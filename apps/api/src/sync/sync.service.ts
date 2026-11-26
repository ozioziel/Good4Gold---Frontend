import { HttpException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Usuario } from '../auth/sesion';
import { type Consulta, Db } from '../db/db.service';
import { decodificar, tipoDeQr } from '../dominio/qr';
import { LugaresService } from '../lugares/lugares.service';
import { nuevaPublicacion } from '../publicaciones/esquemas';
import { PublicacionesService } from '../publicaciones/publicaciones.service';
import { SolicitudesService } from '../solicitudes/solicitudes.service';

const operacion = z.discriminatedUnion('tipo', [
  // Reporte propio que quedó en la cola del teléfono sin conexión: la autoría es la de la sesión.
  z.object({ opId: z.uuid(), tipo: z.literal('publicacion'), publicacion: nuevaPublicacion }).strict(),
  // Reporte de otra persona recibido por QR: quien sincroniza solo lo transporta.
  z.object({ opId: z.uuid(), tipo: z.literal('reporte_qr'), codigo: z.string().max(1400) }).strict(),
]);
export const lote = z.object({ operaciones: z.array(operacion).min(1).max(50) }).strict();

export interface Acuse {
  opId: string;
  resultado: 'creada' | 'duplicada' | 'rechazada';
  publicacionId: string | null;
  solicitudId?: string | null;
  motivo: string | null;
  /** true si esta operación ya se había recibido antes (reenvío). */
  repetida: boolean;
}

/**
 * Sincronización idempotente (POST /sync/operations). Cada operación se aplica en su propia
 * transacción: un error en una no bloquea las demás ni hace perder el borrador (el teléfono
 * solo lo borra cuando recibe «creada» o «duplicada»).
 */
@Injectable()
export class SyncService {
  constructor(
    private readonly db: Db,
    private readonly pubs: PublicacionesService,
    private readonly solicitudes: SolicitudesService,
    private readonly lugares: LugaresService,
  ) {}

  async aplicar(u: Usuario, b: z.infer<typeof lote>): Promise<{ acuses: Acuse[] }> {
    const acuses: Acuse[] = [];
    for (const op of b.operaciones) acuses.push(await this.una(u, op));
    return { acuses };
  }

  private una(u: Usuario, op: z.infer<typeof operacion>): Promise<Acuse> {
    return this.db.transaccion(async (t) => {
      // Candado por operación: dos envíos simultáneos del mismo opId se ordenan.
      await t.query('SELECT pg_advisory_xact_lock(hashtext($1))', [op.opId]);
      const previa = await this.db.fila<{ resultado: Acuse['resultado']; publicacion_id: string | null; motivo: string | null }>(
        'SELECT resultado, publicacion_id, motivo FROM operaciones_sync WHERE op_id = $1',
        [op.opId],
        t,
      );
      if (previa) return { opId: op.opId, resultado: previa.resultado, publicacionId: previa.publicacion_id, motivo: previa.motivo, repetida: true };

      let r: Omit<Acuse, 'opId' | 'repetida'>;
      await t.query('SAVEPOINT op');
      try {
        r = op.tipo === 'publicacion' ? await this.propia(u, op.publicacion, t) : await this.qr(op.codigo, t);
      } catch (e) {
        await t.query('ROLLBACK TO SAVEPOINT op');
        // Solo los rechazos de reglas (4xx) se guardan como acuse; un fallo inesperado se propaga y el teléfono reintenta.
        if (!(e instanceof HttpException)) throw e;
        const motivo = String((e.getResponse() as { message?: string }).message ?? e.message);
        r = { resultado: 'rechazada', publicacionId: null, motivo };
      }
      await t.query(
        'INSERT INTO operaciones_sync (op_id, tipo, publicacion_id, resultado, motivo, transportada_por) VALUES ($1, $2, $3, $4, $5, $6)',
        [op.opId, op.tipo, r.publicacionId, r.resultado, r.motivo, u.id],
      );
      await this.db.auditar(t, u.id, 'sincronizar', `operacion:${op.opId}`, { tipo: op.tipo, resultado: r.resultado });
      return { opId: op.opId, ...r, repetida: false };
    });
  }

  private async propia(u: Usuario, p: z.infer<typeof nuevaPublicacion>, t: Consulta) {
    await t.query('SELECT pg_advisory_xact_lock(hashtext($1))', [p.id]);
    const r = await this.pubs.crear(u, p, 'sin_conexion', t);
    return { resultado: r.creada ? ('creada' as const) : ('duplicada' as const), publicacionId: p.id, motivo: null };
  }

  private async qr(codigo: string, t: Consulta) {
    const r = decodificar(codigo);
    if (!r) return { resultado: 'rechazada' as const, publicacionId: null, motivo: 'El código no es un reporte Gold2 v1 válido.' };
    await t.query('SELECT pg_advisory_xact_lock(hashtext($1))', [r.id]);
    if (await this.db.fila('SELECT 1 FROM publicaciones WHERE id = $1', [r.id], t))
      return { resultado: 'duplicada' as const, publicacionId: r.id, motivo: null };

    const fuente = await this.db.fila<{ id: string }>('SELECT id FROM fuentes_agua WHERE codigo_qr = $1', [r.c], t);
    const autor = r.a?.trim() || 'Sin nombre';
    // Autoría declarada y pendiente de moderación; si el lugar no se reconoce, queda «por ubicar» sin perderse.
    await t.query(
      `INSERT INTO publicaciones (id, fuente_id, codigo_lugar, tipo, texto, fecha, autor_declarado, autoria, origen, moderacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'declarada', 'qr', 'por_revisar')`,
      [r.id, fuente?.id ?? null, fuente ? null : r.c, tipoDeQr(r.t), r.x, r.d, autor],
    );
    let solicitudId: string | null = null;
    if (r.t === 'sol' && fuente) solicitudId = await this.solicitudes.crearDeclarada(t, { fuenteId: fuente.id, publicacionId: r.id, motivo: r.x, autor });
    return { resultado: 'creada' as const, publicacionId: r.id, solicitudId, motivo: fuente ? null : 'Lugar no reconocido: queda por ubicar en moderación.' };
  }

  /** Paquete para guardar en el teléfono: comunidad, sus fuentes con señales y publicaciones recientes. */
  async paquete(comunidadId: string) {
    const c = await this.lugares.comunidad(comunidadId);
    const fuentes = await Promise.all(c.fuentes.map(async (f) => ({ ...f, publicaciones: (await this.pubs.deLugar(f.id)).slice(0, 20) })));
    return { version: 1, generadoEn: new Date().toISOString(), comunidad: { ...c, fuentes: undefined }, fuentes };
  }
}
