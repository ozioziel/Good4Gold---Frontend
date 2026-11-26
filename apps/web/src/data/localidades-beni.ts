// Localidades de referencia de la cuenca del río Beni (La Paz y Beni, Bolivia).
// Coordenadas reales obtenidas de OpenStreetMap (Nominatim) el 2026-11-25. © colaboradores de OpenStreetMap, ODbL.
// Son puntos de referencia geográfica: NO indican contaminación ni resultados de mercurio.
export interface Localidad {
  nombre: string;
  departamento: 'La Paz' | 'Beni';
  lat: number;
  lon: number;
}

export const LOCALIDADES_BENI: Localidad[] = [
  { nombre: 'Rurrenabaque', departamento: 'Beni', lat: -14.4437, lon: -67.5313 },
  { nombre: 'San Buenaventura', departamento: 'La Paz', lat: -14.4387, lon: -67.5365 },
  { nombre: 'Reyes', departamento: 'Beni', lat: -14.2952, lon: -67.3359 },
  { nombre: 'Puerto Salinas', departamento: 'Beni', lat: -14.2641, lon: -67.4973 },
  { nombre: 'Guanay', departamento: 'La Paz', lat: -15.4977, lon: -67.8798 },
  { nombre: 'Teoponte', departamento: 'La Paz', lat: -15.4956, lon: -67.8191 },
  { nombre: 'Mapiri', departamento: 'La Paz', lat: -15.3096, lon: -68.2148 },
  { nombre: 'Tipuani', departamento: 'La Paz', lat: -15.5661, lon: -68.0206 },
  { nombre: 'Caranavi', departamento: 'La Paz', lat: -15.6946, lon: -67.3921 },
  { nombre: 'Riberalta', departamento: 'Beni', lat: -10.9973, lon: -66.0752 },
];

export const FUENTE_LOCALIDADES = {
  titulo: 'OpenStreetMap — Nominatim',
  url: 'https://www.openstreetmap.org/copyright',
  licencia: 'ODbL 1.0',
  consultado: '2026-11-25',
};
