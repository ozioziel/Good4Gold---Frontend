import {
  BadRequestException,
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';
import type { Usuario } from '../auth/sesion';
import { Db } from '../db/db.service';
import { aUnidades, deUnidades, ESCROW, type Escrow, ErrorEscrow, sha256Hex } from './escrow';

const montoUsdc = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,7})?$/, 'Monto en USDC con hasta 7 decimales, p. ej. «25» o «12.5»')
  .refine((m) => Number(m) > 0, 'El monto debe ser mayor que cero');
const direccion = z.string().refine((d) => StrKey.isValidEd25519PublicKey(d), 'Dirección de Stellar inválida (G…)');

export const nuevaCampana = z
  .object({
    solicitudId: z.uuid(),
    titulo: z.string().trim().min(3).max(120),
    causa: z.enum(['investigar', 'proteger', 'educar', 'restaurar']),
    verificadorOrganizacionId: z.uuid(),
    criterioExito: z.string().trim().min(3).max(500),
    politicaSobrantes: z.string().trim().min(3).max(500),
    hitos: z
      .array(z.object({ titulo: z.string().trim().min(2).max(120), monto: montoUsdc }).strict())
      .min(1)
      .max(20),
    // Cuenta que recibe los hitos. Si falta, la cuenta DEMO de organización del servidor.
    orgDireccion: direccion.optional(),
  })
  .strict();

export const donacionDemo = z.object({ monto: montoUsdc }).strict();
export const prepararDonacion = z.object({ direccion, monto: montoUsdc }).strict();
export const enviarDonacion = z.object({ xdr: z.string().min(20).max(20_000) }).strict();
export const revisionHito = z
  .object({
    // Documento o enlace que respalda el hito (informe, acta, comprobante). A la cadena va solo su hash.
    evidenciaRef: z.string().trim().min(3).max(500),
    nota: z.string().trim().max(1000).optional(),
  })
  .strict();
export const cancelacion = z.object({ motivo: z.string().trim().min(10).max(1000) }).strict();
export const reembolso = z.object({ direccion }).strict();

// Tope de prudencia para la demostración en testnet.
const META_MAXIMA = aUnidades('100000');

interface FilaCampana {
  id: string;
  solicitud_id: string;
  organizacion_id: string;
  verificador_id: string;
  campana_cadena: number;
  estado: string;
  meta: string;
}

/** Convierte un error del escrow en una respuesta HTTP clara. */
function aHttp(e: unknown): never {
  if (e instanceof HttpException) throw e;
  if (e instanceof ErrorEscrow) {
    if (/no está configurado/.test(e.message)) throw new ServiceUnavailableException(e.message);
    if (e.deRed) throw new BadGatewayException(e.message);
    throw new ConflictException(e.message);
  }
  throw e;
}

@Injectable()
export class CampanasService {
  constructor(
    private readonly db: Db,
    @Inject(ESCROW) private readonly escrow: Escrow,
  ) {}

  private exigirVerificado(u: Usuario) {
    if (!u.rol_verificado) throw new ForbiddenException('Tu rol todavía no fue verificado.');
  }

  private async campana(id: string) {
    const c = await this.db.fila<FilaCampana>(
      'SELECT id, solicitud_id, organizacion_id, verificador_id, campana_cadena, estado, meta::text FROM campanas WHERE id = $1',
      [id],
    );
    if (!c) throw new NotFoundException('No existe esa campaña.');
    return c;
  }

  // ── Lectura ──────────────────────────────────────────────────────────────────────────────────────

  listar(solicitudId?: string) {
    return this.db.filas(
      `${this.select()} ${solicitudId ? 'WHERE c.solicitud_id = $1' : ''} ORDER BY c.creado_en DESC LIMIT 100`,
      solicitudId ? [solicitudId] : [],
    );
  }

  private select() {
    return `SELECT c.id, c.solicitud_id AS "solicitudId", c.titulo, c.causa, c.estado, trim_scale(c.meta)::text AS meta, c.activo, c.red, c.demo,
              c.fuente_id, f.nombre AS lugar, f.id AS "lugarId",
              o.nombre AS responsable, v.nombre AS verificador, c.criterio_exito AS "criterioExito",
              c.politica_sobrantes AS "politicaSobrantes", c.contrato_id AS "contratoId", c.campana_cadena AS "campanaCadena",
              c.tx_creacion AS "txCreacion", c.creado_en AS "creadaEn",
              trim_scale(COALESCE((SELECT sum(d.monto) FROM donaciones d WHERE d.campana_id = c.id AND d.estado = 'confirmada'), 0))::text AS reunido,
              (SELECT count(*)::int FROM donaciones d WHERE d.campana_id = c.id AND d.estado = 'confirmada') AS aportes,
              trim_scale(COALESCE((SELECT sum(h.monto) FROM hitos h WHERE h.campana_id = c.id AND h.estado = 'liberado'), 0))::text AS liberado,
              COALESCE((SELECT json_agg(json_build_object('id', h.id, 'indice', h.indice, 'titulo', h.titulo, 'monto', trim_scale(h.monto)::text,
                                                          'estado', h.estado, 'evidenciaRef', h.evidencia_ref, 'evidenciaHash', h.evidencia_hash,
                                                          'tx', h.tx_hash, 'liberadoEn', h.liberado_en) ORDER BY h.indice)
                        FROM hitos h WHERE h.campana_id = c.id), '[]') AS hitos
            FROM (SELECT x.*, s.fuente_id FROM campanas x JOIN solicitudes s ON s.id = x.solicitud_id) c
            JOIN fuentes_agua f ON f.id = c.fuente_id
            JOIN organizaciones o ON o.id = c.organizacion_id JOIN organizaciones v ON v.id = c.verificador_id`;
  }

  /** Detalle con donaciones confirmadas y el estado leído del contrato (fuente de verdad del dinero). */
  async una(id: string) {
    const c = await this.db.fila<{ campanaCadena: number; reunido: string; liberado: string } & Record<string, unknown>>(
      `${this.select()} WHERE c.id = $1`,
      [id],
    );
    if (!c) throw new NotFoundException('No existe esa campaña.');
    const donaciones = await this.db.filas(
      `SELECT d.id, trim_scale(d.monto)::text AS monto, d.modo, d.direccion, d.tx_hash AS tx, d.confirmada_en AS fecha
       FROM donaciones d WHERE d.campana_id = $1 AND d.estado = 'confirmada' ORDER BY d.confirmada_en DESC LIMIT 100`,
      [id],
    );
    const movimientos = await this.db.filas(
      'SELECT tipo, direccion, trim_scale(monto)::text AS monto, tx_hash AS tx, motivo, fecha FROM movimientos_escrow WHERE campana_id = $1 ORDER BY fecha',
      [id],
    );
    let cadena: Record<string, unknown> | null = null;
    try {
      const e = await this.escrow.estado(c.campanaCadena);
      cadena = {
        meta: deUnidades(e.meta),
        aportado: deUnidades(e.aportado),
        liberado: deUnidades(e.liberado),
        reembolsado: deUnidades(e.reembolsado),
        hitosLiberados: e.hitosLiberados,
        estado: e.estado,
        // ¿Coincide lo registrado aquí con lo que dice el contrato?
        conciliada: aUnidades(c.reunido) === e.aportado && aUnidades(c.liberado) === e.liberado,
      };
    } catch {
      cadena = null; // sin red: se muestra lo registrado, avisando que no se pudo conciliar
    }
    return { ...c, donaciones, movimientos, cadena };
  }

  // ── Crear ────────────────────────────────────────────────────────────────────────────────────────

  async crear(u: Usuario, b: z.infer<typeof nuevaCampana>) {
    this.exigirVerificado(u);
    if (!u.organizacion_id) throw new ForbiddenException('Necesitas pertenecer a una organización.');
    const s = await this.db.fila<{ estado: string; organizacion_id: string | null; campana_id: string | null }>(
      'SELECT estado, organizacion_id, campana_id FROM solicitudes WHERE id = $1',
      [b.solicitudId],
    );
    if (!s) throw new NotFoundException('No existe esa solicitud.');
    if (s.organizacion_id !== u.organizacion_id) throw new ForbiddenException('Solo la organización que aceptó el caso propone su campaña.');
    if (!['asignada', 'pendiente_recursos'].includes(s.estado)) throw new ConflictException('La campaña se propone cuando el caso está aceptado y le faltan recursos.');
    if (s.campana_id) throw new ConflictException('Este caso ya tiene una campaña.');
    if (b.verificadorOrganizacionId === u.organizacion_id) throw new BadRequestException('El verificador debe ser una organización independiente.');
    if (!(await this.db.fila('SELECT 1 FROM organizaciones WHERE id = $1', [b.verificadorOrganizacionId])))
      throw new NotFoundException('No existe la organización verificadora.');

    const montos = b.hitos.map((h) => aUnidades(h.monto));
    const meta = montos.reduce((a, m) => a + m, 0n);
    if (meta > META_MAXIMA) throw new BadRequestException('La meta supera el tope de la demostración (100 000 USDC de prueba).');

    const id = crypto.randomUUID();
    const referencia = sha256Hex(id);
    try {
      const orgDireccion = b.orgDireccion ?? this.escrow.direccionOrgDemo();
      const verificadorDireccion = this.escrow.direccionVerificador();
      const r = await this.escrow.crear(orgDireccion, verificadorDireccion, referencia, montos);
      return await this.db.transaccion(async (t) => {
        await t.query(
          `INSERT INTO campanas (id, solicitud_id, titulo, causa, organizacion_id, verificador_id, criterio_exito, politica_sobrantes,
                                 contrato_id, campana_cadena, referencia, org_direccion, verificador_direccion, tx_creacion, meta, creada_por)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [
            id, b.solicitudId, b.titulo, b.causa, u.organizacion_id, b.verificadorOrganizacionId, b.criterioExito, b.politicaSobrantes,
            this.escrow.contratoId, r.id, referencia, orgDireccion, verificadorDireccion, r.tx, deUnidades(meta), u.id,
          ],
        );
        for (const [i, h] of b.hitos.entries())
          await t.query('INSERT INTO hitos (campana_id, indice, titulo, monto) VALUES ($1, $2, $3, $4)', [id, i, h.titulo, h.monto]);
        await t.query("INSERT INTO movimientos_escrow (campana_id, tipo, tx_hash, usuario_id) VALUES ($1, 'creacion', $2, $3)", [id, r.tx, u.id]);
        await t.query('UPDATE solicitudes SET campana_id = $2 WHERE id = $1', [b.solicitudId, id]);
        if (s.estado === 'asignada') {
          await t.query("UPDATE solicitudes SET estado = 'pendiente_recursos' WHERE id = $1", [b.solicitudId]);
          await t.query(
            "INSERT INTO solicitud_eventos (solicitud_id, estado, actor_id, actor, nota) VALUES ($1, 'pendiente_recursos', $2, $3, $4)",
            [b.solicitudId, u.id, `${u.nombre} · ${u.rol}`, `Presupuesto publicado como campaña (meta ${deUnidades(meta)} USDC de prueba).`],
          );
        }
        await this.db.auditar(t, u.id, 'crear_campana', `campana:${id}`, { tx: r.tx, campanaCadena: r.id });
        return { id, campanaCadena: r.id, tx: r.tx, meta: deUnidades(meta) };
      });
    } catch (e) {
      aHttp(e);
    }
  }

  // ── Donar ────────────────────────────────────────────────────────────────────────────────────────

  private async abierta(id: string) {
    const c = await this.campana(id);
    if (c.estado !== 'abierta') throw new ConflictException('La campaña ya no recibe aportes.');
    return c;
  }

  /** DEMO: el servidor firma con un donante de prueba que custodia (solo testnet). */
  async donarDemo(u: Usuario, id: string, monto: string) {
    const c = await this.abierta(id);
    try {
      const direccionDemo = this.escrow.direccionDonanteDemo();
      const r = await this.escrow.aportarDemo(c.campana_cadena, aUnidades(monto));
      return await this.registrarConfirmada(c.id, u.id, direccionDemo, monto, 'demo', r.tx);
    } catch (e) {
      aHttp(e);
    }
  }

  /** Billetera: devuelve la transacción sin firmar; el donante la firma (p. ej. Freighter) y la envía con /submit. */
  async preparar(u: Usuario | undefined, id: string, b: z.infer<typeof prepararDonacion>) {
    const c = await this.abierta(id);
    try {
      const xdr = await this.escrow.prepararAporte(c.campana_cadena, b.direccion, aUnidades(b.monto));
      const d = await this.db.fila<{ id: string }>(
        `INSERT INTO donaciones (campana_id, usuario_id, direccion, monto, modo) VALUES ($1, $2, $3, $4, 'billetera') RETURNING id`,
        [c.id, u?.id ?? null, b.direccion, b.monto],
      );
      return { donacionId: d!.id, xdr, red: 'testnet' };
    } catch (e) {
      aHttp(e);
    }
  }

  async enviar(donacionId: string, xdr: string) {
    const d = await this.db.fila<{ campana_id: string; direccion: string; monto: string; estado: string; campana_cadena: number }>(
      `SELECT d.campana_id, d.direccion, d.monto::text, d.estado, c.campana_cadena
       FROM donaciones d JOIN campanas c ON c.id = d.campana_id WHERE d.id = $1`,
      [donacionId],
    );
    if (!d) throw new NotFoundException('No existe esa donación.');
    if (d.estado !== 'preparada') throw new ConflictException(`Esta donación ya está ${d.estado}.`);
    try {
      const r = await this.escrow.enviarAporteFirmado(xdr, { id: d.campana_cadena, donante: d.direccion, monto: aUnidades(d.monto) });
      await this.db.transaccion(async (t) => {
        await t.query("UPDATE donaciones SET estado = 'confirmada', tx_hash = $2, confirmada_en = now() WHERE id = $1", [donacionId, r.tx]);
        await this.db.auditar(t, null, 'donar', `campana:${d.campana_id}`, { tx: r.tx, modo: 'billetera' });
      });
      return { id: donacionId, estado: 'confirmada', tx: r.tx };
    } catch (e) {
      if (e instanceof ErrorEscrow && !e.deRed)
        await this.db.filas("UPDATE donaciones SET estado = 'fallida', error = $2 WHERE id = $1", [donacionId, e.message]);
      aHttp(e);
    }
  }

  private registrarConfirmada(campanaId: string, usuarioId: string | null, direccion: string, monto: string, modo: 'demo' | 'billetera', tx: string) {
    return this.db.transaccion(async (t) => {
      const d = await this.db.fila<{ id: string }>(
        `INSERT INTO donaciones (campana_id, usuario_id, direccion, monto, modo, estado, tx_hash, confirmada_en)
         VALUES ($1, $2, $3, $4, $5, 'confirmada', $6, now()) RETURNING id`,
        [campanaId, usuarioId, direccion, monto, modo, tx],
        t,
      );
      await this.db.auditar(t, usuarioId, 'donar', `campana:${campanaId}`, { tx, modo });
      return { id: d!.id, estado: 'confirmada', tx };
    });
  }

  // ── Hitos, cancelación y reembolsos ─────────────────────────────────────────────────────────────

  /** El verificador independiente aprueba el siguiente hito con su evidencia; el contrato libera el monto. */
  async aprobarHito(u: Usuario, hitoId: string, b: z.infer<typeof revisionHito>) {
    this.exigirVerificado(u);
    const h = await this.db.fila<{ campana_id: string; indice: number; estado: string }>('SELECT campana_id, indice, estado FROM hitos WHERE id = $1', [hitoId]);
    if (!h) throw new NotFoundException('No existe ese hito.');
    const c = await this.campana(h.campana_id);
    if (u.organizacion_id !== c.verificador_id) throw new ForbiddenException('Solo la organización verificadora de esta campaña aprueba sus hitos.');
    if (c.estado !== 'abierta') throw new ConflictException('La campaña no está abierta.');
    if (h.estado !== 'pendiente') throw new ConflictException('Ese hito ya fue liberado.');
    const siguiente = await this.db.fila<{ indice: number }>(
      "SELECT min(indice) AS indice FROM hitos WHERE campana_id = $1 AND estado = 'pendiente'",
      [c.id],
    );
    if (siguiente?.indice !== h.indice) throw new ConflictException('Los hitos se aprueban en orden.');
    const evidenciaHash = sha256Hex(b.evidenciaRef);
    return this.db.transaccion(async (t) => {
      // Un hito a la vez por campaña.
      await t.query('SELECT pg_advisory_xact_lock(hashtext($1))', [c.id]);
      let r: { tx: string; indice: number };
      try {
        r = await this.escrow.aprobarHito(c.campana_cadena, evidenciaHash);
      } catch (e) {
        aHttp(e);
      }
      if (r.indice !== h.indice) throw new ConflictException('El contrato liberó otro hito: revisa la conciliación.');
      await t.query(
        "UPDATE hitos SET estado = 'liberado', evidencia_ref = $2, evidencia_hash = $3, nota = $4, tx_hash = $5, revisado_por = $6, liberado_en = now() WHERE id = $1",
        [hitoId, b.evidenciaRef, evidenciaHash, b.nota ?? null, r.tx, u.id],
      );
      const quedan = await this.db.fila<{ n: number }>("SELECT count(*)::int AS n FROM hitos WHERE campana_id = $1 AND estado = 'pendiente'", [c.id], t);
      if (quedan!.n === 0) await t.query("UPDATE campanas SET estado = 'completada' WHERE id = $1", [c.id]);
      await this.db.auditar(t, u.id, 'liberar_hito', `hito:${hitoId}`, { tx: r.tx, evidenciaHash });
      return { id: hitoId, estado: 'liberado', tx: r.tx, evidenciaHash, campanaCompletada: quedan!.n === 0 };
    });
  }

  /** Moderación cancela tras una disputa documentada; lo no liberado queda para reembolso proporcional. */
  async cancelar(u: Usuario, id: string, motivo: string) {
    this.exigirVerificado(u);
    const c = await this.campana(id);
    if (c.estado !== 'abierta') throw new ConflictException('La campaña no está abierta.');
    try {
      const r = await this.escrow.cancelar(c.campana_cadena);
      await this.db.transaccion(async (t) => {
        await t.query("UPDATE campanas SET estado = 'cancelada' WHERE id = $1", [id]);
        await t.query("INSERT INTO movimientos_escrow (campana_id, tipo, tx_hash, motivo, usuario_id) VALUES ($1, 'cancelacion', $2, $3, $4)", [id, r.tx, motivo, u.id]);
        await this.db.auditar(t, u.id, 'cancelar_campana', `campana:${id}`, { tx: r.tx });
      });
      return { id, estado: 'cancelada', tx: r.tx };
    } catch (e) {
      aHttp(e);
    }
  }

  async reembolsar(id: string, direccionDonante: string) {
    const c = await this.campana(id);
    if (c.estado !== 'cancelada') throw new ConflictException('Solo se reembolsa una campaña cancelada.');
    try {
      const r = await this.escrow.reembolsar(c.campana_cadena, direccionDonante);
      const monto = deUnidades(r.monto);
      await this.db.filas(
        "INSERT INTO movimientos_escrow (campana_id, tipo, direccion, monto, tx_hash) VALUES ($1, 'reembolso', $2, $3, $4)",
        [id, direccionDonante, monto, r.tx],
      );
      return { id, direccion: direccionDonante, monto, tx: r.tx };
    } catch (e) {
      aHttp(e);
    }
  }

  /** Datos públicos para donar con billetera: red, contrato y activo. */
  info() {
    return {
      red: 'testnet',
      configurado: this.escrow.configurado,
      contratoId: this.escrow.contratoId || null,
      activo: { codigo: 'USDC', emisor: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', decimales: 7 },
      aviso: 'Red de pruebas de Stellar: los fondos no tienen valor real. La cadena da trazabilidad del dinero; no valida la ciencia.',
    };
  }
}
