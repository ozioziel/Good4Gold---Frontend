import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
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
import { useSesion } from '@/app/sesion';
import { leerSolicitudes, nivelOficialDe } from '@/data/solicitudes';

/**
 * Estado del Mapa comunitario (frontend de demostración, sin backend). Lo que crea el visitante se guarda
 * en localStorage y se mezcla con los datos DEMO. Los permisos se replican luego en el servidor.
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
}

const Ctx = createContext<Contexto | null>(null);

export function ProveedorMapa({ children }: { children: ReactNode }) {
  const sesion = useSesion();
  const [solicitudes] = useState(leerSolicitudes);
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

  // El rol vive en la sesión compartida por todas las pestañas.
  const { ingresar } = sesion;
  const d = useCallback((a: Accion) => (a.tipo === 'rol' ? ingresar(a.rol) : dLocal(a)), [ingresar]);

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
    const enLinea = s.enLineaReal && !s.sinConexionSimulada;
    const lugares = [...LUGARES, ...s.lugaresExtra];
    const publicaciones = [...s.publicaciones, ...PUBLICACIONES_DEMO].map((p) => ({
      ...p,
      respaldos: [...p.respaldos.filter((r) => !(s.respaldos[p.id] ?? []).some((x) => x.persona.nombre === r.persona.nombre)), ...(s.respaldos[p.id] ?? [])],
      respuestas: [...p.respuestas, ...(s.respuestas[p.id] ?? [])],
    }));
    const publicacionesDe = (lugarId: string) => publicaciones.filter((p) => p.lugarId === lugarId).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const senales = (l: Lugar): SenalesLugar => {
      const pubs = publicacionesDe(l.id);
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
    };
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
    };
  }, [s, d, sesion.rol, sesion.persona, solicitudes]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useMapa() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMapa fuera de ProveedorMapa');
  return c;
}

/** Qué tipos de publicación permite cada rol (se replicará en el backend). */
export function tiposPermitidos(rol: Rol) {
  if (rol === 'visitante') return [] as const;
  if (rol === 'autoridad' || rol === 'laboratorio') return ['oficial', 'pregunta'] as const;
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
