import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, LayerSpecification, Map as MlMap } from 'maplibre-gl';
import { estiloBase, fondoMapa, ORO, reducido, repintarBase } from '@/lib/mapaBase';
import type { Modo } from '@/app/tema';
import { exprTono, type Tono } from './senales';

/**
 * Mapa de ríos (MapLibre, 2D). Clase imperativa fuera de React: React le pasa datos y recibe eventos.
 * Base: OpenFreeMap «dark» (datos de OpenStreetMap, sin clave) recoloreada con la noche del Inicio o el alba.
 * Los ríos son el protagonista: se resaltan en azul y el que se toca se ilumina en oro (el hilo de río).
 */
const CENTRO_INICIAL: [number, number] = [-67.45, -15.0];

/** Colores de las capas propias por tema. En claro, oro y agua hondos para conservar ≥3:1 sobre el marfil. */
const CAPAS: Record<Modo, {
  arroyo: string;
  rioBrillo: string;
  rioBrilloOpacidad: number;
  rio: string;
  oro: string;
  oroSuave: string;
  pubLlena: string;
  hueco: string;
  bordeFicticio: string;
  bordeReal: string;
  nombre: string;
  halo: string;
  yo: string;
  yoBorde: string;
}> = {
  oscuro: {
    arroyo: '#335f72',
    rioBrillo: '#3f86a8',
    rioBrilloOpacidad: 0.32,
    rio: '#7db5cf',
    oro: ORO,
    oroSuave: 'rgba(212,175,85,0.7)',
    pubLlena: '#f3f0e4',
    hueco: '#151714',
    bordeFicticio: '#f3f0e4',
    bordeReal: '#151714',
    nombre: '#e7e2d1',
    halo: '#151714',
    yo: '#8fc3dc',
    yoBorde: '#5fa6c9',
  },
  claro: {
    arroyo: '#7fa9bb',
    rioBrillo: '#7fb0c8',
    rioBrilloOpacidad: 0.4,
    rio: '#2f7393',
    oro: '#93701f',
    oroSuave: 'rgba(147,112,31,0.8)',
    pubLlena: '#fbf9f2',
    hueco: '#e9e4d4',
    bordeFicticio: '#1f221d',
    bordeReal: '#fbf9f2',
    nombre: '#2d3029',
    halo: '#f3f0e4',
    yo: '#2b6a89',
    yoBorde: '#2b6a89',
  },
};

export interface PuntoLugar {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  tono: Tono;
  ficticio: boolean;
}
export interface PuntoPublicacion {
  id: string;
  lugarId: string;
  lat: number;
  lon: number;
  pendiente: boolean;
}
export interface RioCercano {
  nombre: string;
  lat: number;
  lon: number;
  km: number;
}

interface Eventos {
  onLugar: (id: string) => void;
  onRio: (nombre: string | null, lat: number, lon: number) => void;
  onVacio: () => void;
  onCercanos: (rios: RioCercano[]) => void;
  onError: () => void;
  onListo: () => void;
}

export class MapaRios {
  readonly mapa: MlMap;
  private fuente = 'Noto Sans Regular';
  private listo = false;
  private pendientes: (() => void)[] = [];
  private timerCercanos = 0;

  constructor(contenedor: HTMLElement, private modo: Modo, private ev: Eventos) {
    const movil = innerWidth < 900;
    this.mapa = new maplibregl.Map({
      container: contenedor,
      style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': fondoMapa(modo) } }] },
      center: CENTRO_INICIAL,
      zoom: movil ? 6.6 : 7.3,
      attributionControl: false,
      fadeDuration: reducido() ? 0 : 250,
      maxPitch: 0,
      dragRotate: false,
    });
    this.mapa.touchZoomRotate.disableRotation();
    this.mapa.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenStreetMap · OpenFreeMap' }), 'bottom-left');
    estiloBase(modo)
      .then((st) => {
        const ref = st.layers.find((l) => l.id === 'place_town') as { layout?: { 'text-font'?: string[] } } | undefined;
        if (ref?.layout?.['text-font']?.[0]) this.fuente = ref.layout['text-font'][0];
        // Escuchar antes de aplicar: con un objeto de estilo, «style.load» puede dispararse enseguida.
        this.mapa.once('style.load', () => this.prepararCapas());
        this.mapa.setStyle(st);
      })
      .catch(() => ev.onError());
    this.mapa.on('error', (e) => {
      if (/fetch|network/i.test(String(e.error?.message ?? ''))) ev.onError();
    });
  }

  private alListo(fn: () => void) {
    if (this.listo) fn();
    else this.pendientes.push(fn);
  }

  private prepararCapas() {
    if (this.listo) return;
    const m = this.mapa;
    const antesDe = m.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    const rio = ['==', ['get', 'class'], 'river'] as const;
    const nombre = ['coalesce', ['get', 'name:es'], ['get', 'name']];
    const add = (l: LayerSpecification) => m.addLayer(l, antesDe);
    const c = CAPAS[this.modo];

    add({ id: 'arroyos', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 10, filter: ['==', ['get', 'class'], 'stream'], paint: { 'line-color': c.arroyo, 'line-width': 0.9 } });
    add({
      id: 'rios-brillo',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: rio as never,
      paint: {
        'line-color': c.rioBrillo,
        'line-opacity': c.rioBrilloOpacidad,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 3, 10, 9, 14, 16],
        'line-blur': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 7, 14, 12],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    add({
      id: 'rios',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: rio as never,
      paint: { 'line-color': c.rio, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.9, 10, 2.2, 14, 4] },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    add({
      id: 'rios-toque',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['in', ['get', 'class'], ['literal', ['river', 'stream', 'canal']]],
      paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 24 },
    });
    // El río elegido se ilumina en oro.
    add({
      id: 'rio-sel-brillo',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['==', nombre, '__ninguno__'] as never,
      paint: { 'line-color': c.oro, 'line-opacity': 0.45, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 6, 12, 18], 'line-blur': 8 },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    add({
      id: 'rio-sel',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['==', nombre, '__ninguno__'] as never,
      paint: { 'line-color': c.oro, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 12, 4.5] },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    });

    const vacio = { type: 'FeatureCollection' as const, features: [] };
    m.addSource('yo', { type: 'geojson', data: vacio });
    m.addSource('lugares', { type: 'geojson', data: vacio });
    m.addSource('pubs', { type: 'geojson', data: vacio });

    m.addLayer({ id: 'pubs', type: 'circle', source: 'pubs', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 12, 6],
      'circle-color': ['case', ['get', 'pendiente'], c.hueco, c.pubLlena],
      'circle-stroke-color': ['case', ['get', 'pendiente'], c.oro, c.oroSuave],
      'circle-stroke-width': ['case', ['get', 'pendiente'], 2, 1.5],
    } });
    m.addLayer({ id: 'lugares-halo', type: 'circle', source: 'lugares', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 9, 12, 18], 'circle-color': exprTono(this.modo), 'circle-opacity': 0.2, 'circle-blur': 0.4 } });
    m.addLayer({ id: 'lugares', type: 'circle', source: 'lugares', paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 5, 12, 8],
      'circle-color': exprTono(this.modo),
      'circle-stroke-color': ['case', ['get', 'ficticio'], c.bordeFicticio, c.bordeReal],
      'circle-stroke-width': ['case', ['get', 'ficticio'], 1, 2],
      'circle-stroke-opacity': ['case', ['get', 'ficticio'], 0.65, 1],
    } });
    m.addLayer({ id: 'lugar-sel', type: 'circle', source: 'lugares', filter: ['==', ['get', 'id'], '__ninguno__'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 11, 12, 15], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': c.oro, 'circle-stroke-width': 2.5 } });
    m.addLayer({ id: 'lugares-nombre', type: 'symbol', source: 'lugares', minzoom: 8.5, layout: { 'text-field': ['get', 'nombre'], 'text-font': [this.fuente], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': c.nombre, 'text-halo-color': c.halo, 'text-halo-width': 1.4 } });
    m.addLayer({ id: 'yo-halo', type: 'circle', source: 'yo', paint: { 'circle-radius': 22, 'circle-color': c.yo, 'circle-opacity': 0.18 } });
    m.addLayer({ id: 'yo', type: 'circle', source: 'yo', paint: { 'circle-radius': 7, 'circle-color': c.pubLlena, 'circle-stroke-color': c.yoBorde, 'circle-stroke-width': 3 } });

    m.on('click', (e) => this.alTocar(e.point));
    for (const capa of ['lugares', 'pubs', 'rios-toque']) {
      m.on('mouseenter', capa, () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', capa, () => (m.getCanvas().style.cursor = ''));
    }
    m.on('moveend', () => this.programarCercanos());
    m.on('idle', () => this.programarCercanos());

    this.listo = true;
    this.pendientes.splice(0).forEach((f) => f());
    this.ev.onListo();
  }

  private alTocar(p: maplibregl.Point) {
    const caja: [maplibregl.PointLike, maplibregl.PointLike] = [
      [p.x - 12, p.y - 12],
      [p.x + 12, p.y + 12],
    ];
    const lugar = this.mapa.queryRenderedFeatures(caja, { layers: ['lugares', 'pubs'] })[0];
    if (lugar) {
      const id = (lugar.properties.lugarId ?? lugar.properties.id) as string;
      this.ev.onLugar(id);
      return;
    }
    const rio = this.mapa.queryRenderedFeatures(caja, { layers: ['rios-toque'] })[0];
    if (rio) {
      const ll = this.mapa.unproject(p);
      this.ev.onRio(nombreRio(rio), ll.lat, ll.lng);
      return;
    }
    this.ev.onVacio();
  }

  /** Nombre del río bajo un punto de pantalla (para ubicar una publicación). */
  rioEn(p: maplibregl.PointLike): string | null {
    const [x, y] = Array.isArray(p) ? p : [p.x, p.y];
    const f = this.mapa.queryRenderedFeatures(
      [
        [x - 28, y - 28],
        [x + 28, y + 28],
      ],
      { layers: ['rios-toque'] },
    )[0];
    return f ? nombreRio(f) : null;
  }

  private programarCercanos() {
    clearTimeout(this.timerCercanos);
    this.timerCercanos = window.setTimeout(() => this.ev.onCercanos(this.riosCercanos()), 250);
  }

  /** Ríos con nombre más cercanos al centro de la vista (datos de OpenStreetMap ya descargados). */
  riosCercanos(): RioCercano[] {
    if (!this.listo) return [];
    const c = this.mapa.getCenter();
    const kx = Math.cos((c.lat * Math.PI) / 180) * 111.32;
    const mejor = new Map<string, RioCercano>();
    for (const f of this.mapa.querySourceFeatures('openmaptiles', { sourceLayer: 'waterway', filter: ['==', ['get', 'class'], 'river'] })) {
      const n = nombreRio(f);
      if (!n) continue;
      const g = f.geometry;
      const lineas = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      for (const linea of lineas) {
        for (const [lon, lat] of linea) {
          const km = Math.hypot((lon - c.lng) * kx, (lat - c.lat) * 110.57);
          const prev = mejor.get(n);
          if (!prev || km < prev.km) mejor.set(n, { nombre: n, lat, lon, km });
        }
      }
    }
    return [...mejor.values()].sort((a, b) => a.km - b.km).slice(0, 4);
  }

  setLugares(puntos: PuntoLugar[]) {
    this.alListo(() =>
      (this.mapa.getSource('lugares') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: puntos.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { ...p } })),
      }),
    );
  }

  setPublicaciones(puntos: PuntoPublicacion[]) {
    this.alListo(() =>
      (this.mapa.getSource('pubs') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: puntos.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { ...p } })),
      }),
    );
  }

  /** Resalta el lugar o el río elegido (por nombre, en todos sus tramos). */
  seleccionar(lugarId: string | null, nombreRio: string | null) {
    this.alListo(() => {
      const m = this.mapa;
      m.setFilter('lugar-sel', ['==', ['get', 'id'], lugarId ?? '__ninguno__']);
      const f = ['==', ['coalesce', ['get', 'name:es'], ['get', 'name']], nombreRio ?? '__ninguno__'] as never;
      m.setFilter('rio-sel', f);
      m.setFilter('rio-sel-brillo', f);
    });
  }

  /** Cambia el tema: repinta el mapa base y las capas propias en el sitio (sin recargar el estilo). */
  setModo(modo: Modo) {
    if (modo === this.modo) return;
    this.modo = modo;
    this.alListo(() => {
      const m = this.mapa;
      const c = CAPAS[modo];
      repintarBase(m, modo);
      const pintar = (capa: string, prop: string, valor: unknown) => m.getLayer(capa) && m.setPaintProperty(capa, prop as Parameters<MlMap["setPaintProperty"]>[1], valor as never);
      pintar('arroyos', 'line-color', c.arroyo);
      pintar('rios-brillo', 'line-color', c.rioBrillo);
      pintar('rios-brillo', 'line-opacity', c.rioBrilloOpacidad);
      pintar('rios', 'line-color', c.rio);
      pintar('rio-sel-brillo', 'line-color', c.oro);
      pintar('rio-sel', 'line-color', c.oro);
      pintar('pubs', 'circle-color', ['case', ['get', 'pendiente'], c.hueco, c.pubLlena]);
      pintar('pubs', 'circle-stroke-color', ['case', ['get', 'pendiente'], c.oro, c.oroSuave]);
      pintar('lugares-halo', 'circle-color', exprTono(modo));
      pintar('lugares', 'circle-color', exprTono(modo));
      pintar('lugares', 'circle-stroke-color', ['case', ['get', 'ficticio'], c.bordeFicticio, c.bordeReal]);
      pintar('lugar-sel', 'circle-stroke-color', c.oro);
      pintar('lugares-nombre', 'text-color', c.nombre);
      pintar('lugares-nombre', 'text-halo-color', c.halo);
      pintar('yo-halo', 'circle-color', c.yo);
      pintar('yo', 'circle-color', c.pubLlena);
      pintar('yo', 'circle-stroke-color', c.yoBorde);
    });
  }

  setUbicacion(lat: number, lon: number) {
    this.alListo(() =>
      (this.mapa.getSource('yo') as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: {} }],
      }),
    );
  }

  volar(lat: number, lon: number, zoom?: number, abajo = 0) {
    this.mapa.flyTo({
      center: [lon, lat],
      zoom: zoom ?? Math.max(this.mapa.getZoom(), 10),
      duration: reducido() ? 0 : 1200,
      essential: false,
      padding: { top: 60, bottom: abajo, left: 0, right: 0 },
    });
  }

  centro() {
    const c = this.mapa.getCenter();
    const p = this.mapa.project(c);
    return { lat: c.lat, lon: c.lng, rio: this.rioEn([p.x, p.y]) };
  }

  destroy() {
    clearTimeout(this.timerCercanos);
    this.mapa.remove();
  }
}

function nombreRio(f: { properties: unknown }): string | null {
  const p = f.properties as Record<string, unknown>;
  const n = (p['name:es'] ?? p.name ?? p['name:latin']) as string | undefined;
  return n && n.trim() ? n.trim() : null;
}
