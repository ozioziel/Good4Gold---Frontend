import { useCallback, useEffect, useState } from 'react';
import { useSesion } from '@/app/sesion';
import { type EstadoSolicitud, guardarSolicitudes, leerSolicitudes, type SolicitudPanel } from '@/data/solicitudes';
import { aSolicitud, api, esDeRed, hayApi } from '@/lib/api';

/**
 * Solicitudes de investigación. Con servidor: GET /research-requests, y cada cambio de estado lo valida
 * el backend (PATCH /research-requests/:id/status). Sin servidor: la demostración local de siempre.
 */
export function useSolicitudes() {
  const { conectado, rol } = useSesion();
  const [lista, setLista] = useState<SolicitudPanel[]>(leerSolicitudes);
  const [remoto, setRemoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(() => {
    if (!hayApi) return;
    api
      .solicitudes()
      .then((l) => {
        setLista(l.map(aSolicitud));
        setRemoto(true);
      })
      .catch(() => setRemoto(false));
  }, []);

  // Al cambiar de rol (y recibir su token) las acciones permitidas cambian: se vuelve a pedir.
  useEffect(recargar, [recargar, conectado, rol]);

  /** Cambia el estado. Devuelve false si el servidor lo rechazó (el motivo queda en `error`). */
  const cambiar = useCallback(
    async (id: string, estado: EstadoSolicitud, local: () => SolicitudPanel[], nota?: string) => {
      setError(null);
      if (!remoto) {
        const nueva = local();
        setLista(nueva);
        guardarSolicitudes(nueva);
        return true;
      }
      try {
        await api.cambiarEstado(id, estado, nota);
        recargar();
        return true;
      } catch (e) {
        setError(esDeRed(e) ? 'Sin conexión con el servidor. Intenta de nuevo.' : e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    [remoto, recargar],
  );

  return { lista, setLista, remoto, error, cambiar };
}
