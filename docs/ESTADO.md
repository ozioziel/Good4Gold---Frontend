# Estado de la implementación

Decisión del 2026-11-25/26: primero todo el frontend, con datos simulados marcados DEMO. Inicio y Mapa fueron aprobados por el usuario; el resto se construyó con el mismo sistema. El backend real, la sincronización con servidor, Stellar/Trustless Work y el modelo de IA se conectan después.

## Por pestaña

| Pieza | Estado | Real | Simulado (DEMO, marcado en pantalla) |
|---|---|---|---|
| Base: Vite + React 19 + TS, tokens, tipografía, navegación de 5 pestañas, hilo de río | Hecho | — | — |
| **Inicio** (6 escenas 3D + versión ligera) | Hecho · aprobado | Cifras con fuente (PNUMA, OMS, Valdivieso 2025), contornos Natural Earth, 10 localidades OSM | Escenas ilustrativas |
| **Mapa comunitario** | Hecho · aprobado | Mapa base y ríos de OpenStreetMap (OpenFreeMap), ríos cercanos, tu ubicación | Lugares ficticios, publicaciones, respaldos, señales de laboratorio virtual/oficial |
| Publicar en el mapa (ubicar → escribir → enviar), respaldar, responder | Hecho | Funciona de punta a punta en el navegador (localStorage) | Sin servidor |
| Sin conexión simulado + cola de pendientes + QR (generar, escanear/pegar, importar sin duplicar) | Hecho | QR real (formato v1), escaneo con cámara donde hay BarcodeDetector | Sincronización simulada |
| **Laboratorio** | Hecho | Globo MapLibre con Sentinel-2 sin nubes por año (EOX 2016, 2018–2025), MODIS diario y NDVI (NASA GIBS), ríos OSM, biblioteca de 7 estudios reales, comparador de años, área y ríos de la zona dibujada, informe descargable (.md) | Mediciones, prioridad del laboratorio virtual, indicadores del informe |
| **Infórmate** | Hecho | 33 cartas del plan con fuente enlazada (OPS, OMS, PNUMA, planetGOLD, Minamata, AAPS) | Textos marcados «En revisión» (borradores editoriales) |
| **Donaciones** | Hecho | — | Campañas, montos, hitos, transacciones y confirmación (simulación de testnet) |
| Ingresar / Perfil / Panel institucional | Hecho | Ciclo de estados con permisos por rol (tabla en `src/data/solicitudes.ts`) | Roles DEMO elegidos por el visitante; datos en localStorage |
| PWA (manifiesto, íconos, service worker, precarga) | Hecho | Funciona en el build de producción (`npm run build` + servir `dist/`) | — |

## Probado

- Typecheck y build de producción (`npm run typecheck`, `npm run build`).
- Navegador integrado, escritorio (≈1024 px) y móvil (375 × 812): las 5 pestañas, ingreso, panel.
- Mapa: tocar un río (se ilumina en oro), tocar un lugar, tarjeta de tres señales, publicar de punta a punta, hoja de publicaciones.
- Laboratorio: globo con imagen Sentinel-2 real, enlace desde el mapa (`?lat=&lon=`), comparador 2016 ↔ 2025.
- Donaciones: transformación oro → agua → brote por scroll, flujo de aporte simulado completo.
- Panel: acciones según el rol (laboratorio) y estado de cada caso.

## No probado todavía

- Celular real de gama media (fps de escenas, cámara para QR, modo avión con la PWA instalada).
- Service worker en un servidor de producción (en desarrollo no se registra a propósito).
- Anchos 1440, 768 y 320; recorrido completo solo con teclado; lector de pantalla.
- Playwright (no instalado).

## Backend (`apps/api`, iniciado 2026-11-26)

NestJS 12 + PostgreSQL 17/PostGIS 3.5 en Docker. Detalle, rutas y reglas en `apps/api/README.md`.

| Pieza | Estado |
|---|---|
| Esquema y semillas (reales OSM sin resultados + DEMO del frontend) | Hecho |
| Ingreso DEMO con token firmado, guardia de roles leída de la base | Hecho (auth real pendiente) |
| Lugares y comunidades con las tres señales separadas y estado de evidencia | Hecho |
| Publicaciones, respaldos/cuestionamientos, respuestas | Hecho |
| Solicitudes: ciclo completo con transiciones validadas en servidor e historial | Hecho |
| Muestras, mediciones, revisión técnica por otra persona | Hecho |
| `POST /sync/operations` idempotente (propias y QR v1) y paquete por comunidad | Hecho |
| Conexión del frontend a la API | Pendiente |
| Campañas/donaciones, Laboratorio (`/laboratory/*`), alertas por API, moderación, adjuntos | Pendiente |

Probado: `npm run api:typecheck`, `npm run api:build`, `npm run api:test` (32 pruebas: dominio e integración contra PostGIS real, incluido el ciclo completo de una solicitud y la deduplicación de QR entre dos transportistas).

Diferencia con el frontend: en la API el rol laboratorio **no** publica recomendaciones oficiales (PROYECTO.md §6); `tiposPermitidos` del Mapa todavía lo permite.

## Pendiente (fuera del frontend)

- Autenticación real (Supabase Auth u otra) en la API.
- Mapas descargables por región (PMTiles).
- Stellar testnet + Trustless Work (escrow por hitos). Hoy el flujo es una simulación marcada.
- Pipeline científico (Dryad Gerson 2022 + Sentinel-2 L2A) y ficha del modelo con métricas reales.
- Huella minera de Amazon Mining Watch como capa del Laboratorio.

## Herramientas de desarrollo

- `window.__g2` (solo desarrollo, Inicio): `irA(t)`, `capturar(t)`, `medir(t)`.
- `POST /__poster?n=1..6[&w=m]` (solo desarrollo): guarda pósteres de la versión ligera.
- `python -I apps/web/scripts/iconos.py`: regenera los íconos de la PWA.
- `npm run globo:puntos -w apps/web`: regenera las máscaras del globo del Inicio.
