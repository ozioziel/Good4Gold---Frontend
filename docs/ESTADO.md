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

## Modo claro / oscuro (2026-11-26)

- Botón en la cabecera (Sol/Luna, `aria-pressed`). Preferencia en `localStorage` (`gold2-modo`) o, si no hay, la del sistema; se aplica antes del primer pintado (`index.html`) y con fundido que respeta `prefers-reduced-motion`. Estado en `src/app/tema.ts`, atributo `<html data-modo>`.
- Siempre oscuros por narrativa: Inicio (escena y versión ligera), héroe de Donaciones y globo del Laboratorio (sus paneles sí siguen el tema). Infórmate siempre crema. El QR siempre oscuro sobre claro.
- Mapa comunitario: base «alba» en claro, repintada sin recargar teselas. Las señales siguen con texto, icono y anillo, no solo color.
- Contraste AA verificado por cálculo en ambos temas (tokens, señales, mapa, Donaciones). **Revisión visual en navegador pendiente** (pestañas, hojas, QR, cabecera a 375 px).
- Pendientes conocidos: en oscuro `#ea6f5f` sobre superficie-2 da 4,38:1 (previo); etapas inactivas del héroe de Donaciones al 35 % de opacidad, bajo AA (diseño previo).

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
| Conexión del frontend a la API (sesión, mapa, publicar/respaldar/responder, cola y QR por `/sync/operations`, panel y Laboratorio) | Hecho · con `VITE_API_URL`; sin ella, demostración local |
| Campañas y donaciones con escrow por hitos en **Stellar testnet** (contrato Soroban propio en `contracts/escrow`, USDC de prueba de Circle) | Hecho en API y en la pestaña Donaciones |
| Laboratorio (`/laboratory/*`), alertas por API, moderación, adjuntos | Pendiente |

Escrow: contrato desplegado en testnet (`CBJEQGCIA24NJXIOIQPKIDUR4D3O5OPJGJMSNZJH3C3HP4FMQUZBGJCI`), 6 pruebas en Rust. Probado en vivo por la API en testnet (2026-11-26, con 20 USDC de prueba del faucet de Circle en el donante DEMO):
- Campaña A (meta 3): aporte DEMO de 1 → hito 1 liberado → hito 2 bloqueado por falta de fondos → aporte con billetera de 2 (preparado por la API, firmado fuera con `stellar tx sign`, enviado; el reenvío da 409) → hito 2 liberado → campaña completada.
- Campaña B (meta 4): aporte de 2 → hito 1 liberado (1) → cancelada por moderación → reembolso de 1 al donante.
- Saldos finales en la red: organización DEMO 4 USDC, donante DEMO 16 USDC. Las dos campañas quedaron conciliadas con el contrato.
- Las mismas reglas también están cubiertas en las pruebas de la API con un escrow en memoria.

**Pestaña Donaciones conectada** (con `VITE_API_URL`):
- Lista las campañas del servidor con la etiqueta TESTNET y su estado.
- Dos formas de aportar: con **Freighter** (firma la billetera del donante, red Testnet) o con el aporte de prueba que firma la cuenta DEMO del servidor (requiere haber ingresado con un rol).
- El río de transparencia muestra las transacciones confirmadas y las de liberación de hitos, con enlace a stellar.expert, e indica si todo coincide con el contrato.
- Sin API, o si el servidor no tiene campañas, la pestaña sigue con las campañas DEMO locales y el aporte simulado.
- Probado con Chrome headless: un aporte de prueba de 1 USDC confirmado en testnet; el contrato coincide con lo registrado; el río muestra la transacción; sin Freighter aparece un mensaje claro; sin errores de consola.
- Freighter no se pudo probar en el navegador automatizado porque no tiene la extensión. El camino firmar → enviar del API sí está probado en vivo, firmando con `stellar tx sign`.

Probado: `npm run api:typecheck`, `npm run api:build`, `npm run api:test` (38 pruebas: dominio e integración contra PostGIS real, incluido el ciclo completo de una solicitud y la deduplicación de QR entre dos transportistas).

El frontend ya aplica la misma regla: el laboratorio **no** publica recomendaciones oficiales (PROYECTO.md §6).

**Cómo correr todo junto:** `npm run api:db`, `npm run api:dev` y, en otra terminal, `VITE_API_URL=http://localhost:3000 npm run dev` (o copiar `apps/web/.env.example` como `apps/web/.env.local`).

Probado de punta a punta con Chrome headless (2026-11-26): el rol obtiene un token DEMO; el panel lista las solicitudes del servidor y una acción cambia el estado allí; un reporte recibido por QR en la cola local se envía, queda con autoría declarada y la cola se vacía; sin errores de consola. Capturas del mapa (escritorio y 375 px), panel, Laboratorio, Donaciones e Infórmate en ambos temas.

Corregido en la integración: el despachador del mapa cambiaba en cada render y el mapa se volvía a crear, perdiendo los puntos de lugares; ahora es estable.

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
