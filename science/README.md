# Laboratorio virtual (science/)

Pipeline por lotes que **prioriza dónde tomar muestras** en la zona piloto. **No mide ni estima mercurio.** Sus resultados son v0 y no los ha revisado ningún especialista.

| Componente | Qué hace | Fuente |
|---|---|---|
| **Gold2Mining** (`g2/mineria.py`) | Hectáreas de minería confirmada por año en una franja de 3 km de cada tramo; las franjas no se solapan | Amazon Mining Watch, ráster de cicatrices a 10 m (CC BY 4.0) |
| **Gold2Spectral** (`g2/espectral.py`) | NDTI (turbidez relativa) en el agua, NDVI y BSI (suelo desnudo) en la orilla, solo con píxeles sin nubes; resumen por temporada seca y anomalía de cada año frente a los demás (z robusto) | Sentinel-2 L2A Collection 1 (Earth Search) |
| **Lluvia** (`g2/lluvia.py`) | Lluvia de las 2 pentadas previas a cada imagen, para no confundir turbidez por lluvia con turbidez por minería | CHIRPS v3 pentadas (UCSB) |
| **Gold2Risk** (`g2/riesgo.py`) | Prioridad alta, media, baja o «sin datos suficientes» por tramo, con reglas explicables, los datos usados y lo que faltó | Salidas anteriores |
| Tramos (`g2/tramos.py`) | Ríos cortados en tramos de ~15 km en el sentido del flujo, con el grafo de qué tramos quedan aguas arriba | OpenStreetMap (ODbL) |

**Gold2Mercury** (estimar Hg desde el satélite) está **en pausa**: no hay muestras de Bolivia con coordenadas para validarlo.

## Zona y periodo
- **Zona:** piedemonte Guanay–Teoponte–Mapiri (ríos Kaka, Mapiri, Tipuani, Coroico y Alto Beni) y el río Beni hasta Rurrenabaque. Ver `config/parametros.yaml`.
- **Periodo:** época seca (1 de junio a 30 de septiembre) de 2019 a 2025, cuando hay menos nubes.

## Reglas v0 (umbrales ilustrativos, en `config/parametros.yaml`)
- **R1 · alta:** al menos 20 ha de minería nueva aguas arriba en 2 años **y** turbidez anómala (z ≥ 2) en al menos 2 de las últimas 3 temporadas, sin lluvia anómala que la explique.
- **R2 · media:** al menos 50 ha de huella minera acumulada aguas arriba.
- **R3 · media:** turbidez anómala en la temporada evaluada, no explicada por lluvia.
- Si no se cumple ninguna regla y faltan datos, el resultado es **sin datos suficientes**, nunca «baja».
- «Baja» no significa ausencia de mercurio ni agua segura.

## Uso
```bash
cd science
uv sync
uv run pytest                       # pruebas de las piezas puras
uv run python -m g2 tramos          # requiere datos/brutos/osm_rios.json (consulta Overpass en el README)
uv run python -m g2 mineria         # lee AMW por HTTP (solo las ventanas de la zona)
uv run python -m g2 lluvia          # ~190 pentadas de CHIRPS
uv run python -m g2 espectral       # el paso largo (miles de ventanas de Sentinel-2); retoma si se corta
uv run python -m g2 riesgo
uv run python -m g2 cargar          # escribe en PostGIS (DATABASE_URL o apps/api/.env), migración 003
```

Consulta de los ríos (Overpass; el servidor principal suele saturarse, el espejo `maps.mail.ru` funcionó):
```
[out:json][timeout:120];way[waterway=river][name~"Kaka|Mapiri|Beni|Tipuani|Coroico"](-15.85,-68.45,-14.30,-67.25);out geom tags;
```

Cada paso queda registrado en `datos/derivados/manifiesto.json`: fecha, commit, fuentes y conteos. Esa información se copia a `corridas_modelo` en la base.

## Limitaciones conocidas
- **Amazon Mining Watch** cubre la cuenca amazónica según su propio límite. En las cabeceras andinas, un cero puede significar «fuera de cobertura». Además, detectar minería no prueba uso de mercurio.
- **NDTI** es turbidez *relativa*: no son NTU ni sedimentos medidos, porque no hay calibración en campo. Los ríos estrechos (Tipuani, Coroico) tienen pocos píxeles de agua a 20 m.
- **Aguas arriba** se aproxima con la red de OSM y una franja de 3 km; no es una cuenca hidrológica.
- **Lluvia:** CHIRPS (0,05°) se toma en el punto medio de cada tramo.

## Validación contra sedimentos de Dethier et al. (2023)
`uv run python -m g2 validacion` compara nuestro NDTI con los sedimentos en suspensión (mg/L) publicados por Dethier et al. (2023, Nature; Zenodo 7699122, CC BY 4.0). Esos valores se estimaron con Landsat y se calibraron con más de 130 000 mediciones de campo, a lo largo de los perfiles mineros del Mapiri y del Tipuani hasta el Beni.
- **Resultado (épocas secas 2019–2021):** 75 pares tramo-año, Pearson r = **0,49** (log de sedimentos contra NDTI) y Spearman ρ = 0,25. Es una relación positiva, de débil a moderada.
- **Cómo leerlo:** NDTI sigue la dirección de los sedimentos, pero no sirve para estimar concentraciones. Tiende a saturarse con cientos de mg/L, y las dos series vienen de sensores, fechas y métodos distintos. Por eso Gold2Spectral usa anomalías respecto de otros años y no valores absolutos.
- **No es validación con mediciones directas de campo.** Datos y detalle en `datos/externos/LEEME.md`.

## Validación con datos de campo (pendiente)
Todavía no hay mediciones de campo con coordenadas dentro de los tramos para medir el acierto. Lo que se encontró (2026-11-26):
- **SO-HYBAM (IRD/SENAMHI):** mide sedimentos en suspensión en el Beni en Rurrenabaque / Angosto del Bala unas tres veces al mes (CC BY 4.0, según THEIA). Es la mejor opción para **validar NDTI contra sedimentos medidos**. El portal arma su catálogo con JavaScript, así que no hay descarga directa por script: hay que bajar la serie desde https://hybam.obs-mip.fr y guardarla en `datos/brutos/`.
- **Maurice-Bourgoin et al. (IAHS 2002):** en el Beni, el Hg total va de 19 ng/L en época seca a 460 ng/L en crecida, con 59–98 % unido a partículas, y el Hg de los sedimentos se correlaciona con la arcilla (r² = 0,74). Respalda usar la turbidez como indicador para priorizar, pero sus núcleos están aguas abajo de Rurrenabaque.
- **Maurice-Bourgoin et al. 1999 (Ambio) y 2000 (Sci. Total Environ.):** mercurio por río (Kaka, Mapiri, Tipuani, Beni). Están en el repositorio del IRD, que estaba en mantenimiento al consultarlo.
- **SO-HYBAM también publica la serie** de la estación Rurrenabaque (código 15275100, archivo `15275100_Q_IMsO_(mg/l).nc`, DOI 10.6096/1036, CC BY 4.0). Desde el 2026-11-26 su botón de descarga responde 404, así que hay que pedirla a su responsable (J.-M. Martinez, IRD).
- **GloRiSe v1.1** (Zenodo 4485795) no tiene muestras en la cuenca del Beni.
- **La validación de verdad** es muestrear tramos de prioridad alta y baja: así se mide si la priorización acierta.
