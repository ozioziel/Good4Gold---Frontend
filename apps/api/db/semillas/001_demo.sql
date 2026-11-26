-- Datos de partida. Se pueden volver a cargar (ON CONFLICT DO NOTHING).
--   · REALES: localidades y ríos de la cuenca del Beni (OpenStreetMap, ODbL), sin resultados.
--     Aparecen «sin información suficiente» hasta que exista una medición.
--   · DEMO: organizaciones, personas, lugares ficticios, publicaciones, solicitudes y mediciones.
--     Coinciden con apps/web/src/data/mapa-lugares.ts y solicitudes.ts. Ninguna alianza es real.

-- ── Reales ──────────────────────────────────────────────────────────────────────────────────────
INSERT INTO comunidades (id, nombre, departamento, ubicacion, fuente) VALUES
  ('rurrenabaque',     'Rurrenabaque',     'Beni',   'SRID=4326;POINT(-67.5313 -14.4437)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('san-buenaventura', 'San Buenaventura', 'La Paz', 'SRID=4326;POINT(-67.5365 -14.4387)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('reyes',            'Reyes',            'Beni',   'SRID=4326;POINT(-67.3359 -14.2952)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('puerto-salinas',   'Puerto Salinas',   'Beni',   'SRID=4326;POINT(-67.4973 -14.2641)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('guanay',           'Guanay',           'La Paz', 'SRID=4326;POINT(-67.8798 -15.4977)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('teoponte',         'Teoponte',         'La Paz', 'SRID=4326;POINT(-67.8191 -15.4956)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('mapiri',           'Mapiri',           'La Paz', 'SRID=4326;POINT(-68.2148 -15.3096)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('tipuani',          'Tipuani',          'La Paz', 'SRID=4326;POINT(-68.0206 -15.5661)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('caranavi',         'Caranavi',         'La Paz', 'SRID=4326;POINT(-67.3921 -15.6946)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25'),
  ('riberalta',        'Riberalta',        'Beni',   'SRID=4326;POINT(-66.0752 -10.9973)', 'OpenStreetMap (Nominatim), ODbL, 2026-11-25')
ON CONFLICT DO NOTHING;

INSERT INTO fuentes_agua (id, nombre, tipo, cerca, ubicacion) VALUES
  ('rio:rio-beni',    'Río Beni',    'rio', 'Rurrenabaque · San Buenaventura · Riberalta', 'SRID=4326;POINT(-67.53 -14.44)'),
  ('rio:rio-kaka',    'Río Kaka',    'rio', 'Teoponte · Guanay',                           'SRID=4326;POINT(-67.8191 -15.4956)'),
  ('rio:rio-mapiri',  'Río Mapiri',  'rio', 'Mapiri · Guanay',                             'SRID=4326;POINT(-68.2148 -15.3096)'),
  ('rio:rio-tipuani', 'Río Tipuani', 'rio', 'Tipuani · Guanay',                            'SRID=4326;POINT(-68.0206 -15.5661)'),
  ('rio:rio-coroico', 'Río Coroico', 'rio', 'Caranavi',                                    'SRID=4326;POINT(-67.3921 -15.6946)')
ON CONFLICT DO NOTHING;

INSERT INTO fuente_comunidad VALUES
  ('rio:rio-beni','rurrenabaque'), ('rio:rio-beni','san-buenaventura'), ('rio:rio-beni','riberalta'),
  ('rio:rio-kaka','teoponte'), ('rio:rio-kaka','guanay'),
  ('rio:rio-mapiri','mapiri'), ('rio:rio-mapiri','guanay'),
  ('rio:rio-tipuani','tipuani'), ('rio:rio-tipuani','guanay'),
  ('rio:rio-coroico','caranavi')
ON CONFLICT DO NOTHING;

-- Criterio de agua de consumo. NO VERIFICADO: confirmar en la tabla oficial de la NB 512:2016.
INSERT INTO criterios (id, norma, matriz, uso, analito, valor_ng_l, verificado, nota) VALUES
  ('nb512-hg-agua-consumo', 'NB 512:2016', 'agua', 'consumo', 'hg_total', 1000, false,
   'Valor citado 0,001 mg/L (1 µg/L) pendiente de verificar en la tabla oficial. No aplica a peces, cabello ni sedimentos.')
ON CONFLICT DO NOTHING;

-- ── DEMO ────────────────────────────────────────────────────────────────────────────────────────
INSERT INTO organizaciones (id, nombre, tipo, cobertura, demo) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ONG demo Ríos Vivos',      'ong',         'Cuenca del Beni (DEMO)', true),
  ('00000000-0000-4000-8000-0000000000a2', 'Laboratorio demo Andino',  'laboratorio', 'La Paz y Beni (DEMO)',   true),
  ('00000000-0000-4000-8000-0000000000a3', 'Universidad demo',         'universidad', 'Nacional (DEMO)',        true),
  ('00000000-0000-4000-8000-0000000000a4', 'Autoridad sanitaria demo', 'autoridad',   'Beni (DEMO)',            true)
ON CONFLICT DO NOTHING;

INSERT INTO usuarios (id, nombre, rol, rol_verificado, organizacion_id, demo) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'Rosa M.',      'ciudadano',     false, NULL, true),
  ('00000000-0000-4000-8000-0000000000b2', 'Julián C.',    'representante', true,  NULL, true),
  ('00000000-0000-4000-8000-0000000000b3', 'Elena Q.',     'ciudadano',     false, NULL, true),
  ('00000000-0000-4000-8000-0000000000b4', 'Mateo R.',     'ciudadano',     false, NULL, true),
  ('00000000-0000-4000-8000-0000000000b5', 'Dra. Ana P.',  'investigador',  true,  '00000000-0000-4000-8000-0000000000a3', true),
  ('00000000-0000-4000-8000-0000000000b6', 'Autoridad sanitaria', 'autoridad', true, '00000000-0000-4000-8000-0000000000a4', true),
  ('00000000-0000-4000-8000-0000000000b7', 'Laboratorio demo Andino', 'laboratorio', true, '00000000-0000-4000-8000-0000000000a2', true),
  ('00000000-0000-4000-8000-0000000000b8', 'Moderación',   'moderador',     true,  NULL, true),
  ('00000000-0000-4000-8000-0000000000b9', 'ONG demo Ríos Vivos', 'ong',    true,  '00000000-0000-4000-8000-0000000000a1', true)
ON CONFLICT DO NOTHING;

INSERT INTO fuentes_agua (id, nombre, tipo, cerca, ubicacion, ficticia) VALUES
  ('demo:arroyo-esperanza', 'Arroyo Esperanza',        'arroyo',    'Comunidad ficticia', 'SRID=4326;POINT(-67.62 -15.08)', true),
  ('demo:villa-tajibo',     'Red de Villa Tajibo',     'red',       'Comunidad ficticia', 'SRID=4326;POINT(-67.18 -14.72)', true),
  ('demo:puerto-cusi',      'Toma de Puerto Cusi',     'rio',       'Comunidad ficticia', 'SRID=4326;POINT(-66.92 -14.98)', true),
  ('demo:san-lucero',       'Vertiente de San Lucero', 'vertiente', 'Comunidad ficticia', 'SRID=4326;POINT(-67.36 -15.34)', true)
ON CONFLICT DO NOTHING;

INSERT INTO indicadores_ambientales (id, fuente_id, nivel, detalle, origen, fecha, demo) VALUES
  ('00000000-0000-4000-8000-0000000000c1', 'demo:arroyo-esperanza', 'posible_riesgo', 'Agua más turbia y suelo desnudo aguas arriba en imágenes satelitales.', 'DEMO', '2026-11-01', true),
  ('00000000-0000-4000-8000-0000000000c2', 'demo:villa-tajibo',     'sin_senales',    'Sin cambios notables cerca de la toma.',                                 'DEMO', '2026-11-01', true),
  ('00000000-0000-4000-8000-0000000000c3', 'demo:puerto-cusi',      'posible_riesgo', 'Dragas detectadas cerca de la toma.',                                    'DEMO', '2026-11-01', true)
ON CONFLICT DO NOTHING;

INSERT INTO publicaciones (id, fuente_id, tipo, texto, fecha, ubicacion, autor_id, demo) VALUES
  ('00000000-0000-4000-8000-0000000000d1', 'demo:arroyo-esperanza', 'lo_vi',    'Hay maquinaria trabajando aguas arriba. El agua baja turbia por las mañanas.', '2026-11-16', 'SRID=4326;POINT(-67.612 -15.072)', '00000000-0000-4000-8000-0000000000b1', true),
  ('00000000-0000-4000-8000-0000000000d2', 'demo:arroyo-esperanza', 'analisis', 'Pedimos un análisis del arroyo. Lo usamos para cocinar.',                       '2026-10-04', 'SRID=4326;POINT(-67.628 -15.085)', '00000000-0000-4000-8000-0000000000b2', true),
  ('00000000-0000-4000-8000-0000000000d3', 'demo:puerto-cusi',      'oficial',  'No usar el agua de la toma para beber ni cocinar. Hervir no elimina el mercurio. Hay agua segura en la escuela.', '2026-11-11', 'SRID=4326;POINT(-66.915 -14.975)', '00000000-0000-4000-8000-0000000000b6', true),
  ('00000000-0000-4000-8000-0000000000d4', 'demo:puerto-cusi',      'lo_vi',    'Dragas trabajando cerca de donde sacamos agua.',                               '2026-09-18', 'SRID=4326;POINT(-66.93 -14.99)',   '00000000-0000-4000-8000-0000000000b3', true),
  ('00000000-0000-4000-8000-0000000000d5', 'rio:rio-beni',          'pregunta', '¿Hay información sobre mercurio en este tramo? Comemos pescado del río casi todos los días.', '2026-11-21', 'SRID=4326;POINT(-67.525 -14.45)', '00000000-0000-4000-8000-0000000000b3', true)
ON CONFLICT DO NOTHING;

INSERT INTO respaldos (publicacion_id, usuario_id, postura, motivo) VALUES
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b2', 'coincide', 'Vi las máquinas el 10 de noviembre.'),
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b3', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b4', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000b1', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000b3', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000b4', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000b1', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000b2', 'coincide', NULL),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000b5', 'coincide', 'Lo confirman las imágenes satelitales.')
ON CONFLICT DO NOTHING;

INSERT INTO respuestas (id, publicacion_id, autor_id, texto, creado_en) VALUES
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000b5', 'La turbidez no prueba mercurio. Ya se pidió un análisis de agua y sedimento.', '2026-11-17'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-0000000000b5', 'Hay estudios regionales, pero no un análisis de este punto. Puedes pedirlo aquí.', '2026-11-22')
ON CONFLICT DO NOTHING;

INSERT INTO solicitudes (id, fuente_id, publicacion_id, motivo, matriz, estado, solicitante_id, familias_representadas, consentimiento, organizacion_id, campana_id, demo, creado_en) VALUES
  ('00000000-0000-4000-8000-0000000000f1', 'demo:arroyo-esperanza', '00000000-0000-4000-8000-0000000000d2', 'Actividad minera aguas arriba y agua turbia. Lo usamos para cocinar.', 'agua', 'en_muestreo', '00000000-0000-4000-8000-0000000000b2', 31, true, '00000000-0000-4000-8000-0000000000a1', NULL, true, '2026-10-04'),
  ('00000000-0000-4000-8000-0000000000f2', 'demo:san-lucero', NULL, 'Repetir el análisis con un método más sensible.', 'agua', 'solicitada', '00000000-0000-4000-8000-0000000000b2', NULL, false, NULL, NULL, true, '2026-11-20'),
  ('00000000-0000-4000-8000-0000000000f3', 'rio:rio-beni', '00000000-0000-4000-8000-0000000000d5', '¿Hay mercurio en el agua y el pescado que consumimos?', NULL, 'en_revision', '00000000-0000-4000-8000-0000000000b3', NULL, false, NULL, NULL, true, '2026-11-22')
ON CONFLICT DO NOTHING;

INSERT INTO solicitud_apoyos (solicitud_id, usuario_id) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000b1'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000b3'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000b4'),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-0000000000b4')
ON CONFLICT DO NOTHING;

-- El historial se reinserta solo si la solicitud aún no tiene eventos.
INSERT INTO solicitud_eventos (solicitud_id, estado, actor_id, actor, nota, fecha)
SELECT * FROM (VALUES
  ('00000000-0000-4000-8000-0000000000f1'::uuid, 'solicitada',         '00000000-0000-4000-8000-0000000000b2'::uuid, 'Julián C. · representante', 'En nombre de 31 familias, con consentimiento.', '2026-10-04'::timestamptz),
  ('00000000-0000-4000-8000-0000000000f1', 'en_revision',        '00000000-0000-4000-8000-0000000000b8', 'Moderación', 'Sin datos personales expuestos.', '2026-10-05'),
  ('00000000-0000-4000-8000-0000000000f1', 'asignada',           '00000000-0000-4000-8000-0000000000b9', 'ONG demo Ríos Vivos', NULL, '2026-10-09'),
  ('00000000-0000-4000-8000-0000000000f1', 'pendiente_recursos', '00000000-0000-4000-8000-0000000000b9', 'ONG demo Ríos Vivos', 'Presupuesto publicado como campaña.', '2026-10-12'),
  ('00000000-0000-4000-8000-0000000000f1', 'en_muestreo',        '00000000-0000-4000-8000-0000000000b7', 'Laboratorio demo Andino', 'Muestreo con cadena de custodia.', '2026-11-18'),
  ('00000000-0000-4000-8000-0000000000f2', 'solicitada',         '00000000-0000-4000-8000-0000000000b2', 'Julián C. · representante', NULL, '2026-11-20'),
  ('00000000-0000-4000-8000-0000000000f3', 'solicitada',         '00000000-0000-4000-8000-0000000000b3', 'Elena Q. · ciudadana', NULL, '2026-11-22'),
  ('00000000-0000-4000-8000-0000000000f3', 'en_revision',        '00000000-0000-4000-8000-0000000000b8', 'Moderación', NULL, '2026-11-23')
) AS e(solicitud_id, estado, actor_id, actor, nota, fecha)
WHERE NOT EXISTS (SELECT 1 FROM solicitud_eventos x WHERE x.solicitud_id = e.solicitud_id);

-- Muestras y mediciones DEMO (validadas por una persona distinta de quien las cargó).
INSERT INTO muestras (id, fuente_id, matriz, fecha_muestreo, ubicacion, cadena_custodia, laboratorio_id, demo) VALUES
  ('00000000-0000-4000-8000-000000000101', 'demo:villa-tajibo', 'agua', '2026-09-30', 'SRID=4326;POINT(-67.18 -14.72)', 'CC-DEMO-001', '00000000-0000-4000-8000-0000000000a2', true),
  ('00000000-0000-4000-8000-000000000102', 'demo:puerto-cusi',  'agua', '2026-10-21', 'SRID=4326;POINT(-66.92 -14.98)', 'CC-DEMO-002', '00000000-0000-4000-8000-0000000000a2', true),
  ('00000000-0000-4000-8000-000000000103', 'demo:san-lucero',   'agua', '2026-08-14', 'SRID=4326;POINT(-67.36 -15.34)', 'CC-DEMO-003', '00000000-0000-4000-8000-0000000000a2', true)
ON CONFLICT DO NOTHING;

INSERT INTO mediciones (id, muestra_id, analito, calificador, valor, unidad, valor_normalizado, unidad_normalizada, limite_deteccion, metodo, documento_ref, cargada_por, revision, revisada_por, revisada_en, demo) VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'hg_total', 'detectado',    0.42, 'µg/L', 420,  'ng/L', 0.05, 'CV-AFS (DEMO)', 'DEMO-INF-001', '00000000-0000-4000-8000-0000000000b7', 'validada', '00000000-0000-4000-8000-0000000000b5', '2026-10-10', true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102', 'hg_total', 'detectado',    1.8,  'µg/L', 1800, 'ng/L', 0.05, 'CV-AFS (DEMO)', 'DEMO-INF-002', '00000000-0000-4000-8000-0000000000b7', 'validada', '00000000-0000-4000-8000-0000000000b5', '2026-11-02', true),
  -- Límite de detección mayor que el criterio: «no detectado» no permite concluir.
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000103', 'hg_total', 'no_detectado', NULL, 'µg/L', NULL, 'ng/L', 2,    'Kit colorimétrico (DEMO)', 'DEMO-INF-003', '00000000-0000-4000-8000-0000000000b7', 'validada', '00000000-0000-4000-8000-0000000000b5', '2026-08-30', true)
ON CONFLICT DO NOTHING;

INSERT INTO alertas_oficiales (id, fuente_id, autoridad_id, texto, demo, creado_en) VALUES
  ('00000000-0000-4000-8000-000000000301', 'demo:puerto-cusi', '00000000-0000-4000-8000-0000000000b6',
   'No usar el agua de la toma para beber ni cocinar. Hervir no elimina el mercurio. Hay agua segura en la escuela.', true, '2026-11-11')
ON CONFLICT DO NOTHING;
