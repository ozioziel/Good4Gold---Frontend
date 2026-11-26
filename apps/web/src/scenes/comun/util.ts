// Utilidades de tiempo de recorrido y ruido determinista, compartidas por las escenas (Inicio y Donaciones).

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** smoothstep entre a y b. */
export function suave(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Banda de visibilidad: entra entre a→b y sale entre c→d. Devuelve 0..1. */
export function banda(t: number, a: number, b: number, c: number, d: number) {
  return suave(a, b, t) * (1 - suave(c, d, t));
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** Generador pseudoaleatorio con semilla (mulberry32): las escenas se ven igual en cada visita. */
export function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor 2D suave + fbm. Suficiente para relieve y manchas; no necesita librerías. */
export function crearRuido(semilla = 7) {
  const r = azar(semilla);
  const N = 256;
  const tabla = new Float32Array(N * N);
  for (let i = 0; i < tabla.length; i++) tabla[i] = r();
  const v = (x: number, y: number) => tabla[((y & (N - 1)) * N + (x & (N - 1))) | 0];
  const ruido = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi);
    const b = v(xi + 1, yi);
    const c = v(xi, yi + 1);
    const d = v(xi + 1, yi + 1);
    return lerp(lerp(a, b, u), lerp(c, d, u), w) * 2 - 1;
  };
  const fbm = (x: number, y: number, octavas = 5) => {
    let s = 0;
    let amp = 0.5;
    let f = 1;
    for (let i = 0; i < octavas; i++) {
      s += amp * ruido(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return s;
  };
  return { ruido, fbm };
}
