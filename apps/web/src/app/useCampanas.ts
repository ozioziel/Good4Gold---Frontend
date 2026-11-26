import { useCallback, useEffect, useState } from 'react';
import { CAMPANAS, type Campana, type EstadoHito } from '@/data/campanas';
import { api, type CampanaApi, type CampanaDetalleApi, hayApi } from '@/lib/api';

/** Campaña del API → modelo de la pestaña. El dinero y los hitos vienen del contrato de testnet. */
function aCampana(c: CampanaApi): Campana {
  const siguiente = c.hitos.find((h) => h.estado === 'pendiente')?.indice;
  return {
    id: c.id,
    titulo: c.titulo,
    causa: c.causa,
    lugarId: c.lugarId,
    lugar: c.lugar,
    solicitudId: c.solicitudId,
    meta: Number(c.meta),
    reunido: Number(c.reunido),
    aportes: c.aportes,
    responsable: c.responsable,
    verificador: c.verificador,
    remota: true,
    estado: c.estado,
    hitos: c.hitos.map((h) => ({
      titulo: h.titulo,
      monto: Number(h.monto),
      // Liberado por el contrato = hecho. El siguiente, en curso mientras la campaña siga abierta.
      estado: (h.estado === 'liberado' ? 'hecho' : c.estado === 'abierta' && h.indice === siguiente ? 'curso' : 'pendiente') as EstadoHito,
      ...(h.evidenciaRef ? { evidencia: h.evidenciaRef } : {}),
      ...(h.tx ? { tx: h.tx } : {}),
    })),
  };
}

/**
 * Campañas de Donaciones. Con API: GET /campaigns (escrow real en testnet). Sin API o sin red:
 * las campañas DEMO locales y el aporte simulado, como antes.
 */
export function useCampanas() {
  const [campanas, setCampanas] = useState<Campana[]>(CAMPANAS);
  const [remoto, setRemoto] = useState(false);
  const [detalles, setDetalles] = useState<Record<string, CampanaDetalleApi>>({});

  const recargar = useCallback(async () => {
    if (!hayApi) return;
    try {
      const l = await api.campanas();
      // Sin campañas en el servidor, se mantiene la demostración local para no dejar la pestaña vacía.
      if (l.length) {
        setCampanas(l.map(aCampana));
        setRemoto(true);
      }
    } catch {
      setRemoto(false);
    }
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    try {
      const d = await api.campana(id);
      setDetalles((prev) => ({ ...prev, [id]: d }));
    } catch {
      /* sin red: el río muestra lo que hay */
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { campanas, remoto, detalles, recargar, cargarDetalle };
}
