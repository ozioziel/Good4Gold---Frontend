// Genera public/inicio/tierra.bin: máscaras de bits de tierra (mundo) y de Bolivia para el globo de puntos del Inicio.
// Fuente: Natural Earth 1:50m vía el paquete world-atlas (dominio público). Se rasteriza por barrido de líneas
// (scanline par/impar) en coordenadas lon/lat: es rápido y suficiente para un globo de puntos.
// Uso: npm run globo:puntos -w apps/web
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import * as topojson from 'topojson-client';

const require = createRequire(import.meta.url);
const raiz = dirname(fileURLToPath(import.meta.url));
const salida = join(raiz, '..', 'public', 'inicio', 'tierra.bin');

// Debe coincidir con src/scenes/inicio/mascaras.ts
const MUNDO = { ancho: 720, alto: 360, lon0: -180, lat0: 90, paso: 0.5 };
const BOLIVIA = { ancho: 60, alto: 64, lon0: -70, lat0: -9.5, paso: 0.25 };

const leer = async (archivo) => JSON.parse(await readFile(require.resolve(`world-atlas/${archivo}`), 'utf8'));

function anillos(geom) {
  if (geom.type === 'Polygon') return geom.coordinates;
  if (geom.type === 'MultiPolygon') return geom.coordinates.flat();
  return [];
}

function rasterizar(rings, grid) {
  const bits = new Uint8Array(Math.ceil((grid.ancho * grid.alto) / 8));
  for (let fila = 0; fila < grid.alto; fila++) {
    const lat = grid.lat0 - (fila + 0.5) * grid.paso;
    const cortes = [];
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[i + 1];
        if (Math.abs(x2 - x1) > 180) continue; // arista que cruza el antimeridiano
        if ((y1 <= lat && lat < y2) || (y2 <= lat && lat < y1)) {
          cortes.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
    }
    cortes.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cortes.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((cortes[k] - grid.lon0) / grid.paso - 0.5));
      const c1 = Math.min(grid.ancho - 1, Math.floor((cortes[k + 1] - grid.lon0) / grid.paso - 0.5));
      for (let col = c0; col <= c1; col++) {
        const i = fila * grid.ancho + col;
        bits[i >> 3] |= 1 << (i & 7);
      }
    }
    // La Antártida cierra por el polo y el barrido no siempre la capta: la marcamos completa al sur de -80°.
    if (grid === MUNDO && lat < -80) {
      for (let col = 0; col < grid.ancho; col++) {
        const i = fila * grid.ancho + col;
        bits[i >> 3] |= 1 << (i & 7);
      }
    }
  }
  return bits;
}

const tierra = await leer('land-50m.json');
const paises = await leer('countries-50m.json');
const ringsTierra = anillos(topojson.merge(tierra, tierra.objects.land.geometries));
const bolivia = paises.objects.countries.geometries.find((g) => g.id === '068');
if (!bolivia) throw new Error('No se encontró Bolivia (068) en countries-50m');
const ringsBolivia = anillos(topojson.feature(paises, bolivia).geometry);

const a = rasterizar(ringsTierra, MUNDO);
const b = rasterizar(ringsBolivia, BOLIVIA);
const contar = (bits) => bits.reduce((s, v) => { let n = v; while (n) { s += n & 1; n >>= 1; } return s; }, 0);

await mkdir(dirname(salida), { recursive: true });
await writeFile(salida, Buffer.concat([Buffer.from(a), Buffer.from(b)]));
console.log(`tierra.bin: ${a.length + b.length} bytes · celdas tierra ${contar(a)} · celdas Bolivia ${contar(b)}`);
