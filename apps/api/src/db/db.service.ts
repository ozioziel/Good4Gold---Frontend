import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { CONFIG, type Config } from '../config';

// Los numeric de PostgreSQL llegan como texto; aquí se convierten a número (valores pequeños).
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
// Las fechas sin hora se devuelven tal cual (AAAA-MM-DD), sin pasar por zonas horarias.
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
// Lo mismo para listas de fechas (date[]): se leen como lista de texto.
const listaTexto = pg.types.getTypeParser(1009 as never);
pg.types.setTypeParser(1182 as never, (v: string) => listaTexto(v));

export type Consulta = Pick<pg.PoolClient, 'query'>;

@Injectable()
export class Db implements OnModuleDestroy {
  readonly pool: pg.Pool;

  constructor(@Inject(CONFIG) config: Config) {
    this.pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10 });
  }

  async filas<T extends pg.QueryResultRow>(sql: string, params: unknown[] = [], c: Consulta = this.pool): Promise<T[]> {
    return (await c.query<T>(sql, params)).rows;
  }

  async fila<T extends pg.QueryResultRow>(sql: string, params: unknown[] = [], c: Consulta = this.pool): Promise<T | null> {
    return (await c.query<T>(sql, params)).rows[0] ?? null;
  }

  /** Ejecuta fn dentro de una transacción; ante cualquier error, deshace todo. */
  async transaccion<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }

  /** Registro de auditoría de cada mutación. */
  async auditar(c: Consulta, usuarioId: string | null, accion: string, recurso: string, detalle?: unknown) {
    await c.query('INSERT INTO auditoria (usuario_id, accion, recurso, detalle) VALUES ($1, $2, $3, $4)', [
      usuarioId,
      accion,
      recurso,
      detalle === undefined ? null : JSON.stringify(detalle),
    ]);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
