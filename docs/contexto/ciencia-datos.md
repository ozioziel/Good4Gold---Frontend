# Ciencia, datos e IA — guía de trabajo

Documento derivado del plan, no resultado de entrenamiento ni una revisión bibliográfica independiente. Antes de usar una fuente, comprobar que abre, licencia, metadatos, analitos, matrices, unidades, fechas y coordenadas. No sustituir datos faltantes por valores inventados.

## Hipótesis y criterio de éxito

Las relaciones entre Hg y sedimentos/materia orgánica pueden permitir estimaciones locales con calibración. Una imagen no mide Hg directamente; el modelo debe validarse con mediciones independientes. Comenzar por Hg total en agua, no por potabilidad ni clasificación binaria si no hay suficientes positivos. La hipótesis puede fallar. Publicar resultados negativos si corresponde, usar indicadores ambientales cuando no haya capacidad predictiva defendible.

## 3. Información que se centralizará

Distinguir datos originales disponibles, datos derivados y datos aún no obtenidos. La siguiente lista es el alcance deseado, no un inventario de archivos ya descargados.

| Categoría | Información |
|---|---|
| Científica | Estudios, concentración y forma química de Hg, matriz (agua/pez/sedimento/etc.), métodos, incertidumbre, coordenadas, fechas y fuentes |
| Satelital | Imágenes, bandas espectrales, resolución, fecha, nubes, índices y comparaciones |
| Geográfica | Comunidades, límites, ríos, cuencas, uso de suelo, áreas protegidas y minería identificada con su fuente |
| Comunitaria | Consultas, observaciones, evidencias, corroboraciones, solicitudes y seguimiento |
| Analítica | Indicadores ambientales, predicciones experimentales, incertidumbre, versión del modelo y ámbito de validez |
| Sanitaria | Información y recomendaciones oficiales, rutas de exposición, prevención y alertas |
| Institucional | Entidades participantes, especialidades, cobertura, casos y estado de verificación |
| Financiera | Campañas, etapas, aportes, transacciones, verificaciones, desembolsos y resultados |

## 4. Plan de IA y datos científicos

### 4.1. Modelo satelital

**Objetivo:** evaluar si las propiedades ópticas del agua y el contexto ambiental permiten predecir experimentalmente Hg total en agua, o al menos priorizar muestreo con un criterio útil y transparente.

**Target principal (Y):** concentración de mercurio total en agua medida en laboratorio, normalizada (por ejemplo, ng/L). El metilmercurio, el mercurio disuelto y el particulado se modelan por separado, sin mezclarlos como un mismo target. Registrar censura por debajo del límite de detección y no sustituirla automáticamente por cero.

**Inputs candidatos (X), disponibles también al inferir:**

- Reflectancia Sentinel-2 B2, B3, B4, B5–B7, B8/B8A, B11, B12, según resolución y utilidad comprobada; correcciones y máscaras acuáticas apropiadas.
- Índices NDVI, MNDWI y turbidez (NDTI) calculados con bandas compatibles.
- TSS/TSM y CDOM estimados mediante métodos calibrados, cuando existan datos adecuados.
- Distancia a minería, superficie minera aguas arriba, hidrología, tipo de cuerpo de agua, estación y precipitación, sujetos a disponibilidad y calidad.

**No usar como predictor una variable que solo puede obtenerse en laboratorio si no estará disponible en producción.** Las coordenadas y fechas sirven para unir registros y, si se usan como variables, controlar el riesgo de sobreajuste espacial y temporal.

### 4.2. Datasets candidatos

| Fuente | Utilidad | Estado |
|---|---|---|
| Madre de Dios, Perú (Dryad): https://datadryad.org/dataset/doi:10.6078/D1DH6F | Datos de campo de la Amazonía minera, Hg y otras variables; candidatos para emparejar con Sentinel-2 | Verificar CSV, unidades, muestras únicas, fechas, coordenadas y licencia. Se mencionaron 54 sitios y 4.079 registros de múltiples parámetros; no equivalen a 4.079 mediciones de Hg |
| USGS — Hg en agua: https://www.usgs.gov/data/mercury-speciation-surface-waters-south-san-francisco-bay-california | Precedente y datos de especiación | Verificar estructura, alcance y compatibilidad |
| USGS — datos hiperespectrales: https://www.usgs.gov/data/discrete-surface-water-hyperspectral-data-south-san-francisco-bay | Variables ópticas y comparación metodológica | No extrapolar automáticamente desde California a Bolivia |
| USGS — mapas Sentinel-2: https://www.usgs.gov/data/surface-water-mercury-concentrations-south-san-francisco-bay-2022-2024-derived-sentinel-2 | Precedente de productos satelitales de estimación | Verificar publicación, metodología y validación |
| Metaanálisis del Beni: https://www.scielo.org.bo/scielo.php?pid=S0250-54602025000200097&script=sci_arttext | Antecedentes bolivianos y bibliografía | Parte de los datos puede ser anterior a Sentinel-2; no usar como pares temporales sin comprobar |
| IRD — Alto Beni: https://www.documentation.ird.fr/hor/fdi%3A010019126 | Estudios históricos de contaminación | Verificar matriz, coordenadas y fecha |
| Sentinel-2: https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED | Reflectancia superficial desde 2017 | Confirmar acceso, cuotas y calidad por punto/fecha |
| MapBiomas Bolivia: https://bolivia.mapbiomas.org/ | Uso y cobertura de suelo | Confirmar descargas y licencia |
| GeoBolivia: https://geobolivia.planificacion.gob.bo/ | Capas geográficas nacionales | Confirmar disponibilidad |

### 4.3. Pipeline reproducible

1. Descargar y documentar licencias, diccionario, identificadores de muestra y fuentes.
2. Transformar registros de múltiples parámetros en filas por muestra; normalizar unidades, fechas y tipos de Hg.
3. Validar coordenadas, profundidad/matriz, duplicados, límites analíticos y registros incompletos.
4. Obtener imágenes satelitales temporalmente compatibles, predefinir ventana máxima y filtrar nubes, sombras y píxeles mezclados en ríos estrechos; descartar pares de mala calidad.
5. Extraer variables espectrales, hidrológicas y de contexto; registrar el método y versión.
6. Comparar un baseline simple (mediana o regresión) con Random Forest y, si hay datos suficientes, XGBoost. No asumir que un modelo más complejo será mejor.
7. Separar entrenamiento y evaluación por sitios/cuencas y, cuando sea viable, por periodos; evitar fuga de información y ajustar hiperparámetros sin consultar el conjunto final.
8. Evaluar MAE, RMSE, R², sesgo y errores por zona; reportar tamaño de muestra, cobertura y rangos de incertidumbre. Para categorías, evaluar sensibilidad, especificidad y calibración, solo si existen suficientes casos positivos y negativos.
9. Validar con muestras independientes de Bolivia antes de presentar predicciones locales como fiables. Si el modelo no generaliza o los datos no bastan, mostrar solo indicadores ambientales y prioridades, no concentraciones inventadas.
10. Publicar ficha del modelo, versión, datos utilizados y limitaciones en el Laboratorio.

**Clasificación:** no comenzar con «contaminado / no contaminado» sin comprobar distribución del target y umbral aplicable. Preferir regresión experimental y presentar una categoría de prioridad de investigación; separar presencia detectada, excedencia normativa y potabilidad.

### 4.4. Modelo de campo (opcional, fase posterior)

Investigar si mediciones rápidas con sensores de turbidez, propiedades ópticas (posible CDOM), conductividad, TDS, pH y temperatura permiten priorizar muestras de agua para análisis de Hg. Se necesita un dataset con esos mismos inputs y Hg medido en las mismas muestras. TDS y TSS no son equivalentes; pH y conductividad no detectan Hg. No prometer precisión ni utilizar el modelo para declarar agua segura.

## 5. Componente físico / IoT: investigación opcional

No es requisito del MVP. Se busca, a futuro, una herramienta compartida por comunidades, que permita análisis sencillos y sincronización offline. Una fotografía del agua o un cambio de color genérico no son prueba de Hg.

Alternativas:

| Alternativa | Qué aporta | Limitación |
|---|---|---|
| ESP32 con sensores ambientales | Medición rápida de características generales del agua | No mide Hg específicamente |
| Lector óptico con cartucho reactivo específico | Posible detección preliminar si el reactivo y lector están validados | Requiere reactivos, sensibilidad, calibración, control de interferencias y seguridad |
| Electrodos de oro / voltametría | Vía de detección electroquímica específica investigable | Requiere conocimiento, instrumentación y validación profesional |
| Kit comunitario y derivación a laboratorio | Facilita muestreo y acceso a análisis reales | Requiere capacitación, logística y convenios |

Estimaciones orientativas discutidas: lector físico con herramientas ~Bs 510; lector más tres análisis y materiales ~Bs 1.200 sin reactivos específicos; reserva preliminar Bs 1.500–2.000, sin garantizar costo final ni validación. Estación multisensor preliminar ~Bs 950–1.050 sin calibración ni herramientas, o ~Bs 640–740 sin pH. No son cotizaciones ni presupuestos definitivos. No comprar antes de comprobar utilidad, datos y acceso a laboratorio.

**Condiciones de uso:** confirmar sensibilidad respecto al criterio normativo y las formas de Hg de interés, estudiar interferencias, verificar desempeño con muestras reales y establecer protocolos de manejo y descarte. No manipular mercurio ni preparar reactivos peligrosos por cuenta propia o durante el pitch. Una eventual prueba de campo negativa no certifica potabilidad.

**Decisión para la hackathon:** priorizar evidencia existente, demostración funcional de la plataforma y validación experimental del modelo si es posible. Un dispositivo físico solo se presenta como concepto o prototipo no validado, salvo que se disponga de evidencia real suficiente.


## 10. Fuentes de referencia y tareas de verificación

Enlaces identificados durante la planificación; revisar acceso, actualidad, contenido, licencias y aplicabilidad antes de citarlos como evidencia definitiva o integrarlos. No se han descargado ni entrenado los datasets en esta planificación.

- Gold4Good: https://gold4good.info.bo/site/
- Biblioteca de desafíos: https://sites.google.com/view/gold4good-hackathon-2026/p%C3%A1gina-principal
- planetGOLD Bolivia: https://www.planetgold.org/bolivia
- Investigación de sensores remotos y minería aurífera (2022), sección 2.2.6: https://www.mdpi.com/2072-4292/14/13/2971
- planetGOLD, monitoreo satelital y trabajo de campo: https://www.planetgold.org/evaluating-and-monitoring-small-scale-gold-mining-and-mercury-use-building-knowledge-base-satellite
- OPS, Mi comunidad se cuida del mercurio: https://www.paho.org/es/documentos/mi-comunidad-se-cuida-mercurio
- Convenio de Minamata: https://minamataconvention.org/
- Copernicus Browser: https://browser.dataspace.copernicus.eu/
- USGS EarthExplorer: https://earthexplorer.usgs.gov/
- Estudio sobre detección portátil de Hg con celular: https://doi.org/10.1021/nn406571t
- IBMETRO, análisis inorgánicos: https://www.ibmetro.gob.bo/laboratorio-inorganicas
- Los datasets científicos candidatos y fuentes cartográficas se detallan en la sección 4.2.


## Entregables científicos sugeridos

- Inventario de fuentes y licencias, diccionario de datos, archivos originales preservados.
- Script/notebook reproducible de ingestión, normalización y emparejamiento de muestras con imágenes.
- Informe con conteos reales antes/después del filtrado, valores censurados, nubes, cobertura, separación por lugar/tiempo y resultados del baseline.
- Ficha de modelo con métricas reales, error, incertidumbre, límites de extrapolación, versión y datos usados.
- Capas de indicadores con metadatos; únicamente predicciones si pasan evaluación. Distinguir cualquier fixture de demo.
