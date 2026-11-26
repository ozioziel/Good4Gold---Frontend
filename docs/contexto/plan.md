# Gold2… — Plan maestro del proyecto

**Evento:** Gold4Good Hackathon 2026 · Bolivia  
**Versión:** 0.5 — 25 de noviembre de 2026  
**Nombre comercial:** pendiente de decisión (Gold2Life, Gold2Vision y otras variantes son propuestas, no nombres definitivos).  
**Estado:** planificación del MVP; las integraciones, alianzas y capacidades predictivas descritas no se consideran implementadas ni validadas hasta contar con evidencia.

Documentos complementarios del paquete: `CLAUDE.md` (instrucciones para el agente), `contexto-proyecto.md` (memoria y decisiones), `diseno-ux.md` (dirección visual y criterios), `ciencia-datos.md` (investigación y validación) y `implementacion.md` (fases, contratos y pruebas). Este plan es la fuente principal de alcance; los documentos complementarios no amplían automáticamente el MVP.

## 1. Visión y propuesta de valor

Desarrollar una plataforma de monitoreo, investigación, prevención y financiamiento de acciones frente a la contaminación por mercurio asociada a la minería aurífera en Bolivia. La plataforma conecta a comunidades rurales e indígenas, investigadores, laboratorios, organizaciones, autoridades y donantes.

La solución une dos espacios complementarios: un **mapa comunitario**, donde las personas consultan información local, publican observaciones y solicitan investigaciones; y un **laboratorio virtual**, donde se centraliza evidencia científica, se observan imágenes satelitales y se desarrollan análisis ambientales y modelos experimentales de IA. Las donaciones permiten financiar investigaciones e intervenciones con trazabilidad de los recursos.

**Propuesta central:** convertir necesidades comunitarias en investigaciones respaldadas por evidencia y acciones de prevención financiables.

**Frase para el pitch:** El satélite nos dice dónde buscar; la ciencia nos dice qué encontramos; la comunidad nos dice dónde hace falta actuar.

### 1.1. Problema

- El mercurio empleado en parte de la minería aurífera artesanal se une al oro formando una amalgama. Su liberación puede contaminar aire, suelo y agua; en ambientes acuáticos puede transformarse en metilmercurio y acumularse en la cadena alimentaria.
- La exposición puede ocurrir por inhalación de vapores y por consumo de alimentos contaminados, especialmente pescado.
- Las comunidades necesitan información local comprensible, acceso a análisis y canales para solicitar apoyo.
- Las mediciones y estudios pueden estar dispersos y no siempre tienen resolución geográfica o temporal suficiente.
- Investigar e intervenir requiere recursos, coordinación institucional y seguimiento.

### 1.2. Objetivos

- Centralizar evidencia científica y reportes comunitarios georreferenciados.
- Facilitar la consulta de mediciones y antecedentes de cada fuente de agua o localidad.
- Identificar zonas prioritarias de investigación mediante observación satelital y análisis de datos.
- Conectar solicitudes comunitarias con instituciones competentes y financiamiento.
- Difundir información preventiva accesible, respaldada por fuentes oficiales.
- Hacer trazable el uso de las donaciones y documentar resultados.

## 2. Navegación y estructura de la web

Se mantienen **cinco pestañas públicas**, además de autenticación y un panel privado por rol. La biblioteca de investigaciones forma parte del Laboratorio, no una pestaña pública independiente. El mapa comunitario y el mundo satelital son experiencias distintas, aunque comparten datos.

| Pestaña | Propósito | Ruta sugerida |
|---|---|---|
| Inicio | Presentar el problema y la solución, con datos y llamadas a la acción | `/` |
| Mapa comunitario | Consultar comunidades, reportar, corroborar observaciones y solicitar investigaciones | `/mapa` |
| Laboratorio | Globo 3D, imágenes satelitales, análisis, IA, investigaciones y datasets | `/laboratorio` |
| Infórmate | Educación visual, prevención e infografías interactivas | `/informate` |
| Donaciones | Financiar investigaciones e intervenciones, con seguimiento por etapas | `/donaciones` |
| Autenticación y panel privado | Identidad, permisos, publicaciones, gestión de casos y campañas | `/login`, `/perfil`, `/panel` |

### 2.1. Inicio — El lado invisible del oro

**Decisión aprobada:** una experiencia cinematográfica de scroll inmersivo que pasa de la escala microscópica a la planetaria. El relato de Inicio muestra las dos caras del oro; la transformación oro → agua → planta se reserva para Donaciones y no debe repetirse como recurso principal de Inicio.

#### Escena 1 — El valor del oro

Fondo oscuro, gotas de oro líquido flotantes que se unen hasta formar un lingote dorado. Reflejos metálicos, iluminación cinematográfica y movimiento sutil en respuesta al cursor. Texto mínimo:

> Conocemos el valor del oro.

#### Escena 2 — Lo que no vemos

Al hacer scroll, la cámara gira alrededor del lingote y revela una gota plateada de mercurio detrás de él. La cámara se aproxima a la gota y transiciona a un paisaje amazónico con actividad minera.

> Pero no siempre conocemos su costo.

Mostrar pequeñas estadísticas reales con fuente, fecha y contexto; no llenar la escena de texto. No sugerir que todo el oro se extrae con mercurio ni presentar un proceso químico como demostración real.

#### Escena 3 — Una amenaza invisible

La cámara desciende al río, atraviesa la superficie y muestra peces, sedimentos y partículas plateadas como metáfora visual de la contaminación. Explicar brevemente la relación entre liberación de mercurio, transporte ambiental, metilmercurio y cadena alimentaria. Las partículas no representan una medición ni algo que pueda verse a simple vista.

> Una amenaza que no siempre podemos ver.

#### Escena 4 — Una nueva perspectiva

La cámara sale del agua, asciende sobre el bosque, atraviesa la atmósfera y llega al espacio. El planeta 3D gira y enfoca Bolivia; aparecen puntos correspondientes a comunidades, investigaciones y mediciones disponibles (con fuentes o etiqueta demo).

> Lo invisible no tiene por qué permanecer desconocido.

Revelar el nombre de la plataforma (usar marca provisional configurable hasta decidir). Esta escena anticipa el globo del Laboratorio, pero no necesita ejecutar los análisis de ese módulo.

#### Escena 5 — Nuestra solución

Mantener el planeta como fondo y mostrar cuatro paneles flotantes, con ilustraciones/miniaturas 3D y transiciones al pulsarlos:

| Panel | Texto | Destino |
|---|---|---|
| Una comunidad conectada | Consulta, comparte información y solicita investigaciones, incluso sin conexión permanente. | Mapa comunitario |
| Un laboratorio sin fronteras | Satélites, inteligencia artificial y evidencia científica en un mismo lugar. | Laboratorio |
| Conocimiento que protege | Información visual y accesible para prevenir los riesgos del mercurio. | Infórmate |
| Recursos que transforman | Donaciones transparentes para financiar investigaciones e intervenciones. | Donaciones |

#### Escena 6 — Cierre

Paisaje natural, río y bosque iluminados por un amanecer dorado. Cierre con dos llamadas a la acción funcionales.

> El oro tiene valor.
> La vida no tiene precio.

Botones: «Explorar mi comunidad» y «Explorar laboratorio».

#### Dirección artística y técnica de Inicio

- Una narrativa continua, cámara y transiciones sincronizadas al scroll, no seis bloques de video pesados ni una landing genérica de tarjetas. La animación se puede simplificar a escenas independientes con continuidad visual si el rendimiento o el plazo lo exigen.
- Evolución cromática: oscuridad #181A17 (misterio), dorado #D4AF55 (valor económico), plateado #A4ADB3 (mercurio), azul #507F98 (agua/ciencia), verde #426C4A (naturaleza/solución), marfil #F3F0E4 (esperanza y accesibilidad).
- Stack visual candidato: Three.js, React Three Fiber, GSAP ScrollTrigger, shaders de oro líquido y partículas. Reutilizar recursos 3D cuando convenga, sin confundir las narrativas. Cargar por etapas, comprimir modelos/texturas y liberar recursos WebGL al salir.
- Navegación siempre accesible; opción «Saltar animación», respeto a `prefers-reduced-motion`, fallback estático 2D, sin scroll secuestrado, sin bloquear el mapa ni los accesos básicos con una intro pesada. Mobile-first para uso rural.
- El relato presenta la problemática, no afirma resultados científicos no demostrados. Los puntos del mapa conservan la distinción entre mediciones, observaciones, estimaciones y ausencia de datos.
- El inicio mínimo funcional debe conservar todos los mensajes y destinos aunque las simulaciones de líquidos o escenas complejas queden como mejora.

### 2.2. Mapa comunitario (núcleo social)

Mapa orientado a personas y necesidades locales, no a análisis espectral. Permite buscar por departamento, municipio, comunidad o fuente de agua, seleccionar una localidad y abrir su panel.

Cada comunidad podrá tener:

- Ficha geográfica y fuentes de agua diferenciadas (río, pozo, sistema de distribución u otras).
- Resumen de mediciones disponibles, fecha, medio analizado, procedencia y limitaciones.
- Publicaciones, preguntas, respuestas, observaciones, fotos y documentos.
- Reportes de posibles anomalías (cambios de color, sedimentos, actividad minera observada, etc.).
- Corroboraciones y discrepancias con justificación, distinguiendo roles y evidencia.
- Investigaciones solicitadas, en curso y concluidas.
- Resultados de laboratorio, recomendaciones oficiales y campañas relacionadas.

Los visitantes pueden consultar sin iniciar sesión. Para publicar, comentar, corroborar o solicitar seguimiento se requiere autenticación. La plataforma debe permitir reportar abuso y proteger la identidad y ubicación precisa de personas vulnerables.

**Principio:** una fotografía, un testimonio, una votación o una estimación satelital no confirman la presencia de mercurio. La clasificación se aplica a una muestra o fuente de agua con alcance temporal y espacial definido, no indiscriminadamente a toda una comunidad.

#### 2.2.1. Tipos de publicaciones

1. Consulta comunitaria: «¿Existe información sobre mercurio en el río que utilizamos?»
2. Observación ciudadana: descripción, ubicación aproximada, fecha y evidencia opcional.
3. Respuesta técnica: interpretación de un investigador o institución con referencias.
4. Medición preliminar: resultado de campo, instrumento, calibración y limitaciones.
5. Medición de laboratorio: informe, método, analito, unidad, fecha, punto y estado de verificación.
6. Alerta oficial: recomendación emitida por autoridad competente, con fuente y vigencia.
7. Solicitud de investigación: caso formal asociado a una necesidad comunitaria.

#### 2.2.2. Corroborar, discrepar y verificar

Los usuarios pueden marcar «Corroboro», «Discrepo» o «No tengo evidencia suficiente», indicando qué observación están respaldando o cuestionando. Se muestra el desglose de roles y evidencias, no una votación que determine si existe Hg.

| Rol | Puede corroborar observaciones | Puede confirmar o refutar un resultado químico |
|---|---|---|
| Ciudadano | Sí, con observaciones | No por voto |
| Representante comunitario | Sí, con conocimiento local | No por voto |
| Investigador verificado | Sí, con referencias | Puede interpretar y revisar evidencia analítica pertinente |
| ONG verificada | Sí, con documentación | Puede presentar evidencia válida; el rol por sí solo no basta |
| Laboratorio competente | Sí | Puede emitir resultados de su método y muestra, sujetos a revisión de calidad |
| Autoridad sanitaria | Sí | Puede emitir interpretaciones y alertas oficiales respaldadas por evidencia |
| IA | No vota como persona | Solo aporta estimaciones experimentales, nunca certifica |

Los votos ciudadanos ayudan a detectar necesidades y priorizar atención. Las discrepancias técnicas requieren revisión documentada; una medición negativa en otra fecha, otro lugar o con un límite de detección insuficiente no invalida una medición positiva anterior. Se conserva el historial de cambios y no se permite borrar resultados válidos por popularidad.

#### 2.2.3. Estados visuales

Conviene separar el estado de evidencia química del estado del trámite de investigación; pueden coexistir.

| Estado de evidencia | Color sugerido | Criterio |
|---|---|---|
| Sin información suficiente | Gris | No hay medición pertinente o vigente para la consulta |
| Indicios de riesgo | Naranja | Observaciones o análisis ambiental justifican investigar, sin confirmación química |
| Hg detectado | Azul | Medición analítica válida por encima del límite de detección aplicable, indicando concentración y método |
| Hg sobre el límite aplicable | Rojo | Medición válida supera el criterio normativo correspondiente a la matriz y uso |
| Medición dentro del límite | Azul/neutral | Medición válida no supera dicho criterio; no certifica potabilidad |
| Resultado no concluyente o discrepante | Gris/naranja | Incertidumbre, sensibilidad insuficiente o evidencia en conflicto |

Estados independientes de la investigación: solicitada, en revisión, asignada, pendiente de recursos, en muestreo, en análisis, en revisión técnica, resultados publicados, cerrada o rechazada con justificación.

**Normativa:** se identificó como referencia preliminar la NB 512 de Bolivia (valor citado para Hg en agua potable: 0,001 mg/L = 1 µg/L). Verificar la versión oficial vigente, el analito y la aplicabilidad antes de convertirlo en regla de producción. No aplicar el umbral de agua potable a peces, cabello, sedimento ni otros medios. No interpretar «no detectado» como ausencia absoluta, ni «dentro del límite de Hg» como agua potable. Ante una alerta oficial, mostrar las instrucciones de la autoridad y fuentes alternativas seguras cuando corresponda; hervir no elimina el mercurio.

### 2.3. Solicitudes comunitarias de investigación

Si faltan datos o existen indicios que necesitan verificación, la comunidad puede solicitar una investigación. No debe depender de que haya un investigador navegando casualmente por el mapa.

**Campos del caso:** comunidad, fuente de agua/punto de muestreo, ubicación, fecha, motivo, matriz a investigar, observaciones, adjuntos opcionales, población potencialmente beneficiada (si se conoce), contacto privado con consentimiento, referencias, nivel de urgencia justificado y apoyos comunitarios.

**Flujo:**

1. Habitante autenticado crea la solicitud o apoya una existente; se deduplican casos de la misma fuente y problema.
2. El sistema reúne antecedentes, estudios cercanos y cambios satelitales, marcando sus limitaciones.
3. Un moderador revisa calidad, privacidad y pertinencia del caso; el sistema sugiere prioridad y destinatarios.
4. Se notifica únicamente a organizaciones participantes, según jurisdicción, especialidad, tipo de muestra y cobertura.
5. Una organización acepta el caso, solicita más información, deriva a otra entidad o lo rechaza con motivo. Si nadie acepta, permanece pendiente y visible, sin prometer una respuesta.
6. Se prepara un plan de muestreo y presupuesto por personal competente. Si faltan recursos, se puede proponer una campaña vinculada a la solicitud.
7. Personal capacitado toma y transporta muestras conforme al protocolo del laboratorio y la cadena de custodia.
8. El laboratorio realiza análisis y la institución carga el informe; un responsable verifica trazabilidad, método, unidades, alcance y calidad.
9. Se publica el resultado con sus limitaciones y se actualiza el punto de medición del mapa. Se notifica a la comunidad y, cuando corresponda, se deriva a la autoridad sanitaria.
10. Se registran recomendaciones, intervenciones y seguimiento; los datos validados pueden alimentar futuros análisis científicos.

**Priorización sugerida:** actualidad y pertinencia de evidencia, sospecha de exposición, población vulnerable o dependencia de una fuente de agua, ausencia de análisis recientes, factibilidad de muestreo y necesidad expresada por la comunidad. Los apoyos ciudadanos son una señal secundaria, no el único criterio. No relegar comunidades con poca conectividad o pocos votos. No sustituir procedimientos de atención urgente.

#### 2.3.1. Instituciones destinatarias potenciales en Bolivia

No hay acuerdos confirmados: esta lista es de posibles aliados y canales de derivación. Verificar competencias, servicios, acreditación aplicable, cobertura y contactos antes de integrarlos.

| Institución | Posible función | Enlace |
|---|---|---|
| WCS Bolivia | Investigación ambiental, peces, ecosistemas y trabajo comunitario | https://bolivia.wcs.org/ |
| CPILAP | Representación y coordinación con comunidades indígenas de La Paz | https://cpilap.org/ |
| planetGOLD Bolivia | Coordinación, asistencia técnica y articulación de proyectos | https://www.planetgold.org/bolivia |
| UMSA — IIDEPROQ | Investigación y análisis fisicoquímicos; confirmar capacidad específica de Hg | https://iideproq.umsa.bo/ |
| UMSA — SELADIS | Investigación y análisis relacionados con exposición humana; confirmar alcance | https://www.umsa.bo/ |
| IBMETRO | Análisis inorgánicos especializados, incluida determinación de Hg según servicio disponible | https://www.ibmetro.gob.bo/laboratorio-inorganicas |
| INLASA | Laboratorio de salud ambiental y calidad de agua; verificar servicios | https://inlasa.gob.bo/ |
| SEDES y autoridades sanitarias | Vigilancia y respuesta preventiva en su jurisdicción | https://www.sedeslapaz.gob.bo/ |
| Gobiernos municipales y operadores de agua | Coordinación local, suministro y medidas correctivas | Directorio por localidad |
| Universidades y centros de investigación (p. ej. IRD) | Estudios, revisión metodológica y posibles datos de campo | https://www.ird.fr/ |

Para el piloto, priorizar acercamientos con WCS/CPILAP por el vínculo comunitario y con UMSA/IBMETRO por el componente científico. Las instituciones podrán registrarse, verificar su identidad y aceptar recibir notificaciones por correo y en el panel. No enviar automáticamente mensajes a terceros no participantes ni publicar datos de contacto personales sin autorización.

### 2.4. Laboratorio virtual (núcleo científico)

Globo interactivo 3D con enfoque inicial en Bolivia y posibilidad de explorar otras zonas. Debe mostrar información científica separada de las observaciones comunitarias, con vínculos hacia las solicitudes del mapa.

Subsecciones o paneles internos:

- **Observación:** imágenes reales Sentinel-2/Landsat, fecha, fuente, resolución, cobertura de nubes y comparación histórica.
- **Capas:** ríos, cuencas, vegetación, uso de suelo, áreas mineras potenciales, mediciones científicas, cambios ambientales y zonas prioritarias.
- **Análisis:** índices NDVI, MNDWI, indicadores de turbidez y estimaciones de sólidos suspendidos cuando estén calibradas; análisis hidrológico y actividad minera.
- **IA experimental:** resultados de modelos, métricas de validación, incertidumbre, ámbito geográfico y advertencias sobre extrapolación.
- **Investigaciones y datasets:** biblioteca de artículos, estudios bolivianos, metadatos, enlaces a fuentes, archivos con licencia adecuada y metodología utilizada.
- **Muestras y evidencia:** registro estructurado de mediciones y documentos asociados.

El laboratorio puede analizar un punto seleccionado en el mapa comunitario; el mapa puede mostrar un resumen del análisis con enlace al laboratorio. No renderizar un mapa de «mercurio confirmado» a partir de índices satelitales solos.

#### Diseño y herramientas del Laboratorio

- Globo 3D como protagonista, centrado inicialmente en Bolivia; estética de observatorio científico, paneles flotantes plegables y controles que no oculten el territorio. Exploración mundial cuando exista cobertura, sin extender automáticamente las predicciones fuera de la zona validada.
- Barra temporal y comparación entre dos fechas (antes/después); mostrar sensor, fecha, resolución, disponibilidad y cobertura nubosa. No simular una transmisión en vivo si las imágenes no son en tiempo real.
- Selector de capas independientes: imágenes satelitales, mediciones químicas confirmadas, indicadores/estimaciones experimentales, actividad minera, ríos y cuencas, deforestación, comunidades, solicitudes e investigaciones georreferenciadas. Leyenda y procedencia por capa.
- Herramientas internas: Explorador, Satélites, Análisis IA, Mediciones, Estudios y Solicitudes. Son paneles del Laboratorio, no nuevas pestañas públicas.
- Modo de investigación libre: seleccionar un punto o dibujar un polígono sobre un río o territorio, elegir un intervalo de fechas, consultar capas y antecedentes, ejecutar los análisis disponibles y generar un informe con referencias, metodología, cobertura, incertidumbre y limitaciones. Guardar/compartir el informe o vincularlo a una solicitud comunitaria. Si no hay datos suficientes, indicarlo; no inventar resultados ni estimaciones.
- Panel de solicitudes: investigadores y organizaciones verificadas pueden consultar necesidades comunitarias, revisar antecedentes, aceptar casos según sus permisos, registrar avances y publicar resultados documentados. Un caso puede abrir el Laboratorio en su área de interés y regresar al Mapa comunitario.
- Mediciones: ficha por muestra con medio, analito, valor, unidad, coordenadas o ubicación autorizada, fecha, método, límite de detección cuando exista, institución, documento y estado de verificación.
- Biblioteca de estudios y datasets: buscador y filtros por tema, zona, año, tipo de fuente y disponibilidad; vincular investigaciones a ubicaciones cuando sea posible. Conservar fuentes originales y distinguir datos descargables de meras referencias.
- El Mapa comunitario es ligero y accesible; el Laboratorio es una herramienta científica principalmente online, con modo 2D simplificado si el dispositivo no soporta el globo 3D. No exigir que una comunidad utilice herramientas avanzadas para consultar su información o solicitar apoyo.

#### 2.4.1. Qué mide un satélite

Los satélites ópticos convencionales no identifican directamente las concentraciones de mercurio disuelto. Miden reflectancia y otras propiedades ópticas que permiten estimar características ambientales, como sedimentos suspendidos, cambios en cuerpos de agua y pérdida de vegetación. Parte del mercurio puede asociarse a partículas y materia orgánica; estas relaciones dependen del contexto y no son universales. El metilmercurio requiere atención separada.

El propósito inicial es localizar zonas donde conviene tomar muestras. Estimar concentraciones de Hg es un objetivo experimental condicionado a disponer de datos compatibles y validación independiente.

### 2.5. Infórmate (educación y prevención)

**Decisión de diseño:** una colección de cartas educativas pequeñas, ilustradas y deslizables. Debe informar de forma amena con el mínimo de texto necesario, sin convertir la pestaña en un artículo, un listado de PDFs o un curso obligatorio. Público prioritario: comunidades rurales, familias y personas sin formación científica, pero abierta a todos.

#### 2.5.1. Experiencia visual y navegación

- Carrusel de cartas compactas, con una ilustración protagonista, título breve y una sola idea principal. Deslizar horizontalmente en celular; flechas anterior/siguiente y navegación por teclado en escritorio. No avanzar automáticamente. Mostrar contador de cartas o indicadores discretos y permitir cambiar de tema sin recorrer todas las cartas.
- Texto recomendado: título de 2–6 palabras y cuerpo de 15–35 palabras, ampliable solo cuando sea imprescindible por seguridad. Si una explicación necesita más espacio, dividirla en varias cartas. Fuente oficial visible en pequeño o bajo un botón «Ver fuente»; la información crítica no debe quedar escondida.
- Categorías como filtros compactos: Oro, Mercurio, Agua, Salud, Prevención, Naturaleza, Minería responsable y Comunidad. Incluir una opción «Todas».
- Ilustraciones propias coherentes: río, pepitas de oro, peces, manos, gotas de agua, hojas, comunidades y elementos científicos simplificados. Paleta ambiental de crema, verde suave y detalles dorados; contraste suficiente para texto. Evitar estética infantil, exceso de texto, bordes pesados y efectos que distraigan.
- En la parte inferior de la sección, incorporar una **planta dibujada suavemente**, con tallo y hojas orgánicas en tonos verdes desaturados. Puede crecer sutilmente conforme se recorren las cartas como recurso decorativo opcional, no como requisito para acceder a información. Mantenerla detrás o debajo del contenido, sin tapar texto, botones ni controles del celular. Alternativa estática con movimiento reducido y sin dependencia de 3D.
- Diseño mobile-first, cartas descargables y disponibles offline con la PWA (fecha de actualización y fuente guardadas), imágenes ligeras en SVG/WebP y sin dependencias de conexión para leer contenido ya descargado. Posible lectura en audio e idiomas originarios revisados por las comunidades como ampliación, no requisito del MVP.

#### 2.5.2. Catálogo inicial de cartas (temas y textos borrador)

Las frases siguientes son propuestas editoriales que deben revisarse con fuentes oficiales y especialistas antes de publicar. Priorizar agua, mercurio y prevención en el MVP; ampliar progresivamente al resto de temas de Gold4Good. No usar cifras o umbrales sin verificar norma, matriz y contexto.

| Tema | Título de carta | Texto breve propuesto |
|---|---|---|
| Oro | ¿Por qué el oro? | El oro se usa en joyería, tecnología y actividades económicas. Su extracción debe proteger la salud de las personas y el ambiente. |
| Oro | Oro y mercurio | En parte de la minería artesanal se utiliza mercurio para separar oro de otros materiales. Su liberación puede contaminar aire, suelo y agua. |
| Oro | Origen responsable | Conocer el origen del oro y las condiciones de extracción ayuda a promover cadenas de suministro responsables. |
| Mercurio | ¿Qué es el mercurio? | Es un elemento químico tóxico. Algunas de sus formas pueden afectar la salud incluso cuando no se ven ni se huelen. |
| Mercurio | Del suelo al río | El mercurio liberado al ambiente puede llegar al agua y los sedimentos, y transportarse a otros lugares. |
| Mercurio | Mercurio en el aire | Respirar vapores de mercurio es una vía de exposición importante en actividades que lo utilizan. Evita acercarte a zonas de procesamiento sin protección adecuada. |
| Mercurio | Metilmercurio | Algunos microorganismos transforman mercurio en metilmercurio, una forma que puede acumularse en organismos acuáticos. |
| Mercurio | Del río al plato | El metilmercurio puede acumularse en peces y aumentar a través de la cadena alimentaria. Las recomendaciones de consumo deben adaptarse a cada región. |
| Agua | Agua transparente | Que el agua se vea limpia no significa que esté libre de contaminantes. Algunos solo se detectan mediante análisis. |
| Agua | Hervir no basta | Hervir el agua ayuda a eliminar muchos microorganismos, pero no elimina el mercurio ni otros metales disueltos. |
| Agua | ¿Qué hay en mi agua? | Consulta análisis de tu fuente de agua. Si no existen datos recientes, solicita una investigación. |
| Agua | Una prueba no basta | Un resultado de mercurio dentro del límite no demuestra que el agua sea potable: también hay que evaluar otros contaminantes. |
| Agua | Ante una sospecha | Si existe una alerta de contaminación química, sigue las indicaciones de la autoridad sanitaria y utiliza una fuente alternativa segura para beber y cocinar. |
| Agua | Pruebas confiables | Una medición debe identificar la sustancia analizada, la fecha, la fuente y el método. Una fotografía no reemplaza un análisis químico. |
| Salud | ¿Cómo entra al cuerpo? | Podemos exponernos al mercurio al respirar vapores o consumir alimentos contaminados, entre otras vías. |
| Salud | El sistema nervioso | La exposición al mercurio puede afectar el sistema nervioso y otros órganos. Los efectos dependen de la forma, dosis y duración de la exposición. |
| Salud | Embarazo e infancia | El desarrollo del sistema nervioso de fetos y niños es especialmente vulnerable al metilmercurio. Consulta recomendaciones sanitarias locales. |
| Salud | Pescado y nutrición | El pescado aporta nutrientes importantes. Sigue orientaciones locales sobre especies y consumo para reducir la exposición sin perder sus beneficios. |
| Salud | Busca orientación | Si sospechas exposición al mercurio, consulta a un centro de salud. Los síntomas por sí solos no permiten confirmar una intoxicación. |
| Prevención | No manipules mercurio | No manipules mercurio ni intentes realizar experimentos caseros con él. Ante un derrame, solicita orientación especializada. |
| Prevención | Protección en el trabajo | Reducir la exposición laboral requiere procesos más seguros, controles técnicos, capacitación y medidas de protección adecuadas. |
| Prevención | Mujeres en la minería | La seguridad laboral debe proteger a todas las personas y considerar los riesgos específicos que enfrentan las mujeres, incluidas las embarazadas. |
| Naturaleza | Ríos conectados | Las cuencas conectan territorios: una alteración aguas arriba puede afectar lugares aguas abajo. |
| Naturaleza | Bosques y agua | Los bosques ayudan a proteger suelos, ecosistemas y fuentes de agua. La pérdida de vegetación puede incrementar la erosión. |
| Naturaleza | Sedimentos | Los sedimentos pueden transportar contaminantes, pero el agua turbia no demuestra por sí sola que contenga mercurio. |
| Minería responsable | Alternativas al mercurio | Existen tecnologías de recuperación de oro sin mercurio. Su elección depende de las características del mineral y del asesoramiento técnico. |
| Minería responsable | Minamata | El Convenio de Minamata promueve la protección de la salud y el ambiente frente a emisiones y liberaciones de mercurio. |
| Comunidad | Tu comunidad informa | Comparte observaciones y consultas en el mapa. Un reporte ayuda a priorizar investigaciones, pero no confirma contaminación. |
| Comunidad | ¿Quién lo confirma? | Los análisis químicos adecuados y la evidencia científica respaldan las conclusiones sobre mercurio. Los votos no sustituyen las mediciones. |
| Comunidad | Desde el espacio | Los satélites permiten observar cambios ambientales y orientar investigaciones. No certifican directamente si el agua contiene mercurio. |
| Comunidad | Solicita un análisis | Si tu comunidad no tiene información suficiente, crea una solicitud para que investigadores u organizaciones participantes puedan atenderla. |
| Comunidad | Sin internet | Guarda tu reporte y compártelo por QR. Cuando alguien recupere conexión, podrá sincronizarlo con el mapa. |
| Comunidad | Donar para investigar | Las campañas permiten financiar mediciones y acciones preventivas. Los resultados y desembolsos deben respaldarse con evidencias. |

#### 2.5.3. Contenido, verificación y mantenimiento

- Fuentes de partida: OPS/OMS («Mi comunidad se cuida del mercurio»), planetGOLD, Convenio de Minamata y recursos oficiales de Gold4Good. Consultar autoridades bolivianas para recomendaciones y normas locales. La colección es un alcance editorial inicial, no una revisión exhaustiva de todos los subdesafíos oficiales.
- Modelo editorial sugerido: `id`, `category`, `title`, `shortText`, `illustration`, `sourceTitle`, `sourceUrl`, `reviewedAt`, `locale`, `order`, `status`, `optionalAction`. Publicar contenido revisado; conservar historial y actualizar paquetes offline cuando existan cambios.
- No pedir autenticación para consultar las cartas. En cartas pertinentes, ofrecer enlaces discretos al Mapa comunitario, Laboratorio o Donaciones; evitar formularios, quizzes obligatorios o gamificación que trivialice riesgos sanitarios.
- No realizar diagnósticos, certificar potabilidad, indicar consumos personalizados ni sugerir remedios domésticos para eliminar mercurio. Si un mensaje de salud exige mayor explicación, mantener la advertencia esencial en la carta y vincular a recomendaciones oficiales.

### 2.6. Donaciones e impacto

La pestaña de Donaciones no debe verse como una página genérica de ONG ni como un panel frío de recaudación. Debe ser **altamente interactiva**, emocionalmente clara y coherente con toda la identidad del proyecto. La idea visual central es que **el oro se transforma en vida**.

#### 2.6.1. Concepto narrativo y visual

Mensaje de entrada sugerido:

> **Hay cosas que valen más que el oro.**
> Transformemos nuestros recursos en agua, conocimiento y protección para las comunidades.

La escena de apertura puede mostrar una pepita de oro 3D o una forma dorada flotante. A medida que el usuario avanza, el oro se desintegra en partículas doradas, estas se convierten en una gota de agua y, finalmente, de esa gota crece una planta. El oro representa recursos; el agua representa protección; la planta representa vida; y el río representa transparencia.

La experiencia debe sentirse elegante, ambiental y humana. Evitar una apariencia de exchange, wallet especulativa o campaña caritativa genérica. La interacción puede apoyarse en GSAP, Three.js y SVG animados, con una versión más ligera para dispositivos modestos.

#### 2.6.2. Primera interacción: «¿Qué quieres proteger?»

En lugar de pedir dinero inmediatamente, primero se pregunta al usuario **qué quiere ayudar a conseguir**. Las opciones iniciales sugeridas son:

| Opción | Sentido | Visual sugerido |
|---|---|---|
| Investigar | Financiar análisis de mercurio, toma de muestras y estudios científicos | Tubos de ensayo, frascos, goteros, agua y detalles dorados |
| Proteger | Apoyar acceso a agua segura e intervenciones preventivas | Gotas de agua, manos, hojas, comunidad |
| Educar | Llevar información y capacitación a comunidades rurales | Libro abierto, tarjetas educativas, brotes, luz |
| Restaurar | Apoyar recuperación ambiental y cuidado del entorno | Río, peces, plantas, paisaje vivo |

Estas opciones pueden presentarse como tarjetas ilustradas, con la misma línea suave, natural y editorial de la pestaña Infórmate, pero reforzando la presencia de dorados.

#### 2.6.3. Interacción de aporte: «Haz crecer el cambio»

Después de elegir una causa, el usuario selecciona cuánto desea aportar. El control no debe sentirse como una transacción seca. La propuesta visual es un control deslizante o selector que, al aumentar el monto, hace aparecer partículas doradas que se convierten en gotas de agua y alimentan una planta o jardín.

Texto sugerido:

> **Haz crecer el cambio**
> Selecciona tu aporte.

La animación es simbólica; no representa impacto ambiental cuantificado ni sugiere que la donación esté respaldada por oro físico. El objetivo es transmitir que los recursos se convierten en protección real.

#### 2.6.4. Campañas conectadas con el mapa comunitario

Cada campaña debe estar vinculada a una comunidad, solicitud de investigación o necesidad concreta detectada en la plataforma. No crear campañas genéricas desvinculadas de casos reales.

Ejemplo conceptual:

- **Protejamos las aguas del Beni**
- Una comunidad solicita análisis especializados para conocer la presencia de mercurio en sus fuentes de agua.
- Meta visible, progreso, comunidad relacionada, estado y responsables.

Cada campaña debe mostrar un pequeño camino hacia la solución, por ejemplo:

1. Recolección de muestras.
2. Análisis de laboratorio.
3. Publicación de resultados.
4. Acciones preventivas.

La interfaz debe permitir ir del Mapa comunitario a la campaña y de la campaña de regreso a la comunidad, para mantener la relación causa–evidencia–acción.

#### 2.6.5. Transparencia visual: el río de la donación

En vez de una tabla aburrida de transacciones, la transparencia puede representarse mediante un **río ilustrado o flujo visual**. Cada aporte entra al río y avanza por diferentes etapas. El usuario puede tocar una etapa para ver:

- transacciones asociadas,
- evidencias cargadas,
- organización responsable,
- hitos completados,
- verificaciones y documentos.

La blockchain y los contratos por hitos respaldan el registro financiero y la liberación de fondos, pero el diseño no debe centrarse en la complejidad técnica, sino en hacer comprensible el recorrido del aporte.

#### 2.6.6. Jardín o bosque colectivo

Incluir un jardín o bosque colectivo donde cada donación completada pueda hacer aparecer una planta virtual (agrupar visualmente aportes si hay muchos). No equivale a un árbol plantado ni a una intervención ejecutada; identificarlo como representación simbólica de participación. No usar rankings competitivos de quién dona más. El objetivo es representar colaboración, no estatus.

Esta sección serviría como una visualización emocional del impacto agregado de la comunidad de donantes, manteniendo el tono contemplativo y ambiental del proyecto.

#### 2.6.7. Relación con Stellar y Trustless Work

Una organización verificada propone una campaña vinculada a un caso aceptado, con presupuesto, etapas, criterio de éxito, verificador independiente y política de fondos no utilizados o devolución. No crear campañas automáticamente por un resultado de IA. La liberación requiere revisión documentada, reglas de disputa y control de conflictos de interés. Mantener datos personales, informes sensibles y coordenadas vulnerables fuera de la cadena; utilizar referencias opacas no sensibles.

La arquitectura propuesta se mantiene:

- Stellar para transacciones,
- USDC para el activo,
- Trustless Work (o mecanismo equivalente) para hitos y liberación de fondos.

Para la hackathon, usar testnet y dejar absolutamente claro cuándo un flujo financiero es demostrativo. La blockchain no valida la ciencia ni sustituye la verificación de campo; su función es aportar trazabilidad, control de fondos y transparencia.

#### 2.6.8. Principios de diseño para Donaciones

- Debe ser la pestaña **más emocionalmente interactiva** del proyecto, sin perder sobriedad.
- Reutilizar la estética suave, botánica y editorial ya definida para Infórmate.
- Incorporar dorados, agua, plantas y transiciones fluidas.
- Evitar un tono triste o culpabilizante.
- Evitar saturación visual, métricas vacías o componentes financieros agresivos.
- Permitir que el usuario comprenda rápidamente **qué problema ayuda a resolver**.
- Hacer visible el vínculo entre comunidad, investigación, resultado e intervención.

Paleta propia de Donaciones: oro #C7A354, bosque #244B38, agua #83B6B0, marfil #F4F1E6 y vida #A9BF92. El selector de aporte muestra USDC y admite monto personalizado; ejemplos rápidos 5, 10, 25, 50 y 100 son sugerencias de interfaz, no montos obligatorios. Usar GSAP/Three.js para transiciones y SVG para plantas/río; versión ligera y accesible.

#### 2.6.9. Resumen conceptual

La esencia visual y narrativa de la pestaña es:

- **El oro** representa los recursos.
- **El agua** representa la protección.
- **La planta** representa la vida.
- **El río** representa la transparencia.

El flujo ideal de experiencia sería:

1. El usuario entra y comprende que el verdadero valor del oro está en proteger la vida.
2. Elige qué quiere proteger.
3. Define su aporte en una interacción visual agradable.
4. Explora una campaña conectada a una necesidad real.
5. Sigue el recorrido del dinero mediante un río transparente.
6. Observa cómo las contribuciones se convierten en crecimiento colectivo.

### 2.7. Autenticación y roles

| Rol | Permisos principales |
|---|---|
| Visitante | Consultar mapa, laboratorio, educación y campañas públicas |
| Usuario registrado | Publicar, comentar, corroborar observaciones, solicitar investigaciones, donar y guardar casos |
| Representante comunitario verificado | Coordinar y representar solicitudes con consentimiento |
| Investigador verificado | Revisar evidencia, documentar métodos, cargar mediciones y responder consultas |
| Laboratorio verificado | Emitir o adjuntar resultados dentro de su alcance técnico |
| Organización/ONG verificada | Aceptar casos, coordinar análisis, proponer campañas y reportar avances |
| Autoridad verificada | Publicar recomendaciones oficiales y coordinar respuestas |
| Administrador/moderador | Verificar identidades y permisos, moderar, revisar trazabilidad y resolver disputas |

La verificación de identidad y la validez científica de un resultado son procesos distintos. Aplicar permisos por recurso, auditoría de operaciones y moderación. Un rol no autoriza a declarar contaminación sin documentación pertinente.

### 2.8. Acceso rural sin internet y transferencia por QR (Gold2 Offline)

**Decisión:** priorizar a las comunidades rurales e indígenas, sin restringir la plataforma a ellas. La web también estará disponible para usuarios urbanos, investigadores e instituciones de cualquier región. El acceso rural no exigirá comprar hardware adicional: se utilizarán celulares existentes y conectividad ocasional. Un servidor comunitario físico no es requisito del MVP.

**Modo offline (PWA):** tras la primera descarga con conexión, permitir consultar el mapa ligero y las fichas de la comunidad previamente guardados, leer recomendaciones e investigaciones descargadas, redactar reportes, adjuntar fotografías localmente y preparar solicitudes de investigación. Mostrar fecha de última actualización, estado de conexión y operaciones pendientes. No mostrar datos antiguos como evidencia de seguridad actual. El globo satelital con datos nuevos, las respuestas remotas y las donaciones requieren conexión.

**Transferencia de reportes por QR sin internet:**

1. El habitante crea un reporte o una solicitud desde la PWA sin conexión.
2. La aplicación genera un QR que contiene los datos breves del reporte, no solamente una URL que requiera internet.
3. Otro habitante o un promotor comunitario escanea el QR desde su propia aplicación, revisa los datos y acepta importarlos. El reporte queda guardado localmente y pendiente de sincronización.
4. Cuando el receptor recupera internet, envía el reporte al servidor nacional. Este verifica permisos, evita duplicados y registra quién lo creó y quién lo transportó, cuando se pueda acreditar. La persona que transporta el reporte no se convierte en autora ni validadora científica.
5. El caso aparece en el mapa comunitario; una solicitud de investigación puede entrar en el flujo institucional descrito en la sección 2.3. Las respuestas se descargan cuando vuelva a haber conexión.

**Datos del QR:** versión del formato, identificador único del reporte (UUID), tipo de reporte/solicitud, identificador de comunidad o fuente de agua, ubicación aproximada cuando proceda, fecha, descripción breve y referencia de autoría si está disponible y autorizada. Usar un formato compacto con límite de tamaño; no incluir fotos, credenciales, tokens, datos médicos ni información personal sensible. Los archivos grandes podrán compartirse como paquetes separados mediante las funciones de intercambio del sistema operativo, si se implementa esa opción. Las fotografías pueden permanecer en el teléfono original hasta su sincronización.

**Seguridad y confianza:** el QR es un canal de transporte, no una prueba de identidad, autenticidad ni contaminación. Validar el formato al escanear, pedir confirmación antes de importar, deduplicar por UUID y mantener la procedencia. Si se incorporan firmas digitales, verificarlas sin confundir integridad con veracidad científica. Los reportes importados sin autoría verificable se marcan como tales y se someten a revisión; nunca se elevan automáticamente a evidencia confirmada. No ejecutar enlaces ni contenido arbitrario de un QR. Mantener las reglas de roles y evidencia al sincronizar.

**Accesibilidad:** permitir que un representante comunitario registre solicitudes de familias sin celular, con consentimiento. Diseñar formularios ligeros, iconos claros, lenguaje sencillo y, posteriormente, traducciones a idiomas originarios y apoyo de audio revisados con las comunidades.

**Costo:** sin compra de electrónica adicional para la demo; herramientas de software abiertas o gratuitas. No implica costo cero de desarrollo, celulares, conectividad, infraestructura ni mantenimiento. La transferencia QR funciona entre dispositivos cercanos; para llegar a investigadores remotos, al menos un dispositivo deberá conectarse eventualmente a internet.

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

## 6. Arquitectura técnica propuesta (ajustable al repositorio)

| Capa | Stack candidato |
|---|---|
| Frontend | React + TypeScript; diseño responsive, animaciones con carga progresiva |
| Mapa comunitario | MapLibre GL JS o equivalente, capas ligeras y fichas de localidades |
| Laboratorio 3D | CesiumJS o equivalente, imágenes geoespaciales y comparación temporal |
| Backend | NestJS, API REST, permisos por recurso y auditoría |
| Base de datos | Supabase/PostgreSQL + PostGIS; Supabase Auth como opción |
| Procesamiento | Python, GeoPandas, rasterio, scikit-learn; Earth Engine o Copernicus según acceso |
| Archivos | Almacenamiento con políticas de acceso, metadatos y documentos de laboratorio |
| Blockchain | Stellar testnet, USDC de prueba, Trustless Work si está disponible |
| Notificaciones | Bandeja de entrada y correo a organizaciones participantes; reintentos y seguimiento |
| Despliegue | Docker; procesamiento por lotes para no depender de cálculos pesados en el navegador |
| Rural | PWA + Service Worker + IndexedDB (Dexie.js como opción), mapas descargables, cola persistente, QR de datos y sincronización manual/automática cuando esté disponible |

El mapa 2D debe ser usable sin cargar el globo 3D. Evitar exposición de claves privadas o credenciales en frontend. Aplicar control de acceso, validación de archivos, límites de publicación, logs y copias de seguridad.

### 6.1. Modelo de datos conceptual

- `users`, `profiles`, `organizations`, `organization_members`, `role_verifications`
- `communities`, `water_sources`, `sampling_sites`
- `posts`, `comments`, `corroborations`, `attachments`, `moderation_events`
- `research_requests`, `request_supports`, `request_assignments`, `request_events`
- `samples`, `measurements`, `lab_reports`, `evidence_reviews`
- `scientific_sources`, `datasets`, `satellite_assets`, `environmental_indicators`, `model_runs`, `predictions`
- `campaigns`, `milestones`, `donations`, `escrow_transactions`, `milestone_reviews`
- `notifications`, `audit_logs`
- Cola local `offline_outbox`, `qr_imports` y UUID de operaciones para idempotencia; registro de procedencia y acuses de sincronización

Entidades clave: una comunidad puede tener múltiples fuentes de agua; cada fuente, múltiples puntos y muestras; una medición pertenece a una muestra y analito; una solicitud puede referenciar múltiples evidencias y vincularse a una campaña. Una predicción nunca se guarda como medición de laboratorio.

Campos mínimos de una medición: id, matriz, analito/forma química, valor, unidad, calificador (detectado/no detectado/etc.), límite de detección/cuantificación si disponible, fecha, ubicación, método, laboratorio, referencia, estado de revisión y alcance. Guardar valores originales y normalizados. Datos de salud individuales no se publican ni se registran en blockchain.

### 6.2. APIs sugeridas

- `GET /communities`, `GET /communities/:id`, `GET /water-sources/:id/measurements`
- `POST /posts`, `POST /posts/:id/comments`, `POST /posts/:id/corroborations`
- `POST /research-requests`, `POST /research-requests/:id/support`
- `POST /research-requests/:id/assignments`, `PATCH /research-requests/:id/status`
- `POST /samples`, `POST /measurements`, `POST /measurements/:id/reviews`
- `GET /laboratory/satellite`, `GET /laboratory/indicators`, `GET /laboratory/predictions`, `GET /scientific-sources`
- `POST /campaigns`, `POST /campaigns/:id/donations`, `POST /milestones/:id/reviews`
- `POST /sync/operations` y `GET /sync/communities/:id` (orientativas): envío idempotente de reportes pendientes y actualización de datos comunitarios; validar permisos y resolver conflictos sin sobrescribir evidencia verificada.

Rutas orientativas, no contrato definitivo. Restringir mutaciones según rol y autorización; el backend debe aplicar las reglas de evidencia y transición de estados, no únicamente la interfaz.

## 7. MVP para Gold4Good

### P0 — Indispensable

- [ ] Inicio funcional con narrativa «El lado invisible del oro», seis escenas o alternativa ligera, fuentes y enlaces a los cuatro módulos.
- [ ] Mapa comunitario con localidades reales, búsqueda y panel de comunidad/fuente de agua.
- [ ] Autenticación y roles de demostración (ciudadano, investigador/organización, moderador).
- [ ] Publicación, comentarios, corroboración/discrepancia y distinción de evidencia.
- [ ] Solicitud de investigación, asignación a una organización demo, cambio de estado y publicación de resultado.
- [ ] Laboratorio 3D con al menos una zona piloto y una imagen o capa satelital real con fecha/fuente.
- [ ] Biblioteca científica con referencias y al menos algunos registros históricos verificables, si se obtienen.
- [ ] Infórmate: carrusel de cartas pequeñas, ilustraciones, texto mínimo, filtros temáticos, fuentes y planta decorativa inferior. Priorizar las cartas sobre oro, mercurio, agua, salud y prevención; revisar contenido y probar lectura móvil/offline.
- [ ] Campaña asociada a una solicitud y flujo de donación/seguimiento; elección de causa, selector de aporte con planta simbólica y río de hitos; testnet si se consigue integrar.
- [ ] Etiquetado explícito de datos ficticios, predicciones, mediciones y alianzas demo.

### P1 — Diferenciadores si hay tiempo

- [ ] Pulir animaciones 3D de Inicio y Donaciones, jardín colectivo y transiciones entre módulos, sin sacrificar accesibilidad.
- [ ] Comparador satelital por fechas, selector de capas y cálculo reproducible de índices.
- [ ] Modo de investigación libre: dibujar un polígono, consultar evidencia y generar un informe con fuentes y limitaciones, vinculado a solicitudes cuando corresponda.
- [ ] Descargar y auditar datasets de Hg; emparejar muestras con imágenes.
- [ ] Entrenar y evaluar modelo experimental; publicar resultados solo si son defendibles.
- [ ] Escrow testnet con liberación por hitos y verificador.
- [ ] Notificaciones reales dentro del sistema y formularios ligeros para uso rural.
- [ ] Diferenciador rural prioritario: PWA con reporte offline, exportación e importación por QR entre dos celulares y sincronización posterior sin duplicados. Probar en modo avión real, con la aplicación previamente descargada y permisos de cámara disponibles.

### P2 — Desarrollo posterior

- [ ] Convenios reales con organizaciones, comunidades y laboratorios.
- [ ] Validación científica en Bolivia y recolección de muestras nuevas.
- [ ] Hardware o kit comunitario validado, si demuestra viabilidad.
- [ ] Ampliar el modo offline (mapas completos por región, actualización de paquetes, conflictos, intercambio de archivos grandes) y soporte multilingüe revisado localmente.
- [ ] Seguimiento longitudinal, alertas oficiales y financiamiento operativo real.

**Zona piloto sugerida:** cuenca del Beni o una localidad con evidencia georreferenciada suficiente. La elección final depende de disponibilidad y permisos de datos, no de una afirmación previa de contaminación.

## 8. Demostración para el pitch

Escenario ilustrativo (no atribuir contaminación real a una comunidad sin evidencia):

1. Un habitante entra al Mapa comunitario y pregunta si existe información sobre Hg en su fuente de agua.
2. Otros habitantes corroboran una observación de actividad minera o sedimentos. El sistema muestra roles, evidencia y estado «sin confirmar».
3. Se abre el Laboratorio y se muestran imágenes reales de la zona, cambios ambientales y estudios disponibles. Si existe una predicción validada, mostrar sus métricas y limitaciones; si no, mostrar únicamente indicadores.
4. El habitante solicita una investigación; una cuenta institucional demo recibe y acepta el caso.
5. La institución propone un presupuesto y una campaña asociada; un donante aporta fondos de prueba en Stellar y consulta los hitos.
6. Se registra un informe real debidamente autorizado o un informe de demostración claramente marcado. El mapa actualiza el estado de la muestra, no la potabilidad de toda la comunidad.
7. Se muestra una recomendación oficial y el seguimiento de la intervención.

**Demostración rural adicional (prioritaria si se completa):** con dos celulares que ya tengan la PWA instalada, activar modo avión, crear una solicitud en el primero, generar un QR y escanearlo desde el segundo. Mostrar que el reporte se guarda sin internet. Recuperar conexión solo en el segundo, sincronizar y mostrar el mismo caso en el mapa nacional y el panel institucional demo, sin duplicados. Si el flujo no está implementado, presentarlo explícitamente como propuesta, no como funcionalidad existente.

La sorpresa del pitch no debe depender de un experimento de color genérico: es la conexión funcional entre comunidad, satélites, ciencia y financiamiento. Si se cuenta con un resultado de laboratorio auténtico o una evaluación reproducible del modelo, usarlo como prueba central y explicar su alcance.

## 9. Sostenibilidad e impacto

Acceso público gratuito a información esencial. Posibles fuentes de sostenimiento: cooperación internacional, convenios universitarios e institucionales, fondos ambientales y servicios especializados de análisis y monitoreo. No asumir contratos, subvenciones o comisiones acordadas. Las donaciones destinadas a casos deben administrarse separadamente según reglas transparentes y requisitos legales aplicables.

Indicadores propuestos: comunidades con información accesible, fuentes con mediciones verificadas, solicitudes aceptadas y concluidas, tiempo hasta primera respuesta, campañas financiadas, intervenciones verificadas, cobertura y vigencia de datos, desempeño del modelo e incidencias de desinformación. No atribuir reducciones de exposición o mejoras de salud sin medición de resultados.

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

## 11. Decisiones pendientes

- Nombre definitivo Gold2… e identidad visual.
- Dataset y zona piloto con suficientes pares de muestra e imagen.
- Confirmar norma NB 512 vigente y criterios por matriz/uso con especialistas.
- Definir el alcance real de IA después de auditar y evaluar los datos.
- Confirmar organizaciones participantes, procedimientos de consentimiento y capacidad de análisis.
- Definir verificador de hitos, tratamiento de fondos sobrantes y condiciones de campañas reales.
- Confirmar stack final según el repositorio y tiempo disponible.
- Decidir si se construye hardware después de una evaluación de costo, utilidad y seguridad; no es necesario para la transferencia comunitaria offline por QR.
- Probar compatibilidad de la PWA y escáner QR en celulares Android/iOS de gama baja, tamaño máximo del reporte y sincronización tras recuperar conexión.

---

**Resumen:** una red comunitaria que identifica necesidades, un laboratorio virtual que organiza evidencia y analiza el territorio, y un sistema transparente de financiamiento que permite investigar y actuar. El objetivo es facilitar la prevención y reducir riesgos, sin confundir popularidad, observación satelital o predicciones experimentales con evidencia química confirmada.
