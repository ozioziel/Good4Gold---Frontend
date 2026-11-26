// Niveles de calidad para escenas WebGL. Celulares económicos son el público prioritario:
// en duda, calidad baja. Parámetros de prueba: ?hd=1 fuerza alta, ?sd=1 fuerza baja.
export type Calidad = 'alta' | 'baja';

export function detectarCalidad(): Calidad {
  const q = new URLSearchParams(location.search);
  if (q.get('hd') === '1') return 'alta';
  if (q.get('sd') === '1') return 'baja';
  const tactil = matchMedia('(pointer: coarse)').matches;
  const pequena = Math.min(innerWidth, innerHeight) < 700;
  const pocosNucleos = (navigator.hardwareConcurrency ?? 4) <= 4;
  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (tactil || pequena || pocosNucleos || (memoria !== undefined && memoria <= 4)) return 'baja';
  return 'alta';
}

export function dprPara(calidad: Calidad) {
  const fino = matchMedia('(pointer: fine)').matches;
  const tope = calidad === 'alta' ? (fino ? 1.75 : 1.5) : 1.25;
  return Math.min(window.devicePixelRatio || 1, tope);
}

/** Elige una cantidad según la calidad. */
export const hi = (calidad: Calidad, alta: number, baja: number) => (calidad === 'alta' ? alta : baja);

export function webglDisponible() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
