import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type { Usuario } from '../auth/sesion';
import { type Consulta, Db } from '../db/db.service';
import { PUEDE_SOLICITAR } from '../dominio/roles';
import { accionesPara, ESTADOS, type EstadoSolicitud, motivoRechazo } from '../dominio/solicitudes';

export const nuevaSolicitud = z
  .object({
    fuenteId: z.string().min(1).max(80),
    motivo: z.string().trim().min(1).max(1000),
    matriz: z.enum(['agua', 'sedimento', 'pez', 'cabello']).optional(),
    publicacionId: z.uuid().optional(),
    // Solo un representante comunitario, y con consentimiento.
    familiasRepresentadas: z.number().int().positive().max(10_000).optional(),
    consentimiento: z.boolean().optional(),
  })
  .strict();

export const cambioEstado = z
  .object({
    estado: z.enum(ESTADOS),
    nota: z.string().trim().max(1000).optional(),
  })
  .strict();

const ETIQUETA_ROL: Record<string, string> = {
  ciudadano: 'ciudadano/a',
  representante: 'representante',
  investigador: 'investigador/a',
  laboratorio: 'laboratorio',
  ong: 'ONG',
  autoridad: 'autoridad sanitaria',
  moderador: 'moderación',
};
const actor = (u: Usuario) => `${u.nombre} · ${ETIQUETA_ROL[u.rol] ?? u.rol}`;

interface FilaSolicitud {
  id: string;
  fuente_id: string;
  estado: EstadoSolicitud;
  organizacion_id: string | null;
}

@Injectable()
export class SolicitudesService {
  constructor(private readonly db: Db) {}

  /** Vista pública: sin datos personales (solo nombre visible y rol de quien pidió). */
  async listar(f: { fuenteId?: string; estado?: EstadoSolicitud }, u?: Usuario) {
    const cond: string[] = [];
    const p: unknown[] = [];
    if (f.fuenteId) cond.push(`s.fuente_id = $${p.push(f.fuenteId)}`);
    if (f.estado) cond.push(`s.estado = $${p.push(f.estado)}`);
    const filas = await this.db.filas<{ estado: EstadoSolicitud } & Record<string, unknown>>(
      `${this.select(true)} ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY s.creado_en DESC LIMIT 200`,
      p,
    );
    return filas.map((s) => ({ ...s, acciones: u ? accionesPara(u.rol, s.estado) : [] }));
  }

  async una(id: string, u?: Usuario) {
    const s = await this.db.fila<FilaSolicitud & Record<string, unknown>>(`${this.select()} WHERE s.id = $1`, [id]);
    if (!s) throw new NotFoundException('No existe esa solicitud.');
    const historial = await this.db.filas(
      'SELECT estado, fecha, actor, nota FROM solicitud_eventos WHERE solicitud_id = $1 ORDER BY fecha, id',
      [id],
    );
    // Las acciones que esta persona podría intentar (el servidor vuelve a revisar al ejecutar).
    const acciones = u ? accionesPara(u.rol, s.estado) : [];
    return { ...s, historial, acciones };
  }

  private select(conHistorial = false) {
    const historial = conHistorial
      ? `, COALESCE((SELECT json_agg(json_build_object('estado', e.estado, 'fecha', e.fecha::date, 'actor', e.actor, 'nota', e.nota) ORDER BY e.fecha, e.id)
                    FROM solicitud_eventos e WHERE e.solicitud_id = s.id), '[]') AS historial`
      : '';
    return `SELECT s.id, s.fuente_id AS "fuenteId", f.nombre AS lugar, f.ficticia, s.motivo, s.matriz, s.estado, s.origen, s.demo,
              s.familias_representadas AS "familiasRepresentadas", s.campana_id AS "campanaId", s.creado_en AS "creadaEn",
              s.organizacion_id, o.nombre AS organizacion,
              COALESCE(u.nombre, s.solicitante_declarado) AS solicitante, u.rol AS "rolSolicitante",
              (s.solicitante_id IS NULL) AS "autoriaDeclarada",
              (SELECT count(*)::int FROM solicitud_apoyos a WHERE a.solicitud_id = s.id) AS apoyos${historial}
            FROM solicitudes s JOIN fuentes_agua f ON f.id = s.fuente_id
            LEFT JOIN usuarios u ON u.id = s.solicitante_id LEFT JOIN organizaciones o ON o.id = s.organizacion_id`;
  }

  async crear(u: Usuario, b: z.infer<typeof nuevaSolicitud>, c?: Consulta) {
    if (!PUEDE_SOLICITAR.includes(u.rol)) throw new ForbiddenException(`Tu rol (${u.rol}) no puede pedir investigaciones.`);
    if (b.familiasRepresentadas !== undefined) {
      if (u.rol !== 'representante') throw new ForbiddenException('Solo un representante comunitario registra en nombre de familias.');
      if (!b.consentimiento) throw new BadRequestException('Registrar en nombre de familias exige su consentimiento.');
    }
    if (!(await this.db.fila('SELECT 1 FROM fuentes_agua WHERE id = $1', [b.fuenteId], c))) throw new NotFoundException('No existe ese lugar.');
    const hacer = async (t: Consulta) => {
      const s = await this.db.fila<{ id: string }>(
        `INSERT INTO solicitudes (fuente_id, publicacion_id, motivo, matriz, solicitante_id, familias_representadas, consentimiento)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [b.fuenteId, b.publicacionId ?? null, b.motivo, b.matriz ?? null, u.id, b.familiasRepresentadas ?? null, b.consentimiento ?? false],
        t,
      );
      const nota = b.familiasRepresentadas ? `En nombre de ${b.familiasRepresentadas} familias, con consentimiento.` : null;
      await t.query('INSERT INTO solicitud_eventos (solicitud_id, estado, actor_id, actor, nota) VALUES ($1, $2, $3, $4, $5)', [
        s!.id,
        'solicitada',
        u.id,
        actor(u),
        nota,
      ]);
      await this.db.auditar(t, u.id, 'solicitar', `solicitud:${s!.id}`, { fuenteId: b.fuenteId });
      return { id: s!.id, estado: 'solicitada' as const };
    };
    return c ? hacer(c) : this.db.transaccion(hacer);
  }

  /** Solicitud llegada por QR: autoría declarada; quien la transporta no es el solicitante. */
  async crearDeclarada(c: Consulta, d: { fuenteId: string; publicacionId: string; motivo: string; autor: string }) {
    const s = await this.db.fila<{ id: string }>(
      `INSERT INTO solicitudes (fuente_id, publicacion_id, motivo, solicitante_declarado, origen) VALUES ($1, $2, $3, $4, 'qr') RETURNING id`,
      [d.fuenteId, d.publicacionId, d.motivo, d.autor],
      c,
    );
    await c.query('INSERT INTO solicitud_eventos (solicitud_id, estado, actor, nota) VALUES ($1, $2, $3, $4)', [
      s!.id,
      'solicitada',
      `${d.autor} · autoría declarada`,
      'Llegó por QR. Moderación verifica antes de avanzar.',
    ]);
    return s!.id;
  }

  async apoyar(u: Usuario, id: string) {
    const s = await this.db.fila<{ estado: string }>('SELECT estado FROM solicitudes WHERE id = $1', [id]);
    if (!s) throw new NotFoundException('No existe esa solicitud.');
    if (s.estado === 'cerrada' || s.estado === 'rechazada') throw new BadRequestException('Esta solicitud ya no recibe apoyos.');
    await this.db.transaccion(async (t) => {
      const r = await t.query('INSERT INTO solicitud_apoyos (solicitud_id, usuario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, u.id]);
      if (r.rowCount) await this.db.auditar(t, u.id, 'apoyar', `solicitud:${id}`);
    });
    return this.db.fila('SELECT count(*)::int AS apoyos FROM solicitud_apoyos WHERE solicitud_id = $1', [id]);
  }

  /** Cambia el estado aplicando la tabla de transiciones y las reglas del servidor. */
  async cambiarEstado(u: Usuario, id: string, b: z.infer<typeof cambioEstado>) {
    return this.db.transaccion(async (t) => {
      // FOR UPDATE: dos personas no pueden avanzar el mismo caso a la vez.
      const s = await this.db.fila<FilaSolicitud>('SELECT id, fuente_id, estado, organizacion_id FROM solicitudes WHERE id = $1 FOR UPDATE', [id], t);
      if (!s) throw new NotFoundException('No existe esa solicitud.');
      const m = await this.db.fila<{ total: number; pendientes: number; validadas: number }>(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE m.revision = 'pendiente')::int AS pendientes,
                count(*) FILTER (WHERE m.revision = 'validada')::int AS validadas
         FROM mediciones m JOIN muestras x ON x.id = m.muestra_id WHERE x.solicitud_id = $1`,
        [id],
        t,
      );
      const motivo = motivoRechazo(s.estado, b.estado, {
        rol: u.rol,
        rolVerificado: u.rol_verificado,
        organizacionUsuario: u.organizacion_id,
        organizacionAsignada: s.organizacion_id,
        nota: b.nota,
        mediciones: m!,
      });
      if (motivo) throw new ConflictException(motivo);
      const asignar = b.estado === 'asignada' && u.organizacion_id ? u.organizacion_id : s.organizacion_id;
      await t.query('UPDATE solicitudes SET estado = $2, organizacion_id = $3 WHERE id = $1', [id, b.estado, asignar]);
      await t.query('INSERT INTO solicitud_eventos (solicitud_id, estado, actor_id, actor, nota) VALUES ($1, $2, $3, $4, $5)', [
        id,
        b.estado,
        u.id,
        actor(u),
        b.nota ?? null,
      ]);
      await this.db.auditar(t, u.id, 'cambiar_estado', `solicitud:${id}`, { de: s.estado, a: b.estado });
      return { id, estado: b.estado };
    });
  }
}
