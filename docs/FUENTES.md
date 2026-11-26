# Fuentes, datos y licencias

Registro de todo dato real usado en la interfaz. Lo que no está aquí no debe mostrarse como dato real.

| Uso | Fuente | Licencia / estado | Verificado |
|---|---|---|---|
| Inicio, escena 2: ≈838 t de Hg al aire desde minería aurífera artesanal (≈38 % de ≈2220 t, datos 2015) | PNUMA, Global Mercury Assessment 2018 — Key Findings: https://wedocs.unep.org/bitstream/handle/20.500.11822/29830/GMAKF_EN.pdf | Documento público | 2026-11-25 (cifra cruzada con EPA y Ambio 2023) |
| Inicio, escena 3: metilmercurio y bioacumulación en peces | OMS, «El mercurio y la salud»: https://www.who.int/es/news-room/fact-sheets/detail/mercury-and-health | Documento público | 2026-11-25 |
| Inicio, escena 3: 4 µg/g de Hg en cabello humano, registro 2022–2023, cuenca del Beni | Valdivieso et al. (2025), Revista Boliviana de Química 42(2): 97–113: https://bolivianchemistryjournaliiq.umsa.bo/wp-content/uploads/2025/12/6.-nMercuryBeniRiver-Valdivieso2025.pdf | Artículo académico; dato agregado, no diagnóstico | 2026-11-25 (resumen); pendiente leer el PDF completo |
| Inicio, escena 4: contornos de continentes y Bolivia | Natural Earth 1:50m vía `world-atlas` (npm) | Dominio público | Generado con `npm run globo:puntos -w apps/web` |
| Inicio, escena 4: 10 localidades de la cuenca del Beni | OpenStreetMap / Nominatim | ODbL 1.0 — © colaboradores de OpenStreetMap | 2026-11-25 |
| Mapa y Laboratorio: mapa base vectorial, ríos y rótulos | OpenFreeMap (estilo «dark») con datos de OpenStreetMap | ODbL 1.0 — © colaboradores de OpenStreetMap | 2026-11-26 |
| Laboratorio: mosaicos anuales Sentinel-2 sin nubes 2016, 2018–2025 | EOX IT Services · s2maps.eu (Contains modified Copernicus Sentinel data) | 2016: CC BY 4.0 · 2018 en adelante: CC BY-NC-SA 4.0 (uso no comercial) | 2026-11-26 (teselas responden 200) |
| Laboratorio: MODIS Terra color real diario y NDVI de 8 días | NASA EOSDIS GIBS | Dominio público (atribución recomendada) | 2026-11-26 |
| Laboratorio: biblioteca de estudios | Valdivieso 2025; Gerson et al. 2022 (Dryad D1DH6F); USGS SF Bay (2 datasets); Remote Sensing 14(13):2971; PNUMA GMA 2018; planetGOLD | Enlaces a las fuentes originales | 2026-11-26 (enlaces); contenido pendiente de auditoría |
| Infórmate: fuentes de las 33 cartas | OPS «Mi comunidad se cuida del mercurio», OMS, PNUMA, planetGOLD, Convenio de Minamata, AAPS (NB 512) | Documentos públicos | Textos en revisión editorial |

## Datos candidatos (aún no integrados)

Ver `docs/contexto/ciencia-datos.md` §4.2. Confirmados como accesibles el 2026-11-25: Dryad D1DH6F (Gerson et al., 2022, Madre de Dios, Perú), Amazon Mining Watch (CC BY 4.0, source.coop), Sentinel-2 L2A en Earth Search (STAC anónimo). NB 512:2016 es la versión vigente; el valor de 0,001 mg/L para Hg aún no se verificó en la tabla oficial.

## Escenas ilustrativas

El paisaje, el río, los peces, las partículas plateadas y el amanecer son ilustraciones procedurales: no representan un lugar real ni una medición.
