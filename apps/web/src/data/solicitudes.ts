// Ciclo institucional de las solicitudes de investigación (plan.md §2.3), compartido entre el Mapa
// (señal «Laboratorio oficial») y el Panel. Demostración en localStorage; en producción, el backend
// valida cada transición según el rol.
import type { NivelOficial } from './mapa-lugares';

export type EstadoSolicitud =
  | 'solicitada'
  | 'en_revision'
  | 'asignada'
  | 'pendiente_recursos'
  | 'en_muestreo'
  | 'en_analisis'
  | 'revision_tecnica'
  | 'resultados_publicados'
  | 'cerrada'
  | 'rechazada';

export const PASOS: EstadoSolicitud[] = [
  'solicitada',
  'en_revision',
  'asignada',
  'pendiente_recursos',
  'en_muestreo',
  'en_analisis',
  'revision_tecnica',
  'resultados_publicados',
];

export interface EventoSolicitud {
  estado: EstadoSolicitud;
  fecha: string;
  actor: string;
  nota?: string;
}

export interface SolicitudPanel {
  id: string;
  lugarId: string;
  lugar: string;
  motivo: string;
  apoyos: number;
  estado: EstadoSolicitud;
  organizacion?: string;
  campanaId?: string;
  historial: EventoSolicitud[];
  /** Acciones que el servidor permite a la sesión actual (si hay API). */
  acciones?: { a: EstadoSolicitud; clave: string }[];
}

const CLAVE = 'g2:solicitudes:v1';

export const SOLICITUDES_DEMO: SolicitudPanel[] = [
  {
    id: 'sol-esperanza',
    lugarId: 'demo:arroyo-esperanza',
    lugar: 'Arroyo Esperanza',
    motivo: 'Actividad minera aguas arriba y agua turbia. Lo usamos para cocinar.',
    apoyos: 23,
    estado: 'en_muestreo',
    organizacion: 'ONG demo Ríos Vivos + Laboratorio demo Andino',
    campanaId: 'arroyo-esperanza',
    historial: [
      { estado: 'solicitada', fecha: '2026-10-04', actor: 'Julián C. · representante', nota: 'En nombre de 31 familias, con consentimiento.' },
      { estado: 'en_revision', fecha: '2026-10-05', actor: 'Moderación', nota: 'Sin datos personales expuestos.' },
      { estado: 'asignada', fecha: '2026-10-09', actor: 'ONG demo Ríos Vivos' },
      { estado: 'pendiente_recursos', fecha: '2026-10-12', actor: 'ONG demo Ríos Vivos', nota: 'Presupuesto publicado como campaña.' },
      { estado: 'en_muestreo', fecha: '2026-11-18', actor: 'Laboratorio demo Andino', nota: 'Muestreo con cadena de custodia.' },
    ],
  },
  {
    id: 'sol-lucero',
    lugarId: 'demo:san-lucero',
    lugar: 'Vertiente de San Lucero',
    motivo: 'Repetir el análisis con un método más sensible.',
    apoyos: 9,
    estado: 'solicitada',
    historial: [{ estado: 'solicitada', fecha: '2026-11-20', actor: 'Julián C. · representante' }],
  },
  {
    id: 'sol-beni',
    lugarId: 'rio:rio-beni',
    lugar: 'Río Beni · Rurrenabaque',
    motivo: '¿Hay mercurio en el agua y el pescado que consumimos?',
    apoyos: 4,
    estado: 'en_revision',
    historial: [
      { estado: 'solicitada', fecha: '2026-11-22', actor: 'Elena Q. · ciudadana' },
      { estado: 'en_revision', fecha: '2026-11-23', actor: 'Moderación' },
    ],
  },
];

export function leerSolicitudes(): SolicitudPanel[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return JSON.parse(raw) as SolicitudPanel[];
  } catch {
    /* sin almacenamiento */
  }
  return SOLICITUDES_DEMO;
}

export function guardarSolicitudes(lista: SolicitudPanel[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* sin espacio */
  }
}

/** Cómo se ve una solicitud en la señal «Laboratorio oficial» del mapa. */
export function nivelOficialDe(estado: EstadoSolicitud): NivelOficial | null {
  if (estado === 'solicitada' || estado === 'en_revision') return 'solicitado';
  if (estado === 'rechazada' || estado === 'cerrada' || estado === 'resultados_publicados') return null;
  return 'en_proceso';
}

/** Transiciones que cada rol puede hacer (la misma tabla irá al backend). */
export function accionesPara(rol: string, estado: EstadoSolicitud): { a: EstadoSolicitud; clave: string }[] {
  const institucion = ['investigador', 'laboratorio', 'ong', 'autoridad'].includes(rol);
  switch (estado) {
    case 'solicitada':
      return rol === 'moderador' ? [{ a: 'en_revision', clave: 'revisar' }, { a: 'rechazada', clave: 'rechazar' }] : [];
    case 'en_revision':
      return institucion || rol === 'moderador' ? [{ a: 'asignada', clave: 'aceptar' }, { a: 'rechazada', clave: 'rechazar' }] : [];
    case 'asignada':
      return institucion ? [{ a: 'pendiente_recursos', clave: 'pedirFondos' }, { a: 'en_muestreo', clave: 'muestrear' }] : [];
    case 'pendiente_recursos':
      return institucion ? [{ a: 'en_muestreo', clave: 'muestrear' }] : [];
    case 'en_muestreo':
      return rol === 'laboratorio' || rol === 'investigador' ? [{ a: 'en_analisis', clave: 'analizar' }] : [];
    case 'en_analisis':
      return rol === 'laboratorio' ? [{ a: 'revision_tecnica', clave: 'cargarResultado' }] : [];
    case 'revision_tecnica':
      return rol === 'investigador' || rol === 'moderador' ? [{ a: 'resultados_publicados', clave: 'publicar' }] : [];
    case 'resultados_publicados':
      return institucion || rol === 'moderador' ? [{ a: 'cerrada', clave: 'cerrar' }] : [];
    default:
      return [];
  }
}
