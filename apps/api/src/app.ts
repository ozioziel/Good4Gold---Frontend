import type { INestApplication } from '@nestjs/common';
import { leerConfig } from './config';

/** Ajustes comunes a main.ts y a las pruebas. */
export function configurar(app: INestApplication) {
  const config = leerConfig();
  app.enableCors({ origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()) });
  app.enableShutdownHooks();
  return config;
}
