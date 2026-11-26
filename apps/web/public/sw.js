/* Service worker de Gold2Life (Gold2 Offline).
 * - Al instalarse guarda la app (lista generada en el build: /precache.json), las cartas y los pósteres.
 * - Navegación: red primero; sin conexión, la app guardada.
 * - Recursos con hash (/assets): caché primero (no cambian nunca).
 * - Teselas de mapa e imágenes satelitales ya vistas: caché con límite, para consultar la zona sin internet.
 * Los datos creados sin conexión viven en localStorage y se envían al recuperar internet (ver Mapa). */
const VERSION = 'g2-v1';
const APP = `${VERSION}-app`;
const TESELAS = `${VERSION}-teselas`;
const MAX_TESELAS = 1500;

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(APP);
      const base = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/inicio/tierra.bin'];
      let lista = [];
      try {
        lista = await (await fetch('/precache.json', { cache: 'no-store' })).json();
      } catch (_) {
        /* sin lista: se guarda lo que se visite */
      }
      await cache.addAll(base);
      // De a poco: un fallo puntual no impide instalar.
      await Promise.all(lista.map((u) => cache.add(u).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

async function limitar(nombre, max) {
  const cache = await caches.open(nombre);
  const claves = await cache.keys();
  for (let i = 0; i < claves.length - max; i++) await cache.delete(claves[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(APP).then((c) => c.put('/index.html', res.clone()));
          return res;
        })
        .catch(async () => (await caches.match('/index.html')) || Response.error()),
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/inicio/') || url.pathname.startsWith('/icons/'))) {
              const copia = res.clone();
              caches.open(APP).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Mapa base, estilo y teselas satelitales: red primero, caché como respaldo sin conexión.
  if (/tiles\.openfreemap\.org|tiles\.maps\.eox\.at|gibs\.earthdata\.nasa\.gov/.test(url.hostname)) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(TESELAS).then((c) => c.put(req, copia).then(() => limitar(TESELAS, MAX_TESELAS)));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || Response.error()),
    );
  }
});
