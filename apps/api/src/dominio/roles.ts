// Roles y permisos (PROYECTO.md §6). Refleja apps/web/src/data/mapa-lugares.ts (Rol) y
// apps/web/src/pages/mapa/estado.tsx (tiposPermitidos); el servidor es quien decide.
export const ROLES = ['ciudadano', 'representante', 'investigador', 'laboratorio', 'ong', 'autoridad', 'moderador'] as const;
export type Rol = (typeof ROLES)[number];

export const INSTITUCION: readonly Rol[] = ['investigador', 'laboratorio', 'ong', 'autoridad'];
export const esInstitucion = (r: Rol) => INSTITUCION.includes(r);

export type TipoPublicacion = 'lo_vi' | 'pregunta' | 'analisis' | 'oficial';

/**
 * Qué tipos de publicación puede crear cada rol.
 * Diferencia deliberada con el frontend: allí el laboratorio puede publicar «oficial»; aquí no,
 * porque un laboratorio carga resultados pero no emite alertas oficiales (PROYECTO.md §6).
 */
export function tiposPermitidos(rol: Rol): readonly TipoPublicacion[] {
  if (rol === 'autoridad') return ['oficial', 'pregunta'];
  if (rol === 'laboratorio') return ['pregunta'];
  return ['lo_vi', 'pregunta', 'analisis'];
}

/** Quién puede pedir una investigación. */
export const PUEDE_SOLICITAR: readonly Rol[] = ['ciudadano', 'representante', 'investigador', 'ong'];
