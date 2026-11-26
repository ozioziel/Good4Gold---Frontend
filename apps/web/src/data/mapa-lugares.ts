// Lugares del Mapa comunitario y sus tres señales, siempre separadas (CLAUDE.md):
//   Comunidad            → lo que reportan y respaldan las personas (se calcula con las publicaciones).
//   Laboratorio virtual  → indicadores satelitales y modelos experimentales de nuestro Laboratorio. Nunca certifica.
//   Laboratorio oficial  → análisis químico de un laboratorio competente.
//
// Ríos reales (OpenStreetMap): sin resultados inventados; sus señales dicen «Sin análisis».
// Lugares ficticios (DEMO): muestran cada combinación de señales para la demostración.

export type TipoLugar = 'rio' | 'arroyo' | 'pozo' | 'red' | 'vertiente' | 'punto';
export type NivelVirtual = 'sin_analisis' | 'sin_senales' | 'posible_riesgo';
export type NivelOficial = 'sin_analisis' | 'solicitado' | 'en_proceso' | 'dentro_criterio' | 'sobre_criterio' | 'no_concluyente';
export type NivelComunidad = 'sin_reportes' | 'reportes' | 'riesgoso';
export type TipoPublicacion = 'lo_vi' | 'pregunta' | 'analisis' | 'oficial';
export type Rol = 'visitante' | 'ciudadano' | 'representante' | 'investigador' | 'laboratorio' | 'autoridad' | 'moderador';

export interface Lugar {
  id: string;
  nombre: string;
  cerca: string;
  tipo: TipoLugar;
  lat: number;
  lon: number;
  ficticio: boolean;
  virtual: { nivel: NivelVirtual; detalle: string };
  oficial: { nivel: NivelOficial; detalle: string; valor?: string };
}

export interface Persona {
  nombre: string;
  rol: Rol;
}

export interface Respaldo {
  persona: Persona;
  postura: 'coincide' | 'no_coincide';
  motivo?: string;
}

export interface Publicacion {
  id: string;
  lugarId: string;
  tipo: TipoPublicacion;
  autor: Persona;
  fecha: string;
  texto: string;
  lat: number;
  lon: number;
  foto?: boolean;
  respaldos: Respaldo[];
  respuestas: { persona: Persona; texto: string; fecha: string }[];
  demo?: boolean;
  pendiente?: boolean;
  viaQr?: boolean;
  /** Identificador de la operación de sincronización (idempotencia en el servidor). */
  opId?: string;
  /** Código QR v1 original, para reenviarlo tal cual al servidor (el transportista no es autor). */
  codigoQr?: string;
  /** Llegó con autoría declarada y espera moderación. */
  porRevisar?: boolean;
  /** El servidor la rechazó al sincronizar (motivo). */
  rechazo?: string;
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Clave de un río a partir de su nombre en el mapa base: «Río Beni» → rio:rio-beni */
export const idRio = (nombre: string) => `rio:${slug(nombre)}`;

const SIN_VIRTUAL = { nivel: 'sin_analisis' as const, detalle: 'El laboratorio virtual todavía no analizó este lugar.' };
const SIN_OFICIAL = { nivel: 'sin_analisis' as const, detalle: 'No hay un análisis químico vigente.' };

// Ríos reales de la cuenca del Beni (coordenadas de referencia: OpenStreetMap).
const reales: Lugar[] = [
  { id: idRio('Río Beni'), nombre: 'Río Beni', cerca: 'Rurrenabaque · San Buenaventura · Riberalta', tipo: 'rio', lat: -14.44, lon: -67.53, ficticio: false, virtual: SIN_VIRTUAL, oficial: SIN_OFICIAL },
  { id: idRio('Río Kaka'), nombre: 'Río Kaka', cerca: 'Teoponte · Guanay', tipo: 'rio', lat: -15.4956, lon: -67.8191, ficticio: false, virtual: SIN_VIRTUAL, oficial: SIN_OFICIAL },
  { id: idRio('Río Mapiri'), nombre: 'Río Mapiri', cerca: 'Mapiri · Guanay', tipo: 'rio', lat: -15.3096, lon: -68.2148, ficticio: false, virtual: SIN_VIRTUAL, oficial: SIN_OFICIAL },
  { id: idRio('Río Tipuani'), nombre: 'Río Tipuani', cerca: 'Tipuani · Guanay', tipo: 'rio', lat: -15.5661, lon: -68.0206, ficticio: false, virtual: SIN_VIRTUAL, oficial: SIN_OFICIAL },
  { id: idRio('Río Coroico'), nombre: 'Río Coroico', cerca: 'Caranavi', tipo: 'rio', lat: -15.6946, lon: -67.3921, ficticio: false, virtual: SIN_VIRTUAL, oficial: SIN_OFICIAL },
];

// Lugares ficticios para la demostración (nombres inventados).
const ficticios: Lugar[] = [
  {
    id: 'demo:arroyo-esperanza',
    nombre: 'Arroyo Esperanza',
    cerca: 'Comunidad ficticia',
    tipo: 'arroyo',
    lat: -15.08,
    lon: -67.62,
    ficticio: true,
    virtual: { nivel: 'posible_riesgo', detalle: 'Agua más turbia y suelo desnudo aguas arriba en imágenes satelitales.' },
    oficial: { nivel: 'en_proceso', detalle: 'Muestreo programado por un laboratorio participante.' },
  },
  {
    id: 'demo:villa-tajibo',
    nombre: 'Red de Villa Tajibo',
    cerca: 'Comunidad ficticia',
    tipo: 'red',
    lat: -14.72,
    lon: -67.18,
    ficticio: true,
    virtual: { nivel: 'sin_senales', detalle: 'Sin cambios notables cerca de la toma.' },
    oficial: { nivel: 'dentro_criterio', valor: '0,42 µg/L', detalle: 'Hg detectado, dentro del criterio. No certifica que el agua sea potable.' },
  },
  {
    id: 'demo:puerto-cusi',
    nombre: 'Toma de Puerto Cusi',
    cerca: 'Comunidad ficticia',
    tipo: 'rio',
    lat: -14.98,
    lon: -66.92,
    ficticio: true,
    virtual: { nivel: 'posible_riesgo', detalle: 'Dragas detectadas cerca de la toma.' },
    oficial: { nivel: 'sobre_criterio', valor: '1,8 µg/L', detalle: 'Sobre el criterio para agua de consumo. Sigue la recomendación oficial.' },
  },
  {
    id: 'demo:san-lucero',
    nombre: 'Vertiente de San Lucero',
    cerca: 'Comunidad ficticia',
    tipo: 'vertiente',
    lat: -15.34,
    lon: -67.36,
    ficticio: true,
    virtual: SIN_VIRTUAL,
    oficial: { nivel: 'no_concluyente', detalle: 'El método no detecta concentraciones bajas. Hay que repetir.' },
  },
];

export const LUGARES: Lugar[] = [...ficticios, ...reales];

/** Lugar genérico para un río o punto sin información (lo que el visitante toque en el mapa). */
export const lugarSinDatos = (id: string, nombre: string, lat: number, lon: number, tipo: TipoLugar = 'rio'): Lugar => ({
  id,
  nombre,
  cerca: '',
  tipo,
  lat,
  lon,
  ficticio: false,
  virtual: SIN_VIRTUAL,
  oficial: SIN_OFICIAL,
});

const P = {
  rosa: { nombre: 'Rosa M.', rol: 'ciudadano' as Rol },
  julian: { nombre: 'Julián C.', rol: 'representante' as Rol },
  elena: { nombre: 'Elena Q.', rol: 'ciudadano' as Rol },
  mateo: { nombre: 'Mateo R.', rol: 'ciudadano' as Rol },
  ana: { nombre: 'Dra. Ana P.', rol: 'investigador' as Rol },
  sedes: { nombre: 'Autoridad sanitaria', rol: 'autoridad' as Rol },
};

export const PUBLICACIONES_DEMO: Publicacion[] = [
  {
    id: 'demo-1',
    lugarId: 'demo:arroyo-esperanza',
    tipo: 'lo_vi',
    autor: P.rosa,
    fecha: '2026-11-16',
    texto: 'Hay maquinaria trabajando aguas arriba. El agua baja turbia por las mañanas.',
    lat: -15.072,
    lon: -67.612,
    foto: true,
    demo: true,
    respaldos: [
      { persona: P.julian, postura: 'coincide', motivo: 'Vi las máquinas el 10 de noviembre.' },
      { persona: P.elena, postura: 'coincide' },
      { persona: P.mateo, postura: 'coincide' },
    ],
    respuestas: [{ persona: P.ana, texto: 'La turbidez no prueba mercurio. Ya se pidió un análisis de agua y sedimento.', fecha: '2026-11-17' }],
  },
  {
    id: 'demo-2',
    lugarId: 'demo:arroyo-esperanza',
    tipo: 'analisis',
    autor: P.julian,
    fecha: '2026-10-04',
    texto: 'Pedimos un análisis del arroyo. Lo usamos para cocinar.',
    lat: -15.085,
    lon: -67.628,
    demo: true,
    respaldos: [
      { persona: P.rosa, postura: 'coincide' },
      { persona: P.elena, postura: 'coincide' },
    ],
    respuestas: [],
  },
  {
    id: 'demo-3',
    lugarId: 'demo:puerto-cusi',
    tipo: 'oficial',
    autor: P.sedes,
    fecha: '2026-11-11',
    texto: 'No usar el agua de la toma para beber ni cocinar. Hervir no elimina el mercurio. Hay agua segura en la escuela.',
    lat: -14.975,
    lon: -66.915,
    demo: true,
    respaldos: [],
    respuestas: [],
  },
  {
    id: 'demo-4',
    lugarId: 'demo:puerto-cusi',
    tipo: 'lo_vi',
    autor: P.elena,
    fecha: '2026-09-18',
    texto: 'Dragas trabajando cerca de donde sacamos agua.',
    lat: -14.99,
    lon: -66.93,
    demo: true,
    respaldos: [
      { persona: P.mateo, postura: 'coincide' },
      { persona: P.rosa, postura: 'coincide' },
      { persona: P.julian, postura: 'coincide' },
      { persona: P.ana, postura: 'coincide', motivo: 'Lo confirman las imágenes satelitales.' },
    ],
    respuestas: [],
  },
  {
    id: 'demo-5',
    lugarId: idRio('Río Beni'),
    tipo: 'pregunta',
    autor: P.elena,
    fecha: '2026-11-21',
    texto: '¿Hay información sobre mercurio en este tramo? Comemos pescado del río casi todos los días.',
    lat: -14.45,
    lon: -67.525,
    demo: true,
    respaldos: [],
    respuestas: [{ persona: P.ana, texto: 'Hay estudios regionales, pero no un análisis de este punto. Puedes pedirlo aquí.', fecha: '2026-11-22' }],
  },
];

export const ESTUDIO_REGIONAL = {
  titulo: 'Valdivieso et al. 2025 · cuenca del Beni',
  url: 'https://bolivianchemistryjournaliiq.umsa.bo/wp-content/uploads/2025/12/6.-nMercuryBeniRiver-Valdivieso2025.pdf',
};
