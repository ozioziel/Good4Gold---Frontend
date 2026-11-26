// Capas y biblioteca del Laboratorio. Las capas satelitales son reales (verificadas el 2026-11-26).
// Ninguna capa satelital mide mercurio: orientan dónde buscar.

/** Mosaicos anuales Sentinel-2 sin nubes de EOX (s2maps.eu). 2016: CC BY 4.0; 2018+: CC BY-NC-SA 4.0. */
export const ANIOS_S2 = [2016, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;
export type AnioS2 = (typeof ANIOS_S2)[number];

export const urlS2 = (anio: AnioS2) =>
  anio === 2016
    ? 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
    : `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${anio}_3857/default/g/{z}/{y}/{x}.jpg`;

export const atribucionS2 = (anio: AnioS2) =>
  `Sentinel-2 cloudless ${anio} — s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${anio === 2016 ? '2016 & 2017' : anio})`;

/** NASA GIBS (dominio público): MODIS diario en color real y NDVI de 8 días. */
export const urlModis = (fecha: string) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${fecha}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
export const urlNdvi = (fecha: string) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${fecha}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
export const ATRIBUCION_GIBS = 'NASA EOSDIS GIBS · MODIS Terra';

export type IdCapa = 's2' | 'modis' | 'ndvi' | 'rios' | 'lugares' | 'mediciones' | 'solicitudes' | 'estudios';

export interface DefCapa {
  id: IdCapa;
  grupo: 'imagen' | 'territorio' | 'evidencia';
  real: boolean;
  fuente: string;
  resolucion?: string;
}

export const CAPAS: DefCapa[] = [
  { id: 's2', grupo: 'imagen', real: true, fuente: 'EOX · Copernicus Sentinel-2', resolucion: '10 m' },
  { id: 'modis', grupo: 'imagen', real: true, fuente: ATRIBUCION_GIBS, resolucion: '250 m' },
  { id: 'ndvi', grupo: 'imagen', real: true, fuente: `${ATRIBUCION_GIBS} · NDVI 8 días`, resolucion: '250 m' },
  { id: 'rios', grupo: 'territorio', real: true, fuente: 'OpenStreetMap' },
  { id: 'lugares', grupo: 'territorio', real: false, fuente: 'Gold2Life (demo)' },
  { id: 'mediciones', grupo: 'evidencia', real: false, fuente: 'Laboratorios participantes (demo)' },
  { id: 'solicitudes', grupo: 'evidencia', real: false, fuente: 'Mapa comunitario (demo)' },
  { id: 'estudios', grupo: 'evidencia', real: true, fuente: 'Biblioteca científica' },
];

export interface Estudio {
  id: string;
  titulo: string;
  autores: string;
  anio: number;
  tipo: 'articulo' | 'dataset' | 'informe';
  zona: string;
  tema: 'agua' | 'peces' | 'personas' | 'satelite' | 'politica';
  lat: number;
  lon: number;
  url: string;
  descargable: boolean;
  nota: string;
}

export const ESTUDIOS: Estudio[] = [
  {
    id: 'valdivieso-2025',
    titulo: 'Mercurio en la cuenca del río Beni: metaanálisis 1995–2024',
    autores: 'Valdivieso et al. · Rev. Boliviana de Química 42(2)',
    anio: 2025,
    tipo: 'articulo',
    zona: 'Cuenca del Beni, Bolivia',
    tema: 'agua',
    lat: -14.6,
    lon: -67.6,
    url: 'https://bolivianchemistryjournaliiq.umsa.bo/wp-content/uploads/2025/12/6.-nMercuryBeniRiver-Valdivieso2025.pdf',
    descargable: false,
    nota: 'Agua, sedimentos y cabello humano por zonas. Sin coordenadas por muestra.',
  },
  {
    id: 'gerson-2022',
    titulo: 'Química de agua superficial, precipitación, hojas, suelo y aire cerca de minería de oro',
    autores: 'Gerson et al. · Ecology 103(5) · Dryad',
    anio: 2022,
    tipo: 'dataset',
    zona: 'Madre de Dios, Perú',
    tema: 'agua',
    lat: -12.6,
    lon: -70.0,
    url: 'https://datadryad.org/dataset/doi:10.6078/D1DH6F',
    descargable: true,
    nota: 'Hg total en agua sin filtrar (Tekran 2600). Candidato para entrenar y validar.',
  },
  {
    id: 'usgs-sf-s2',
    titulo: 'Concentraciones de Hg en agua superficial derivadas de Sentinel-2 (2022–2024)',
    autores: 'USGS',
    anio: 2024,
    tipo: 'dataset',
    zona: 'Bahía de San Francisco, EE. UU.',
    tema: 'satelite',
    lat: 37.55,
    lon: -122.1,
    url: 'https://www.usgs.gov/data/surface-water-mercury-concentrations-south-san-francisco-bay-2022-2024-derived-sentinel-2',
    descargable: true,
    nota: 'Precedente metodológico. No se extrapola a Bolivia.',
  },
  {
    id: 'usgs-sf-hg',
    titulo: 'Especiación de mercurio en aguas superficiales',
    autores: 'USGS',
    anio: 2023,
    tipo: 'dataset',
    zona: 'Bahía de San Francisco, EE. UU.',
    tema: 'agua',
    lat: 37.45,
    lon: -122.0,
    url: 'https://www.usgs.gov/data/mercury-speciation-surface-waters-south-san-francisco-bay-california',
    descargable: true,
    nota: 'Hg total, disuelto y particulado por separado.',
  },
  {
    id: 'mdpi-2022',
    titulo: 'Sensores remotos y minería de oro (revisión)',
    autores: 'Remote Sensing 14(13): 2971',
    anio: 2022,
    tipo: 'articulo',
    zona: 'Global',
    tema: 'satelite',
    lat: -9.5,
    lon: -63.5,
    url: 'https://www.mdpi.com/2072-4292/14/13/2971',
    descargable: false,
    nota: 'Qué pueden y qué no pueden detectar los satélites.',
  },
  {
    id: 'pnuma-gma',
    titulo: 'Evaluación Mundial del Mercurio 2018',
    autores: 'PNUMA',
    anio: 2019,
    tipo: 'informe',
    zona: 'Global',
    tema: 'politica',
    lat: 0,
    lon: -40,
    url: 'https://wedocs.unep.org/bitstream/handle/20.500.11822/29830/GMAKF_EN.pdf',
    descargable: false,
    nota: 'Inventario mundial de emisiones (≈ 838 t/año de la minería artesanal).',
  },
  {
    id: 'planetgold-sat',
    titulo: 'Monitoreo satelital y trabajo de campo en minería artesanal',
    autores: 'planetGOLD',
    anio: 2023,
    tipo: 'informe',
    zona: 'Global',
    tema: 'satelite',
    lat: -16.5,
    lon: -68.15,
    url: 'https://www.planetgold.org/evaluating-and-monitoring-small-scale-gold-mining-and-mercury-use-building-knowledge-base-satellite',
    descargable: false,
    nota: 'Combinar imágenes con visitas de campo.',
  },
];

/** Estado honesto del modelo experimental (ciencia-datos.md §4). */
export const MODELO = {
  nombre: 'Hg total en agua · experimento',
  estado: 'en_evaluacion' as const,
  pasos: [
    { id: 'datos', hecho: true },
    { id: 'emparejar', hecho: false },
    { id: 'baseline', hecho: false },
    { id: 'validar', hecho: false },
  ],
};
