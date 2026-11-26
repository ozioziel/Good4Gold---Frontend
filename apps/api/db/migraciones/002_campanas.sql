-- Campañas y donaciones con escrow por hitos en Stellar TESTNET (contracts/escrow).
-- La base guarda el contexto (caso, textos, quién verifica); el dinero y su estado viven en el contrato,
-- que es la fuente de verdad: una donación se confirma por la red, no por la interfaz.
-- En la cadena no van datos personales: solo direcciones y una referencia opaca (sha256 del id).

CREATE TABLE campanas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id    uuid NOT NULL REFERENCES solicitudes(id),
  titulo          text NOT NULL CHECK (length(titulo) BETWEEN 3 AND 120),
  causa           text NOT NULL CHECK (causa IN ('investigar','proteger','educar','restaurar')),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  -- Verificador independiente: otra organización.
  verificador_id  uuid NOT NULL REFERENCES organizaciones(id),
  criterio_exito  text NOT NULL CHECK (length(criterio_exito) BETWEEN 3 AND 500),
  politica_sobrantes text NOT NULL CHECK (length(politica_sobrantes) BETWEEN 3 AND 500),
  -- Cadena
  red             text NOT NULL DEFAULT 'testnet' CHECK (red = 'testnet'),
  activo          text NOT NULL DEFAULT 'USDC',
  contrato_id     text NOT NULL,
  campana_cadena  integer NOT NULL,
  referencia      text NOT NULL,          -- sha256(id) en hex
  org_direccion   text NOT NULL,
  verificador_direccion text NOT NULL,
  tx_creacion     text NOT NULL,
  meta            numeric(20,7) NOT NULL CHECK (meta > 0),
  estado          text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','completada','cancelada')),
  demo            boolean NOT NULL DEFAULT true,
  creada_por      uuid NOT NULL REFERENCES usuarios(id),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, campana_cadena),
  CHECK (organizacion_id <> verificador_id)
);

CREATE TABLE hitos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id    uuid NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
  indice        integer NOT NULL CHECK (indice >= 0),
  titulo        text NOT NULL CHECK (length(titulo) BETWEEN 2 AND 120),
  monto         numeric(20,7) NOT NULL CHECK (monto > 0),
  estado        text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','liberado')),
  -- Evidencia documentada fuera de la cadena; a la cadena va solo su hash.
  evidencia_ref text,
  evidencia_hash text,
  nota          text,
  tx_hash       text,
  revisado_por  uuid REFERENCES usuarios(id),
  liberado_en   timestamptz,
  UNIQUE (campana_id, indice),
  CHECK (estado = 'pendiente' OR (evidencia_hash IS NOT NULL AND tx_hash IS NOT NULL))
);

CREATE TABLE donaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id    uuid NOT NULL REFERENCES campanas(id),
  usuario_id    uuid REFERENCES usuarios(id),
  direccion     text NOT NULL,
  monto         numeric(20,7) NOT NULL CHECK (monto > 0),
  modo          text NOT NULL CHECK (modo IN ('billetera','demo')),
  estado        text NOT NULL DEFAULT 'preparada' CHECK (estado IN ('preparada','confirmada','fallida')),
  tx_hash       text UNIQUE,
  error         text,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  confirmada_en timestamptz
);
CREATE INDEX donaciones_campana_idx ON donaciones (campana_id, estado);

-- Movimientos de cancelación y reembolso, también confirmados por la red.
CREATE TABLE movimientos_escrow (
  id          bigserial PRIMARY KEY,
  campana_id  uuid NOT NULL REFERENCES campanas(id),
  tipo        text NOT NULL CHECK (tipo IN ('creacion','cancelacion','reembolso')),
  direccion   text,
  monto       numeric(20,7),
  tx_hash     text NOT NULL,
  motivo      text,
  usuario_id  uuid REFERENCES usuarios(id),
  fecha       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes DROP COLUMN campana_id;
ALTER TABLE solicitudes ADD COLUMN campana_id uuid REFERENCES campanas(id);
