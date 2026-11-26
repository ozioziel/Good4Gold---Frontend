// Fuentes citadas en el Inicio. Cada cifra visible apunta aquí. Verificadas el 2026-11-25 (ver docs/FUENTES.md).
export interface Fuente {
  id: string;
  titulo: string;
  autor: string;
  anio: string;
  url: string;
  uso: string;
}

export const FUENTES_INICIO: Fuente[] = [
  {
    id: 'pnuma-gma-2018',
    titulo: 'Global Mercury Assessment 2018 — Key Findings',
    autor: 'Programa de las Naciones Unidas para el Medio Ambiente (PNUMA)',
    anio: '2019',
    url: 'https://wedocs.unep.org/bitstream/handle/20.500.11822/29830/GMAKF_EN.pdf',
    uso: 'Escena 2: la minería de oro artesanal y de pequeña escala emitió ≈ 838 t de mercurio al aire en 2015, cerca del 38 % de las emisiones antropogénicas (≈ 2220 t).',
  },
  {
    id: 'oms-mercurio',
    titulo: 'El mercurio y la salud — nota descriptiva',
    autor: 'Organización Mundial de la Salud',
    anio: '2024',
    url: 'https://www.who.int/es/news-room/fact-sheets/detail/mercury-and-health',
    uso: 'Escena 3: el mercurio se transforma en metilmercurio, que se bioacumula en peces y llega a las personas por la alimentación.',
  },
  {
    id: 'valdivieso-2025',
    titulo: 'Mercurio en la cuenca del río Beni: metaanálisis 1995–2024',
    autor: 'Valdivieso et al. — Revista Boliviana de Química 42(2): 97–113',
    anio: '2025',
    url: 'https://bolivianchemistryjournaliiq.umsa.bo/wp-content/uploads/2025/12/6.-nMercuryBeniRiver-Valdivieso2025.pdf',
    uso: 'Escena 3: el registro más reciente (2022–2023) es una concentración de 4 µg/g de mercurio en cabello humano. Es un dato agregado de estudio, no un diagnóstico.',
  },
  {
    id: 'natural-earth',
    titulo: 'Natural Earth 1:50m (vía world-atlas)',
    autor: 'Natural Earth',
    anio: '—',
    url: 'https://www.naturalearthdata.com/',
    uso: 'Escena 4: contornos de continentes y de Bolivia del globo de puntos (dominio público).',
  },
  {
    id: 'osm',
    titulo: 'OpenStreetMap — Nominatim',
    autor: 'Colaboradores de OpenStreetMap (ODbL)',
    anio: '2026',
    url: 'https://www.openstreetmap.org/copyright',
    uso: 'Escena 4: ubicación de 10 localidades de la cuenca del Beni. Son referencias geográficas, no indican contaminación.',
  },
];

export const fuente = (id: string) => FUENTES_INICIO.find((f) => f.id === id)!;
