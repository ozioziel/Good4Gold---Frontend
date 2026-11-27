# Trabajo realizado — 26 de noviembre de 2026

Este resumen cubre una jornada de trabajo sobre Gold2Life (Gold4Good 2026): qué se construyó, cómo se probó y qué queda pendiente. El estado vivo del proyecto está en `docs/ESTADO.md`.

## 1. Backend (`apps/api`)

**NestJS 12 + PostgreSQL 17 / PostGIS 3.5** en Docker, en el puerto 5433.
- La imagen oficial de PostGIS solo existe para amd64: en Mac corre emulada.
- Compila con SWC porque el CLI de Nest no funciona con TypeScript 7. El typecheck lo hace `tsc` 7.

**Base de datos**
- `001_esquema.sql`: personas, organizaciones, comunidades, fuentes de agua, publicaciones, respaldos, solicitudes con historial, muestras, mediciones, criterios, alertas, sincronización y auditoría.
- `002_campanas.sql`: campañas, hitos, donaciones y movimientos del escrow.
- `003_laboratorio.sql`: tramos, huella minera, indicadores por temporada, evaluaciones de riesgo y corridas del modelo.
- **Semillas:** 10 localidades y 5 ríos reales de OpenStreetMap, sin resultados. Todo lo demás es DEMO y coincide con el frontend.

**Reglas que aplica el servidor**
- Las tres señales de cada lugar se calculan siempre por separado:
  - **Comunidad:** prioriza; nunca confirma mercurio.
  - **Laboratorio virtual:** orienta dónde muestrear; no mide mercurio.
  - **Laboratorio oficial:** solo usa mediciones validadas.
- **Evidencia química:**
  - «No detectado» exige el límite de detección, y si ese límite es mayor que el criterio, el resultado es no concluyente.
  - Una medición negativa posterior no borra una positiva anterior.
  - «Dentro del criterio» nunca se presenta como «potable».
  - El criterio de agua no se aplica a peces, cabello ni sedimentos.
- **NB 512:** el valor de 1 µg/L está guardado como no verificado y la API lo avisa en cada respuesta.
- **Solicitudes:** el ciclo completo se valida en el servidor.
  - Las acciones institucionales exigen rol verificado, y rechazar exige un motivo.
  - Solo la organización asignada avanza el caso.
  - No se publica un resultado sin revisión técnica hecha por otra persona.
- **Sincronización** (`POST /sync/operations`): idempotente para las publicaciones propias y para los QR v1. Quien sube un QR es transportista, no autor.
- **Auditoría** de todas las mutaciones; ubicaciones redondeadas a unos 100 m.
- **Roles:** el laboratorio carga resultados pero no publica recomendaciones oficiales (PROYECTO §6). El frontend aplica la misma regla.

**Rutas:** salud, ingreso DEMO, lugares, comunidades, publicaciones, solicitudes, muestras y mediciones, sincronización, campañas y donaciones, y laboratorio. Detalle en `apps/api/README.md`.

**Pruebas:** 41 pruebas de dominio e integración contra PostGIS real (base aparte `gold2_test`).

## 2. Escrow por hitos en Stellar testnet (`contracts/escrow`)

**Contrato Soroban propio** (Rust, soroban-sdk 28), desplegado en testnet en `CBJEQGCIA24NJXIOIQPKIDUR4D3O5OPJGJMSNZJH3C3HP4FMQUZBGJCI`. Usa el USDC de prueba de Circle.
- Cada campaña acepta aportes hasta la meta, nunca más.
- El verificador independiente libera los hitos en orden, con el hash de la evidencia.
- La organización no puede ser su propia verificadora.
- Si se cancela, cada donante recupera su parte proporcional de lo no liberado.
- 6 pruebas en Rust.

**Cuentas de prueba:** cuatro, fondeadas con Friendbot. Sus claves están solo en `apps/api/.env`, que no se sube a git, y en `stellar keys`.

**API:**
- Una campaña nace de un caso aceptado y solo la propone la organización asignada.
- Dos formas de donar: DEMO, que firma el servidor, y con billetera (Freighter), donde el servidor prepara la transacción y solo envía la firmada si es exactamente ese aporte.
- La donación se confirma por la red, no por la interfaz.
- La aprobación de hitos guarda el hash de la evidencia; también hay cancelación, reembolsos y conciliación con el estado del contrato.

**Probado en vivo** con 20 USDC de prueba:
- Campaña A: aporte DEMO → hito → hito bloqueado por falta de fondos → aporte con billetera firmado con el CLI → hito → campaña completada.
- Campaña B: aporte → hito → cancelación → reembolso.
- Saldos finales en la red: organización 4 USDC, donante 16 USDC. Todo quedó conciliado.

## 3. Frontend (`apps/web`)

**Modo claro y oscuro**
- Botón en la cabecera; usa la preferencia guardada o la del sistema, sin parpadeo al cargar.
- Contraste AA verificado por cálculo.
- Inicio, el héroe de Donaciones y el globo del Laboratorio se quedan siempre oscuros. El QR siempre es oscuro sobre claro.

**Conexión al API** (`VITE_API_URL`). Si no hay API o no responde, todo sigue funcionando como demostración local.
- **Sesión:** el rol obtiene un token DEMO.
- **Mapa:** lee lugares, señales y publicaciones del servidor. Publicar, respaldar y responder van al API. La cola sin conexión y los QR se envían sin duplicarse.
- **Panel institucional y Laboratorio:** usan las solicitudes y las acciones que permite el servidor.
- **Donaciones:** campañas reales de testnet. Se puede aportar con Freighter o con la cuenta DEMO, y el río de transparencia muestra las transacciones con enlace a stellar.expert.
- **Laboratorio:** capa de tramos coloreados por prioridad en el globo, lista de prioridades con sus reglas y Gold2Mercury marcado «en pausa».

**Error corregido:** el despachador del mapa recreaba el mapa en cada render y se perdían los puntos.

**Probado** con Chrome headless: flujos de punta a punta, capturas en ambos temas y anchos, y sin errores de consola. Freighter no se pudo probar en el navegador automatizado.

## 4. Laboratorio virtual (`science/`)

**Zona y periodo:** piedemonte Guanay–Teoponte–Mapiri y el río Beni hasta Rurrenabaque, en la época seca (junio a septiembre) de 2019 a 2025.

**Componentes:**
- **Tramos:** 48 tramos de unos 15 km, obtenidos de OpenStreetMap en el sentido del flujo, con el grafo de qué queda aguas arriba.
- **Gold2Mining:** huella minera por tramo y año con el ráster de cicatrices de Amazon Mining Watch (CC BY 4.0). Las franjas de 3 km de cada tramo no se solapan.
- **Lluvia:** 189 pentadas de CHIRPS v3.
- **Gold2Spectral:** índices NDTI (agua), NDVI y BSI (orilla) con Sentinel-2 L2A, 2719 lecturas sin errores.
  - Se usa la Collection 1, que tiene la escala homogénea y evita el salto de 2022.
  - Esa colección tiene un hueco en la zona entre abril y noviembre de 2022, así que ese año usa la colección original, que declara la misma escala y offset. Queda registrado en el manifiesto.
- **Gold2Risk v0:** reglas explicables, sin revisión de especialista. Ver `science/README.md`.
- **Gold2Mercury:** en pausa. No hay muestras de Bolivia con coordenadas para validarlo.

**Resultado de la temporada 2025:**
- 2 tramos de prioridad alta: **Kaka-02** (495 ha de minería nueva aguas arriba en 2 años y turbidez anómala persistente) y **Mapiri-04** (179 ha nuevas; z de turbidez 5,0).
- 31 de prioridad media, 14 baja y 1 sin datos suficientes (Tipuani-01).
- Es prioridad de muestreo, no confirmación de mercurio.

**Cargado en PostGIS:** con eso, el mapa muestra la señal real del laboratorio virtual en los ríos de la zona, junto a los lugares DEMO.

## 5. Decisiones y límites a tener en cuenta
- El verificador del escrow firma con una clave que guarda el servidor (DEMO). En producción firmaría con su propia billetera.
- Amazon Mining Watch puede no cubrir las cabeceras andinas: allí un cero puede significar «fuera de cobertura».
- NDTI es turbidez relativa, no NTU, y los ríos estrechos tienen pocos píxeles de agua.
- Los umbrales de Gold2Risk son ilustrativos y necesitan revisión de un especialista.
- Pendiente: autenticación real, alertas oficiales y moderación por API, revisión de Freighter en un navegador con la extensión y prueba en celulares reales.

## 6. Despliegue con Docker
`docker-compose.yml` en la raíz levanta tres servicios:
- **db:** PostGIS.
- **api:** al arrancar aplica las migraciones y las semillas, reintentando la conexión mientras la base termina de iniciar.
- **web:** nginx sirve la PWA y hace de proxy a `/api`.

Opcionales: el perfil `https` agrega Caddy con certificados automáticos, y el perfil `laboratorio` agrega el servicio que carga los resultados de `science/`.

Probado localmente en el puerto 8088: build, servicios en estado *healthy*, rutas de la SPA, API por `/api`, carga del laboratorio, escrow de testnet configurado y el panel en el navegador sin errores. Guía completa en `docs/DESPLIEGUE.md`.

## 7. Cómo correr todo
```bash
npm run api:db && npm run api:dev                           # API en :3000
VITE_API_URL=http://localhost:3000 npm run dev              # web en :5180
npm run api:test                                            # 41 pruebas
(cd contracts/escrow && cargo test)                         # 6 pruebas del contrato
(cd science && uv sync && uv run pytest && uv run python -m g2 todo)   # laboratorio (≈1,5 h)
```
