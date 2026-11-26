import { esInstitucion, type Rol } from './roles';

// Ciclo de una solicitud de investigación (PROYECTO.md §4). La tabla de transiciones es la misma
// de apps/web/src/data/solicitudes.ts (accionesPara), más «ong» como institución.
export const ESTADOS = [
  'solicitada',
  'en_revision',
  'asignada',
  'pendiente_recursos',
  'en_muestreo',
  'en_analisis',
  'revision_tecnica',
  'resultados_publicados',
  'cerrada',
  'rechazada',
] as const;
export type EstadoSolicitud = (typeof ESTADOS)[number];

export interface Accion {
  a: EstadoSolicitud;
  clave: string;
}

export function accionesPara(rol: Rol, estado: EstadoSolicitud): Accion[] {
  const institucion = esInstitucion(rol);
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

/** Contexto que el servidor revisa además de la tabla de roles. */
export interface ContextoTransicion {
  rol: Rol;
  rolVerificado: boolean;
  organizacionUsuario: string | null;
  organizacionAsignada: string | null;
  nota?: string;
  mediciones: { total: number; pendientes: number; validadas: number };
}

/**
 * Decide si una transición está permitida. Devuelve null si sí, o el motivo si no.
 * Reglas extra del servidor:
 *  · las acciones institucionales exigen un rol verificado;
 *  · rechazar exige una justificación;
 *  · aceptar asigna la organización de quien acepta; después solo esa organización (o un
 *    laboratorio / investigador verificado en sus pasos técnicos) avanza el caso;
 *  · no se pasa a revisión técnica sin un resultado cargado, ni se publica con resultados sin revisar.
 */
export function motivoRechazo(desde: EstadoSolicitud, hacia: EstadoSolicitud, c: ContextoTransicion): string | null {
  if (!accionesPara(c.rol, desde).some((x) => x.a === hacia)) return `El rol ${c.rol} no puede pasar de ${desde} a ${hacia}.`;
  if ((esInstitucion(c.rol) || c.rol === 'moderador') && !c.rolVerificado) return 'Tu rol todavía no fue verificado.';
  if (hacia === 'rechazada' && !c.nota?.trim()) return 'Rechazar exige explicar el motivo.';
  if (hacia === 'asignada' && c.rol !== 'moderador' && !c.organizacionUsuario) return 'Para aceptar un caso necesitas pertenecer a una organización.';
  if ((desde === 'asignada' || desde === 'pendiente_recursos') && c.organizacionAsignada && c.organizacionUsuario !== c.organizacionAsignada)
    return 'Solo la organización asignada puede avanzar este caso.';
  if (hacia === 'revision_tecnica' && c.mediciones.total === 0) return 'Primero hay que cargar al menos un resultado de laboratorio.';
  if (hacia === 'resultados_publicados') {
    if (c.mediciones.pendientes > 0) return 'Hay resultados sin revisión técnica.';
    if (c.mediciones.validadas === 0) return 'No hay resultados validados para publicar.';
  }
  return null;
}

/** Cómo se ve el trámite en la señal «Laboratorio oficial» mientras no hay resultado. */
export function nivelTramite(estado: EstadoSolicitud): 'solicitado' | 'en_proceso' | null {
  if (estado === 'solicitada' || estado === 'en_revision') return 'solicitado';
  if (estado === 'rechazada' || estado === 'cerrada' || estado === 'resultados_publicados') return null;
  return 'en_proceso';
}
