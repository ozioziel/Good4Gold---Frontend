# API de Gold2Life (`apps/api`)

NestJS 12 + PostgreSQL 17 / PostGIS 3.5. Aplica en el servidor las reglas de evidencia, los permisos por rol y la sincronización idempotente que el frontend hoy simula en `localStorage`.

## Arranque

```bash
cp apps/api/.env.example apps/api/.env   # una vez; cambia JWT_SECRET
npm run api:db       # levanta PostGIS en Docker (puerto 5433), migra y carga semillas
npm run api:dev      # http://localhost:3000
npm run api:test     # dominio + integración contra una base aparte (gold2_test)
npm run api:typecheck && npm run api:build
```

Desde `apps/api`: `npm run db:up`, `db:migrar`, `db:semillas`, `db:down`.

- La imagen `postgis/postgis` solo existe para amd64: en Mac con Apple Silicon corre emulada.
- La compilación usa SWC y no el CLI de Nest, porque TypeScript 7 aún no expone el API de compilador que necesita ese CLI (volverá en la 7.1). El typecheck lo hace `tsc` 7.

## Rutas

| Método y ruta | Quién | Qué hace |
|---|---|---|
| `GET /health` | público | Estado, marca y versión de PostGIS |
| `POST /auth/demo` | público (solo `AUTH_MODE=demo`) | `{rol, nombre?}` crea una persona DEMO; `{usuarioId}` entra como una de las semillas. Devuelve un token |
| `GET /auth/demo/personas` · `GET /auth/yo` | público · con sesión | Personas DEMO · persona de la sesión |
| `GET /water-sources?q=&bbox=O,S,E,N` · `GET /water-sources/:id` | público | Lugares con las **tres señales separadas** y el estado de evidencia |
| `GET /communities?q=` · `GET /communities/:id` | público | Localidades OSM y sus fuentes (vinculadas o a menos de 15 km) |
| `GET /water-sources/:id/posts` · `POST /posts` | público · con sesión | Publicaciones. El id es el UUID del teléfono; si se reenvía, no se duplica |
| `POST /posts/:id/corroborations` · `POST /posts/:id/comments` | con sesión | Respaldar o cuestionar (con motivo) · responder |
| `GET /research-requests` · `GET /research-requests/:id` | público | Solicitudes, historial y acciones posibles para quien consulta |
| `POST /research-requests` · `POST /:id/support` · `PATCH /:id/status` | con sesión | Pedir, apoyar y avanzar el trámite. El servidor valida cada transición |
| `POST /samples` · `POST /measurements` | laboratorio verificado | Muestra con cadena de custodia · resultado con método y límites |
| `POST /measurements/:id/reviews` | investigador o moderación | Revisión técnica, hecha por otra persona que quien cargó el resultado |
| `GET /water-sources/:id/measurements` | público | Solo mediciones validadas, con su alcance y el criterio de su matriz |
| `POST /sync/operations` · `GET /sync/communities/:id` | con sesión · público | Lote idempotente (propias o QR v1) · paquete para guardar sin conexión |

## Reglas que hace cumplir

- **Señales separadas**:
  - Comunidad: basta con 3 personas distintas para «riesgoso», y nunca confirma mercurio.
  - Laboratorio virtual: tabla `indicadores_ambientales`; las predicciones están en otra tabla y nunca se guardan como mediciones.
  - Laboratorio oficial: solo usa mediciones validadas.
- **Evidencia química** (`src/dominio/evidencia.ts`):
  - «No detectado» exige el límite de detección. Si ese límite es mayor que el criterio, el resultado es no concluyente.
  - Una medición dentro del criterio no borra una anterior sobre el criterio.
  - «Dentro del criterio» nunca se presenta como «potable».
  - El criterio del agua de consumo solo se aplica al agua.
- **NB 512**: el valor de 1 µg/L está guardado con `verificado = false`, y cada respuesta lo avisa.
- **Trámite** (`src/dominio/solicitudes.ts`):
  - Usa la misma tabla de transiciones que el frontend y además exige rol verificado.
  - Rechazar exige un motivo.
  - Solo la organización asignada avanza el caso.
  - No se pasa a revisión técnica sin un resultado cargado, ni se publica con resultados sin revisar.
- **Laboratorio**: carga resultados, pero no publica recomendaciones oficiales. Eso lo hace solo la autoridad; el frontend todavía lo permite.
- **Privacidad**: las coordenadas se redondean a unos 100 m. Las solicitudes públicas muestran solo el nombre visible y el rol.
- **QR** (`src/dominio/qr.ts`, la misma validación que `apps/web/src/lib/qrReporte.ts`):
  - Quien sincroniza un QR es transportista: la autoría queda «declarada» y la publicación, en moderación.
  - Un QR de tipo `sol` crea una solicitud con solicitante declarado.
  - Si el lugar no se reconoce, la publicación queda «por ubicar», sin perderse.
  - Cada operación se aplica en su propia transacción, con un candado por `opId`.
- **Auditoría**: toda mutación queda en la tabla `auditoria`.

## Datos

- `db/migraciones/001_esquema.sql`: el esquema, con las reglas que se pueden expresar como restricciones.
- `db/semillas/001_demo.sql`:
  - Reales, sin resultados: 10 localidades y 5 ríos de OSM.
  - DEMO: los lugares, las publicaciones, las solicitudes y las mediciones del frontend. Todo lo simulado lleva `demo = true`.

## Pendiente

- Conectar el frontend (hoy usa `localStorage`).
- Autenticación real (Supabase Auth u otra).
- Campañas y donaciones (Stellar testnet y Trustless Work).
- Tablas y rutas del Laboratorio (`/laboratory/*`), alertas oficiales por API, moderación, adjuntos y notificaciones.
