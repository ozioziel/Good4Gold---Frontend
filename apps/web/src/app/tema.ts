import { useSyncExternalStore } from 'react';

/**
 * Tema claro / oscuro de todo el sitio.
 * El valor vive en <html data-modo="…">; el script en línea de index.html lo fija antes del primer pintado
 * (preferencia guardada o, si no hay, prefers-color-scheme). Aquí solo se lee, se cambia y se avisa.
 */
export type Modo = 'claro' | 'oscuro';

export const CLAVE_MODO = 'gold2-modo';
/** Color de la barra del navegador por tema (meta theme-color). */
export const COLOR_BARRA: Record<Modo, string> = { oscuro: '#181a17', claro: '#f3f0e4' };

const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

export function modoActual(): Modo {
  return typeof document !== 'undefined' && document.documentElement.dataset.modo === 'claro' ? 'claro' : 'oscuro';
}

function guardado(): Modo | null {
  try {
    const v = localStorage.getItem(CLAVE_MODO);
    return v === 'claro' || v === 'oscuro' ? v : null;
  } catch {
    return null;
  }
}

function reducido() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('reduced') === '1';
}

/** Pinta el color de la barra del navegador. Layout lo ajusta por pestaña (Inicio y Donaciones son oscuros). */
export function fijarColorBarra(color: string) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

function aplicar(m: Modo) {
  const html = document.documentElement;
  html.dataset.modo = m;
  html.style.colorScheme = m === 'claro' ? 'light' : 'dark';
  fijarColorBarra(COLOR_BARRA[m]);
  avisar();
}

/** Cambia el tema. `recordar` lo guarda como preferencia del usuario (si no, se sigue al sistema). */
export function cambiarModo(m: Modo, recordar = true) {
  if (recordar) {
    try {
      localStorage.setItem(CLAVE_MODO, m);
    } catch {
      /* sin almacenamiento (modo privado): el cambio vale solo para esta visita */
    }
  }
  if (m === modoActual()) return;
  // Fundido corto entre temas, nunca con movimiento reducido.
  const doc = document as Document & { startViewTransition?: (fn: () => void) => unknown };
  if (doc.startViewTransition && !reducido()) doc.startViewTransition(() => aplicar(m));
  else aplicar(m);
}

// Sin preferencia guardada, el sitio sigue al sistema también cuando este cambia.
if (typeof window !== 'undefined') {
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!guardado()) cambiarModo(e.matches ? 'claro' : 'oscuro', false);
  });
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** Tema actual (se actualiza al cambiar) y función para alternarlo. */
export function useModo() {
  const modo = useSyncExternalStore(suscribir, modoActual, () => 'oscuro' as Modo);
  return { modo, alternar: () => cambiarModo(modo === 'claro' ? 'oscuro' : 'claro') };
}
