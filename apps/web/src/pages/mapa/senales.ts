import type { Lugar, NivelComunidad, NivelOficial, NivelVirtual } from '@/data/mapa-lugares';
import type { SenalesLugar } from './estado';
import type { Modo } from '@/app/tema';

// Tonos de las señales. Siempre acompañados de texto, icono y forma del anillo (nunca solo color).
// Las funciones devuelven el nombre del tono; el color concreto depende del fondo:
// - DOM: cssTono() → var(--senal-*) de tokens.css, que cambia con el tema.
// - MapLibre: TONO_HEX[modo] (el mapa comunitario sigue el tema; el globo del Laboratorio es siempre oscuro).
export type Tono = 'neutro' | 'agua' | 'proceso' | 'riesgo' | 'alto' | 'duda' | 'reportes';

export const TONO_HEX: Record<Modo, Record<Tono, string>> = {
  // Sobre la noche del mapa.
  oscuro: { neutro: '#a9a596', agua: '#8fc3dc', proceso: '#d4af55', riesgo: '#e8a256', alto: '#ea6f5f', duda: '#c2ab7f', reportes: '#d9d3c0' },
  // Sobre el alba (marfil): versiones hondas, ≥4.5:1 como texto y ≥3:1 como punto.
  claro: { neutro: '#66645a', agua: '#2b6a89', proceso: '#80611f', riesgo: '#9c5016', alto: '#b0392b', duda: '#74643c', reportes: '#47463f' },
};

export const cssTono = (t: Tono) => `var(--senal-${t})`;

export const tonoComunidad = (n: NivelComunidad): Tono => (n === 'riesgoso' ? 'riesgo' : n === 'reportes' ? 'reportes' : 'neutro');
export const tonoVirtual = (n: NivelVirtual): Tono => (n === 'posible_riesgo' ? 'riesgo' : n === 'sin_senales' ? 'agua' : 'neutro');
export const tonoOficial = (n: NivelOficial): Tono =>
  n === 'sobre_criterio'
    ? 'alto'
    : n === 'dentro_criterio'
      ? 'agua'
      : n === 'no_concluyente'
        ? 'duda'
        : n === 'solicitado' || n === 'en_proceso'
          ? 'proceso'
          : 'neutro';

const PRIORIDAD: Tono[] = ['alto', 'riesgo', 'proceso', 'duda', 'agua', 'reportes', 'neutro'];

/** Tono del punto en el mapa: la señal más importante entre las tres. */
export function tonoLugar(l: Lugar, s: SenalesLugar): Tono {
  const tonos = [tonoOficial(s.oficial), tonoVirtual(l.virtual.nivel), tonoComunidad(s.comunidad.nivel)];
  return PRIORIDAD.find((p) => tonos.includes(p)) ?? 'neutro';
}

/** Expresión de MapLibre que traduce la propiedad «tono» de cada punto al color del tema. */
export function exprTono(modo: Modo) {
  const h = TONO_HEX[modo];
  return ['match', ['get', 'tono'], ...PRIORIDAD.flatMap((t) => [t, h[t]]), h.neutro] as unknown as string;
}

/** ¿Merece un punto en el mapa? Solo los lugares con algo que decir (menos ruido). */
export const tieneInformacion = (l: Lugar, s: SenalesLugar) =>
  l.ficticio || s.comunidad.publicaciones > 0 || l.virtual.nivel !== 'sin_analisis' || s.oficial !== 'sin_analisis';
