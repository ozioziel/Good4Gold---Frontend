import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import { punto } from '../comun/validar';
import { type Consulta, Db } from '../db/db.service';
import { PUEDE_SOLICITAR, tiposPermitidos } from '../dominio/roles';
import { SolicitudesService } from '../solicitudes/solicitudes.service';
import type { Usuario } from '../auth/sesion';
import type { NuevaPublicacion, respaldo } from './esquemas';

const hoy = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class PublicacionesService {
  constructor(
    private readonly db: Db,
    private readonly solicitudes: SolicitudesService,
  ) {}

  /** Publicaciones de un lugar con autor (nombre y rol), respaldos y respuestas. */
  async deLugar(fuenteId: string) {
    return this.db.filas(
      `SELECT p.id, p.fuente_id AS "fuenteId", p.tipo, p.texto, p.fecha,
              ST_Y(p.ubicacion::geometry) AS lat, ST_X(p.ubicacion::geometry) AS lon,
              CASE WHEN p.autor_id IS NULL THEN json_build_object('nombre', p.autor_declarado, 'rol', NULL, 'declarado', true)
                   ELSE json_build_object('nombre', u.nombre, 'rol', u.rol, 'declarado', false) END AS autor,
              p.autoria, p.origen, p.moderacion, p.demo,
              COALESCE((SELECT json_agg(json_build_object('persona', json_build_object('nombre', ru.nombre, 'rol', ru.rol),
                                                          'postura', r.postura, 'motivo', r.motivo) ORDER BY r.creado_en)
                        FROM respaldos r JOIN usuarios ru ON ru.id = r.usuario_id WHERE r.publicacion_id = p.id), '[]') AS respaldos,
              COALESCE((SELECT json_agg(json_build_object('persona', json_build_object('nombre', au.nombre, 'rol', au.rol),
                                                          'texto', a.texto, 'fecha', a.creado_en::date) ORDER BY a.creado_en)
                        FROM respuestas a JOIN usuarios au ON au.id = a.autor_id WHERE a.publicacion_id = p.id), '[]') AS respuestas
       FROM publicaciones p LEFT JOIN usuarios u ON u.id = p.autor_id
       WHERE p.fuente_id = $1 AND p.moderacion <> 'oculta'
       ORDER BY p.fecha DESC, p.creado_en DESC`,
      [fuenteId],
    );
  }

  /**
   * Crea una publicación en línea o desde la cola sin conexión del propio autor.
   * Idempotente: si el mismo autor reenvía el mismo id, devuelve { creada: false }.
   */
  async crear(u: Usuario, b: NuevaPublicacion, origen: 'en_linea' | 'sin_conexion' = 'en_linea', c?: Consulta) {
    if (!tiposPermitidos(u.rol).includes(b.tipo)) throw new ForbiddenException(`Tu rol (${u.rol}) no puede publicar «${b.tipo}».`);
    const hacer = async (t: Consulta) => {
      const previa = await this.db.fila<{ autor_id: string | null }>('SELECT autor_id FROM publicaciones WHERE id = $1', [b.id], t);
      if (previa) {
        // Ya llegó antes (quizá por QR, con autoría declarada): no se duplica ni se reclama la autoría
        // solo por conocer el UUID, que viaja en el QR. Moderación puede unir ambas autorías.
        if (previa.autor_id !== null && previa.autor_id !== u.id) throw new ConflictException('Ese identificador ya está en uso.');
        return { id: b.id, creada: false };
      }
      const fuenteId = b.fuenteId ?? b.lugar!.id;
      const existe = await this.db.fila('SELECT 1 FROM fuentes_agua WHERE id = $1', [fuenteId], t);
      if (!existe) {
        if (!b.lugar || b.lugar.id !== fuenteId) throw new NotFoundException('No existe ese lugar.');
        await t.query(
          `INSERT INTO fuentes_agua (id, nombre, tipo, ubicacion) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [b.lugar.id, b.lugar.nombre, b.lugar.tipo, punto(b.lugar.lat, b.lugar.lon)],
        );
      }
      await t.query(
        `INSERT INTO publicaciones (id, fuente_id, tipo, texto, fecha, ubicacion, autor_id, origen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [b.id, fuenteId, b.tipo, b.texto, b.fecha ?? hoy(), punto(b.lat, b.lon), u.id, origen],
      );
      await this.db.auditar(t, u.id, 'publicar', `publicacion:${b.id}`, { tipo: b.tipo, fuenteId, origen });
      // «Pedir análisis» en el mapa abre la solicitud de investigación vinculada (PROYECTO.md §4).
      let solicitudId: string | undefined;
      if (b.tipo === 'analisis' && PUEDE_SOLICITAR.includes(u.rol))
        solicitudId = (await this.solicitudes.crear(u, { fuenteId, motivo: b.texto, publicacionId: b.id }, t)).id;
      return { id: b.id, creada: true, ...(solicitudId ? { solicitudId } : {}) };
    };
    return c ? hacer(c) : this.db.transaccion(hacer);
  }

  /** Respaldar o cuestionar. Ayuda a priorizar; nunca cambia el estado químico de nada. */
  async respaldar(u: Usuario, id: string, b: z.infer<typeof respaldo>) {
    const p = await this.db.fila<{ autor_id: string | null; tipo: string }>('SELECT autor_id, tipo FROM publicaciones WHERE id = $1', [id]);
    if (!p) throw new NotFoundException('No existe esa publicación.');
    if (p.tipo === 'oficial') throw new BadRequestException('Las recomendaciones oficiales no se votan.');
    if (p.autor_id === u.id) throw new BadRequestException('No puedes respaldar tu propia publicación.');
    return this.db.transaccion(async (t) => {
      await t.query(
        `INSERT INTO respaldos (publicacion_id, usuario_id, postura, motivo) VALUES ($1, $2, $3, $4)
         ON CONFLICT (publicacion_id, usuario_id) DO UPDATE SET postura = EXCLUDED.postura, motivo = EXCLUDED.motivo, creado_en = now()`,
        [id, u.id, b.postura, b.motivo ?? null],
      );
      await this.db.auditar(t, u.id, 'respaldar', `publicacion:${id}`, { postura: b.postura });
      return { ok: true };
    });
  }

  async responder(u: Usuario, id: string, texto: string) {
    if (!(await this.db.fila('SELECT 1 FROM publicaciones WHERE id = $1', [id]))) throw new NotFoundException('No existe esa publicación.');
    return this.db.transaccion(async (t) => {
      const r = await this.db.fila<{ id: string }>('INSERT INTO respuestas (publicacion_id, autor_id, texto) VALUES ($1, $2, $3) RETURNING id', [id, u.id, texto], t);
      await this.db.auditar(t, u.id, 'responder', `publicacion:${id}`);
      return r;
    });
  }
}
