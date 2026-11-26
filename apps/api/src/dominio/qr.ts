// Formato QR v1 de un reporte (copia de la validación de apps/web/src/lib/qrReporte.ts).
// El QR es transporte: no prueba identidad, autenticidad ni contaminación.
export const PREFIJO = 'G2R1:';
const MAX_TEXTO = 280;
const MAX_CODIGO = 1400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID = /^[a-z0-9-]{1,80}$/;

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

export const tipoDeQr = (t: ReporteQR['t']) => (t === 'obs' ? 'lo_vi' : t === 'sol' ? 'analisis' : 'pregunta');

export function codificar(r: Omit<ReporteQR, 'v'>): string {
  const limpio: ReporteQR = { v: 1, ...r, x: r.x.slice(0, MAX_TEXTO) };
  return PREFIJO + Buffer.from(JSON.stringify(limpio), 'utf8').toString('base64url');
}

/** Devuelve null ante cualquier duda: nunca ejecuta ni abre contenido del QR. */
export function decodificar(codigo: string): ReporteQR | null {
  const s = codigo.trim();
  if (!s.startsWith(PREFIJO) || s.length > MAX_CODIGO) return null;
  try {
    const o = JSON.parse(Buffer.from(s.slice(PREFIJO.length), 'base64url').toString('utf8')) as Partial<ReporteQR>;
    if (o.v !== 1) return null;
    if (typeof o.id !== 'string' || !UUID.test(o.id)) return null;
    if (o.t !== 'con' && o.t !== 'obs' && o.t !== 'sol') return null;
    if (typeof o.c !== 'string' || !ID.test(o.c)) return null;
    if (o.f !== undefined && (typeof o.f !== 'string' || !ID.test(o.f))) return null;
    if (typeof o.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.d)) return null;
    if (typeof o.x !== 'string' || o.x.length === 0 || o.x.length > MAX_TEXTO) return null;
    if (o.a !== undefined && (typeof o.a !== 'string' || o.a.length > 60)) return null;
    return { v: 1, id: o.id.toLowerCase(), t: o.t, c: o.c, ...(o.f ? { f: o.f } : {}), d: o.d, x: o.x, ...(o.a ? { a: o.a } : {}) };
  } catch {
    return null;
  }
}
