import { Injectable, NotFoundException } from '@nestjs/common';
import { Db } from '../db/db.service';
import { senalComunidad } from '../dominio/comunidad';
import { type Criterio, type MedicionValidada, senalOficial } from '../dominio/evidencia';
import { type EstadoSolicitud, nivelTramite } from '../dominio/solicitudes';

interface FilaFuente {
  id: string;
  nombre: string;
  tipo: string;
  cerca: string;
  ficticia: boolean;
  lat: number;
  lon: number;
}

const COLUMNAS = `f.id, f.nombre, f.tipo, f.cerca, f.ficticia,
  ST_Y(f.ubicacion::geometry) AS lat, ST_X(f.ubicacion::geometry) AS lon`;

export interface Filtro {
  q?: string;
  bbox?: [number, number, number, number]; // oeste, sur, este, norte
}

/**
 * Lugares (fuentes de agua) con sus tres señales SIEMPRE separadas:
 *   comunidad → prioriza, no confirma mercurio · virtual → orienta, no mide mercurio ·
 *   oficial → resultado químico de una muestra, no certifica potabilidad.
 */
@Injectable()
export class LugaresService {
  constructor(private readonly db: Db) {}

  async listar(f: Filtro) {
    const cond: string[] = [];
    const p: unknown[] = [];
    if (f.q) {
      p.push(`%${f.q}%`);
      cond.push(`(f.nombre ILIKE $${p.length} OR f.cerca ILIKE $${p.length})`);
    }
    if (f.bbox) {
      p.push(...f.bbox);
      const n = p.length;
      cond.push(`ST_Intersects(f.ubicacion, ST_MakeEnvelope($${n - 3}, $${n - 2}, $${n - 1}, $${n}, 4326)::geography)`);
    }
    const filas = await this.db.filas<FilaFuente>(
      `SELECT ${COLUMNAS} FROM fuentes_agua f ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY f.ficticia DESC, f.nombre LIMIT 500`,
      p,
    );
    return this.conSenales(filas);
  }

  async uno(id: string) {
    const f = await this.db.fila<FilaFuente>(`SELECT ${COLUMNAS} FROM fuentes_agua f WHERE f.id = $1`, [id]);
    if (!f) throw new NotFoundException('No existe ese lugar.');
    const [conSenal] = await this.conSenales([f]);
    const comunidades = await this.db.filas(
      `SELECT c.id, c.nombre, c.departamento, c.ficticia FROM fuente_comunidad fc JOIN comunidades c ON c.id = fc.comunidad_id
       WHERE fc.fuente_id = $1 ORDER BY c.nombre`,
      [id],
    );
    const alertas = await this.db.filas(
      `SELECT id, texto, demo, creado_en FROM alertas_oficiales WHERE fuente_id = $1 AND vigente ORDER BY creado_en DESC`,
      [id],
    );
    return { ...conSenal, comunidades, alertas };
  }

  async existe(id: string) {
    return !!(await this.db.fila('SELECT 1 FROM fuentes_agua WHERE id = $1', [id]));
  }

  private async conSenales(fuentes: FilaFuente[]) {
    if (fuentes.length === 0) return [];
    const ids = fuentes.map((f) => f.id);
    const [pubs, indicadores, mediciones, tramites, criterio] = await Promise.all([
      this.db.filas<{ fuente_id: string; tipo: string; autor: string; coinciden: string[] }>(
        `SELECT p.fuente_id, p.tipo, COALESCE(p.autor_id::text, 'declarado:' || p.autor_declarado) AS autor,
                COALESCE(array_agg(r.usuario_id::text) FILTER (WHERE r.postura = 'coincide'), '{}') AS coinciden
         FROM publicaciones p LEFT JOIN respaldos r ON r.publicacion_id = p.id
         -- Lo que llegó con autoría declarada y espera moderación se ve, pero aún no cuenta para la señal.
         WHERE p.fuente_id = ANY($1) AND p.moderacion = 'publicada'
         GROUP BY p.id`,
        [ids],
      ),
      this.db.filas<{ fuente_id: string; nivel: string; detalle: string; origen: string; fecha: string; demo: boolean }>(
        `SELECT DISTINCT ON (fuente_id) fuente_id, nivel, detalle, origen, fecha, demo
         FROM indicadores_ambientales WHERE fuente_id = ANY($1) ORDER BY fuente_id, fecha DESC`,
        [ids],
      ),
      this.db.filas<MedicionValidada & { fuente_id: string }>(
        `SELECT s.fuente_id, m.id, s.fecha_muestreo AS fecha, m.calificador, m.valor, m.unidad, m.metodo, m.demo,
                m.valor_normalizado AS "valorNgL",
                CASE m.unidad WHEN 'ng/L' THEN m.limite_deteccion WHEN 'µg/L' THEN m.limite_deteccion * 1000
                              WHEN 'mg/L' THEN m.limite_deteccion * 1000000 END AS "limiteDeteccionNgL"
         FROM mediciones m JOIN muestras s ON s.id = m.muestra_id
         WHERE s.fuente_id = ANY($1) AND s.matriz = 'agua' AND m.analito = 'hg_total' AND m.revision = 'validada'`,
        [ids],
      ),
      this.db.filas<{ fuente_id: string; estado: EstadoSolicitud }>(
        `SELECT DISTINCT ON (fuente_id) fuente_id, estado FROM solicitudes
         WHERE fuente_id = ANY($1) AND estado NOT IN ('cerrada', 'rechazada', 'resultados_publicados')
         ORDER BY fuente_id, creado_en DESC`,
        [ids],
      ),
      this.criterio(),
    ]);

    return fuentes.map((f) => {
      const comunidad = senalComunidad(pubs.filter((p) => p.fuente_id === f.id));
      const ind = indicadores.find((i) => i.fuente_id === f.id);
      const virtual = ind
        ? { nivel: ind.nivel, detalle: ind.detalle, origen: ind.origen, fecha: ind.fecha, demo: ind.demo }
        : { nivel: 'sin_analisis', detalle: 'El laboratorio virtual todavía no analizó este lugar.' };
      const t = tramites.find((x) => x.fuente_id === f.id);
      const oficial = senalOficial(
        mediciones.filter((m) => m.fuente_id === f.id),
        criterio,
        t ? nivelTramite(t.estado) : null,
      );
      // Estado de evidencia química: «indicios» solo si hay señales pero ninguna medición.
      const estadoEvidencia =
        oficial.estado === 'sin_informacion' && (virtual.nivel === 'posible_riesgo' || comunidad.nivel === 'riesgoso') ? 'indicios_riesgo' : oficial.estado;
      return {
        ...f,
        senales: {
          comunidad: { ...comunidad, aclaracion: 'Sirve para priorizar. No confirma mercurio.' },
          virtual: { ...virtual, aclaracion: 'Orienta dónde tomar muestras. No mide mercurio.' },
          oficial: { ...oficial, aclaracion: 'Resultado de una muestra concreta. No certifica que el agua sea potable.' },
        },
        estadoEvidencia,
      };
    });
  }

  async criterio(): Promise<Criterio> {
    const c = await this.db.fila<{ norma: string; valor_ng_l: number; verificado: boolean }>(
      `SELECT norma, valor_ng_l, verificado FROM criterios WHERE id = 'nb512-hg-agua-consumo'`,
    );
    if (!c) throw new Error('Falta el criterio nb512-hg-agua-consumo (ejecuta npm run db:semillas).');
    return { norma: c.norma, valorNgL: c.valor_ng_l, verificado: c.verificado };
  }

  // ── Comunidades (localidades) ──
  comunidades(q?: string) {
    return this.db.filas(
      `SELECT id, nombre, departamento, ficticia, fuente, ST_Y(ubicacion::geometry) AS lat, ST_X(ubicacion::geometry) AS lon
       FROM comunidades ${q ? 'WHERE nombre ILIKE $1' : ''} ORDER BY nombre`,
      q ? [`%${q}%`] : [],
    );
  }

  async comunidad(id: string) {
    const c = await this.db.fila<{ id: string }>(
      `SELECT id, nombre, departamento, ficticia, fuente, ST_Y(ubicacion::geometry) AS lat, ST_X(ubicacion::geometry) AS lon
       FROM comunidades WHERE id = $1`,
      [id],
    );
    if (!c) throw new NotFoundException('No existe esa comunidad.');
    // Fuentes vinculadas a la comunidad o a menos de 15 km.
    const fuentes = await this.db.filas<FilaFuente>(
      `SELECT DISTINCT ${COLUMNAS} FROM fuentes_agua f, comunidades c
       WHERE c.id = $1 AND (EXISTS (SELECT 1 FROM fuente_comunidad fc WHERE fc.fuente_id = f.id AND fc.comunidad_id = c.id)
                            OR ST_DWithin(f.ubicacion, c.ubicacion, 15000))`,
      [id],
    );
    return { ...c, fuentes: await this.conSenales(fuentes) };
  }
}
