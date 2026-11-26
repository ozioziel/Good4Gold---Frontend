import { z } from 'zod';

// Configuración leída del entorno (ver .env.example). Falla al arrancar si falta algo.
const esquema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default('http://localhost:5180,http://127.0.0.1:5180'),
  AUTH_MODE: z.enum(['demo']).default('demo'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  MARCA: z.string().default('Gold2Life'),
});

export type Config = z.infer<typeof esquema>;

export function leerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = esquema.safeParse(env);
  if (!r.success) {
    const detalle = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detalle}`);
  }
  return r.data;
}

export const CONFIG = Symbol('CONFIG');
