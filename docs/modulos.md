# Funcionamiento de los módulos

La plataforma tiene cinco espacios y un área de cuenta. Cada uno tiene una identidad visual propia; no es una plantilla genérica. Leyenda de la columna «Estado»:
- **Real:** funciona con datos o servicios reales.
- **DEMO:** usa datos de ejemplo marcados en pantalla.
- **Futuro:** todavía no está construido.

## Inicio: «El lado invisible del oro»
Un recorrido narrativo en seis escenas 3D (three.js + GSAP): el oro, el mercurio que se libera, el río y los peces, la mirada desde el espacio sobre Bolivia, las tres señales y el amanecer. Cierra con «El oro tiene valor. La vida no tiene precio.».

| Función | Estado |
|---|---|
| Escenas 3D con versión ligera (imágenes) para equipos modestos o con movimiento reducido | Real |
| Cifras con fuente: PNUMA (838 t/año, ~38 %), OMS (metilmercurio) y Valdivieso et al. 2025 (4 µg/g en cabello, 2022–2023) | Real, con cita |
| Globo con contornos de Natural Earth y 10 localidades de OSM | Real |

## Mapa comunitario
El núcleo social. Una persona busca su río o su comunidad y ve **tres señales separadas**:

| Señal | Quién la produce | Qué no significa |
|---|---|---|
| Comunidad | Personas que reportan y respaldan | No confirma mercurio |
| Laboratorio virtual | Prioridad por tramo calculada desde el satélite | No mide mercurio |
| Laboratorio oficial | Resultado químico validado de una muestra | No certifica potabilidad |

| Función | Estado |
|---|---|
| Mapa base y ríos de OpenStreetMap (OpenFreeMap), ríos cercanos y ubicación propia | Real |
| Publicar en tres pasos (ubicar → escribir → enviar): «Lo vi», «Pregunta», «Pedir análisis» y, solo para la autoridad, «Aviso oficial» | Real, en el servidor con API |
| Respaldar o cuestionar con motivo; responder | Real, en el servidor con API |
| Señal «Laboratorio virtual» en los ríos reales de la zona piloto | Real (Gold2Risk v0) |
| Lugares, publicaciones y resultados de ejemplo | DEMO |
| Sin conexión: cola de pendientes y envío posterior sin duplicar | Real |
| QR v1 que **contiene** el reporte (no un enlace), con escaneo por cámara o pegado | Real |

## Laboratorio
El núcleo científico: un globo (MapLibre) centrado en Bolivia.

| Función | Estado |
|---|---|
| Mosaicos Sentinel-2 sin nubes por año (EOX 2016, 2018–2025) y comparador de años | Real |
| MODIS diario y NDVI de 8 días (NASA GIBS) | Real |
| Biblioteca de 7 estudios con enlace a la fuente original | Real (enlaces); contenido pendiente de auditoría |
| **Prioridad de muestreo por tramo** (48 tramos, temporada seca 2025) con reglas visibles y capa en el globo | Real (v0, sin revisión de especialista) |
| Dibujar una zona y descargar un informe (.md) con ríos, fuentes y limitaciones | Real; los indicadores del informe son DEMO |
| Mediciones químicas y solicitudes sobre el globo | DEMO / servidor |
| Gold2Mercury (estimar Hg desde el satélite) | En pausa: sin datos de Bolivia para validarlo |

## Infórmate
33 cartas cortas e ilustradas (qué es el mercurio, cómo llega al agua y al plato, por qué hervir no sirve, qué hacer ante una sospecha, alternativas al mercurio, Minamata), con filtros por tema, navegación por deslizamiento y lectura sin conexión.

| Función | Estado |
|---|---|
| 33 cartas con fuente enlazada (OPS, OMS, PNUMA, planetGOLD, Minamata, AAPS) | Real; los textos son borradores en revisión editorial |
| Sin diagnósticos ni remedios caseros | Criterio de contenido |

## Donaciones: «Hay cosas que valen más que el oro»
Narrativa propia: el oro se transforma en agua y en vida.

| Función | Estado |
|---|---|
| Campañas que nacen de un caso aceptado, con meta, responsable, verificador independiente e hitos | Real en el servidor (testnet) |
| Aporte con la billetera **Freighter** (firma el donante) o aporte de prueba (firma una cuenta DEMO del servidor) | Real en **testnet** |
| Confirmación por la red con enlace a stellar.expert; río de transparencia con transacciones y liberación de hitos | Real en testnet |
| Bosque colectivo sin rankings | Simbólico: no mide impacto |
| Campañas de ejemplo cuando no hay servidor | DEMO |

## Cuenta, perfil y panel institucional
| Función | Estado |
|---|---|
| Ingreso por rol DEMO (ciudadano, representante, investigador, laboratorio, ONG, autoridad, moderación) | DEMO (sin autenticación real) |
| Panel con el ciclo de solicitudes y las acciones que el servidor permite a cada rol | Real |
| Autenticación con cuentas verificadas | Futuro |

## Transversal
- **Modo claro y oscuro** con contraste AA verificado por cálculo.
- **Marca configurable** con `VITE_BRAND_NAME`.
- **Sin servidor:** si la API no responde, todo sigue funcionando con los datos DEMO locales.
