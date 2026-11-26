// Señal «Comunidad» (apps/web/src/pages/mapa/estado.tsx): sirve para priorizar, nunca confirma mercurio.
// «Lo considera riesgoso» cuando al menos 3 personas distintas reportan («Lo vi») o respaldan un reporte.
export type NivelComunidad = 'sin_reportes' | 'reportes' | 'riesgoso';
export const UMBRAL_PERSONAS = 3;

export interface ReporteResumen {
  tipo: string;
  autor: string; // id de usuario o nombre declarado
  coinciden: string[]; // ids de quienes respaldan con «coincide»
}

export function senalComunidad(publicaciones: ReporteResumen[]) {
  const reportes = publicaciones.filter((p) => p.tipo === 'lo_vi');
  const personas = new Set(reportes.flatMap((p) => [p.autor, ...p.coinciden]));
  const respaldos = reportes.reduce((n, p) => n + p.coinciden.length, 0);
  const nivel: NivelComunidad = reportes.length === 0 ? 'sin_reportes' : personas.size >= UMBRAL_PERSONAS ? 'riesgoso' : 'reportes';
  return { nivel, reportes: reportes.length, respaldos, personas: personas.size, publicaciones: publicaciones.length };
}
