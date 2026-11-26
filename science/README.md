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
