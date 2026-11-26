-- Laboratorio virtual (science/): tramos de río, huella minera, indicadores espectrales y prioridad de
-- muestreo (Gold2Mining, Gold2Spectral y Gold2Risk). Lo escribe el pipeline por lotes; la API solo lee.
-- Nada de esto es una medición de mercurio: orienta dónde tomar muestras.

CREATE TABLE corridas_modelo (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  componente  text NOT NULL,                 -- 'gold2-lab'
  version     text NOT NULL,                 -- versión de las reglas
  commit_git  text,
  estado      text NOT NULL CHECK (estado IN ('en_evaluacion','v0_sin_revision','validado','rechazado','resultado_negativo')),
  parametros  jsonb NOT NULL,
  manifiesto  jsonb NOT NULL,                -- fuentes, licencias, fechas y conteos de cada paso
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tramos (
  id            text PRIMARY KEY,
  rio           text NOT NULL,
  fuente_id     text REFERENCES fuentes_agua(id),
  orden         integer NOT NULL,
  desemboca_en  text,
  aguas_arriba  text[] NOT NULL DEFAULT '{}',
  longitud_km   numeric(8,2) NOT NULL,
  geom          geography(LineString, 4326) NOT NULL,
  corrida_id    uuid NOT NULL REFERENCES corridas_modelo(id)
);
CREATE INDEX tramos_geom_idx ON tramos USING gist (geom);

CREATE TABLE mineria_tramo (
  tramo_id      text NOT NULL REFERENCES tramos(id) ON DELETE CASCADE,
  anio          integer NOT NULL,
  ha_nueva      numeric(12,2) NOT NULL,
  ha_acumulada  numeric(12,2) NOT NULL,
  corrida_id    uuid NOT NULL REFERENCES corridas_modelo(id),
  PRIMARY KEY (tramo_id, anio)
);

CREATE TABLE indicadores_temporada (
  tramo_id        text NOT NULL REFERENCES tramos(id) ON DELETE CASCADE,
  anio            integer NOT NULL,
  escenas         integer NOT NULL,
  suficiente      boolean NOT NULL,
  px_agua_mediana integer,
  ndti_agua       numeric(7,4),
  ndvi_orilla     numeric(7,4),
  bsi_orilla      numeric(7,4),
  lluvia_previa_mm numeric(8,1),
  z_ndti_agua     numeric(8,2),
  z_bsi_orilla    numeric(8,2),
  z_lluvia_previa numeric(8,2),
  fechas          date[] NOT NULL DEFAULT '{}',
  corrida_id      uuid NOT NULL REFERENCES corridas_modelo(id),
  PRIMARY KEY (tramo_id, anio)
);

CREATE TABLE evaluaciones_riesgo (
  tramo_id     text NOT NULL REFERENCES tramos(id) ON DELETE CASCADE,
  anio         integer NOT NULL,
  prioridad    text NOT NULL CHECK (prioridad IN ('alta','media','baja','insuficiente')),
  reglas       jsonb NOT NULL,
  faltantes    jsonb NOT NULL,
  datos        jsonb NOT NULL,
  version      text NOT NULL,
  -- Revisión humana (especialista) pendiente en v0.
  revisado_por uuid REFERENCES usuarios(id),
  corrida_id   uuid NOT NULL REFERENCES corridas_modelo(id),
  PRIMARY KEY (tramo_id, anio)
);

-- La señal resumida del mapa puede venir de una corrida (origen trazable).
ALTER TABLE indicadores_ambientales ADD COLUMN corrida_id uuid REFERENCES corridas_modelo(id);
