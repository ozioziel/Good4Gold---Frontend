# Procesamiento geoespacial y satelital

## Capas que ve el usuario
| Capa | Fuente | Dónde se usa |
|---|---|---|
| Mapa base vectorial, ríos y rótulos | OpenStreetMap vía OpenFreeMap | Mapa comunitario y Laboratorio |
| Mosaico anual sin nubes (2016, 2018–2025) | EOX s2cloudless (Copernicus Sentinel-2) | Globo y comparador de años del Laboratorio |
| Color real diario y NDVI de 8 días | NASA GIBS (MODIS Terra) | Laboratorio |
| Tramos de río coloreados por prioridad | Pipeline `science/` (ver [`metodologia.md`](metodologia.md)) | Laboratorio, y señal «Laboratorio virtual» del Mapa |

Los mosaicos EOX son imágenes de visualización (JPG): **no se usan para calcular índices**. Los índices salen de los productos Sentinel-2 L2A originales.

## Zona piloto
El piedemonte Guanay–Teoponte–Mapiri, con los ríos Kaka, Mapiri, Tipuani, Coroico y Alto Beni, y el río Beni hasta Rurrenabaque:
- **bbox:** -68,45 / -15,85 / -67,25 / -14,30;
- **proyección métrica:** UTM 19S (EPSG:32719).

La elección responde a la disponibilidad de datos y a la concentración de minería aluvial documentada; **no afirma que esas comunidades estén contaminadas**.

## Tramos de río
- **Origen:** los ríos de OpenStreetMap, descargados con Overpass y versionados en `science/datos/brutos/osm_rios.json` (ODbL).
- **Corte:** OSM dibuja los ríos en el sentido del flujo. Las líneas se unen respetando ese sentido (`linemerge(directed=True)`) y se cortan en **48 tramos de unos 15 km**.
- **Grafo de aguas arriba:** cada tramo desemboca en el tramo más cercano a su punto final, con una tolerancia de 1,2 km para los huecos de OSM. Así se sabe qué tramos quedan aguas arriba de cada uno (Tipuani → Mapiri → Kaka ← Coroico; Kaka + Alto Beni → Beni).

## Sentinel-2 L2A
- **Colección:** `sentinel-2-c1-l2a` (Earth Search, STAC anónimo), reprocesada con escala 0,0001 y offset −0,1 en toda la serie, lo que evita el salto de 2022.
- **Hueco de 2022:** la Collection 1 no tiene escenas de la zona entre abril y noviembre de 2022. Para esa temporada se usa `sentinel-2-l2a`, que declara la misma escala y offset en cada banda; queda registrado en el manifiesto y en cada lectura.
- **Selección:** época seca (1 de junio a 30 de septiembre), escenas con menos del 25 % de nubes y las 8 más despejadas de cada tesela por temporada.
- **Lectura:** solo la ventana de cada tramo, a 20 m. Las bandas de 10 m se leen desde la vista reducida del COG, ya promediada por el productor; se comprobó que da los mismos valores.
- **Máscaras:**
  - píxeles válidos según SCL (vegetación, suelo, agua y sin clasificar; fuera nubes, sombras y cirros);
  - agua: MNDWI > 0 dentro de 250 m del eje del río;
  - orilla: MNDWI ≤ 0 entre 300 y 1500 m del eje.
- **Índices:**

| Índice | Fórmula (bandas S2) | Dónde |
|---|---|---|
| NDTI (turbidez relativa) | (B04 − B03) / (B04 + B03) | Agua |
| MNDWI (agua) | (B03 − B11) / (B03 + B11) | Máscara de agua |
| NDVI (vegetación) | (B08 − B04) / (B08 + B04) | Orilla |
| BSI (suelo desnudo) | ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02)) | Orilla |

- **Volumen:** 2719 lecturas (escena × tramo) sin errores; 2443 útiles después de los filtros de calidad.

## Otras fuentes ráster
- **Amazon Mining Watch:** ráster de cicatrices mineras a 10 m (COG), leído por ventanas con `/vsicurl/`, sin descargar el archivo de toda la Amazonía.
- **CHIRPS v3:** pentadas de Latinoamérica (0,05°), leídas por ventana en el punto medio de cada tramo.

## En el API
PostGIS guarda las geometrías como `geography`:
- consultas por `bbox` (`ST_MakeEnvelope`);
- fuentes de agua a menos de 15 km de una comunidad (`ST_DWithin`);
- tramos devueltos como GeoJSON (`ST_AsGeoJSON`).

Las ubicaciones de las publicaciones se redondean a unos 100 m.
