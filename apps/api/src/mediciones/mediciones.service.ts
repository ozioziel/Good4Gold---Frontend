import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type { Usuario } from '../auth/sesion';
import { punto } from '../comun/validar';
import { Db } from '../db/db.service';
import { type Matriz, normalizar } from '../dominio/unidades';

export const nuevaMuestra = z
  .object({
    fuenteId: z.string().min(1).max(80),
    solicitudId: z.uuid().optional(),
    matriz: z.enum(['agua', 'sedimento', 'pez', 'cabello']),
    fechaMuestreo: z.iso.date(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
    cadenaCustodia: z.string().trim().max(120).optional(),
  })
  .strict();

export const nuevaMedicion = z
  .object({
    muestraId: z.uuid(),
    analito: z.enum(['hg_total', 'metilmercurio', 'hg_disuelto', 'hg_particulado']),
    calificador: z.enum(['detectado', 'no_detectado', 'bajo_lc', 'no_concluyente']),
    valor: z.number().nonnegative().optional(),
    unidad: z.enum(['ng/L', 'µg/L', 'mg/L', 'µg/g', 'mg/kg', 'ng/g']),
    limiteDeteccion: z.number().positive().optional(),
    limiteCuantificacion: z.number().positive().optional(),
    metodo: z.string().trim().min(1).max(200),
    documentoRef: z.string().trim().max(200).optional(),
    alcance: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((b) => b.calificador !== 'detectado' || b.valor !== undefined, { message: 'Un resultado detectado necesita su valor', path: ['valor'] })
  .refine((b) => b.calificador !== 'no_detectado' || (b.valor === undefined && b.limiteDeteccion !== undefined), {
    message: '«No detectado» no es «ausente»: indica el límite de detección y no un valor',
    path: ['limiteDeteccion'],
  });

export const revision = z
  .object({ decision: z.enum(['validada', 'rechazada']), nota: z.string().trim().min(1).max(1000) })
  .strict();

@Injectable()
export class MedicionesService {
  constructor(private readonly db: Db) {}

  private exigirVerificado(u: Usuario) {
    if (!u.rol_verificado) throw new ForbiddenException('Tu rol todavía no fue verificado.');
  }

  async crearMuestra(u: Usuario, b: z.infer<typeof nuevaMuestra>) {
    this.exigirVerificado(u);
    if (!u.organizacion_id) throw new ForbiddenException('Necesitas pertenecer a un laboratorio.');
    if (!(await this.db.fila('SELECT 1 FROM fuentes_agua WHERE id = $1', [b.fuenteId]))) throw new NotFoundException('No existe ese lugar.');
    if (b.solicitudId) {
      const s = await this.db.fila<{ fuente_id: string; estado: string }>('SELECT fuente_id, estado FROM solicitudes WHERE id = $1', [b.solicitudId]);
      if (!s) throw new NotFoundException('No existe esa solicitud.');
      if (s.fuente_id !== b.fuenteId) throw new BadRequestException('La muestra debe ser del mismo lugar que la solicitud.');
      if (!['en_muestreo', 'en_analisis'].includes(s.estado)) throw new ConflictException('La solicitud no está en muestreo ni en análisis.');
    }
    return this.db.transaccion(async (t) => {
      const m = await this.db.fila<{ id: string }>(
        `INSERT INTO muestras (fuente_id, solicitud_id, matriz, fecha_muestreo, ubicacion, cadena_custodia, laboratorio_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [b.fuenteId, b.solicitudId ?? null, b.matriz, b.fechaMuestreo, punto(b.lat, b.lon), b.cadenaCustodia ?? null, u.organizacion_id],
        t,
      );
      await this.db.auditar(t, u.id, 'crear_muestra', `muestra:${m!.id}`);
      return m;
    });
  }

  async crearMedicion(u: Usuario, b: z.infer<typeof nuevaMedicion>) {
    this.exigirVerificado(u);
    const muestra = await this.db.fila<{ matriz: Matriz; laboratorio_id: string }>('SELECT matriz, laboratorio_id FROM muestras WHERE id = $1', [b.muestraId]);
    if (!muestra) throw new NotFoundException('No existe esa muestra.');
    if (muestra.laboratorio_id !== u.organizacion_id) throw new ForbiddenException('Solo el laboratorio que tomó la muestra carga sus resultados.');
    const n = normalizar(b.valor ?? null, b.unidad, muestra.matriz);
    if (!n) throw new BadRequestException(`La unidad ${b.unidad} no corresponde a una muestra de ${muestra.matriz}.`);
    return this.db.transaccion(async (t) => {
      const m = await this.db.fila<{ id: string }>(
        `INSERT INTO mediciones (muestra_id, analito, calificador, valor, unidad, valor_normalizado, unidad_normalizada,
                                 limite_deteccion, limite_cuantificacion, metodo, documento_ref, alcance, cargada_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, 'Aplica solo a esta muestra, en este lugar y fecha.'),$13) RETURNING id`,
        [
          b.muestraId, b.analito, b.calificador, b.valor ?? null, b.unidad, n.valor, n.unidad,
          b.limiteDeteccion ?? null, b.limiteCuantificacion ?? null, b.metodo, b.documentoRef ?? null, b.alcance ?? null, u.id,
        ],
        t,
      );
      await this.db.auditar(t, u.id, 'cargar_medicion', `medicion:${m!.id}`);
      return { id: m!.id, revision: 'pendiente' };
    });
  }

  /** Revisión técnica: la hace una persona distinta de quien cargó el resultado. */
  async revisar(u: Usuario, id: string, b: z.infer<typeof revision>) {
    this.exigirVerificado(u);
    return this.db.transaccion(async (t) => {
      const m = await this.db.fila<{ cargada_por: string; revision: string }>('SELECT cargada_por, revision FROM mediciones WHERE id = $1 FOR UPDATE', [id], t);
      if (!m) throw new NotFoundException('No existe esa medición.');
      if (m.cargada_por === u.id) throw new ForbiddenException('Quien carga un resultado no puede validarlo.');
      if (m.revision !== 'pendiente') throw new ConflictException('Esta medición ya fue revisada; una discrepancia se documenta aparte.');
      await t.query('UPDATE mediciones SET revision = $2, revisada_por = $3, revisada_en = now(), nota_revision = $4 WHERE id = $1', [id, b.decision, u.id, b.nota]);
      await this.db.auditar(t, u.id, 'revisar_medicion', `medicion:${id}`, { decision: b.decision });
      return { id, revision: b.decision };
    });
  }

  /** Mediciones públicas de un lugar: solo validadas, con su alcance y el criterio que aplica a cada matriz. */
  async deLugar(fuenteId: string) {
    const filas = await this.db.filas<{ matriz: string; analito: string }>(
      `SELECT m.id, s.matriz, m.analito, m.calificador, m.valor, m.unidad, m.valor_normalizado AS "valorNormalizado",
              m.unidad_normalizada AS "unidadNormalizada", m.limite_deteccion AS "limiteDeteccion",
              m.limite_cuantificacion AS "limiteCuantificacion", m.metodo, m.alcance, s.fecha_muestreo AS "fechaMuestreo",
              o.nombre AS laboratorio, m.demo, m.revisada_en AS "revisadaEn"
       FROM mediciones m JOIN muestras s ON s.id = m.muestra_id JOIN organizaciones o ON o.id = s.laboratorio_id
       WHERE s.fuente_id = $1 AND m.revision = 'validada' ORDER BY s.fecha_muestreo DESC`,
      [fuenteId],
    );
    const c = await this.db.fila('SELECT norma, valor_ng_l, verificado, nota FROM criterios WHERE id = $1', ['nb512-hg-agua-consumo']);
    return filas.map((m) => ({
      ...m,
      // El umbral de agua potable no se aplica a peces, cabello ni sedimentos.
      criterio: m.matriz === 'agua' && m.analito === 'hg_total' ? c : null,
    }));
  }
}
