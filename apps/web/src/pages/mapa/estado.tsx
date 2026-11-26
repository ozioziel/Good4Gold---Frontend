import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import {
  LUGARES,
  PUBLICACIONES_DEMO,
  type Lugar,
  type NivelComunidad,
  type NivelOficial,
  type Persona,
  type Publicacion,
  type Respaldo,
  type Rol,
} from '@/data/mapa-lugares';
import i18n from 'i18next';
import { useSesion } from '@/app/sesion';
import { leerSolicitudes, nivelOficialDe } from '@/data/solicitudes';
import { aLugar, aPublicacion, api, esDeRed, hayApi, type LugarApi, type NuevaPublicacionApi, type Operacion } from '@/lib/api';

/**
 * Estado del Mapa comunitario.
 *  · Con API (VITE_API_URL) y servidor alcanzable: lugares, señales y publicaciones vienen del servidor,
 *    que aplica los permisos y las reglas de evidencia. Lo creado sin conexión o recibido por QR queda en
 *    una cola local (localStorage) y se envía con POST /sync/operations, sin duplicar.
 *  · Sin API: demostración local con los datos DEMO, como antes.
 */
const CLAVE = 'g2:mapa:v2';

interface Guardado {
  rol: Rol;
  sinConexionSimulada: boolean;
  publicaciones: Publicacion[];
  respaldos: Record<string, Respaldo[]>;
  respuestas: Record<string, Publicacion['respuestas']>;
  /** Lugares sin información que alguien tocó o donde alguien publicó (ríos del mapa base). */
  lugaresExtra: Lugar[];
}

export interface EstadoMapa extends Guardado {
  lugarId: string | null;
  enLineaReal: boolean;
  aviso: string | null;
}

type Accion =
  | { tipo: 'elegir'; lugar: Lugar | null }
  | { tipo: 'rol'; rol: Rol }
  | { tipo: 'simularSinConexion'; valor: boolean }
  | { tipo: 'enLineaReal'; valor: boolean }
  | { tipo: 'publicar'; pub: Publicacion; lugar: Lugar }
  | { tipo: 'importar'; pub: Publicacion; lugar: Lugar }
  | { tipo: 'respaldar'; pubId: string; respaldo: Respaldo }
  | { tipo: 'responder'; pubId: string; persona: Persona; texto: string }
  | { tipo: 'sincronizar' }
  | { tipo: 'confirmar'; ids: string[] }
  | { tipo: 'rechazo'; id: string; motivo: string }
  | { tipo: 'aviso'; texto: string | null }
  | { tipo: 'reiniciar' };

const inicial = (): Guardado => ({
  rol: 'visitante',
  sinConexionSimulada: false,
  publicaciones: [],
  respaldos: {},
  respuestas: {},
  lugaresExtra: [],
});

function cargar(): Guardado {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return { ...inicial(), ...(JSON.parse(raw) as Partial<Guardado>) };
  } catch {
    /* almacenamiento no disponible: se empieza de cero */
  }
  return inicial();
}

const conLugar = (s: Guardado, l: Lugar) =>
  LUGARES.some((x) => x.id === l.id) || s.lugaresExtra.some((x) => x.id === l.id) ? s.lugaresExtra : [...s.lugaresExtra, l];

function reducir(s: EstadoMapa, a: Accion): EstadoMapa {
  switch (a.tipo) {
    case 'elegir':
      return { ...s, lugarId: a.lugar?.id ?? null, lugaresExtra: a.lugar ? conLugar(s, a.lugar) : s.lugaresExtra };
    case 'rol':
      return { ...s, rol: a.rol };
    case 'simularSinConexion':
      return { ...s, sinConexionSimulada: a.valor };
    case 'enLineaReal':
      return { ...s, enLineaReal: a.valor };
    case 'publicar':
      return { ...s, publicaciones: [a.pub, ...s.publicaciones], lugaresExtra: conLugar(s, a.lugar), lugarId: a.lugar.id };
    case 'importar':
      // Idempotente: el mismo UUID nunca crea dos publicaciones.
      if (s.publicaciones.some((p) => p.id === a.pub.id)) return s;
      return { ...s, publicaciones: [a.pub, ...s.publicaciones], lugaresExtra: conLugar(s, a.lugar) };
    case 'respaldar': {
      const previos = (s.respaldos[a.pubId] ?? []).filter((r) => r.persona.nombre !== a.respaldo.persona.nombre);
      return { ...s, respaldos: { ...s.respaldos, [a.pubId]: [...previos, a.respaldo] } };
    }
    case 'responder':
      return {
        ...s,
        respuestas: { ...s.respuestas, [a.pubId]: [...(s.respuestas[a.pubId] ?? []), { persona: a.persona, texto: a.texto, fecha: hoy() }] },
      };
    case 'sincronizar':
      return { ...s, publicaciones: s.publicaciones.map((p) => (p.pendiente ? { ...p, pendiente: false } : p)) };
    case 'confirmar':
      // El servidor ya las tiene: salen de la cola local (se leen del servidor).
      return { ...s, publicaciones: s.publicaciones.filter((p) => !a.ids.includes(p.id)) };
    case 'rechazo':
      return { ...s, publicaciones: s.publicaciones.map((p) => (p.id === a.id ? { ...p, pendiente: false, rechazo: a.motivo } : p)) };
    case 'aviso':
      return { ...s, aviso: a.texto };
    case 'reiniciar':
      return { ...s, ...inicial(), lugarId: null };
  }
}

export interface SenalesLugar {
  comunidad: { nivel: NivelComunidad; reportes: number; respaldos: number; publicaciones: number };
  oficial: NivelOficial;
}

interface Contexto {
  s: EstadoMapa;
  d: (a: Accion) => void;
  enLinea: boolean;
  persona: Persona | null;
  lugares: Lugar[];
  lugar: Lugar | null;
  publicaciones: Publicacion[];
  publicacionesDe: (lugarId: string) => Publicacion[];
  senales: (l: Lugar) => SenalesLugar;
  pendientes: number;
  /** true cuando los datos vienen del servidor. */
  remoto: boolean;
}

const Ctx = createContext<Contexto | null>(null);

export function ProveedorMapa({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const [solicitudes] = useState(leerSolicitudes);
  // Datos del servidor (null mientras no haya API o no responda).
  const [srv, setSrv] = useState<{ lugares: Lugar[]; senales: Record<string, SenalesLugar> } | null>(null);
  const [pubsSrv, setPubsSrv] = useState<Record<string, Publicacion[]>>({});
  const [s, dLocal] = useReducer(reducir, undefined, () => ({
    ...cargar(),
    lugarId: null,
    enLineaReal: typeof navigator === 'undefined' ? true : navigator.onLine,
    aviso: null,
  }));

  useEffect(() => {
    const { rol, sinConexionSimulada, publicaciones, respaldos, respuestas, lugaresExtra } = s;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ rol, sinConexionSimulada, publicaciones, respaldos, respuestas, lugaresExtra }));
    } catch {
      /* sin espacio: la demo sigue en memoria */
    }
  }, [s]);

  const cargarPubs = useCallback(async (ids: string[]) => {
    const pares = await Promise.all(ids.map(async (id) => [id, (await api.publicaciones(id)).map(aPublicacion)] as const));
    setPubsSrv((prev) => ({ ...prev, ...Object.fromEntries(pares) }));
  }, []);

  const cargarServidor = useCallback(async () => {
    const ls: LugarApi[] = await api.lugares();
    setSrv({
      lugares: ls.map(aLugar),
      senales: Object.fromEntries(
        ls.map((l) => [
          l.id,
          {
            comunidad: {
              nivel: l.senales.comunidad.nivel,
              reportes: l.senales.comunidad.reportes,
              respaldos: Math.max(l.senales.comunidad.respaldos, l.senales.comunidad.personas),
              publicaciones: l.senales.comunidad.publicaciones,
            },
            oficial: l.senales.oficial.nivel,
          },
        ]),
      ),
    });
    // Publicaciones de los lugares que tienen alguna (para los puntos del mapa).
    await cargarPubs(ls.filter((l) => l.senales.comunidad.publicaciones > 0).map((l) => l.id).slice(0, 40));
  }, [cargarPubs]);

  useEffect(() => {
    if (hayApi) cargarServidor().catch(() => setSrv(null)); // sin servidor: demostración local
  }, [cargarServidor]);

  const refrescar = useCallback(
    (lugarId?: string) => {
      void cargarServidor().catch(() => undefined);
      if (lugarId) void cargarPubs([lugarId]).catch(() => undefined);
    },
    [cargarServidor, cargarPubs],
  );

  // Al elegir un lugar con servidor, se traen sus publicaciones.
  useEffect(() => {
    if (srv && s.lugarId && !pubsSrv[s.lugarId]) void cargarPubs([s.lugarId]).catch(() => undefined);
  }, [srv, s.lugarId, pubsSrv, cargarPubs]);

  const { ingresar, conectado } = sesion;
  const enLineaYa = s.enLineaReal && !s.sinConexionSimulada;
  const conServidor = !!srv && conectado && enLineaYa;

  const aviso = useCallback((texto: string) => dLocal({ tipo: 'aviso', texto }), []);
  const errorDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const sincronizarConServidor = useCallback(async () => {
    const cola = s.publicaciones.filter((p) => p.pendiente);
    if (cola.length === 0) return;
    const ops: Operacion[] = cola.map((p) =>
      p.viaQr && p.codigoQr
        ? { opId: p.opId ?? p.id, tipo: 'reporte_qr', codigo: p.codigoQr }
        : { opId: p.opId ?? p.id, tipo: 'publicacion', publicacion: cuerpoPublicacion(p, [...LUGARES, ...s.lugaresExtra]) },
    );
    try {
      const { acuses } = await api.sincronizar(ops);
      const ok = acuses.filter((x) => x.resultado !== 'rechazada').map((x) => cola[ops.findIndex((o) => o.opId === x.opId)]!.id);
      dLocal({ tipo: 'confirmar', ids: ok });
      acuses
        .filter((x) => x.resultado === 'rechazada')
        .forEach((x) => dLocal({ tipo: 'rechazo', id: cola[ops.findIndex((o) => o.opId === x.opId)]!.id, motivo: x.motivo ?? '' }));
      const rechazadas = acuses.length - ok.length;
      aviso(rechazadas ? i18n.t('mapa.sincronizadoParcial', { count: rechazadas }) : i18n.t('mapa.sincronizado'));
      refrescar(s.lugarId ?? undefined);
    } catch (e) {
      aviso(esDeRed(e) ? i18n.t('mapa.sinServidor') : errorDe(e));
    }
  }, [s.publicaciones, s.lugaresExtra, s.lugarId, aviso, refrescar]);

  // Las acciones que cambian datos pasan por el servidor cuando se puede; si no, quedan en la cola local.
  // `d` debe ser estable (el mapa se crea una sola vez con él): la lógica vive en una referencia que se
  // actualiza en cada render y `d` solo la invoca.
  const manejar = (a: Accion) => {
    if (a.tipo === 'rol') return ingresar(a.rol);
    if (!srv) {
      dLocal(a);
      if (a.tipo === 'sincronizar') aviso(i18n.t('mapa.sincronizado'));
      return;
    }
    switch (a.tipo) {
      case 'publicar': {
        if (!conServidor || a.pub.pendiente) return dLocal({ ...a, pub: { ...a.pub, pendiente: true, opId: a.pub.opId ?? nuevoId() } });
        api
          .publicar(cuerpoPublicacion(a.pub, [...srv.lugares, ...s.lugaresExtra, a.lugar]))
          .then(() => refrescar(a.lugar.id))
          .catch((e) => {
            if (esDeRed(e)) {
              dLocal({ ...a, pub: { ...a.pub, pendiente: true, opId: nuevoId() } });
              aviso(i18n.t('mapa.guardadoSinConexion'));
            } else aviso(errorDe(e));
          });
        return dLocal({ tipo: 'elegir', lugar: a.lugar });
      }
      case 'importar':
        return dLocal({ ...a, pub: { ...a.pub, opId: a.pub.opId ?? nuevoId() } });
      case 'respaldar':
      case 'responder': {
        const local = s.publicaciones.find((p) => p.id === a.pubId);
        if (!conServidor || local?.pendiente) return dLocal(a);
        const lugarId = Object.entries(pubsSrv).find(([, ps]) => ps.some((p) => p.id === a.pubId))?.[0];
        const llamada =
          a.tipo === 'respaldar' ? api.respaldar(a.pubId, a.respaldo.postura, a.respaldo.motivo) : api.responder(a.pubId, a.texto);
        llamada.then(() => refrescar(lugarId)).catch((e) => aviso(esDeRed(e) ? i18n.t('mapa.sinServidor') : errorDe(e)));
        return;
      }
      case 'sincronizar':
        if (!conServidor) return aviso(i18n.t('mapa.sinServidor'));
        void sincronizarConServidor();
        return;
      default:
        return dLocal(a);
    }
  };
  const manejarRef = useRef(manejar);
  manejarRef.current = manejar;
  const d = useCallback((a: Accion) => manejarRef.current(a), []);

  useEffect(() => {
    const on = () => d({ tipo: 'enLineaReal', valor: navigator.onLine });
    addEventListener('online', on);
    addEventListener('offline', on);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', on);
    };
  }, [d]);

  useEffect(() => {
    if (!s.aviso) return;
    const id = setTimeout(() => d({ tipo: 'aviso', texto: null }), 3200);
    return () => clearTimeout(id);
  }, [s.aviso, d]);

  const valor = useMemo<Contexto>(() => {
    const enLinea = enLineaYa;
    if (srv) {
      // Servidor: sus lugares y publicaciones, más la cola local (pendientes o rechazadas).
      const lugares = [...srv.lugares, ...s.lugaresExtra.filter((l) => !srv.lugares.some((x) => x.id === l.id))];
      const vistas = new Set<string>();
      const publicaciones = [...s.publicaciones, ...Object.values(pubsSrv).flat()].filter((p) => !vistas.has(p.id) && vistas.add(p.id));
      const publicacionesDe = (lugarId: string) => publicaciones.filter((p) => p.lugarId === lugarId).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const senales = (l: Lugar): SenalesLugar =>
        srv.senales[l.id] ?? senalesLocales(l, publicacionesDe(l.id), solicitudes);
      return {
        s: { ...s, rol: sesion.rol },
        d,
        enLinea,
        persona: sesion.persona,
        lugares,
        lugar: lugares.find((l) => l.id === s.lugarId) ?? null,
        publicaciones,
        publicacionesDe,
        senales,
        pendientes: s.publicaciones.filter((p) => p.pendiente).length,
        remoto: true,
      };
    }
    const lugares = [...LUGARES, ...s.lugaresExtra];
    const publicaciones = [...s.publicaciones, ...PUBLICACIONES_DEMO].map((p) => ({
      ...p,
      respaldos: [...p.respaldos.filter((r) => !(s.respaldos[p.id] ?? []).some((x) => x.persona.nombre === r.persona.nombre)), ...(s.respaldos[p.id] ?? [])],
      respuestas: [...p.respuestas, ...(s.respuestas[p.id] ?? [])],
    }));
    const publicacionesDe = (lugarId: string) => publicaciones.filter((p) => p.lugarId === lugarId).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const senales = (l: Lugar): SenalesLugar => senalesLocales(l, publicacionesDe(l.id), solicitudes);
    return {
      s: { ...s, rol: sesion.rol },
      d,
      enLinea,
      persona: sesion.persona,
      lugares,
      lugar: lugares.find((l) => l.id === s.lugarId) ?? null,
      publicaciones,
      publicacionesDe,
      senales,
      pendientes: s.publicaciones.filter((p) => p.pendiente).length,
      remoto: false,
    };
  }, [s, d, sesion.rol, sesion.persona, solicitudes, srv, pubsSrv, enLineaYa]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** Señales calculadas en el navegador (modo local, o un lugar que el servidor aún no conoce). */
function senalesLocales(l: Lugar, pubs: Publicacion[], solicitudes: ReturnType<typeof leerSolicitudes>): SenalesLugar {
  const reportes = pubs.filter((p) => p.tipo === 'lo_vi');
  const respaldos = reportes.reduce((n, p) => n + p.respaldos.filter((r) => r.postura === 'coincide').length, 0);
  const personas = new Set(reportes.flatMap((p) => [p.autor.nombre, ...p.respaldos.filter((r) => r.postura === 'coincide').map((r) => r.persona.nombre)]));
  // La comunidad «lo considera riesgoso» cuando al menos 3 personas reportan o respaldan un riesgo.
  // Solo cuentan los reportes «Lo vi»: una pregunta no es un reporte de riesgo.
  const nivel: NivelComunidad = reportes.length === 0 ? 'sin_reportes' : personas.size >= 3 ? 'riesgoso' : 'reportes';
  const pidieron = pubs.some((p) => p.tipo === 'analisis');
  // El estado del trámite en el panel institucional manda sobre la señal oficial (si aún no hay resultado).
  const tramite = solicitudes.find((x) => x.lugarId === l.id);
  const porTramite = tramite ? nivelOficialDe(tramite.estado) : null;
  const sinResultado = l.oficial.nivel === 'sin_analisis' || l.oficial.nivel === 'solicitado' || l.oficial.nivel === 'en_proceso';
  const oficial = sinResultado && porTramite ? porTramite : l.oficial.nivel === 'sin_analisis' && pidieron ? 'solicitado' : l.oficial.nivel;
  return { comunidad: { nivel, reportes: reportes.length, respaldos: Math.max(respaldos, personas.size), publicaciones: pubs.length }, oficial };
}

/** Cuerpo de POST /posts a partir de una publicación del mapa. */
function cuerpoPublicacion(p: Publicacion, lugares: Lugar[]): NuevaPublicacionApi {
  const l = lugares.find((x) => x.id === p.lugarId);
  const nuevo = /^(rio|punto):/.test(p.lugarId) && l;
  return {
    id: p.id,
    ...(nuevo ? { lugar: { id: l.id, nombre: l.nombre.slice(0, 120), tipo: l.tipo, lat: l.lat, lon: l.lon } } : { fuenteId: p.lugarId }),
    tipo: p.tipo,
    texto: p.texto,
    fecha: p.fecha,
    ...(p.lat || p.lon ? { lat: p.lat, lon: p.lon } : {}),
  };
}

export function useMapa() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMapa fuera de ProveedorMapa');
  return c;
}

/**
 * Qué tipos de publicación permite cada rol (igual que apps/api/src/dominio/roles.ts).
 * Un laboratorio carga resultados, pero no emite recomendaciones oficiales (PROYECTO.md §6).
 */
export function tiposPermitidos(rol: Rol) {
  if (rol === 'visitante') return [] as const;
  if (rol === 'autoridad') return ['oficial', 'pregunta'] as const;
  if (rol === 'laboratorio') return ['pregunta'] as const;
  return ['lo_vi', 'pregunta', 'analisis'] as const;
}

export const nuevoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));

export const hoy = () => new Date().toISOString().slice(0, 10);

export function haceCuanto(fecha: string, t: (k: string, o?: { n: number }) => string) {
  const dias = Math.round((Date.now() - new Date(`${fecha}T12:00:00`).getTime()) / 86_400_000);
  if (dias <= 0) return t('mapa.hace.hoy');
  if (dias === 1) return t('mapa.hace.ayer');
  if (dias < 45) return t('mapa.hace.dias', { n: dias });
  return new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short' }).format(new Date(`${fecha}T12:00:00`));
}
