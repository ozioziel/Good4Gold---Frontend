import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, LayerSpecification, Map as MlMap, StyleSpecification } from 'maplibre-gl';
import type { Feature } from 'geojson';
import { estiloNoche, ORO, reducido } from '@/lib/mapaBase';
import { exprTono, TONO_HEX, type Tono } from '../mapa/senales';
import { ATRIBUCION_GIBS, atribucionS2, urlModis, urlNdvi, urlS2, type AnioS2, type IdCapa } from '@/data/laboratorio';

/**
 * Globo del Laboratorio (MapLibre en proyección de globo, con modo 2D). Clase imperativa fuera de React.
 * Capas satelitales reales (EOX Sentinel-2 sin nubes, NASA GIBS MODIS) + ríos de OSM + evidencias.
 * Comparador: un segundo mapa (solo imagen) encima, recortado por la línea del deslizador y sincronizado.
 * El globo es siempre oscuro (espacio + imágenes satelitales) en ambos temas; los paneles de encima sí siguen el tema.
 */
const ESPACIO = '#05070a';
const NOCHE = '#151714';
export const BOLIVIA: [number, number] = [-64.9, -16.6];

export interface PuntoLab {
  id: string;
  capa: 'lugares' | 'mediciones' | 'solicitudes' | 'estudios';
  nombre: string;
  lat: number;
  lon: number;
  tono: Tono;
  ficticio: boolean;
}

interface Eventos {
  onListo: () => void;
  onError: () => void;
  onPunto: (p: { id: string; capa: string }) => void;
  onVista: (v: { lat: number; lon: number; zoom: number }) => void;
  onPoligono: (puntos: [number, number][]) => void;
}

const FUENTES_EVIDENCIA = ['lugares', 'mediciones', 'solicitudes', 'estudios'] as const;

export class GloboLab {
  readonly mapa: MlMap;
  private comparar: MlMap | null = null;
  private listo = false;
  private pendientes: (() => void)[] = [];
  private dibujando = false;
  private vertices: [number, number][] = [];
  private estado = { anio: 2025 as AnioS2, fecha: '', capas: new Set<IdCapa>(['s2', 'rios', 'tramos', 'lugares', 'mediciones', 'estudios']) };

  constructor(private contenedor: HTMLElement, private ev: Eventos) {
    this.mapa = new maplibregl.Map({
      container: contenedor,
      style: { version: 8, sources: {}, layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': ESPACIO } }] },
      center: BOLIVIA,
      zoom: innerWidth < 900 ? 1.6 : 2.2,
      attributionControl: false,
      fadeDuration: reducido() ? 0 : 250,
      maxPitch: 60,
    });
    this.mapa.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    this.mapa.on('error', (e) => {
      if (/fetch|network/i.test(String(e.error?.message ?? ''))) ev.onError();
    });
    estiloNoche()
      .then((st) => {
        const conGlobo = { ...st, projection: { type: 'globe' }, sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] } } as unknown as StyleSpecification;
        this.mapa.once('style.load', () => this.preparar());
        this.mapa.setStyle(conGlobo);
      })
      .catch(() => ev.onError());
  }

  private alListo(fn: () => void) {
    if (this.listo) fn();
    else this.pendientes.push(fn);
  }

  private preparar() {
    if (this.listo) return;
    const m = this.mapa;
    const capas = m.getStyle().layers;
    const primeraLinea = capas.find((l) => l.type === 'line')?.id;
    const primerSimbolo = capas.find((l) => l.type === 'symbol')?.id;

    // Imágenes satelitales: bajo las líneas y rótulos del mapa base.
    m.addSource('s2', { type: 'raster', tiles: [urlS2(this.estado.anio)], tileSize: 256, maxzoom: 15, attribution: atribucionS2(this.estado.anio) });
    m.addLayer({ id: 's2', type: 'raster', source: 's2', paint: { 'raster-opacity': 1, 'raster-fade-duration': 200 } }, primeraLinea);
    m.addSource('modis', { type: 'raster', tiles: [urlModis(this.fechaGibs())], tileSize: 256, maxzoom: 9, attribution: ATRIBUCION_GIBS });
    m.addLayer({ id: 'modis', type: 'raster', source: 'modis', layout: { visibility: 'none' } }, primeraLinea);
    m.addSource('ndvi', { type: 'raster', tiles: [urlNdvi(this.fechaGibs(8))], tileSize: 256, maxzoom: 9, attribution: ATRIBUCION_GIBS });
    m.addLayer({ id: 'ndvi', type: 'raster', source: 'ndvi', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } }, primeraLinea);

    // Ríos de OpenStreetMap, resaltados.
    const rio: LayerSpecification = {
      id: 'rios',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['==', ['get', 'class'], 'river'],
      paint: { 'line-color': '#7db5cf', 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 1.6, 13, 3.5] },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    };
    m.addLayer(rio, primerSimbolo);

    // Prioridad de muestreo por tramo (Gold2Risk v0). El color nunca va solo: el panel lo dice en texto.
    m.addSource('tramos', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const tonoPrioridad = ['match', ['get', 'prioridad'], 'alta', TONO_HEX.oscuro.alto, 'media', TONO_HEX.oscuro.riesgo, 'baja', TONO_HEX.oscuro.agua, TONO_HEX.oscuro.neutro] as unknown as string;
    m.addLayer(
      {
        id: 'tramos-halo',
        type: 'line',
        source: 'tramos',
        paint: { 'line-color': tonoPrioridad, 'line-opacity': 0.25, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 6, 12, 16], 'line-blur': 2 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      },
      primerSimbolo,
    );
    m.addLayer(
      {
        id: 'tramos',
        type: 'line',
        source: 'tramos',
        paint: {
          'line-color': tonoPrioridad,
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 2, 12, 5],
          'line-opacity': ['match', ['get', 'prioridad'], 'insuficiente', 0.6, 1],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      },
      primerSimbolo,
    );

    // Evidencias: una fuente por grupo para poder encenderlas por separado.
    for (const f of FUENTES_EVIDENCIA) {
      m.addSource(f, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      const forma = f === 'estudios' ? 0.35 : 0;
      m.addLayer({
        id: `${f}-halo`,
        type: 'circle',
        source: f,
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 6, 10, 16], 'circle-color': exprTono('oscuro'), 'circle-opacity': 0.18 + forma * 0, 'circle-blur': 0.5 },
      });
      m.addLayer({
        id: f,
        type: 'circle',
        source: f,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, f === 'estudios' ? 4 : 3, 10, f === 'estudios' ? 7 : 6],
          'circle-color': f === 'estudios' ? NOCHE : exprTono('oscuro'),
          'circle-stroke-color': f === 'estudios' ? ORO : NOCHE,
          'circle-stroke-width': f === 'estudios' ? 2 : 1.5,
        },
      });
    }

    // Zona de investigación libre.
    m.addSource('zona', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    m.addLayer({ id: 'zona-relleno', type: 'fill', source: 'zona', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ORO, 'fill-opacity': 0.14 } });
    m.addLayer({ id: 'zona-borde', type: 'line', source: 'zona', paint: { 'line-color': ORO, 'line-width': 2, 'line-dasharray': [2, 1.5] } });
    m.addLayer({ id: 'zona-vertices', type: 'circle', source: 'zona', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 4, 'circle-color': ORO, 'circle-stroke-color': NOCHE, 'circle-stroke-width': 1.5 } });

    m.on('click', (e) => {
      if (this.dibujando) {
        this.vertices.push([e.lngLat.lng, e.lngLat.lat]);
        this.pintarZona(false);
        return;
      }
      const capasClic = FUENTES_EVIDENCIA.filter((f) => m.getLayer(f) && m.getLayoutProperty(f, 'visibility') !== 'none');
      const f = m.queryRenderedFeatures(
        [
          [e.point.x - 10, e.point.y - 10],
          [e.point.x + 10, e.point.y + 10],
        ],
        { layers: capasClic },
      )[0];
      if (f) this.ev.onPunto({ id: String(f.properties.id), capa: String(f.properties.capa) });
    });
    m.on('dblclick', (e) => {
      if (!this.dibujando) return;
      e.preventDefault();
      this.cerrarPoligono();
    });
    for (const f of FUENTES_EVIDENCIA) {
      m.on('mouseenter', f, () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', f, () => (m.getCanvas().style.cursor = this.dibujando ? 'crosshair' : ''));
    }
    m.on('move', () => {
      const c = m.getCenter();
      this.ev.onVista({ lat: c.lat, lon: c.lng, zoom: m.getZoom() });
    });

    this.listo = true;
    this.aplicarCapas();
    this.pendientes.splice(0).forEach((f) => f());
    this.ev.onListo();
  }

  /** Fecha GIBS con días de margen (las imágenes diarias tardan en publicarse). */
  private fechaGibs(margen = 2) {
    if (this.estado.fecha) return this.estado.fecha;
    const d = new Date(Date.now() - margen * 86_400_000);
    return d.toISOString().slice(0, 10);
  }

  private aplicarCapas() {
    const m = this.mapa;
    const vis = (id: string, on: boolean) => m.getLayer(id) && m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('s2', this.estado.capas.has('s2'));
    vis('modis', this.estado.capas.has('modis'));
    vis('ndvi', this.estado.capas.has('ndvi'));
    vis('rios', this.estado.capas.has('rios'));
    vis('tramos', this.estado.capas.has('tramos'));
    vis('tramos-halo', this.estado.capas.has('tramos'));
    for (const f of FUENTES_EVIDENCIA) {
      vis(f, this.estado.capas.has(f));
      vis(`${f}-halo`, this.estado.capas.has(f));
    }
  }

  setCapas(capas: Set<IdCapa>) {
    this.estado.capas = new Set(capas);
    this.alListo(() => this.aplicarCapas());
  }

  setAnio(anio: AnioS2) {
    this.estado.anio = anio;
    this.alListo(() => {
      const src = this.mapa.getSource('s2') as maplibregl.RasterTileSource | undefined;
      src?.setTiles([urlS2(anio)]);
    });
  }

  setFecha(fecha: string) {
    this.estado.fecha = fecha;
    this.alListo(() => {
      (this.mapa.getSource('modis') as maplibregl.RasterTileSource | undefined)?.setTiles([urlModis(fecha)]);
      (this.mapa.getSource('ndvi') as maplibregl.RasterTileSource | undefined)?.setTiles([urlNdvi(fecha)]);
    });
  }

  setPuntos(puntos: PuntoLab[]) {
    this.alListo(() => {
      for (const f of FUENTES_EVIDENCIA) {
        (this.mapa.getSource(f) as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: puntos
            .filter((p) => p.capa === f)
            .map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { ...p } })),
        });
      }
    });
  }

  /** Tramos de río con su prioridad de muestreo (GeoJSON de GET /laboratory/tramos). */
  setTramos(fc: GeoJSON.FeatureCollection) {
    this.alListo(() => (this.mapa.getSource('tramos') as GeoJSONSource | undefined)?.setData(fc));
  }

  setGlobo(globo: boolean) {
    this.alListo(() => this.mapa.setProjection({ type: globo ? 'globe' : 'mercator' }));
    this.comparar?.setProjection({ type: globo ? 'globe' : 'mercator' });
  }

  volar(lat: number, lon: number, zoom = 9) {
    this.mapa.flyTo({ center: [lon, lat], zoom, duration: reducido() ? 0 : 2400, essential: false });
  }

  // ---------------- Comparador antes / después ----------------

  abrirComparador(contenedorB: HTMLElement, anioB: AnioS2) {
    if (this.comparar) return this.setAnioB(anioB);
    const b = new maplibregl.Map({
      container: contenedorB,
      style: {
        version: 8,
        sources: { s2b: { type: 'raster', tiles: [urlS2(anioB)], tileSize: 256, maxzoom: 15 } },
        layers: [
          { id: 'fondo', type: 'background', paint: { 'background-color': ESPACIO } },
          { id: 's2b', type: 'raster', source: 's2b' },
        ],
        projection: { type: this.mapa.getProjection()?.type === 'mercator' ? 'mercator' : 'globe' },
      } as StyleSpecification,
      center: this.mapa.getCenter(),
      zoom: this.mapa.getZoom(),
      bearing: this.mapa.getBearing(),
      pitch: this.mapa.getPitch(),
      interactive: false,
      attributionControl: false,
    });
    this.comparar = b;
    this.mapa.on('move', this.sincronizar);
  }

  setAnioB(anio: AnioS2) {
    (this.comparar?.getSource('s2b') as maplibregl.RasterTileSource | undefined)?.setTiles([urlS2(anio)]);
  }

  private sincronizar = () => {
    this.comparar?.jumpTo({ center: this.mapa.getCenter(), zoom: this.mapa.getZoom(), bearing: this.mapa.getBearing(), pitch: this.mapa.getPitch() });
  };

  cerrarComparador() {
    this.mapa.off('move', this.sincronizar);
    this.comparar?.remove();
    this.comparar = null;
  }

  // ---------------- Investigación libre: dibujar un polígono ----------------

  empezarDibujo() {
    this.dibujando = true;
    this.vertices = [];
    this.mapa.doubleClickZoom.disable();
    this.mapa.getCanvas().style.cursor = 'crosshair';
    this.alListo(() => this.pintarZona(false));
  }

  cerrarPoligono() {
    if (this.vertices.length < 3) return;
    this.dibujando = false;
    this.mapa.doubleClickZoom.enable();
    this.mapa.getCanvas().style.cursor = '';
    this.pintarZona(true);
    this.ev.onPoligono([...this.vertices]);
  }

  deshacerVertice() {
    this.vertices.pop();
    this.pintarZona(false);
  }

  limpiarZona() {
    this.dibujando = false;
    this.vertices = [];
    this.mapa.doubleClickZoom.enable();
    this.mapa.getCanvas().style.cursor = '';
    this.alListo(() => this.pintarZona(false));
  }

  get verticesActuales() {
    return this.vertices.length;
  }

  private pintarZona(cerrado: boolean) {
    const v = this.vertices;
    const features: Feature[] = v.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} }));
    if (v.length >= 2) {
      features.push(
        cerrado
          ? { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...v, v[0]]] }, properties: {} }
          : { type: 'Feature', geometry: { type: 'LineString', coordinates: v }, properties: {} },
      );
    }
    (this.mapa.getSource('zona') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features });
  }

  /** Ríos con nombre dentro (o cerca) de la zona, según los datos de OSM ya cargados. */
  riosEnZona(poligono: [number, number][]) {
    const lons = poligono.map((p) => p[0]);
    const lats = poligono.map((p) => p[1]);
    const caja = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
    const nombres = new Set<string>();
    for (const f of this.mapa.querySourceFeatures('openmaptiles', { sourceLayer: 'waterway', filter: ['==', ['get', 'class'], 'river'] })) {
      const p = f.properties as Record<string, unknown>;
      const n = (p['name:es'] ?? p.name) as string | undefined;
      if (!n) continue;
      const g = f.geometry;
      const lineas: number[][][] = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      if (lineas.some((l) => l.some(([x, y]) => x >= caja[0] && x <= caja[2] && y >= caja[1] && y <= caja[3]))) nombres.add(n);
    }
    return [...nombres].slice(0, 8);
  }

  resize() {
    this.mapa.resize();
    this.comparar?.resize();
  }

  destroy() {
    this.cerrarComparador();
    this.mapa.remove();
    void this.contenedor;
  }
}
