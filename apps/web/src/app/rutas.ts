import { House, MapPinned, Satellite, BookOpen, Sprout, type LucideIcon } from 'lucide-react';

export interface Ruta {
  id: 'inicio' | 'mapa' | 'laboratorio' | 'informate' | 'donaciones';
  path: string;
  icono: LucideIcon;
  /** Clave i18n del nombre largo y del corto (tab bar móvil). */
  nombre: string;
  corto: string;
}

// Cinco pestañas públicas, en el orden aprobado (contexto-proyecto.md).
export const RUTAS: Ruta[] = [
  { id: 'inicio', path: '/', icono: House, nombre: 'nav.inicio', corto: 'nav.inicio' },
  { id: 'mapa', path: '/mapa', icono: MapPinned, nombre: 'nav.mapa', corto: 'nav.mapaCorto' },
  { id: 'laboratorio', path: '/laboratorio', icono: Satellite, nombre: 'nav.laboratorio', corto: 'nav.laboratorioCorto' },
  { id: 'informate', path: '/informate', icono: BookOpen, nombre: 'nav.informate', corto: 'nav.informateCorto' },
  { id: 'donaciones', path: '/donaciones', icono: Sprout, nombre: 'nav.donaciones', corto: 'nav.donacionesCorto' },
];
