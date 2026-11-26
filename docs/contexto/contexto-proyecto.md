# Contexto y memoria de decisiones — Gold2…

Registro de contexto del proyecto conversado el 25 de noviembre de 2026, para transferir a Claude Code. No es una exportación de memorias personales ajenas al proyecto. Leer junto con `plan.md`.

## Qué queremos construir y por qué

Gold4Good Bolivia: plataforma ambiental centrada en el mercurio asociado con la minería aurífera. Público prioritario: comunidades rurales e indígenas, pero el producto es abierto a cualquier usuario, investigador o institución. El proyecto conecta necesidades comunitarias, ciencia, prevención y recursos. El objetivo no es vender un detector ficticio ni una web de cripto.

## Decisiones vigentes (aprobadas en la conversación)

- Marca temporal Gold2…; se prefiere la estructura Gold2 + palabra. Gold2Life y Gold2Vision son candidatos, no una elección final.
- Cinco pestañas públicas, en este orden: Inicio, Mapa comunitario, Laboratorio, Infórmate, Donaciones. Autenticación y perfil/panel privado se mantienen. No crear una sexta pestaña de investigaciones: la biblioteca vive en Laboratorio.
- Inicio: «El lado invisible del oro», lingote formado por oro líquido, gota de mercurio detrás, descenso al río, ascenso al espacio/Bolivia, cuatro paneles de solución, cierre en naturaleza. La transformación oro/agua/planta pertenece a Donaciones.
- Mapa comunitario: escoger o buscar comunidad y fuente de agua, consultar publicaciones, preguntar, responder, corroborar/discrepar con roles visibles. Un ciudadano corrobora observaciones, no confirma químicamente Hg. Diferenciar resultados de laboratorio, estimaciones, reportes y falta de información. Si no hay evidencia, solicitar investigación.
- Las solicitudes se dirigen a una red de organizaciones participantes según cobertura y especialidad; WCS/CPILAP, UMSA, IBMETRO, planetGOLD y otros son candidatos, no aliados confirmados. Mostrar flujo de aceptación, presupuesto, análisis, resultado y seguimiento.
- Gold2 Offline: PWA con datos descargados, creación de reportes offline, exportación/importación del contenido por QR entre teléfonos, y sincronización cuando uno recupere internet. No comprar electrónica ni exigir servidor comunitario. Representante puede ayudar a familias sin celular. QR no valida científicamente ni autentica por sí solo.
- Laboratorio: globo 3D centrado en Bolivia, exploración global, capas, satélites, comparador temporal, mediciones, estudios, solicitudes y modo de investigación libre con polígono e informe. Mapa comunitario ligero y laboratorio científico avanzado son distintos pero se enlazan.
- Infórmate: cartas pequeñas ilustradas, deslizables, texto mínimo (15–35 palabras), categorías, fuente consultable, planta dibujada suave en la parte inferior que puede crecer al recorrerlas. Offline y sin login para leer. Catálogo inicial completo en plan.
- Donaciones: experiencia interactiva oro → agua → planta; «Hay cosas que valen más que el oro»; elegir Investigar, Proteger, Educar, Restaurar; selector de monto con planta que crece; campañas vinculadas al mapa; río visual de trazabilidad; jardín colectivo sin ranking. Stellar/USDC/Trustless Work como propuesta, testnet para la demo.

## Ideas exploradas y descartadas como requisito actual

- No hacer una foto del agua y afirmar contaminación. No usar turbidez, pH, conductividad ni un cambio de color genérico como prueba de Hg.
- Se exploraron dispositivos electroquímicos, cartuchos de oro/nanopartículas y ESP32 con sensores. El hardware no es requisito, y debe validarse científicamente antes de desplegarse. No manipular Hg en el pitch. Se discutió un presupuesto preliminar de Bs 1.500–2.000 para explorar lector y análisis, sin cotización ni validación.
- El servidor Wi-Fi comunitario físico quedó como posibilidad posterior, no requisito. El QR y la PWA son la alternativa elegida.
- No separar el mapa científico en dos pestañas de mundo y observatorio. No hacer de Infórmate una biblioteca de PDFs. No repetir la misma animación principal en Inicio y Donaciones.

## Preferencias de experiencia

Diseño cuidado, creativo, con narrativa 3D y paneles bien estructurados. Estética oro/naturaleza/ciencia, no interfaz genérica de SaaS ni exchange. Animaciones suaves y transiciones con propósito; evitar saturación, texto excesivo, botones falsos y recursos pesados para población rural. Navegación utilizable en teléfonos económicos; alternativas 2D y modo de movimiento reducido.

## Qué sabemos y qué falta

Existen artículos y datasets candidatos (ver ciencia-datos.md); aún no se acredita descarga, entrenamiento ni precisión del modelo. No hay acuerdos institucionales confirmados. El nombre, zona piloto exacta, disponibilidad de datos y versión oficial de norma se deben cerrar con evidencia. No confundir diseño aprobado con funcionalidad ya implementada. El repositorio actual, credenciales y herramientas deben inspeccionarse al iniciar Claude Code, sin asumir que ya existen.
