// Prepara una base aparte (gold2_test) desde cero antes de las pruebas de integración.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import pg from 'pg';

export const URL_PRUEBAS = process.env.DATABASE_URL_TEST ?? 'postgres://gold2:gold2_local@127.0.0.1:5433/gold2_test';

export default async function preparar() {
  const admin = new URL(URL_PRUEBAS);
  const nombre = admin.pathname.slice(1);
  admin.pathname = '/gold2';
  const c = new pg.Client({ connectionString: admin.toString() });
  try {
    await c.connect();
  } catch {
    throw new Error('No hay base de datos para las pruebas. Levántala con: npm run db:up');
  }
  await c.query(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
  await c.query(`CREATE DATABASE ${nombre}`);
  await c.end();
  execFileSync(process.execPath, [join(__dirname, '..', 'scripts', 'migrar.mts'), '--semillas'], {
    env: { ...process.env, DATABASE_URL: URL_PRUEBAS },
    stdio: 'ignore',
  });
}
