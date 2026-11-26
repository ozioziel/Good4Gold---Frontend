import type { Lugar, NivelComunidad, NivelOficial, NivelVirtual } from '@/data/mapa-lugares';
import type { SenalesLugar } from './estado';

// Tonos de las señales sobre la noche del mapa. Siempre acompañados de texto (nunca solo color).
export const TONO = {
  neutro: '#a9a596',
  agua: '#8fc3dc',
  proceso: '#d4af55',
  riesgo: '#e8a256',
  alto: '#ea6f5f',
  duda: '#c2ab7f',
} as const;

export const tonoComunidad = (n: NivelComunidad) => (n === 'riesgoso' ? TONO.riesgo : n === 'reportes' ? '#d9d3c0' : TONO.neutro);
export const tonoVirtual = (n: NivelVirtual) => (n === 'posible_riesgo' ? TONO.riesgo : n === 'sin_senales' ? TONO.agua : TONO.neutro);
export const tonoOficial = (n: NivelOficial) =>
  n === 'sobre_criterio'
    ? TONO.alto
    : n === 'dentro_criterio'
      ? TONO.agua
      : n === 'no_concluyente'
        ? TONO.duda
        : n === 'solicitado' || n === 'en_proceso'
          ? TONO.proceso
          : TONO.neutro;

const PRIORIDAD: string[] = [TONO.alto, TONO.riesgo, TONO.proceso, TONO.duda, TONO.agua, '#d9d3c0', TONO.neutro];

/** Tono del punto en el mapa: la señal más importante entre las tres. */
export function tonoLugar(l: Lugar, s: SenalesLugar) {
  const tonos = [tonoOficial(s.oficial), tonoVirtual(l.virtual.nivel), tonoComunidad(s.comunidad.nivel)];
  return PRIORIDAD.find((p) => tonos.includes(p as never)) ?? TONO.neutro;
}

/** ¿Merece un punto en el mapa? Solo los lugares con algo que decir (menos ruido). */
export const tieneInformacion = (l: Lugar, s: SenalesLugar) =>
  l.ficticio || s.comunidad.publicaciones > 0 || l.virtual.nivel !== 'sin_analisis' || s.oficial !== 'sin_analisis';
