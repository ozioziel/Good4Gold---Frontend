// Cálculos de la investigación libre. Área y pertenencia son reales; los indicadores son DEMO
// (deterministas a partir de la zona) hasta conectar el pipeline científico.

const R = 6371.0088; // radio medio de la Tierra, km

/** Área de un polígono lon/lat sobre la esfera (km²). */
export function areaKm2(p: [number, number][]) {
  if (p.length < 3) return 0;
  const rad = Math.PI / 180;
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [lon1, lat1] = p[i];
    const [lon2, lat2] = p[(i + 1) % p.length];
    s += (lon2 - lon1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  return Math.abs((s * R * R) / 2);
}

/** Punto dentro de polígono (par/impar, plano lon/lat: suficiente para zonas locales). */
export function dentro([x, y]: [number, number], p: [number, number][]) {
  let adentro = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}

export function indicadoresDemo(p: [number, number][], desde: number, hasta: number) {
  const semilla = Math.abs(Math.sin(p.reduce((s, [x, y]) => s + x * 12.9898 + y * 78.233, 0)) * 43758.5453) % 1;
  const anios = hasta - desde;
  const veg = -(2 + semilla * 9) * (anios / 7);
  const turb = 4 + semilla * 18;
  const suelo = (semilla * 3.2 * anios) / 7;
  const f = (n: number, d = 1) => n.toLocaleString('es-BO', { maximumFractionDigits: d, minimumFractionDigits: d });
  return [
    { clave: 'informeVegetacion', valor: `${f(veg)} %` },
    { clave: 'informeTurbidez', valor: `+${f(turb)} %` },
    { clave: 'informeSueloDesnudo', valor: `${f(suelo)} km²` },
  ];
}

interface Informe {
  area: number;
  centro: [number, number];
  desde: number;
  hasta: number;
  imagenes: number[];
  indicadores: { clave: string; valor: string }[];
  rios: string[];
  comunidades: string[];
  estudios: string[];
}

export function informeMarkdown(i: Informe, t: (k: string, o?: Record<string, unknown>) => unknown) {
  const tx = (k: string) => String(t(k));
  const lim = t('laboratorio.limitaciones', { returnObjects: true }) as string[];
  return [
    `# ${tx('laboratorio.informe')}`,
    '',
    `Generado: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Gold2Life (demo)`,
    `Centro: ${i.centro[0].toFixed(4)}, ${i.centro[1].toFixed(4)} · ${tx('laboratorio.informeArea')}: ${Math.round(i.area)} km²`,
    `Periodo: ${i.desde}–${i.hasta}`,
    '',
    `## ${tx('laboratorio.informeImagenes')}`,
    `Sentinel-2 cloudless (EOX): ${i.imagenes.join(', ')}. MODIS Terra (NASA GIBS).`,
    '',
    `## ${tx('laboratorio.informeIndicadores')} (DEMO)`,
    ...i.indicadores.map((x) => `- ${tx(`laboratorio.${x.clave}`)}: ${x.valor}`),
    `> ${tx('laboratorio.informeIndicadoresNota')}`,
    '',
    `## ${tx('laboratorio.informeRios')}`,
    i.rios.length ? i.rios.map((r) => `- ${r}`).join('\n') : `- ${tx('laboratorio.ninguno')}`,
    '',
    `## ${tx('laboratorio.informeComunidades')}`,
    i.comunidades.length ? i.comunidades.map((r) => `- ${r}`).join('\n') : `- ${tx('laboratorio.ninguno')}`,
    '',
    `## ${tx('laboratorio.informeEstudios')}`,
    i.estudios.length ? i.estudios.map((r) => `- ${r}`).join('\n') : `- ${tx('laboratorio.ninguno')}`,
    '',
    `## ${tx('laboratorio.informeLimitaciones')}`,
    ...lim.map((l) => `- ${l}`),
    '',
    'Fuentes: EOX Sentinel-2 cloudless (s2maps.eu, Copernicus Sentinel data), NASA EOSDIS GIBS, © OpenStreetMap.',
  ].join('\n');
}
