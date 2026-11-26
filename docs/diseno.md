# Diseño — Gold2Life (marca provisional)

**Registro:** capítulos inmersivos en Inicio (movimiento nivel 3, escena 3D); el resto de pestañas se definirá al aprobar cada una.
**Mundo:** «río amazónico al alba: oro, mercurio, bosque».
**Firma visual:** el *hilo de río dorado* — línea ondulada que marca la pestaña activa y reaparece como río (Inicio), tallo (Infórmate) y río de transparencia (Donaciones).
**3D en Inicio:** sí. Pasa la prueba: (1) el viaje de escala — lingote → gota → río → planeta — no se entiende igual en 2D; (2) la versión ligera conserva todo el contenido; (3) three.js se descarga solo en el Inicio animado y baja de calidad en celulares.

## Tokens

Ver `apps/web/src/styles/tokens.css`. Paleta del Inicio (plan.md §2.1): noche `#181A17`, oro `#D4AF55`, mercurio `#A4ADB3`, río `#507F98`, selva `#426C4A`, marfil `#F3F0E4`. Donaciones tendrá su paleta propia (`--don-*`).

| Rol | Valor | Uso |
|---|---|---|
| `--suelo` | `#181A17` | fondo de escenas oscuras |
| `--tinta` | `#F3F0E4` | texto principal |
| `--tinta-2` | `#C9C5B6` | texto secundario |
| `--accion` / `--foco` | `#D4AF55` / `#E8CB7E` | botón primario, foco visible, pestaña activa |
| `--demo` | `#E3B45A` | etiqueta DEMO/TESTNET (siempre con texto) |

**Contraste** (sobre `#181A17`, calculado con la fórmula WCAG 2.x): marfil 15.3:1 · tinta-2 10.1:1 · tinta-3 `#9C998C` 6.1:1 · oro 8.4:1 · oro claro 11.1:1. Texto oscuro `#1D1A10` sobre botón oro: 8.3:1. Pendiente: medir el texto sobre la escena (depende del cuadro; se protege con viñeta inferior y sombra de texto).

**Tipografía** (auto-hospedada, `@fontsource`): Newsreader (display, con eje de tamaño óptico) · Atkinson Hyperlegible Next (interfaz; diseñada para legibilidad en pantallas modestas) · IBM Plex Mono (HUD, numeración y fuentes).

## Tabla de movimiento — Inicio

| Momento | Técnica | Qué comunica | Versión reducida |
|---|---|---|---|
| Gotas de oro → lingote sobre un río oscuro | Marching cubes + morph de elipsoide a lingote (por tiempo, 2.7 s); río con reflejo real (Reflector), selva al horizonte y polvo dorado | el valor del oro toma forma en su lugar | póster estático del lingote sobre el río |
| Goteo de mercurio | la cámara gira y baja; gotas de plata líquida caen del lingote al agua y abren ondas; etiqueta DOM «Mercurio (Hg)» proyectada desde 3D | el costo oculto del oro llega al río | póster + etiqueta como texto |
| Superficie del río → paisaje | la cámara baja al agua; velo plateado DOM tapa el corte | continuidad: del goteo al territorio minero | capítulos apilados |
| Descenso al río y bajo el agua | ruta Catmull-Rom por claves; peces y partículas | la amenaza invisible (metáfora, no medición) | póster + nota de metáfora |
| Ascenso → globo → Bolivia | velo de atmósfera; globo de puntos que se enciende | nueva perspectiva; ubicación real | póster del globo |
| Paneles | DOM sobre el globo, hover que eleva 4 px | cuatro destinos reales | rejilla estática |
| Amanecer | velo dorado; aves y río | cierre esperanzador | póster del amanecer |
| Pestaña activa | trazo SVG que se dibuja (620 ms) | «llegaste aquí» | trazo ya dibujado |
| «Desliza para descubrir» | único bucle sobre la escena, 2.4 s | hay más abajo | sin animación |

**Navegación por paradas (decisión del 2026-11-25):** cada gesto de scroll (rueda, deslizar o flechas/AvPág/espacio) lleva el recorrido solo hasta el siguiente texto (7 paradas: 0.3, 1.16, 1.86, 2.7, 3.9, 4.62, 5.8). Los gestos durante un viaje se encolan; la inercia del trackpad no salta paradas. Tras la última parada el scroll vuelve a ser libre hacia las fuentes. Salidas: «Saltar recorrido» y puntos por capítulo. Si el scroll cambia por otra vía (barra), se asienta en la parada más cercana.

Reglas cumplidas: texto en el DOM y canvas `aria-hidden`; salto directo («Saltar recorrido») y puntos por capítulo; tiempo de recorrido suavizado y reversible; DPR limitado; calidad baja automática en táctil/pantallas pequeñas/≤4 núcleos; baja resolución si el render va lento; WebGL en `try/catch` con caída a la versión ligera; preferencia «Versión ligera / animada» guardada en `localStorage`.

Parámetros de prueba: `?ligera=1`, `?ligera=0`, `?reduced=1`, `?hd=1`, `?sd=1`.

## Registros por pestaña

| Pestaña | Registro | Movimiento | 3D | Por qué |
|---|---|---|---|---|
| Inicio | Capítulos inmersivos | 3 | Sí (Three.js) | El viaje de escala es el contenido |
| Mapa comunitario | Cálido-interactivo sobre la noche del Inicio | 1–2 | No (MapLibre 2D) | Herramienta táctil para celulares económicos; el mapa es el protagonista |
| Laboratorio | Sobrio-profesional, observatorio | 1–2 | Sí (globo MapLibre, con 2D a un toque) | El territorio es el contenido |
| Infórmate | Cálido-editorial (crema, verde, oro) | 2 | No (SVG) | Lectura breve, sin conexión |
| Donaciones | Capítulo inmersivo ligero + flujo cálido | 2–3 | No (canvas 2D) | La transformación oro → agua → vida no necesita WebGL |

## Movimiento — resto de pestañas

| Momento | Técnica | Qué comunica | Versión reducida |
|---|---|---|---|
| Mapa: tocar un río | el río se ilumina en oro (capa MapLibre) | qué elegiste | igual (sin transición) |
| Mapa: tarjeta y hojas | sube 14 px y aparece (340 ms) | de dónde viene | aparece quieta |
| Mapa: ubicar publicación | mira dorada fija en el centro | dónde quedará | igual |
| Laboratorio: comparar años | línea dorada que recorta el mapa de otro año | antes / después | igual (es control directo) |
| Infórmate: planta | tallo que se dibuja y hojas que se abren por cartas vistas | progreso de lectura | estado final sin transición |
| Donaciones: hero | partículas pepita → gota → brote según scroll | el oro se vuelve vida | brote quieto |
| Donaciones: aporte | chispas doradas suben y se vuelven agua; planta crece | el aporte alimenta | sin chispas; planta en su estado |
| Donaciones: río | trazo de agua que fluye (bucle lento) | los fondos avanzan | quieto |

**Señales del mapa** (nunca solo color): Comunidad (anillo sólido, ícono personas) · Laboratorio virtual (anillo discontinuo: es estimación) · Laboratorio oficial (anillo sólido, ícono matraz). Tonos: neutro, agua, proceso (oro), riesgo (naranja), alto (rojo), duda.
