import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Plugin } from 'vite';

// Solo en desarrollo: guarda los pósteres de la versión ligera del Inicio capturados desde la escena real
// (POST /__poster?n=1 con un dataURL WebP). No existe en el build de producción.
function guardarPosteres(): Plugin {
  return {
    name: 'gold2-posteres',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__poster', (req, res) => {
        const n = new URL(req.url ?? '', 'http://x').searchParams.get('n');
        const ancho = new URL(req.url ?? '', 'http://x').searchParams.get('w');
        if (req.method !== 'POST' || !n || !/^[1-6]$/.test(n)) {
          res.statusCode = 400;
          res.end('n inválido');
          return;
        }
        let cuerpo = '';
        req.on('data', (c) => (cuerpo += c));
        req.on('end', () => {
          const m = /^data:image\/webp;base64,(.+)$/.exec(cuerpo);
          if (!m) {
            res.statusCode = 400;
            res.end('se esperaba image/webp');
            return;
          }
          const dir = fileURLToPath(new URL('./public/inicio/posters/', import.meta.url));
          mkdirSync(dir, { recursive: true });
          const sufijo = ancho === 'm' ? '-m' : '';
          writeFileSync(`${dir}c${n}${sufijo}.webp`, Buffer.from(m[1], 'base64'));
          res.end('ok');
        });
      });
    },
  };
}

// En el build: lista de archivos para que el service worker guarde la app al instalarse (Gold2 Offline).
// Se excluye la escena 3D del Inicio (three, gsap): sin conexión se usa la versión ligera.
function listaPrecache(): Plugin {
  return {
    name: 'gold2-precache',
    apply: 'build',
    generateBundle(_opciones, bundle) {
      const archivos = Object.keys(bundle)
        .filter((f) => !/(^|\/)(three|motion|Recorrido|EscenaInicio)[-.]/.test(f) && !f.endsWith('.map'))
        .map((f) => `/${f}`);
      const posteres = [1, 2, 3, 4, 5, 6].flatMap((n) => [`/inicio/posters/c${n}.webp`, `/inicio/posters/c${n}-m.webp`]);
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify([...archivos, ...posteres, '/icons/icon-192.png']) });
    },
  };
}

export default defineConfig({
  plugins: [react(), guardarPosteres(), listaPrecache()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // MapLibre usa un worker ES: se empaqueta aparte (src/pages/mapa/maplibre-worker.ts) con formato ES.
  worker: { format: 'es' },
  server: { port: 5180, host: true },
  preview: { port: 5180 },
  build: {
    target: 'es2022',
    // three (~150 kB gzip) solo se descarga en el Inicio animado; su tamaño es esperado.
    chunkSizeWarningLimit: 700,
    // three y gsap viven en chunks propios: solo se descargan en las rutas con escena.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
});
