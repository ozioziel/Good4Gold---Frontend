/**
 * Cliente del API (apps/api). Si VITE_API_URL no está definida, o el servidor no responde, la app sigue
 * funcionando con los datos DEMO locales: el modo sin conexión es parte del producto, no un error.
 */
import type { Lugar, NivelOficial, NivelVirtual, Publicacion, Rol, TipoLugar, TipoPublicacion } from '@/data/mapa-lugares';
import type { EstadoSolicitud, SolicitudPanel } from '@/data/solicitudes';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const hayApi = BASE.length > 0;

const CLAVE_TOKEN = 'g2:token:v1';
const ESPERA_MS = 8000;

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
}

// Ingreso en curso: las llamadas esperan a que llegue el token para no salir como visitante.
let ingresoEnCurso: Promise<unknown> | null = null;
export function registrarIngreso(p: Promise<unknown>) {
  const actual = p.finally(() => {
    if (ingresoEnCurso === actual) ingresoEnCurso = null;
  });
  ingresoEnCurso = actual;
}

async function pedir<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown; sinEsperar?: boolean; esperaMs?: number } = {}): Promise<T> {
  if (!hayApi) throw new ErrorApi(0, 'API no configurada');
  if (ingresoEnCurso && !opciones.sinEsperar) await ingresoEnCurso.catch(() => undefined);
  const control = new AbortController();
  // Las operaciones en la red (crear, donar, liberar) tardan más que una lectura.
  const reloj = setTimeout(() => control.abort(), opciones.esperaMs ?? (opciones.metodo && opciones.metodo !== 'GET' ? 60_000 : ESPERA_MS));
  const token = leerToken();
  try {
    const r = await fetch(BASE + ruta, {
      method: opciones.metodo ?? 'GET',
      headers: {
        ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
      signal: control.signal,
    });
    const datos = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) {
      const m = (datos as { message?: string | string[]; mensaje?: string } | null) ?? {};
      throw new ErrorApi(r.status, m.mensaje ?? (Array.isArray(m.message) ? m.message.join(' ') : m.message) ?? `Error ${r.status}`);
    }
    return datos as T;
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    // Sin red, servidor caído o tiempo agotado: se trata como «sin conexión».
    throw new ErrorApi(0, 'Sin conexión con el servidor');
  } finally {
    clearTimeout(reloj);
  }
}

/** true si el error fue de red (reintentar después), false si el servidor rechazó la operación. */
export const esDeRed = (e: unknown) => e instanceof ErrorApi && e.estado === 0;

// ── Tipos del API ──────────────────────────────────────────────────────────────────────────────────

export interface UsuarioApi {
  id: string;
  nombre: string;
  rol: Exclude<Rol, 'visitante'> | 'ong';
  rol_verificado: boolean;
  organizacion_id: string | null;
  demo: boolean;
}

export interface LugarApi {
  id: string;
  nombre: string;
  tipo: TipoLugar;
  cerca: string;
  ficticia: boolean;
  lat: number;
  lon: number;
  senales: {
    comunidad: { nivel: 'sin_reportes' | 'reportes' | 'riesgoso'; reportes: number; respaldos: number; personas: number; publicaciones: number };
    virtual: { nivel: NivelVirtual; detalle: string; demo?: boolean };
    oficial: {
      nivel: NivelOficial;
      detalle: string;
      medicion?: { valor: number | null; unidad: string; calificador: string; fecha: string; demo: boolean };
      criterio?: { verificado: boolean };
    };
  };
  estadoEvidencia: string;
}

interface PersonaApi {
  nombre: string;
  rol: Rol | 'ong' | null;
  declarado?: boolean;
}

export interface PublicacionApi {
  id: string;
  fuenteId: string;
  tipo: TipoPublicacion;
  texto: string;
  fecha: string;
  lat: number | null;
  lon: number | null;
  autor: PersonaApi;
  autoria: 'verificada' | 'declarada';
  origen: 'en_linea' | 'qr' | 'sin_conexion';
  moderacion: 'publicada' | 'por_revisar' | 'oculta';
  demo: boolean;
  respaldos: { persona: PersonaApi; postura: 'coincide' | 'no_coincide'; motivo: string | null }[];
  respuestas: { persona: PersonaApi; texto: string; fecha: string }[];
}

export interface SolicitudApi {
  id: string;
  fuenteId: string;
  lugar: string;
  motivo: string;
  estado: EstadoSolicitud;
  organizacion: string | null;
  campanaId: string | null;
  apoyos: number;
  historial: { estado: EstadoSolicitud; fecha: string; actor: string; nota: string | null }[];
  acciones: { a: EstadoSolicitud; clave: string }[];
}

export interface Acuse {
  opId: string;
  resultado: 'creada' | 'duplicada' | 'rechazada';
  publicacionId: string | null;
  motivo: string | null;
  repetida: boolean;
}

export type Operacion =
  | { opId: string; tipo: 'publicacion'; publicacion: NuevaPublicacionApi }
  | { opId: string; tipo: 'reporte_qr'; codigo: string };

export interface NuevaPublicacionApi {
  id: string;
  fuenteId?: string;
  lugar?: { id: string; nombre: string; tipo: TipoLugar; lat: number; lon: number };
  tipo: TipoPublicacion;
  texto: string;
  fecha?: string;
  lat?: number;
  lon?: number;
}

// ── Adaptadores al modelo del frontend ─────────────────────────────────────────────────────────────

const formatoValor = (m?: { valor: number | null; unidad: string; calificador: string }) =>
  m && m.valor != null ? `${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 3 }).format(m.valor)} ${m.unidad}` : undefined;

const rolFront = (r: PersonaApi['rol']): Rol => (r === 'ong' ? 'investigador' : (r ?? 'ciudadano'));

export function aLugar(l: LugarApi): Lugar {
  const valor = formatoValor(l.senales.oficial.medicion);
  return {
    id: l.id,
    nombre: l.nombre,
    cerca: l.cerca,
    tipo: l.tipo,
    lat: l.lat,
    lon: l.lon,
    ficticio: l.ficticia,
    virtual: { nivel: l.senales.virtual.nivel, detalle: l.senales.virtual.detalle },
    oficial: { nivel: l.senales.oficial.nivel, detalle: l.senales.oficial.detalle, ...(valor ? { valor } : {}) },
  };
}

export function aPublicacion(p: PublicacionApi): Publicacion {
  return {
    id: p.id,
    lugarId: p.fuenteId,
    tipo: p.tipo,
    autor: { nombre: p.autor.nombre, rol: rolFront(p.autor.rol) },
    fecha: p.fecha,
    texto: p.texto,
    lat: p.lat ?? 0,
    lon: p.lon ?? 0,
    respaldos: p.respaldos.map((r) => ({ persona: { nombre: r.persona.nombre, rol: rolFront(r.persona.rol) }, postura: r.postura, ...(r.motivo ? { motivo: r.motivo } : {}) })),
    respuestas: p.respuestas.map((r) => ({ persona: { nombre: r.persona.nombre, rol: rolFront(r.persona.rol) }, texto: r.texto, fecha: r.fecha })),
    demo: p.demo,
    viaQr: p.origen === 'qr',
    porRevisar: p.moderacion === 'por_revisar',
  };
}

export function aSolicitud(s: SolicitudApi): SolicitudPanel {
  return {
    id: s.id,
    lugarId: s.fuenteId,
    lugar: s.lugar,
    motivo: s.motivo,
    apoyos: s.apoyos,
    estado: s.estado,
    ...(s.organizacion ? { organizacion: s.organizacion } : {}),
    ...(s.campanaId ? { campanaId: s.campanaId } : {}),
    historial: s.historial.map((h) => ({ estado: h.estado, fecha: h.fecha, actor: h.actor, ...(h.nota ? { nota: h.nota } : {}) })),
    acciones: s.acciones,
  };
}

// ── Llamadas ───────────────────────────────────────────────────────────────────────────────────────

export const api = {
  ingresarDemo: (rol: Rol) => pedir<{ token: string; usuario: UsuarioApi }>('/auth/demo', { metodo: 'POST', cuerpo: { rol }, sinEsperar: true }),
  yo: () => pedir<UsuarioApi>('/auth/yo'),
  lugares: () => pedir<LugarApi[]>('/water-sources'),
  lugar: (id: string) => pedir<LugarApi>(`/water-sources/${encodeURIComponent(id)}`),
  publicaciones: (id: string) => pedir<PublicacionApi[]>(`/water-sources/${encodeURIComponent(id)}/posts`),
  publicar: (p: NuevaPublicacionApi) => pedir<{ id: string; creada: boolean; solicitudId?: string }>('/posts', { metodo: 'POST', cuerpo: p }),
  respaldar: (id: string, postura: 'coincide' | 'no_coincide', motivo?: string) =>
    pedir<{ ok: boolean }>(`/posts/${id}/corroborations`, { metodo: 'POST', cuerpo: { postura, ...(motivo ? { motivo } : {}) } }),
  responder: (id: string, texto: string) => pedir<{ id: string }>(`/posts/${id}/comments`, { metodo: 'POST', cuerpo: { texto } }),
  solicitudes: () => pedir<SolicitudApi[]>('/research-requests'),
  cambiarEstado: (id: string, estado: EstadoSolicitud, nota?: string) =>
    pedir<{ id: string; estado: EstadoSolicitud }>(`/research-requests/${id}/status`, { metodo: 'PATCH', cuerpo: { estado, ...(nota ? { nota } : {}) } }),
  sincronizar: (operaciones: Operacion[]) => pedir<{ acuses: Acuse[] }>('/sync/operations', { metodo: 'POST', cuerpo: { operaciones } }),
  // Campañas y donaciones (escrow por hitos en Stellar testnet)
  campanas: () => pedir<CampanaApi[]>('/campaigns'),
  campana: (id: string) => pedir<CampanaDetalleApi>(`/campaigns/${id}`),
  donarDemo: (id: string, monto: string) => pedir<{ id: string; tx: string }>(`/campaigns/${id}/donations/demo`, { metodo: 'POST', cuerpo: { monto } }),
  prepararDonacion: (id: string, direccion: string, monto: string) =>
    pedir<{ donacionId: string; xdr: string }>(`/campaigns/${id}/donations/prepare`, { metodo: 'POST', cuerpo: { direccion, monto } }),
  enviarDonacion: (donacionId: string, xdr: string) => pedir<{ tx: string }>(`/donations/${donacionId}/submit`, { metodo: 'POST', cuerpo: { xdr }, esperaMs: 60_000 }),
};

export interface HitoApi {
  id: string;
  indice: number;
  titulo: string;
  monto: string;
  estado: 'pendiente' | 'liberado';
  evidenciaRef: string | null;
  tx: string | null;
}

export interface CampanaApi {
  id: string;
  solicitudId: string;
  titulo: string;
  causa: 'investigar' | 'proteger' | 'educar' | 'restaurar';
  estado: 'abierta' | 'completada' | 'cancelada';
  meta: string;
  reunido: string;
  liberado: string;
  aportes: number;
  lugar: string;
  lugarId: string;
  responsable: string;
  verificador: string;
  contratoId: string;
  txCreacion: string;
  demo: boolean;
  hitos: HitoApi[];
}

export interface CampanaDetalleApi extends CampanaApi {
  donaciones: { id: string; monto: string; modo: 'demo' | 'billetera'; tx: string; fecha: string }[];
  cadena: { aportado: string; liberado: string; estado: string; conciliada: boolean } | null;
}

/** Enlace público a una transacción de testnet. */
export const enlaceTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
