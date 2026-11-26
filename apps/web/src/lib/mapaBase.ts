import * as maplibregl from 'maplibre-gl';
import type { LayerSpecification, Map as MlMap, StyleSpecification } from 'maplibre-gl';
// El worker de MapLibre como entrada propia de Vite: así se empaqueta completo (también en el build).
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Modo } from '@/app/tema';

/**
 * Base compartida por el Mapa comunitario y el Laboratorio: worker de MapLibre y estilo base
 * (OpenFreeMap «dark», datos de OpenStreetMap, sin clave) recoloreado con la paleta del proyecto:
 * - oscuro: la noche del Inicio;
 * - claro: el alba (marfil, agua y bosque suaves). Se usa el mismo estilo de origen para que las capas
 *   tengan los mismos ids y el cambio de tema sea un repintado, sin recargar teselas.
 */
maplibregl.setWorkerUrl(urlWorker);

const ESTILO = 'https://tiles.openfreemap.org/styles/dark';
export const ORO = '#d4af55';

export const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Colores del mapa base por tema. El oscuro reproduce el recoloreado original del proyecto. */
const PALETA: Record<Modo, {
  fondo: string;
  agua: string;
  bosque: string;
  residencial: string;
  edificio: string;
  edificioBorde: string;
  cauce: string;
  hielo: string;
  calles: string;
  limites: string;
  rotuloAgua: string;
  rotuloCiudad: string;
  rotulo: string;
  halo: string;
}> = {
  oscuro: {
    fondo: '#151714',
    agua: '#1a2a31',
    bosque: '#192017',
    residencial: '#1e201b',
    edificio: '#24261f',
    edificioBorde: 'rgb(27 ,27 ,29)',
    cauce: '#2c5262',
    hielo: 'rgb(12,12,12)',
    calles: '#2a2c26',
    limites: '#4b4636',
    rotuloAgua: '#7fa9bd',
    rotuloCiudad: '#d9d4c3',
    rotulo: '#99958a',
    halo: '#151714',
  },
  claro: {
    fondo: '#e9e4d4',
    agua: '#c6d9df',
    bosque: '#d9dfc8',
    residencial: '#e2dccb',
    edificio: '#dcd5c2',
    edificioBorde: '#cfc7b1',
    cauce: '#9cbfcd',
    hielo: '#f6f4ec',
    calles: '#d3cab2',
    limites: '#a3966f',
    rotuloAgua: '#35637a',
    rotuloCiudad: '#2d3029',
    rotulo: '#5f5d52',
    halo: '#f3f0e4',
  },
};

export const fondoMapa = (modo: Modo) => PALETA[modo].fondo;

/** Pintura propia de una capa del estilo base según el tema (null = se deja como viene). */
function pintura(l: Pick<LayerSpecification, 'id' | 'type'>, modo: Modo): Record<string, unknown> | null {
  const c = PALETA[modo];
  const fija: Record<string, Record<string, unknown>> = {
    background: { 'background-color': c.fondo },
    water: { 'fill-color': c.agua },
    landcover_wood: { 'fill-color': c.bosque, 'fill-opacity': 0.9 },
    landuse_park: { 'fill-color': c.bosque },
    landuse_residential: { 'fill-color': c.residencial },
    building: { 'fill-color': c.edificio, 'fill-outline-color': c.edificioBorde },
    waterway: { 'line-color': c.cauce },
    landcover_ice_shelf: { 'fill-color': c.hielo },
    landcover_glacier: { 'fill-color': c.hielo },
    road_area_pier: { 'fill-color': c.fondo },
  };
  if (fija[l.id]) return fija[l.id];
  if (l.type === 'line' && /^(highway|railway|road)/.test(l.id)) return { 'line-color': c.calles };
  if (l.type === 'line' && /^boundary/.test(l.id)) return { 'line-color': c.limites };
  if (l.type === 'symbol') {
    const color = l.id.startsWith('water') ? c.rotuloAgua : /place_(town|city)/.test(l.id) ? c.rotuloCiudad : c.rotulo;
    return { 'text-color': color, 'text-halo-color': c.halo, 'text-halo-width': 1.2 };
  }
  return null;
}

let estiloOrigen: Promise<StyleSpecification> | null = null;
function origen() {
  estiloOrigen ??= fetch(ESTILO).then((res) => {
    if (!res.ok) throw new Error('estilo');
    return res.json() as Promise<StyleSpecification>;
  });
  // Si falla, el siguiente intento vuelve a pedirlo.
  estiloOrigen.catch(() => (estiloOrigen = null));
  return estiloOrigen;
}

export async function estiloBase(modo: Modo): Promise<StyleSpecification> {
  const st = structuredClone(await origen());
  st.layers = st.layers
    // Menos ruido: sin edificios ni rótulos de calles.
    .filter((l) => !/^(road_oneway|highway_name|aeroway)/.test(l.id))
    .map((l) => {
      let c = l as LayerSpecification & { paint?: Record<string, unknown> };
      const p = pintura(l, modo);
      if (p) c = { ...c, paint: { ...c.paint, ...p } } as typeof c;
      if (l.type === 'symbol') {
        // Rótulos en español cuando OpenStreetMap los tiene.
        const campo = (c as { layout?: Record<string, unknown> }).layout?.['text-field'];
        if (campo && !l.id.startsWith('highway')) {
          (c as { layout: Record<string, unknown> }).layout = {
            ...(c as { layout?: Record<string, unknown> }).layout,
            'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']],
          };
        }
      }
      return c as LayerSpecification;
    });
  return st;
}

/** Estilo nocturno (Laboratorio: el globo satelital es siempre oscuro). */
export const estiloNoche = () => estiloBase('oscuro');

/** Repinta el mapa base ya cargado con los colores del tema, sin tocar las capas propias. */
export function repintarBase(m: MlMap, modo: Modo) {
  for (const l of m.getStyle().layers) {
    // Solo capas del estilo base (las propias usan otras fuentes o ids que pintura() no reconoce).
    if (l.type !== 'background' && (l as { source?: string }).source !== 'openmaptiles') continue;
    const p = pintura(l, modo);
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) m.setPaintProperty(l.id, k as Parameters<MlMap["setPaintProperty"]>[1], v as never);
  }
}
