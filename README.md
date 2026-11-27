# Gold2Life

> **El satélite nos dice dónde buscar; la ciencia nos dice qué encontramos; la comunidad nos dice dónde hace falta actuar.**

Plataforma comunitaria, científica y de financiamiento frente al **mercurio de la minería aurífera** en la cuenca del río Beni (Bolivia). Proyecto para la hackathon **Gold4Good 2026**. «Gold2Life» es una marca provisional y configurable.

**Prototipo en línea:** https://gold2life.bell7738.com (datos DEMO y red de prueba de Stellar; sin dinero real).

## Reto

| Desafío | Cómo responde Gold2Life |
|---|---|
| **ORO-3.1 · Información verificada, riesgos y prevención** (foco principal) | Infórmate: 33 cartas ilustradas con fuente, legibles sin conexión. Mapa comunitario con tres señales separadas: un reporte o un voto nunca confirman mercurio. Reportes que viajan por QR donde no hay señal. |
| **ORO-3.3 · Mapa vivo de estudios y proyectos sobre mercurio** (complemento) | Laboratorio: biblioteca de estudios enlazada a sus fuentes, imágenes satelitales por año y prioridad de muestreo por tramo de río, para orientar dónde hace falta investigar. |

Ambos pertenecen al Gran Desafío 03, «Conocimiento y acción frente a la exposición del mercurio».

![Inicio: el lado invisible del oro](docs/capturas/inicio/01-oro.jpg)

## Qué resuelve

El mercurio no se ve. Las comunidades ribereñas no tienen información comprensible sobre el agua que usan, los estudios están dispersos en PDF y pedir un análisis depende de tener contactos. Gold2Life conecta cinco actores que hoy no se hablan: **comunidades, investigadores, laboratorios, autoridades sanitarias y donantes**. Con eso, una necesidad local se convierte en una investigación respaldada por evidencia y en acciones financiables y trazables.

## Los cinco espacios

| | |
|---|---|
| **Inicio** | Un recorrido narrativo en 3D: el oro, el mercurio que se libera, el río, la mirada desde el espacio. Tiene una versión ligera para celulares modestos. |
| **Mapa comunitario** | Cada lugar muestra **tres señales separadas**: lo que dice la comunidad, lo que orienta el laboratorio virtual y lo que midió un laboratorio oficial. Se publica, se respalda y se pide un análisis; funciona sin conexión y comparte por QR. |
| **Laboratorio** | Globo con imágenes Sentinel-2 y MODIS, biblioteca científica, comparador de años, informes por zona y **prioridad de muestreo por tramo de río**. |
| **Infórmate** | Cartas cortas e ilustradas, con fuentes (OPS/OMS, PNUMA, planetGOLD, Minamata) y legibles sin conexión. |
| **Donaciones** | Campañas nacidas de casos reales, con **escrow por hitos en Stellar testnet** y un río de transparencia con cada transacción. |

<p>
  <img src="docs/capturas/mapa/03-tres-senales.jpg" width="49%" alt="Mapa comunitario: las tres señales de un lugar">
  <img src="docs/capturas/laboratorio/01-prioridad-por-tramo.jpg" width="49%" alt="Laboratorio: prioridad de muestreo por tramo">
</p>
<p>
  <img src="docs/capturas/donaciones/02-aporte-confirmado.jpg" width="49%" alt="Donaciones: aporte confirmado en Stellar testnet">
  <img src="docs/capturas/donaciones/01-rio-transparencia.jpg" width="49%" alt="Donaciones: río de transparencia">
</p>

## Principios de evidencia (no negociables)

- Una foto, un voto o una estimación satelital **no confirman mercurio**: solo lo confirma un análisis químico.
- Un resultado dentro del límite **no certifica potabilidad**, y **«no detectado» no es «ausente»**.
- Un resultado vale para **una muestra**, no para toda una comunidad.
- Una predicción **nunca se guarda como medición**.
- **Hervir el agua no elimina el mercurio.**
- No se inventan cifras ni alianzas; todo lo simulado se marca **DEMO**.

El servidor aplica estas reglas; no dependen solo de la interfaz. El detalle está en [`PROYECTO.md`](docs/PROYECTO.md).

## Arquitectura

```
apps/web          React 19 + Vite + MapLibre + three.js · PWA sin conexión · modo claro/oscuro
apps/api          NestJS 12 + PostgreSQL/PostGIS · reglas de evidencia, roles, sincronización, campañas
contracts/escrow  Contrato Soroban (Rust) · escrow por hitos en Stellar testnet con USDC de prueba
science/          Python · laboratorio virtual: huella minera, índices espectrales y prioridad por tramo
```

- **Sin conexión:** la PWA guarda los reportes en el teléfono. Un QR transporta el reporte (no un enlace) y el servidor sincroniza sin duplicar.
- **Escrow:** los aportes llegan hasta la meta y nunca la superan. El verificador independiente libera cada hito en orden, con el hash de la evidencia, y si la campaña se cancela cada donante recupera su parte proporcional. Contrato: [`CBJEQ…GJCI`](https://stellar.expert/explorer/testnet/contract/CBJEQGCIA24NJXIOIQPKIDUR4D3O5OPJGJMSNZJH3C3HP4FMQUZBGJCI).
- **Laboratorio virtual:** trabaja en la zona Guanay–Mapiri–Kaka–Beni, en las épocas secas de 2019 a 2025. Usa Amazon Mining Watch, Sentinel-2 y CHIRPS, con reglas explicables. **Prioriza dónde muestrear; no mide mercurio.** Detalle en [`science/README.md`](science/README.md).

## Empezar

Requisitos: Node 22+, Docker, y para el laboratorio Python con [uv](https://docs.astral.sh/uv/).

```bash
npm install
npm run api:db                                     # PostGIS en Docker + migraciones + semillas
npm run api:dev                                    # API en http://localhost:3000
VITE_API_URL=http://localhost:3000 npm run dev     # web en http://localhost:5180
```

Sin `VITE_API_URL`, la web funciona sola con datos DEMO locales.

**Pruebas**

```bash
npm run typecheck && npm run api:typecheck
npm run api:test                       # dominio + integración contra PostGIS real
(cd contracts/escrow && cargo test)    # contrato de escrow
(cd science && uv run pytest)          # piezas del laboratorio virtual
```

## Desplegar

```bash
cp .env.example .env              # completa POSTGRES_PASSWORD y JWT_SECRET (y Stellar si usarás campañas)
docker compose up -d --build      # db + api + web (nginx con proxy a /api)
docker compose --profile laboratorio run --rm ciencia cargar
```

HTTPS automático con Caddy, actualización y respaldos en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Documentación

- [`docs/README.md`](docs/README.md): **índice de toda la documentación técnica** (arquitectura, módulos, API y datos, geoespacial, metodología, participación, seguridad, pruebas, limitaciones y hoja de ruta).
- [`docs/PROYECTO.md`](docs/PROYECTO.md): el proyecto, sus actores y su flujo central.
- [`docs/ESTADO.md`](docs/ESTADO.md): qué está hecho, qué es real y qué es DEMO, y qué se probó.
- [`docs/TRABAJO-REALIZADO.md`](docs/TRABAJO-REALIZADO.md): resumen del trabajo de backend, escrow, laboratorio y despliegue.
- [`docs/FUENTES.md`](docs/FUENTES.md): fuentes y licencias de los datos.
- [`apps/api/README.md`](apps/api/README.md), [`contracts/escrow/README.md`](contracts/escrow/README.md) y [`science/README.md`](science/README.md).

## Datos y licencias

OpenStreetMap (ODbL) · Copernicus Sentinel-2 L2A (Earth Search) · EOX Sentinel-2 cloudless · NASA GIBS (MODIS) · Amazon Mining Watch (CC BY 4.0) · CHIRPS v3 (UCSB) · Dethier et al. 2023 (Zenodo 7699122, CC BY 4.0). Las cifras de salud y mercurio citan su fuente; los lugares, personas y resultados de ejemplo son **ficticios y están marcados DEMO**.

## Estado

MVP funcional para la hackathon:
- **Real:** la base, los datos satelitales y de minería, el laboratorio virtual y el escrow en **testnet**.
- **DEMO:** las cuentas (ingreso por rol, sin autenticación real), los lugares y casos de ejemplo.
- **Sin confirmar:** las alianzas institucionales; ninguna está confirmada.

**Pendiente:** autenticación real, revisión de los umbrales por especialistas, validación con muestras de campo y pruebas en celulares de gama baja.

## Resumen del informe técnico

**Problema.** En la cuenca del río Beni, la minería aurífera usa mercurio. Las familias ribereñas e indígenas dependen del pescado, pero la información existente es técnica, está dispersa y casi nunca llega a ellas. Además:
- Pedir un análisis depende de tener contactos.
- Los estudios no se conectan con lo que la comunidad observa.
- Las alertas comunitarias, las estimaciones satelitales y los resultados de laboratorio suelen mezclarse, como si valieran lo mismo.

**Solución.** Una PWA ligera que conecta a comunidades, investigadores, laboratorios, autoridades sanitarias y donantes en cinco espacios: Inicio, Infórmate, Mapa comunitario, Laboratorio y Donaciones.
- **Flujo central:** una persona reporta o pide un análisis desde el mapa, incluso sin conexión y por QR. Una organización acepta el caso. Un laboratorio carga el resultado de una muestra y otra persona lo revisa. Si hace falta financiamiento, una campaña con escrow por hitos deja cada movimiento trazable.

**Tecnología.**
- **Web:** React 19, Vite, MapLibre y three.js.
- **API:** NestJS con PostgreSQL/PostGIS, que aplica las reglas de evidencia y los roles en el servidor.
- **Escrow:** contrato Soroban propio en Stellar **testnet**.
- **Laboratorio virtual:** pipeline en Python.
- **Despliegue:** Docker Compose en un VPS.

**Laboratorio virtual.** Prioriza dónde muestrear; **no mide mercurio**.
- **Gold2Mining:** hectáreas mineras por tramo, a partir de Amazon Mining Watch.
- **Gold2Spectral:** anomalías de turbidez (NDTI) con Sentinel-2, descontando la lluvia con CHIRPS.
- **Gold2Risk v0:** reglas explicables con umbrales sin revisión de especialista.
- **Resultado de la temporada seca 2025, en 48 tramos:** 2 de prioridad alta (Kaka-02 y Mapiri-04), 31 media, 14 baja y 1 con información insuficiente.
- **Gold2Mercury:** en pausa, porque no hay muestras de Bolivia para validarlo.

**Validación.**
- **NDTI frente a sedimentos de Dethier et al. (2023):** 75 pares, r = 0,49 (log), ρ = 0,25. Es una relación de débil a moderada, que respalda usar anomalías y no valores absolutos; **no es una validación con mediciones directas de campo**.
- **Pruebas automatizadas:** 41 del API, 6 del contrato y 6 del laboratorio.
- **Pruebas en vivo:** dos campañas completas en testnet.
- **Usuarios y especialistas:** la propuesta se contrastó con ellos durante la hackathon.

**Qué es real y qué no.**
- **Real:** el API y su base, los datos satelitales y de minería, el laboratorio virtual y el escrow en red de prueba.
- **DEMO:** las cuentas (ingreso por rol, sin autenticación real), y los lugares, publicaciones y algunos resultados de ejemplo.
- **Sin confirmar:** ninguna alianza institucional está confirmada.

**Limitaciones principales.**
- Los satélites ópticos no detectan mercurio disuelto.
- Solo se analiza la época seca, por las nubes.
- La prioridad «media» del Beni sale inflada porque la minería aguas arriba no se atenúa con la distancia.
- Las cartas de Infórmate están pendientes de revisión con especialistas y con la autoridad sanitaria.
- Detalle en [`docs/limitaciones.md`](docs/limitaciones.md).

**Próximos pasos.**
- Muestrear tramos de prioridad alta y baja con un laboratorio competente.
- Gold2Risk v1, con atenuación por distancia y revisión de especialistas.
- Autenticación real y pruebas en celulares de gama baja.
- Catálogo de estudios con metadatos estándar (ORO-3.3).
- Información por especie, río y persona, construida con las comunidades.
- Detalle en [`docs/roadmap.md`](docs/roadmap.md).

## Equipo

- Luis Daniel Rojas Caceres
- Oziel Rodman Ramos Torrez
- Daniel Boris Rueda
