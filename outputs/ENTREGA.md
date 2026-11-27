# Entrega audiovisual de Gold2Life

Ejecución de `Gold2Life-guion-y-produccion.md`, en el orden que fija el guion.

## 1. Infórmate y QR
- **Infórmate corregido en local:** ahora muestra una carta por pantalla, con flechas, deslizamiento y teclado. Probado en Chrome headless: una sola carta en el DOM tras la transición, filtros funcionando y sin errores de consola. Archivos: `apps/web/src/pages/informate/Informate.tsx` e `informate.css`.
  - **Sin commit y sin desplegar.** El sitio público aún muestra la versión anterior: falta el commit, el `git pull` y la reconstrucción en el VPS.
- **QR del sitio:** `outputs/qr/gold2life-qr.png` (2048 px, corrección H) y `gold2life-qr.svg`. Decodificado con OpenCV como `https://gold2life.bell7738.com`, también desde el último fotograma del video.

## 2. Video demo
| Archivo | Duración | Formato | Verificación |
|---|---|---|---|
| `video-demo/Gold2Life-demo-con-voz.mp4` | 2:52 (172,0 s) | 1920×1080, 30 fps, H.264 + AAC estéreo 48 kHz | ffprobe; se decodifica completo sin errores; voz unos 17 dB sobre la música |
| `video-demo/Gold2Life-demo-sin-voz.mp4` | 2:52 (172,0 s) | Igual, con el video copiado | Solo la pista de música (sin narración ni testimonios); subtítulos incrustados |
| `video-demo/subtitulos.srt` | 44 bloques | SRT | Sincronizado con la versión con voz: narración y testimonios |

- **Estructura:** 9 escenas del guion más 3 testimonios: gancho de los vasos → problema → solución → Infórmate → Mapa → Laboratorio → sin internet/QR → Donaciones → cierre con QR (unos 12 s en pantalla).
  - Cerca del 74 % del tiempo es grabación real de la plataforma, recorrida en local con la API, Chrome headless y acciones reales: búsqueda, publicación, QR, comparador de años y aporte de prueba en testnet.
- **Narración:** voz sintética de macOS «Paulina» (es-MX), elegida por el usuario porque las voces de HeyGen piden plan de pago.
- **Música:** pista del catálogo de HeyGen (cuenta Free), «calm, subdued, documentary», encadenada con fundidos.
- **Etiquetas en pantalla:**
  - DEMO en los lugares del Mapa.
  - TESTNET y «sin dinero real» en Donaciones.
  - «No mide mercurio» y «Prioridad v0 experimental» en el Laboratorio.
  - «Modo sin conexión simulado en la app» en la escena del QR.
- **Editables:** `video-demo/editable/`
  - `gold2life-demo/`: proyecto HyperFrames. Los textos y tiempos se cambian en `generar.py` y se regenera con `python3 generar.py`; ahí también están `REVIEW.md` y las capturas crudas.
  - `pistas/`: `narracion.wav`, `testimonios.wav` y `musica.wav` por separado, alineadas a 172 s.
  - `demo-limpio/` y `demo-limpio.mp4`: el mismo montaje sin subtítulos ni voces, del que salen los clips visuales del deck.
  - `pitch-clips/`: proyecto de los clips de entrevista (`gold2life-demo/pitch.py`).
  - La carpeta pesa unos 920 MB; **no conviene subirla a git** (ver abajo).

## 3. Entrevistas
- **Fuente:** `planeacion/entrevistas/` (3 audios y `Guiones.txt`). Los originales no se modificaron.
- **Transcripciones:** `entrevistas/transcripciones.md`. Son automáticas (whisper medium) y no están revisadas a mano. Los nombres dichos en el audio se sustituyen por [nombre].
- **Citas elegidas:** `entrevistas/seleccion-y-tiempos.md`, con archivo, inicio y fin, cita literal y motivo. Se cotejaron con las marcas por palabra; **conviene escucharlas una vez antes de presentar**.
- **Consentimiento:** las tres personas pidieron no aparecer en cámara (confirmado por el usuario). Todas llevan el rótulo y solo su rol. Ninguna voz se sintetizó ni se clonó.

## 4. Recursos del pitch
- `pitch-deck/videos/`:
  - `01-`, `02-` y `03-entrevista-*.mp4`.
  - `entrevistas-compilado.mp4`: **36,0 s**, dentro de 30–45 s.
  - 8 clips `visual-*.mp4` sin voz.
  - `indice-clips.md`.
- `pitch-deck/Gold2Life_ORO-3.1_Pitch.pptx`: **nuevo**, hecho sobre una copia de la plantilla oficial; el original de `planeacion/` sigue intacto.
  - 12 diapositivas: 7 del pitch NABC de 3:00, con el bloque de entrevistas dentro del tiempo, y 4 de respaldo (R1 evidencia, R2 con quién probamos, R3 lo ya intentado, R6 equipo).
  - Lleva el video del compilado incrustado, transiciones de fundido y entradas animadas.
  - Pasa `validate.py`.
- `pitch-deck/Gold2Life_ORO-3.1_Pitch.pdf`: respaldo exportado con PowerPoint.
- `pitch-deck/enlace-google-slides.md`: **la presentación de Google Slides no se creó**; ahí están el motivo y los pasos.

## Limitaciones y pendientes reales
1. **Google Slides:** no se pudo subir el archivo desde la automatización del navegador (selector en iframe de otro origen). Hay que subir el PPTX y abrirlo con Presentaciones; el video se vuelve a insertar desde Drive. La presentación existente no se tocó.
2. **Fecha del deck:** la guía fija la entrega el jueves 26 de noviembre a las 23:59; este material quedó listo después de esa hora.
3. **Contenido del deck que falta completar:**
   - R2 «qué ajustamos»: por registrar por el equipo.
   - R6: formación, rol, qué hizo cada persona y contacto.
   - El costo solo dice «0 Bs en licencias» (estimación del equipo); faltan el costo del servidor y de la difusión.
   - Ninguna cifra se inventó: cada una cita su fuente en la diapositiva y en R1.
4. **Deploy:** Infórmate corregido solo en local. Cloudflare guarda en caché `sw.js` durante 4 h; falta la regla de caché.
5. **Git:** nada tiene commit. Antes de subir `outputs/` conviene excluir al menos:
   - `video-demo/editable/**/capturas-crudas`, `tramos`, `demo-limpio*` y `pitch-clips`;
   - los `.mp4` pesados, que van mejor en Drive o en un release.
