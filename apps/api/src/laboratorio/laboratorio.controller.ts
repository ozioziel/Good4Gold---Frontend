import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Db } from '../db/db.service';

const AVISO =
  'Laboratorio virtual v0, sin revisión de especialista. Prioriza dónde tomar muestras con imágenes satelitales, huella minera y lluvia: no mide ni estima mercurio. «Baja» no significa agua segura.';

/** Resultados del pipeline científico (science/). Solo lectura. */
@Controller('laboratory')
export class LaboratorioController {
  constructor(private readonly db: Db) {}

  /** Tramos como GeoJSON, con la prioridad y la huella minera de la última temporada evaluada. */
  @Get('tramos')
  async tramos() {
    const filas = await this.db.filas<{ geom: string } & Record<string, unknown>>(
      `WITH ult AS (SELECT max(anio) AS anio FROM evaluaciones_riesgo)
       SELECT t.id, t.rio, t.fuente_id AS "fuenteId", t.longitud_km::float AS "longitudKm", t.desemboca_en AS "desembocaEn",
              e.anio, e.prioridad, e.reglas, e.faltantes, (e.datos->>'mineria_aguas_arriba_ha')::float AS "mineriaAguasArribaHa",
              m.ha_acumulada::float AS "mineriaTramoHa", ST_AsGeoJSON(t.geom, 5) AS geom
       FROM tramos t CROSS JOIN ult
       LEFT JOIN evaluaciones_riesgo e ON e.tramo_id = t.id AND e.anio = ult.anio
       LEFT JOIN mineria_tramo m ON m.tramo_id = t.id AND m.anio = ult.anio
       ORDER BY t.rio, t.orden`,
    );
    return {
      type: 'FeatureCollection',
      aviso: AVISO,
      features: filas.map(({ geom, ...props }) => ({ type: 'Feature', geometry: JSON.parse(geom), properties: props })),
    };
  }

  /** Serie por temporada de un tramo: minería, indicadores espectrales, lluvia y prioridad con sus reglas. */
  @Get('tramos/:id')
  async tramo(@Param('id') id: string) {
    const t = await this.db.fila(
      `SELECT id, rio, fuente_id AS "fuenteId", orden, longitud_km::float AS "longitudKm", desemboca_en AS "desembocaEn", aguas_arriba AS "aguasArriba"
       FROM tramos WHERE id = $1`,
      [id],
    );
    if (!t) throw new NotFoundException('No existe ese tramo.');
    const [mineria, indicadores, riesgo] = await Promise.all([
      this.db.filas('SELECT anio, ha_nueva::float AS "haNueva", ha_acumulada::float AS "haAcumulada" FROM mineria_tramo WHERE tramo_id = $1 ORDER BY anio', [id]),
      this.db.filas(
        `SELECT anio, escenas, suficiente, px_agua_mediana AS "pxAgua", ndti_agua::float AS ndti, ndvi_orilla::float AS ndvi, bsi_orilla::float AS bsi,
                lluvia_previa_mm::float AS "lluviaPreviaMm", z_ndti_agua::float AS "zNdti", z_bsi_orilla::float AS "zBsi", z_lluvia_previa::float AS "zLluvia", fechas
         FROM indicadores_temporada WHERE tramo_id = $1 ORDER BY anio`,
        [id],
      ),
      this.db.filas('SELECT anio, prioridad, reglas, faltantes, datos, version FROM evaluaciones_riesgo WHERE tramo_id = $1 ORDER BY anio', [id]),
    ]);
    return { ...t, mineria, indicadores, riesgo, aviso: AVISO };
  }

  /** Corridas del pipeline con su manifiesto (fuentes, licencias, parámetros): reproducibilidad. */
  @Get('runs')
  runs() {
    return this.db.filas('SELECT id, componente, version, commit_git AS commit, estado, manifiesto, creado_en AS fecha FROM corridas_modelo ORDER BY creado_en DESC LIMIT 20');
  }

  /** Gold2Mercury está en pausa: no hay predicciones de mercurio publicadas. */
  @Get('predictions')
  predicciones() {
    return {
      estado: 'en_pausa',
      predicciones: [],
      nota: 'No se publican estimaciones de mercurio: no hay muestras de Bolivia con coordenadas para validar un modelo. Una predicción nunca se guarda como medición.',
    };
  }
}
