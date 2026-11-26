# Implementación y verificación — propuesta operativa

No es un contrato cerrado de stack ni un registro de trabajo completado. Ajustar al repositorio y plazo de Gold4Good. No bloquear toda la app por esperar hardware, datos de IA o integraciones externas.

## Orden recomendado de trabajo

| Fase | Entrega funcional | Prueba de aceptación |
|---|---|---|
| 0 | Revisar repo, skills, dependencias, datos, configuración; definir alcance real | Arranque reproducible, inventario de estado y limitaciones |
| 1 | Shell, rutas, tokens visuales, autenticación, roles y mapa comunitario | Navegar cinco pestañas; buscar comunidad; permisos servidor |
| 2 | Solicitudes y ciclo institucional | Publicar, corroborar, solicitar, aceptar y registrar resultado demo; no cambiar evidencia mediante votos |
| 3 | PWA offline y QR | Dos celulares previamente preparados en modo avión, exportar/importar reporte, sincronizar uno, deduplicar |
| 4 | Laboratorio | Globo/2D, capas reales, fechas, comparador, fuentes, polígono si viable; volver al mapa |
| 5 | Ciencia en paralelo desde fase 0 | Auditar datasets, emparejar y evaluar baseline; no afirmar precisión sin medición |
| 6 | Infórmate | Cartas, fuentes, filtros, swipe, planta, lectura offline |
| 7 | Donaciones | Campaña desde caso, selector, testnet, estados por hitos, río y jardín simbólico |
| 8 | Pulido de Inicio y pitch | Seis escenas o fallback, rutas reales, performance y recorrido completo |

La planificación por fases es una sugerencia; equipos paralelos pueden avanzar módulos independientes. P0/P1/P2 del plan marcan alcance, no promesas de entrega. El QR es un diferenciador rural prioritario: intentar completar antes que animaciones complejas o hardware.

## Contratos y estados imprescindibles

- Reporte: UUID, comunidad/fuente, tipo, texto, fecha, procedencia, evidencia y estado de sincronización. QR versionado con contenido breve; sin datos sensibles ni tokens. Importación confirmada por el usuario, validar formato/tamaño, deduplicar por ID. Autor, transportista y verificador no se confunden. Para creación offline sin sesión verificable, conservar como borrador/autoría declarada hasta autenticación o moderación.
- Solicitud: referencia a reporte/fuente, motivo, matriz, evidencias, estado, asignaciones, historial y campaña opcional. Transiciones autorizadas en backend, no solo UI.
- Medición: matriz, analito, valor y unidad, fecha, punto, método, límites analíticos, documento, verificación. Nunca guardar estimación como medición. Control de permisos y privacidad.
- Campaña: caso, entidad, monto, activo/red, hitos, verificador, estados, evidencias y política de fondos. Donación confirmada por red, no por interfaz. Idempotencia y reconciliación. Testnet marcada. No enviar transacciones reales sin autorización.

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


## Checklist de revisión antes del pitch

- [ ] Build, lint y pruebas disponibles ejecutados; errores pendientes documentados.
- [ ] Interfaz móvil, escritorio y movimiento reducido; no hay botones falsos ni bloqueo de navegación.
- [ ] Probar offline después de instalación y descarga; escáner QR con permisos en contexto seguro, sin bibliotecas que exijan CDN durante la prueba.
- [ ] Dos importaciones del mismo QR no crean dos reportes. Un intento de sincronización fallido no pierde el borrador.
- [ ] No se filtran datos privados ni claves; permisos backend probados.
- [ ] Fuentes, licencias, imágenes reales y fechas auditadas; ausencia de datos marcada.
- [ ] Métricas IA reproducibles o ausencia de modelo declarado; resultados no confirman potabilidad.
- [ ] Donaciones de prueba verificadas o flujo demo identificado; evidencia y transacciones separadas.
- [ ] Ensayar recorrido de pitch con respaldo local y capturas de resultados reales ya obtenidos.
