import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Persona, Rol } from '@/data/mapa-lugares';
import { api, ErrorApi, guardarToken, hayApi, leerToken, registrarIngreso } from '@/lib/api';

/**
 * Sesión de demostración compartida por todas las pestañas. En producción: cuenta verificada
 * (correo o teléfono) y rol aprobado por moderación; aquí el visitante elige un rol DEMO.
 * Con API (VITE_API_URL), elegir un rol pide un token DEMO al servidor; sin API o sin red,
 * la sesión sigue siendo local y lo creado queda pendiente de enviar.
 */
const CLAVE = 'g2:sesion:v1';

interface Sesion {
  rol: Rol;
  persona: Persona | null;
  ingresar: (rol: Rol) => void;
  salir: () => void;
  esInstitucion: boolean;
  /** true si hay token del servidor para este rol. */
  conectado: boolean;
}

const Ctx = createContext<Sesion | null>(null);

export const ROLES_INSTITUCION: Rol[] = ['investigador', 'laboratorio', 'autoridad', 'moderador'];

function leer(): Rol {
  try {
    const r = localStorage.getItem(CLAVE) as Rol | null;
    if (r) return r;
    // Compatibilidad con la primera versión del mapa, que guardaba el rol por su cuenta.
    const viejo = JSON.parse(localStorage.getItem('g2:mapa:v2') ?? 'null') as { rol?: Rol } | null;
    return viejo?.rol ?? 'visitante';
  } catch {
    return 'visitante';
  }
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [rol, setRol] = useState<Rol>(leer);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, rol);
    } catch {
      /* sin almacenamiento: la sesión vive en memoria */
    }
  }, [rol]);
  // Otra pestaña del navegador cambió el rol: se refleja aquí.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === CLAVE && e.newValue) setRol(e.newValue as Rol);
      if (e.key === 'g2:token:v1') setConectado(hayApi && !!e.newValue);
    };
    addEventListener('storage', on);
    return () => removeEventListener('storage', on);
  }, []);
  const [conectado, setConectado] = useState(() => hayApi && !!leerToken() && leer() !== 'visitante');

  const pedirToken = useCallback((r: Rol) => {
    guardarToken(null);
    setConectado(false);
    if (!hayApi || r === 'visitante') return;
    registrarIngreso(
      api
        .ingresarDemo(r)
        .then(({ token }) => {
          guardarToken(token);
          setConectado(true);
        })
        .catch(() => {
          /* sin servidor: la sesión sigue local */
        }),
    );
  }, []);

  // Al abrir la app: valida el token guardado, o lo pide si hay rol pero no token.
  useEffect(() => {
    if (!hayApi || rol === 'visitante') return;
    if (!leerToken()) return pedirToken(rol);
    api
      .yo()
      .then((u) => (u.rol === rol ? setConectado(true) : pedirToken(rol)))
      .catch((e) => {
        if (e instanceof ErrorApi && e.estado === 401) pedirToken(rol);
      });
    // Solo al montar: los cambios de rol pasan por ingresar().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingresar = useCallback(
    (r: Rol) => {
      setRol(r);
      pedirToken(r);
    },
    [pedirToken],
  );
  const salir = useCallback(() => {
    setRol('visitante');
    pedirToken('visitante');
  }, [pedirToken]);
  const valor = useMemo<Sesion>(
    () => ({
      rol,
      persona: rol === 'visitante' ? null : { nombre: 'Tú', rol },
      ingresar,
      salir,
      esInstitucion: ROLES_INSTITUCION.includes(rol),
      conectado,
    }),
    [rol, ingresar, salir, conectado],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSesion fuera de ProveedorSesion');
  return c;
}
