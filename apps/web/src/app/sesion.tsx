import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Persona, Rol } from '@/data/mapa-lugares';

/**
 * Sesión de demostración compartida por todas las pestañas. En producción: cuenta verificada
 * (correo o teléfono) y rol aprobado por moderación; aquí el visitante elige un rol DEMO.
 */
const CLAVE = 'g2:sesion:v1';

interface Sesion {
  rol: Rol;
  persona: Persona | null;
  ingresar: (rol: Rol) => void;
  salir: () => void;
  esInstitucion: boolean;
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
    const on = (e: StorageEvent) => e.key === CLAVE && e.newValue && setRol(e.newValue as Rol);
    addEventListener('storage', on);
    return () => removeEventListener('storage', on);
  }, []);
  const ingresar = useCallback((r: Rol) => setRol(r), []);
  const salir = useCallback(() => setRol('visitante'), []);
  const valor = useMemo<Sesion>(
    () => ({
      rol,
      persona: rol === 'visitante' ? null : { nombre: 'Tú', rol },
      ingresar,
      salir,
      esInstitucion: ROLES_INSTITUCION.includes(rol),
    }),
    [rol, ingresar, salir],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSesion() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSesion fuera de ProveedorSesion');
  return c;
}
