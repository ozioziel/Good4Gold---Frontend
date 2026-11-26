/**
 * Formato QR v1 de un reporte comunitario (plan.md §2.8). El QR lleva el reporte completo y breve,
 * no una URL: así viaja entre teléfonos sin internet.
 *
 * Contiene: versión, UUID, tipo, comunidad, fuente, fecha, texto breve y autoría declarada.
 * NO contiene: fotos, credenciales, tokens, datos médicos ni ubicaciones exactas de viviendas.
 * El QR es un canal de transporte: no prueba identidad, autenticidad ni contaminación.
 */
export const PREFIJO = 'G2R1:';
const MAX_TEXTO = 280;
const MAX_CODIGO = 1400;

export interface ReporteQR {
  v: 1;
  id: string;
  t: 'con' | 'obs' | 'sol';
  c: string;
  f?: string;
  d: string;
  x: string;
  a?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID = /^[a-z0-9-]{1,80}$/;

function aBase64Url(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(b64: string) {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '==='.slice((norm.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function codificar(r: Omit<ReporteQR, 'v'>): string {
  const limpio: ReporteQR = { v: 1, ...r, x: r.x.slice(0, MAX_TEXTO) };
  return PREFIJO + aBase64Url(JSON.stringify(limpio));
}

/** Valida forma, tamaño y tipos. Devuelve null ante cualquier duda: nunca ejecuta ni abre contenido del QR. */
export function decodificar(codigo: string): ReporteQR | null {
  const s = codigo.trim();
  if (!s.startsWith(PREFIJO) || s.length > MAX_CODIGO) return null;
  try {
    const o = JSON.parse(deBase64Url(s.slice(PREFIJO.length))) as Partial<ReporteQR>;
    if (o.v !== 1) return null;
    if (typeof o.id !== 'string' || !UUID.test(o.id)) return null;
    if (o.t !== 'con' && o.t !== 'obs' && o.t !== 'sol') return null;
    if (typeof o.c !== 'string' || !ID.test(o.c)) return null;
    if (o.f !== undefined && (typeof o.f !== 'string' || !ID.test(o.f))) return null;
    if (typeof o.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.d)) return null;
    if (typeof o.x !== 'string' || o.x.length === 0 || o.x.length > MAX_TEXTO) return null;
    if (o.a !== undefined && (typeof o.a !== 'string' || o.a.length > 60)) return null;
    return o as ReporteQR;
  } catch {
    return null;
  }
}
