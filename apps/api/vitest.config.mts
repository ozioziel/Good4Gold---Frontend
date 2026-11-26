import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC compila los decoradores de NestJS con sus metadatos (esbuild no los emite).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.test.ts'],
    // Las pruebas de integración comparten una base de datos: una a la vez.
    fileParallelism: false,
    testTimeout: 20_000,
    globalSetup: ['test/preparar.ts'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? 'postgres://gold2:gold2_local@127.0.0.1:5433/gold2_test',
      JWT_SECRET: 'secreto-solo-para-pruebas-con-32-caracteres-o-mas',
      AUTH_MODE: 'demo',
    },
  },
});
