-- Esquema inicial de Gold2Life (PROYECTO.md §4–§7, docs/contexto/implementacion.md §6.1).
-- Las reglas de evidencia que se pueden expresar como restricciones viven aquí, no solo en la API:
--   · una predicción nunca es una medición (tablas separadas, sin ruta de copia);
--   · «no detectado» exige límite de detección y no guarda valor;
--   · los votos (respaldos) no tienen columna que cambie el estado químico de nada.
-- Todo dato simulado lleva demo = true.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Personas y roles ────────────────────────────────────────────────────────────────────────────
CREATE TABLE usuarios (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 60),
  rol         text NOT NULL CHECK (rol IN ('ciudadano','representante','investigador','laboratorio','ong','autoridad','moderador')),
  -- Verificación de identidad/rol (distinta de la validez científica de un resultado).
  rol_verificado boolean NOT NULL DEFAULT false,
  organizacion_id uuid,
  demo        boolean NOT NULL DEFAULT false,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL UNIQUE,
  tipo        text NOT NULL CHECK (tipo IN ('laboratorio','ong','universidad','autoridad')),
  cobertura   text,
  -- Ninguna alianza está confirmada: las organizaciones de ejemplo son DEMO.
  demo        boolean NOT NULL DEFAULT false,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE usuarios ADD FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id);

-- ── Lugares ─────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE comunidades (
  id           text PRIMARY KEY CHECK (id ~ '^[a-z0-9:-]{1,80}$'),
  nombre       text NOT NULL,
  departamento text,
  ubicacion    geography(Point, 4326) NOT NULL,
  fuente       text,           -- p. ej. «OpenStreetMap (Nominatim), ODbL, 2026-11-25»
  ficticia     boolean NOT NULL DEFAULT false
);

-- Fuentes de agua (lo que el frontend llama «lugar»): río, arroyo, pozo, red, vertiente o punto.
-- El id coincide con el del frontend (rio:rio-beni, demo:arroyo-esperanza).
CREATE TABLE fuentes_agua (
  id          text PRIMARY KEY CHECK (id ~ '^[a-z0-9:-]{1,80}$'),
  nombre      text NOT NULL CHECK (length(nombre) BETWEEN 1 AND 120),
  tipo        text NOT NULL CHECK (tipo IN ('rio','arroyo','pozo','red','vertiente','punto')),
  cerca       text NOT NULL DEFAULT '',
  ubicacion   geography(Point, 4326) NOT NULL,
  ficticia    boolean NOT NULL DEFAULT false,
  -- Código que viaja en el QR v1 (sin «:»): rio:rio-beni → rio-rio-beni.
  codigo_qr   text GENERATED ALWAYS AS (regexp_replace(id, '[^a-z0-9-]', '-', 'g')) STORED UNIQUE,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fuentes_agua_ubicacion_idx ON fuentes_agua USING gist (ubicacion);

CREATE TABLE fuente_comunidad (
  fuente_id    text NOT NULL REFERENCES fuentes_agua(id) ON DELETE CASCADE,
  comunidad_id text NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  PRIMARY KEY (fuente_id, comunidad_id)
);

-- ── Señal «Comunidad»: publicaciones, respaldos y respuestas ────────────────────────────────────
CREATE TABLE publicaciones (
  id          uuid PRIMARY KEY,   -- lo genera el teléfono: así el mismo reporte nunca se duplica
  fuente_id   text REFERENCES fuentes_agua(id),
  -- Si llegó por QR con un lugar desconocido, queda por ubicar (moderación) sin perderse.
  codigo_lugar text,
  tipo        text NOT NULL CHECK (tipo IN ('lo_vi','pregunta','analisis','oficial')),
  texto       text NOT NULL CHECK (length(texto) BETWEEN 1 AND 1000),
  fecha       date NOT NULL,
  -- Ubicación aproximada del reporte (nunca de una vivienda).
  ubicacion   geography(Point, 4326),
  autor_id    uuid REFERENCES usuarios(id),
  -- Autoría declarada en un QR sin sesión verificable: se conserva como texto, no como identidad.
  autor_declarado text CHECK (length(autor_declarado) <= 60),
  autoria     text NOT NULL DEFAULT 'verificada' CHECK (autoria IN ('verificada','declarada')),
  origen      text NOT NULL DEFAULT 'en_linea' CHECK (origen IN ('en_linea','qr','sin_conexion')),
  moderacion  text NOT NULL DEFAULT 'publicada' CHECK (moderacion IN ('publicada','por_revisar','oculta')),
  demo        boolean NOT NULL DEFAULT false,
  creado_en   timestamptz NOT NULL DEFAULT now(),
  CHECK (fuente_id IS NOT NULL OR codigo_lugar IS NOT NULL),
  CHECK (autor_id IS NOT NULL OR autor_declarado IS NOT NULL)
);
CREATE INDEX publicaciones_fuente_idx ON publicaciones (fuente_id, fecha DESC);

CREATE TABLE respaldos (
  publicacion_id uuid NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  usuario_id     uuid NOT NULL REFERENCES usuarios(id),
  postura        text NOT NULL CHECK (postura IN ('coincide','no_coincide')),
  motivo         text CHECK (length(motivo) <= 280),
  creado_en      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (publicacion_id, usuario_id)   -- una persona, un respaldo (se puede cambiar)
);

CREATE TABLE respuestas (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacion_id uuid NOT NULL REFERENCES publicaciones(id) ON DELETE CASCADE,
  autor_id       uuid NOT NULL REFERENCES usuarios(id),
  texto          text NOT NULL CHECK (length(texto) BETWEEN 1 AND 1000),
  creado_en      timestamptz NOT NULL DEFAULT now()
);

-- ── Señal «Laboratorio virtual»: indicadores y predicciones (nunca mediciones) ──────────────────
CREATE TABLE indicadores_ambientales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id   text NOT NULL REFERENCES fuentes_agua(id) ON DELETE CASCADE,
  nivel       text NOT NULL CHECK (nivel IN ('sin_senales','posible_riesgo')),
  detalle     text NOT NULL,
  origen      text NOT NULL,   -- p. ej. «Sentinel-2 L2A, MNDWI», o «DEMO»
  fecha       date NOT NULL,
  demo        boolean NOT NULL DEFAULT false
);

CREATE TABLE predicciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id   text NOT NULL REFERENCES fuentes_agua(id) ON DELETE CASCADE,
  modelo      text NOT NULL,
  version     text NOT NULL,
  valor_estimado numeric,
  unidad      text,
  incertidumbre numeric,
  fecha       date NOT NULL,
  -- Estado actual del modelo: en evaluación. Ninguna predicción se publica sin validación.
  publicada   boolean NOT NULL DEFAULT false,
  demo        boolean NOT NULL DEFAULT false
);

-- ── Solicitudes de investigación ────────────────────────────────────────────────────────────────
CREATE TABLE solicitudes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id     text NOT NULL REFERENCES fuentes_agua(id),
  publicacion_id uuid REFERENCES publicaciones(id),
  motivo        text NOT NULL CHECK (length(motivo) BETWEEN 1 AND 1000),
  matriz        text CHECK (matriz IN ('agua','sedimento','pez','cabello')),
  estado        text NOT NULL DEFAULT 'solicitada' CHECK (estado IN (
                  'solicitada','en_revision','asignada','pendiente_recursos','en_muestreo',
                  'en_analisis','revision_tecnica','resultados_publicados','cerrada','rechazada')),
  solicitante_id uuid REFERENCES usuarios(id),
  -- Solicitud llegada por QR sin sesión verificable: autoría declarada, nunca la del transportista.
  solicitante_declarado text CHECK (length(solicitante_declarado) <= 60),
  origen        text NOT NULL DEFAULT 'en_linea' CHECK (origen IN ('en_linea','qr','sin_conexion')),
  -- Un representante puede registrar en nombre de familias sin celular, con consentimiento.
  familias_representadas integer CHECK (familias_representadas > 0),
  consentimiento boolean NOT NULL DEFAULT false,
  organizacion_id uuid REFERENCES organizaciones(id),
  campana_id    text,
  demo          boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CHECK (familias_representadas IS NULL OR consentimiento),
  CHECK (solicitante_id IS NOT NULL OR solicitante_declarado IS NOT NULL)
);
CREATE INDEX solicitudes_fuente_idx ON solicitudes (fuente_id);

CREATE TABLE solicitud_apoyos (
  solicitud_id uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  usuario_id   uuid NOT NULL REFERENCES usuarios(id),
  creado_en    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solicitud_id, usuario_id)
);

CREATE TABLE solicitud_eventos (
  id           bigserial PRIMARY KEY,
  solicitud_id uuid NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  estado       text NOT NULL,
  actor_id     uuid REFERENCES usuarios(id),
  actor        text NOT NULL,     -- nombre visible y rol en el momento del evento
  nota         text CHECK (length(nota) <= 1000),
  fecha        timestamptz NOT NULL DEFAULT now()
);

-- ── Señal «Laboratorio oficial»: muestras y mediciones ──────────────────────────────────────────
CREATE TABLE muestras (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id     text NOT NULL REFERENCES fuentes_agua(id),
  solicitud_id  uuid REFERENCES solicitudes(id),
  matriz        text NOT NULL CHECK (matriz IN ('agua','sedimento','pez','cabello')),
  fecha_muestreo date NOT NULL,
  -- Punto de muestreo generalizado; nunca la ubicación de una vivienda.
  ubicacion     geography(Point, 4326),
  cadena_custodia text,
  laboratorio_id uuid NOT NULL REFERENCES organizaciones(id),
  demo          boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE mediciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muestra_id    uuid NOT NULL REFERENCES muestras(id) ON DELETE CASCADE,
  analito       text NOT NULL CHECK (analito IN ('hg_total','metilmercurio','hg_disuelto','hg_particulado')),
  calificador   text NOT NULL CHECK (calificador IN ('detectado','no_detectado','bajo_lc','no_concluyente')),
  -- Valor original tal como lo reporta el laboratorio y su versión normalizada.
  valor         numeric CHECK (valor >= 0),
  unidad        text NOT NULL CHECK (unidad IN ('ng/L','µg/L','mg/L','µg/g','mg/kg','ng/g')),
  valor_normalizado numeric,
  unidad_normalizada text,
  limite_deteccion numeric CHECK (limite_deteccion > 0),
  limite_cuantificacion numeric CHECK (limite_cuantificacion > 0),
  metodo        text NOT NULL CHECK (length(metodo) BETWEEN 1 AND 200),
  documento_ref text,          -- referencia opaca al informe del laboratorio
  alcance       text NOT NULL DEFAULT 'Aplica solo a esta muestra, en este lugar y fecha.',
  cargada_por   uuid NOT NULL REFERENCES usuarios(id),
  revision      text NOT NULL DEFAULT 'pendiente' CHECK (revision IN ('pendiente','validada','rechazada')),
  revisada_por  uuid REFERENCES usuarios(id),
  revisada_en   timestamptz,
  nota_revision text,
  demo          boolean NOT NULL DEFAULT false,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  -- «No detectado» no es «ausente»: exige el límite de detección y no guarda valor.
  CHECK (calificador <> 'no_detectado' OR (valor IS NULL AND limite_deteccion IS NOT NULL)),
  CHECK (calificador <> 'detectado' OR valor IS NOT NULL),
  -- Quien carga un resultado no lo valida (conflicto de interés).
  CHECK (revisada_por IS NULL OR revisada_por <> cargada_por)
);

-- Criterios normativos por matriz y uso. El umbral de agua potable no se aplica a peces, cabello ni sedimentos.
CREATE TABLE criterios (
  id          text PRIMARY KEY,
  norma       text NOT NULL,
  matriz      text NOT NULL,
  uso         text NOT NULL,
  analito     text NOT NULL,
  valor_ng_l  numeric NOT NULL,
  -- NB 512:2016: el valor de Hg está PENDIENTE DE VERIFICAR en la tabla oficial (PROYECTO.md §5).
  verificado  boolean NOT NULL DEFAULT false,
  nota        text
);

-- Alertas y recomendaciones oficiales (solo autoridad sanitaria).
CREATE TABLE alertas_oficiales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuente_id   text NOT NULL REFERENCES fuentes_agua(id),
  autoridad_id uuid NOT NULL REFERENCES usuarios(id),
  texto       text NOT NULL,
  vigente     boolean NOT NULL DEFAULT true,
  demo        boolean NOT NULL DEFAULT false,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- ── Sincronización sin conexión ─────────────────────────────────────────────────────────────────
-- Cada operación trae un UUID propio: reenviarla devuelve el mismo acuse sin volver a aplicarla.
CREATE TABLE operaciones_sync (
  op_id        uuid PRIMARY KEY,
  tipo         text NOT NULL,
  publicacion_id uuid REFERENCES publicaciones(id),
  resultado    text NOT NULL CHECK (resultado IN ('creada','duplicada','rechazada')),
  motivo       text,
  -- Quién la transportó (escaneó el QR o la subió). Transportar no es ser autor ni validador.
  transportada_por uuid REFERENCES usuarios(id),
  recibida_en  timestamptz NOT NULL DEFAULT now()
);

-- ── Auditoría ───────────────────────────────────────────────────────────────────────────────────
CREATE TABLE auditoria (
  id         bigserial PRIMARY KEY,
  usuario_id uuid REFERENCES usuarios(id),
  accion     text NOT NULL,
  recurso    text NOT NULL,
  detalle    jsonb,
  fecha      timestamptz NOT NULL DEFAULT now()
);
