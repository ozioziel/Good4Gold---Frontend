// Campañas de demostración. Todas ligadas a lugares ficticios del mapa (DEMO): montos, organizaciones,
// hitos y transacciones son de ejemplo. Una campaña real nace de una solicitud aceptada (plan.md §2.6.7).
export type Causa = 'investigar' | 'proteger' | 'educar' | 'restaurar';
export type EstadoHito = 'hecho' | 'curso' | 'pendiente';

export interface Hito {
  titulo: string;
  monto: number;
  estado: EstadoHito;
  evidencia?: string;
  /** Hash de la transacción que liberó el hito (testnet). */
  tx?: string;
}

export interface Campana {
  id: string;
  titulo: string;
  causa: Causa;
  lugarId: string;
  lugar: string;
  solicitudId?: string;
  meta: number;
  reunido: number;
  aportes: number;
  responsable: string;
  verificador: string;
  hitos: Hito[];
  /** true si viene del API y su dinero vive en el contrato de testnet (no DEMO local). */
  remota?: boolean;
  estado?: 'abierta' | 'completada' | 'cancelada';
}

export const CAMPANAS: Campana[] = [
  {
    id: 'arroyo-esperanza',
    titulo: 'Protejamos el Arroyo Esperanza',
    causa: 'investigar',
    lugarId: 'demo:arroyo-esperanza',
    lugar: 'Arroyo Esperanza',
    solicitudId: 'sol-esperanza',
    meta: 2400,
    reunido: 1630,
    aportes: 41,
    responsable: 'ONG demo Ríos Vivos',
    verificador: 'Universidad demo',
    hitos: [
      { titulo: 'Recolección de muestras', monto: 600, estado: 'curso', evidencia: 'Plan de muestreo y cadena de custodia' },
      { titulo: 'Análisis de laboratorio', monto: 1200, estado: 'pendiente' },
      { titulo: 'Publicación de resultados', monto: 200, estado: 'pendiente' },
      { titulo: 'Acciones preventivas', monto: 400, estado: 'pendiente' },
    ],
  },
  {
    id: 'agua-puerto-cusi',
    titulo: 'Agua segura en Puerto Cusi',
    causa: 'proteger',
    lugarId: 'demo:puerto-cusi',
    lugar: 'Puerto Cusi',
    meta: 1800,
    reunido: 1800,
    aportes: 57,
    responsable: 'Autoridad sanitaria demo',
    verificador: 'ONG demo Ríos Vivos',
    hitos: [
      { titulo: 'Fuente alternativa en la escuela', monto: 900, estado: 'hecho', evidencia: 'Acta de entrega y fotos' },
      { titulo: 'Señalización del río', monto: 300, estado: 'hecho', evidencia: 'Fotos geolocalizadas' },
      { titulo: 'Segundo análisis de control', monto: 600, estado: 'curso' },
    ],
  },
  {
    id: 'cartas-villa-tajibo',
    titulo: 'Cartas para la escuela de Villa Tajibo',
    causa: 'educar',
    lugarId: 'demo:villa-tajibo',
    lugar: 'Villa Tajibo',
    meta: 600,
    reunido: 210,
    aportes: 14,
    responsable: 'Representante comunitario demo',
    verificador: 'Moderación',
    hitos: [
      { titulo: 'Impresión de cartas', monto: 250, estado: 'pendiente' },
      { titulo: 'Taller con familias', monto: 350, estado: 'pendiente' },
    ],
  },
  {
    id: 'orillas-san-lucero',
    titulo: 'Orillas vivas en San Lucero',
    causa: 'restaurar',
    lugarId: 'demo:san-lucero',
    lugar: 'San Lucero',
    meta: 1500,
    reunido: 380,
    aportes: 19,
    responsable: 'ONG demo Ríos Vivos',
    verificador: 'Universidad demo',
    hitos: [
      { titulo: 'Vivero de especies nativas', monto: 600, estado: 'curso', evidencia: 'Inventario del vivero' },
      { titulo: 'Plantación en la orilla', monto: 700, estado: 'pendiente' },
      { titulo: 'Seguimiento a 6 meses', monto: 200, estado: 'pendiente' },
    ],
  },
];

/** Transacciones de ejemplo para el río de transparencia (simuladas, sin enlace a un explorador). */
export const TX_DEMO = ['7f3a…c21e', 'b90d…44a8', '1c6e…f03b'];

export const PLANTAS_DEMO = 37;
