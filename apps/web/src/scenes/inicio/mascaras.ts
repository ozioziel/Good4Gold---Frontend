// Lee public/inicio/tierra.bin (generado por scripts/globo-puntos.mjs desde Natural Earth 1:50m).
// Debe coincidir con las rejillas MUNDO y BOLIVIA del script.
const MUNDO = { ancho: 720, alto: 360, lon0: -180, lat0: 90, paso: 0.5 };
const BOLIVIA = { ancho: 60, alto: 64, lon0: -70, lat0: -9.5, paso: 0.25 };

export interface Mascaras {
  esTierra(lat: number, lon: number): boolean;
  esBolivia(lat: number, lon: number): boolean;
}

function lector(bits: Uint8Array, g: typeof MUNDO) {
  return (lat: number, lon: number) => {
    const col = Math.floor((lon - g.lon0) / g.paso);
    const fila = Math.floor((g.lat0 - lat) / g.paso);
    if (col < 0 || fila < 0 || col >= g.ancho || fila >= g.alto) return false;
    const i = fila * g.ancho + col;
    return (bits[i >> 3] & (1 << (i & 7))) !== 0;
  };
}

export async function cargarMascaras(url = '/inicio/tierra.bin'): Promise<Mascaras> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo leer ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const n = Math.ceil((MUNDO.ancho * MUNDO.alto) / 8);
  return {
    esTierra: lector(buf.subarray(0, n), MUNDO),
    esBolivia: lector(buf.subarray(n), BOLIVIA),
  };
}
