// Conversión de concentraciones a una unidad común por matriz. Se guarda siempre el valor original.
// Agua → ng/L. Sólidos y tejidos (sedimento, pez, cabello) → ng/g (= µg/kg).
const AGUA: Record<string, number> = { 'ng/L': 1, 'µg/L': 1_000, 'mg/L': 1_000_000 };
const SOLIDO: Record<string, number> = { 'ng/g': 1, 'µg/g': 1_000, 'mg/kg': 1_000 };

export type Matriz = 'agua' | 'sedimento' | 'pez' | 'cabello';

export function normalizar(valor: number | null, unidad: string, matriz: Matriz): { valor: number | null; unidad: string } | null {
  const tabla = matriz === 'agua' ? AGUA : SOLIDO;
  const f = tabla[unidad];
  if (f === undefined) return null; // unidad que no corresponde a la matriz
  return { valor: valor == null ? null : valor * f, unidad: matriz === 'agua' ? 'ng/L' : 'ng/g' };
}
