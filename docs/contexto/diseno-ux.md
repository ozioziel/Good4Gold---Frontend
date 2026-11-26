# Dirección artística y experiencia de usuario

## Sistema visual

Ambiental, cinematográfico, científico y humano. Oro como valor, plata como riesgo del Hg, agua como investigación/protección, verde como vida. Fondos oscuros para escenas 3D y crema/marfil para educación y partes del flujo comunitario. Tipografía legible, poco texto, ilustraciones botánicas suaves, capas y paneles flotantes sin saturar. Los colores de riesgo deben tener etiquetas e iconos, no depender del color solo. Mantener navegación consistente y funcional.

## Inicio (storyboard aprobado)

| Escena | Visual y acción de scroll | Texto |
|---|---|---|
| 1 | Oro líquido se une en lingote flotante sobre negro; cámara/cursor sutil | Conocemos el valor del oro. |
| 2 | Giro revela gota plateada de Hg detrás del lingote; transición a paisaje minero amazónico | Pero no siempre conocemos su costo. |
| 3 | Cámara atraviesa río: peces, sedimentos, partículas simbólicas; datos con fuente | Una amenaza que no siempre podemos ver. |
| 4 | Ascenso bosque → atmósfera → globo 3D enfocado en Bolivia, puntos e identidad del proyecto | Lo invisible no tiene por qué permanecer desconocido. |
| 5 | Globo al fondo y cuatro paneles flotantes hacia Mapa, Laboratorio, Infórmate, Donaciones | Una comunidad conectada / Un laboratorio sin fronteras / Conocimiento que protege / Recursos que transforman |
| 6 | Amanecer dorado sobre río y bosque | El oro tiene valor. La vida no tiene precio. |

CTA final: Explorar mi comunidad / Explorar laboratorio. Paleta #181A17, #D4AF55, #A4ADB3, #507F98, #426C4A, #F3F0E4. Three.js/R3F + GSAP ScrollTrigger + shaders como candidatos. Navegación y opción de saltar siempre visibles. Alternativa estática completa con imágenes ligeras. No repetir oro → agua → planta en Inicio: pertenece a Donaciones.

## Mapa comunitario

Diseñar móvil primero: buscador, selector de comunidad/fuente de agua, mapa 2D ligero, ficha con resultados y fecha, feed y acciones grandes. Cada publicación tiene autor/rol, tipo de evidencia, fecha, fuente, estado y acciones Corroboro / Discrepo / Solicitar investigación. Mostrar quién respalda o cuestiona la observación y por qué. Los votos no confirman Hg. Separar estado de muestra de estado del trámite. Sin evidencia: explicar qué falta y ofrecer solicitud. Indicador de offline y pendientes; QR accesible desde un reporte y escáner desde el mapa/perfil. Ver fuentes y retorno desde Laboratorio/campañas.

## Laboratorio

Globo 3D protagonista; enfoque inicial Bolivia, paneles plegables de Explorador, Satélites, Análisis IA, Mediciones, Estudios, Solicitudes. Línea temporal y comparación antes/después; selector de capas con leyendas, fecha y procedencia. Modo libre: seleccionar punto o dibujar polígono, rango temporal, analizar, abrir resultados y guardar informe con fuentes. Datos sin cobertura: estado explícito. Consultar registros originales. Modo 2D si no hay WebGL o dispositivo modesto. No mostrar falsos mapas de Hg confirmado por satélite.

## Infórmate

Carrusel horizontal de cartas pequeñas: ilustración, título 2–6 palabras, cuerpo 15–35 palabras, categoría, enlace de fuente. Una idea por carta, flechas y swipe, filtros, indicador de avance, sin avance automático. Ilustraciones botánicas suaves, fondo crema, verde desaturado y dorados. Planta dibujada en el borde inferior, puede crecer sutilmente al recorrer cartas; nunca tapa contenido. Contenido revisado disponible offline, sin login. Categorías: Oro, Mercurio, Agua, Salud, Prevención, Naturaleza, Minería responsable, Comunidad. Usar el catálogo de 33 cartas de `plan.md` como punto de partida.

## Donaciones

1. Hero oscuro verde: «Hay cosas que valen más que el oro». Pepita dorada flotante → partículas → gota de agua → brote/planta. GSAP/Three.js si viable.
2. «¿Qué quieres proteger?» Cuatro cartas ilustradas: Investigar (muestras), Proteger (agua), Educar (libro), Restaurar (río/bosque).
3. «Haz crecer el cambio»: monto editable, slider/atajos sugeridos, partículas doradas y planta animada que crece con el aporte seleccionado; indicar que es representación simbólica, no cantidad de impacto.
4. Campañas por comunidad/caso, meta, recaudación, institución, enlace al mapa, hitos y evidencia. Los montos del ejemplo del Beni son ficticios, no sembrarlos como campaña real.
5. Río de transparencia: nodos seleccionables Donación → Fondos protegidos → Investigación → Impacto. Mostrar transacción, evidencia, revisión, responsable y estado; no representar hitos pendientes como completados.
6. Bosque colectivo con planta virtual por donación completada o agrupación visual; sin rankings ni presión social. Mostrar resultados reales por separado.

Paleta: #C7A354, #244B38, #83B6B0, #F4F1E6, #A9BF92. SVG animado para plantas y río, alternativas estáticas. La donación necesita confirmación explícita y debe etiquetar testnet.

## Criterios transversales

Navegación sin animación obligatoria, carga diferida de 3D, imágenes optimizadas, estados de carga/error/vacío, teclado y foco visible, contraste, reduced motion, soporte de celular, acciones reales sin botones inertes. No depender de color para comunicar seguridad sanitaria. Mantener fuentes, leyendas y fechas visibles. En offline, mostrar vigencia y estado de sincronización. Probar en móvil real, no solo escritorio.
