import * as maplibregl from 'maplibre-gl';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
// El worker de MapLibre como entrada propia de Vite: así se empaqueta completo (también en el build).
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

/**
 * Base compartida por el Mapa comunitario y el Laboratorio: worker de MapLibre y estilo nocturno
 * (OpenFreeMap «dark», datos de OpenStreetMap, sin clave) recoloreado con la noche del Inicio.
 */
maplibregl.setWorkerUrl(urlWorker);

const ESTILO = 'https://tiles.openfreemap.org/styles/dark';
export const ORO = '#d4af55';

export const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function estiloNoche(): Promise<StyleSpecification> {
  const res = await fetch(ESTILO);
  if (!res.ok) throw new Error('estilo');
  const st = (await res.json()) as StyleSpecification;
  const pintar: Record<string, Record<string, unknown>> = {
    background: { 'background-color': '#151714' },
    water: { 'fill-color': '#1a2a31' },
    landcover_wood: { 'fill-color': '#192017', 'fill-opacity': 0.9 },
    landuse_park: { 'fill-color': '#192017' },
    landuse_residential: { 'fill-color': '#1e201b' },
    building: { 'fill-color': '#24261f' },
    waterway: { 'line-color': '#2c5262' },
  };
  st.layers = st.layers
    // Menos ruido: sin edificios ni rótulos de calles.
    .filter((l) => !/^(road_oneway|highway_name|aeroway)/.test(l.id))
    .map((l) => {
      let c = l as LayerSpecification & { paint?: Record<string, unknown> };
      if (pintar[l.id]) c = { ...c, paint: { ...c.paint, ...pintar[l.id] } } as typeof c;
      if (l.type === 'line' && /^(highway|railway|road)/.test(l.id)) c = { ...c, paint: { ...c.paint, 'line-color': '#2a2c26' } } as typeof c;
      if (l.type === 'line' && /^boundary/.test(l.id)) c = { ...c, paint: { ...c.paint, 'line-color': '#4b4636' } } as typeof c;
      if (l.type === 'symbol') {
        const agua = l.id.startsWith('water');
        // Rótulos en español cuando OpenStreetMap los tiene.
        const campo = (c as { layout?: Record<string, unknown> }).layout?.['text-field'];
        if (campo && !l.id.startsWith('highway')) {
          (c as { layout: Record<string, unknown> }).layout = {
            ...(c as { layout?: Record<string, unknown> }).layout,
            'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']],
          };
        }
        c = {
          ...c,
          paint: { ...c.paint, 'text-color': agua ? '#7fa9bd' : /place_(town|city)/.test(l.id) ? '#d9d4c3' : '#99958a', 'text-halo-color': '#151714', 'text-halo-width': 1.2 },
        } as typeof c;
      }
      return c as LayerSpecification;
    });
  return st;
}

