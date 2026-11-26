// Aplica las migraciones de db/migraciones en orden (una sola vez cada una) y, con --semillas,
// carga db/semillas (idempotentes). Uso: npm run db:migrar · npm run db:semillas
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL (copia .env.example como .env).');
  process.exit(1);
}

const raiz = join(import.meta.dirname, '..', 'db');
const sql = (carpeta: string) =>
  readdirSync(join(raiz, carpeta))
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ nombre: f, texto: readFileSync(join(raiz, carpeta, f), 'utf8') }));

const cliente = new pg.Client({ connectionString: url });
await cliente.connect();
try {
  await cliente.query('CREATE TABLE IF NOT EXISTS migraciones (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())');
  const hechas = new Set((await cliente.query<{ nombre: string }>('SELECT nombre FROM migraciones')).rows.map((r) => r.nombre));
  for (const m of sql('migraciones')) {
    if (hechas.has(m.nombre)) continue;
    await cliente.query('BEGIN');
    try {
      await cliente.query(m.texto);
      await cliente.query('INSERT INTO migraciones (nombre) VALUES ($1)', [m.nombre]);
      await cliente.query('COMMIT');
      console.log(`migración aplicada: ${m.nombre}`);
    } catch (e) {
      await cliente.query('ROLLBACK');
      throw e;
    }
  }
  if (process.argv.includes('--semillas')) {
    for (const s of sql('semillas')) {
      await cliente.query(s.texto);
      console.log(`semillas cargadas: ${s.nombre}`);
    }
  }
} finally {
  await cliente.end();
}
