import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Une vértices duplicados para que el ruido no abra grietas entre caras.
const mergeVerticesCopa = (g: THREE.BufferGeometry) => {
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  return mergeVertices(g);
};
import { type Calidad, hi } from '../../comun/calidad';
import { azar, crearRuido, lerp, suave } from '../../comun/util';

/**
 * Escenas 2, 3 y 6: paisaje amazónico con un río sinuoso, bosque de copas, una zona minera con pozas
 * (escena 2), el lecho del río bajo el agua (escena 3) y el mismo territorio al amanecer (escena 6).
 * Todo es procedural: cero descargas. Es ilustrativo, no un lugar ni una medición real.
 */

export const NIVEL_AGUA = -0.8;
export const RIO_SEMIANCHO = 7;
const ANCHO = 280;
const LARGO = 440;
const Z0 = -270; // borde lejano (aguas abajo, hacia el amanecer)

export const rioX = (z: number) => 16 * Math.sin(z * 0.032) + 7 * Math.sin(z * 0.011 + 1.3);

const ruido = crearRuido(23);

/** Máscara de la zona minera (0..1): orilla derecha, aguas arriba del tramo inicial. */
export function zonaMinera(x: number, z: number) {
  const dx = x - (rioX(z) + RIO_SEMIANCHO);
  if (dx < 0.5 || dx > 40) return 0;
  const enZ = suave(-46, -36, z) * (1 - suave(4, 14, z));
  const borde = 1 - suave(26, 38, dx + ruido.fbm(x * 0.05, z * 0.05, 3) * 14);
  return Math.min(1, enZ * borde * 1.4) * (ruido.fbm(x * 0.09 + 4, z * 0.09, 3) > -0.35 ? 1 : 0.4);
}

export function altura(x: number, z: number) {
  const d = Math.abs(x - rioX(z));
  const base = 2.2 + ruido.fbm(x * 0.018, z * 0.018, 5) * 7 + ruido.fbm(x * 0.07, z * 0.07, 3) * 1.2;
  const lomas = suave(60, 135, Math.abs(x)) * (10 + ruido.fbm(x * 0.03, z * 0.03, 4) * 8);
  const orilla = suave(RIO_SEMIANCHO * 0.7, RIO_SEMIANCHO + 16, d);
  const cauce = lerp(-3.4 + ruido.ruido(x * 0.2, z * 0.2) * 0.4, 0, suave(0, RIO_SEMIANCHO * 1.05, d));
  let h = lerp(cauce, base + lomas, orilla);
  const m = zonaMinera(x, z);
  if (m > 0) h = lerp(h, 0.35 + ruido.ruido(x * 0.4, z * 0.4) * 0.25, Math.min(1, m * 1.2));
  return h;
}

// Paleta del paisaje (colores lineales vía THREE.Color)
const C = {
  selva: new THREE.Color('#1f3a22'),
  selvaClara: new THREE.Color('#2f4f2c'),
  playa: new THREE.Color('#9c8762'),
  barro: new THREE.Color('#7d6446'),
  mina: new THREE.Color('#b8926a'),
  minaClara: new THREE.Color('#cdb48d'),
  lecho: new THREE.Color('#4a4433'),
};

interface Ambiente {
  zenit: THREE.Color;
  horizonte: THREE.Color;
  suelo: THREE.Color;
  sol: THREE.Vector3;
  solColor: THREE.Color;
  niebla: THREE.Color;
  densidad: number;
  hemiCielo: THREE.Color;
  hemiSuelo: THREE.Color;
  hemiI: number;
  luzColor: THREE.Color;
  luzI: number;
  agua: THREE.Color;
}

const amb = (o: Omit<Ambiente, 'sol'> & { sol: [number, number, number] }): Ambiente => ({
  ...o,
  sol: new THREE.Vector3(...o.sol).normalize(),
});

const TARDE = amb({
  zenit: new THREE.Color('#6d8ea3'),
  horizonte: new THREE.Color('#cdc8af'),
  suelo: new THREE.Color('#8b8a72'),
  sol: [0.35, 0.5, -0.8],
  solColor: new THREE.Color('#fff0cf'),
  niebla: new THREE.Color('#c3c3ab'),
  densidad: 0.0068,
  hemiCielo: new THREE.Color('#e6ebe4'),
  hemiSuelo: new THREE.Color('#3b4a2c'),
  hemiI: 1.25,
  luzColor: new THREE.Color('#fff1d8'),
  luzI: 2.1,
  agua: new THREE.Color('#6b5b3f'),
});

const ALTURA = amb({
  zenit: new THREE.Color('#0d1828'),
  horizonte: new THREE.Color('#8db2c6'),
  suelo: new THREE.Color('#5f7468'),
  sol: [0.35, 0.5, -0.8],
  solColor: new THREE.Color('#fff4dc'),
  niebla: new THREE.Color('#a9c2cc'),
  densidad: 0.006,
  hemiCielo: new THREE.Color('#d7e6ee'),
  hemiSuelo: new THREE.Color('#2f3c2a'),
  hemiI: 1.1,
  luzColor: new THREE.Color('#fff4dc'),
  luzI: 2.0,
  agua: new THREE.Color('#6b5b3f'),
});

const AMANECER = amb({
  zenit: new THREE.Color('#2f4257'),
  horizonte: new THREE.Color('#f0b563'),
  suelo: new THREE.Color('#6a4b34'),
  sol: [0.02, 0.055, -1],
  solColor: new THREE.Color('#ffd189'),
  niebla: new THREE.Color('#d9a066'),
  densidad: 0.0128,
  hemiCielo: new THREE.Color('#f6cf96'),
  hemiSuelo: new THREE.Color('#29331f'),
  hemiI: 0.95,
  luzColor: new THREE.Color('#ffc277'),
  luzI: 2.3,
  agua: new THREE.Color('#5d5438'),
});

const NIEBLA_AGUA = new THREE.Color('#3a5a4c');

export class ConjuntoPaisaje {
  readonly grupo = new THREE.Group();
  private submarino = new THREE.Group();
  private mineria = new THREE.Group();
  private cielo: THREE.Mesh;
  private uCielo = {
    uZenit: { value: new THREE.Color() },
    uHorizonte: { value: new THREE.Color() },
    uSuelo: { value: new THREE.Color() },
    uSolDir: { value: new THREE.Vector3() },
    uSolColor: { value: new THREE.Color() },
    uSolFuerza: { value: 1 },
  };
  private uAgua = {
    uTiempo: { value: 0 },
    uCielo: { value: new THREE.Color() },
    uSolDir: this.uCielo.uSolDir,
    uSolColor: this.uCielo.uSolColor,
  };
  private uParticulas = { uTiempo: { value: 0 }, uEscala: { value: 1 } };
  private hemi = new THREE.HemisphereLight();
  private sol = new THREE.DirectionalLight();
  private peces: THREE.InstancedMesh;
  private datosPeces: { x: number; y: number; z: number; v: number; f: number; amp: number }[] = [];
  private aves: THREE.LineSegments;
  private datosAves: { x: number; y: number; z: number; v: number; f: number; e: number }[] = [];
  private rayos: THREE.Mesh[] = [];
  private disposables: { dispose(): void }[] = [];
  private tmp = new THREE.Object3D();
  private ambienteActual: Ambiente = {
    ...TARDE,
    zenit: TARDE.zenit.clone(),
    horizonte: TARDE.horizonte.clone(),
    suelo: TARDE.suelo.clone(),
    sol: TARDE.sol.clone(),
    solColor: TARDE.solColor.clone(),
    niebla: TARDE.niebla.clone(),
    hemiCielo: TARDE.hemiCielo.clone(),
    hemiSuelo: TARDE.hemiSuelo.clone(),
    luzColor: TARDE.luzColor.clone(),
    agua: TARDE.agua.clone(),
  };
  readonly niebla = new THREE.FogExp2(0xffffff, 0.01);
  bajoAgua = false;

  constructor(calidad: Calidad) {
    const r = azar(5);

    // ---------- Terreno ----------
    const segX = hi(calidad, 150, 96);
    const segZ = hi(calidad, 236, 150);
    const geo = new THREE.PlaneGeometry(ANCHO, LARGO, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, Z0 + LARGO / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colores = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = altura(x, z);
      pos.setY(i, h);
      const d = Math.abs(x - rioX(z));
      const m = zonaMinera(x, z);
      const n = ruido.ruido(x * 0.3, z * 0.3);
      c.copy(C.selva).lerp(C.selvaClara, 0.5 + n * 0.5);
      if (d < RIO_SEMIANCHO + 3) c.lerp(C.playa, 1 - suave(RIO_SEMIANCHO + 0.2, RIO_SEMIANCHO + 3, d));
      if (h < NIVEL_AGUA - 0.2) c.copy(C.lecho).lerp(C.barro, 0.5 + n * 0.5);
      if (m > 0) c.lerp(n > 0.2 ? C.minaClara : C.mina, Math.min(1, m * 1.3));
      colores.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geo.computeVertexNormals();
    const matTerreno = new THREE.MeshLambertMaterial({ vertexColors: true });
    const terreno = new THREE.Mesh(geo, matTerreno);
    this.grupo.add(terreno);
    this.disposables.push(geo, matTerreno);

    // ---------- Bosque: copas instanciadas (incluye tajibos amarillos y morados, típicos del oriente boliviano) ----------
    // Copa: icosaedro con relieve de ruido y sombreado suave (se lee como follaje, no como facetas).
    const geoCopa = mergeVerticesCopa(new THREE.IcosahedronGeometry(1, hi(calidad, 2, 1)));
    const pc = geoCopa.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pc.count; i++) {
      const x = pc.getX(i);
      const y = pc.getY(i);
      const z = pc.getZ(i);
      const k = 1 + ruido.ruido(x * 2.7 + 11, z * 2.7 + y * 1.9) * 0.16;
      pc.setXYZ(i, x * k, Math.max(y * k * 0.8, -0.35), z * k);
    }
    geoCopa.computeVertexNormals();
    const matCopa = new THREE.MeshLambertMaterial();
    const paso = hi(calidad, 2.9, 3.8);
    const verdes = ['#2c4b2d', '#365a34', '#41683a', '#2a4430', '#4f7a43', '#3b5f2f', '#577f45'].map((h) => new THREE.Color(h));
    const tajiboAmarillo = new THREE.Color('#d2a93a');
    const tajiboMorado = new THREE.Color('#a8617a');
    const arboles: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    for (let z = Z0 + 4; z < Z0 + LARGO - 60; z += paso) {
      for (let x = -ANCHO / 2 + 4; x < ANCHO / 2 - 4; x += paso) {
        const px = x + (r() - 0.5) * paso * 0.9;
        const pz = z + (r() - 0.5) * paso * 0.9;
        const d = Math.abs(px - rioX(pz));
        if (d < RIO_SEMIANCHO + 3 + r() * 2.5) continue;
        if (zonaMinera(px, pz) > 0.25) continue;
        if (r() < 0.04) continue; // claros naturales
        const h = altura(px, pz);
        const grande = r() < 0.06 ? 1.55 : 1;
        const sx = (1.25 + r() * 1.05) * grande;
        const sy = (0.95 + r() * 0.9) * grande;
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3(px, h + sy * 0.55 + 0.6 * grande, pz),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI),
          new THREE.Vector3(sx, sy, sx * (0.85 + r() * 0.3)),
        );
        const u = r();
        const col = u < 0.018 ? tajiboAmarillo : u < 0.027 ? tajiboMorado : verdes[Math.floor(r() * verdes.length)];
        arboles.push({ m, c: col.clone().multiplyScalar(0.9 + r() * 0.2) });
      }
    }
    const bosque = new THREE.InstancedMesh(geoCopa, matCopa, arboles.length);
    arboles.forEach((a, i) => {
      bosque.setMatrixAt(i, a.m);
      bosque.setColorAt(i, a.c);
    });
    bosque.instanceMatrix.needsUpdate = true;
    this.grupo.add(bosque);
    this.disposables.push(geoCopa, matCopa);

    // ---------- Agua del río ----------
    const geoAgua = new THREE.PlaneGeometry(ANCHO, LARGO, 1, 1);
    geoAgua.rotateX(-Math.PI / 2);
    geoAgua.translate(0, NIVEL_AGUA, Z0 + LARGO / 2);
    const matAgua = this.materialAgua(new THREE.Color('#7a6339'), new THREE.Color('#33382a'));
    const agua = new THREE.Mesh(geoAgua, matAgua);
    this.grupo.add(agua);
    this.disposables.push(geoAgua, matAgua);

    // ---------- Minería: pozas de relave y dragas (escena 2) ----------
    const colPozas = ['#5e9c8d', '#7e6a48', '#a7a58c', '#4f8a7e', '#8f7a52'];
    let pozas = 0;
    for (let i = 0; i < 400 && pozas < 16; i++) {
      const z = -42 + r() * 50;
      const x = rioX(z) + RIO_SEMIANCHO + 4 + r() * 28;
      if (zonaMinera(x, z) < 0.7) continue;
      const rad = 1.6 + r() * 2.8;
      const g = new THREE.CircleGeometry(rad, 14);
      const pg = g.attributes.position as THREE.BufferAttribute;
      for (let k = 1; k < pg.count; k++) {
        const s = 0.75 + r() * 0.4;
        pg.setXY(k, pg.getX(k) * s * 1.3, pg.getY(k) * s);
      }
      g.rotateX(-Math.PI / 2);
      g.rotateY(r() * Math.PI);
      const col = new THREE.Color(colPozas[Math.floor(r() * colPozas.length)]);
      const mat = this.materialAgua(col, col.clone().multiplyScalar(0.5), 0.55);
      const poza = new THREE.Mesh(g, mat);
      poza.position.set(x, altura(x, z) + 0.08, z);
      this.mineria.add(poza);
      this.disposables.push(g, mat);
      pozas++;
    }
    const matDraga = new THREE.MeshLambertMaterial({ color: '#6f5f4a', flatShading: true });
    const matTecho = new THREE.MeshLambertMaterial({ color: '#9fa7a4', flatShading: true, side: THREE.DoubleSide });
    const geoCasco = new THREE.BoxGeometry(2.6, 0.35, 1.2);
    const geoTecho = new THREE.PlaneGeometry(1.6, 1.3);
    for (const z of [-30, -17, -6]) {
      const draga = new THREE.Group();
      const casco = new THREE.Mesh(geoCasco, matDraga);
      const techo = new THREE.Mesh(geoTecho, matTecho);
      techo.rotation.x = -Math.PI / 2 + 0.12;
      techo.position.set(0.2, 1.1, 0);
      draga.add(casco, techo);
      draga.position.set(rioX(z) + RIO_SEMIANCHO * 0.45, NIVEL_AGUA + 0.12, z);
      draga.rotation.y = Math.atan2(rioX(z + 1) - rioX(z), 1) + Math.PI / 2;
      this.mineria.add(draga);
    }
    this.disposables.push(matDraga, matTecho, geoCasco, geoTecho);
    this.grupo.add(this.mineria);

    // ---------- Cielo ----------
    const geoCielo = new THREE.SphereGeometry(900, 32, 16);
    const matCielo = new THREE.ShaderMaterial({
      uniforms: this.uCielo,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenit; uniform vec3 uHorizonte; uniform vec3 uSuelo;
        uniform vec3 uSolDir; uniform vec3 uSolColor; uniform float uSolFuerza;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = h > 0.0 ? mix(uHorizonte, uZenit, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizonte, uSuelo, clamp(-h * 4.0, 0.0, 1.0));
          float s = max(dot(d, normalize(uSolDir)), 0.0);
          col += uSolColor * (pow(s, 6.0) * 0.28 + pow(s, 60.0) * 0.5) * uSolFuerza;
          col += uSolColor * smoothstep(0.99955, 0.99985, s) * 0.9 * uSolFuerza;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.cielo = new THREE.Mesh(geoCielo, matCielo);
    this.cielo.frustumCulled = false;
    this.cielo.renderOrder = -1;
    this.grupo.add(this.cielo);
    this.disposables.push(geoCielo, matCielo);

    // ---------- Luces ----------
    this.sol.position.set(40, 60, -80);
    this.grupo.add(this.hemi, this.sol, this.sol.target);

    // ---------- Bajo el agua: peces, sedimentos, partículas plateadas y rayos de luz ----------
    // Pez: cuerpo fusiforme que se afina hacia la cola, aletas dorsal y caudal; lomo oscuro y vientre claro.
    const cuerpo = new THREE.SphereGeometry(1, 16, 10);
    const pcu = cuerpo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pcu.count; i++) {
      const x = pcu.getX(i);
      const afinar = x < 0 ? 1 + x * 0.78 : 1 - x * x * 0.12;
      pcu.setXYZ(i, x * 0.55, pcu.getY(i) * 0.19 * afinar, pcu.getZ(i) * 0.085 * afinar);
    }
    cuerpo.computeVertexNormals();
    const aleta = (pts: number[]) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pts.length / 3) * 2).fill(0), 2));
      g.computeVertexNormals();
      return g;
    };
    const caudal = aleta([-0.5, 0, 0, -0.78, 0.2, 0, -0.7, 0, 0, -0.5, 0, 0, -0.7, 0, 0, -0.78, -0.18, 0]);
    const dorsal = aleta([0.08, 0.17, 0, -0.18, 0.15, 0, -0.06, 0.3, 0]);
    const piezas = [cuerpo.toNonIndexed(), caudal, dorsal];
    piezas.forEach((g) => {
      const pp = g.attributes.position as THREE.BufferAttribute;
      const col = new Float32Array(pp.count * 3);
      const lomo = new THREE.Color('#4d5a4c');
      const vientre = new THREE.Color('#d9dccf');
      const cc = new THREE.Color();
      for (let i = 0; i < pp.count; i++) {
        cc.copy(vientre).lerp(lomo, suave(-0.06, 0.12, pp.getY(i)));
        col.set([cc.r, cc.g, cc.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    });
    const geoPez = mergeGeometries(piezas)!;
    const matPez = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.5,
      roughness: 0.38,
      side: THREE.DoubleSide,
      emissive: '#1c2219',
    });
    const nPeces = hi(calidad, 46, 26);
    this.peces = new THREE.InstancedMesh(geoPez, matPez, nPeces);
    for (let i = 0; i < nPeces; i++) {
      const z = -28 + r() * 56;
      this.datosPeces.push({
        // Fuera del eje de la cámara: ningún pez le pasa por delante a quemarropa.
        x: (r() < 0.5 ? -1 : 1) * (1.3 + r() * RIO_SEMIANCHO * 0.5),
        y: NIVEL_AGUA - 1.2 - r() * 1.6,
        z,
        v: 0.6 + r() * 0.9,
        f: r() * Math.PI * 2,
        amp: 0.2 + r() * 0.6,
      });
    }
    this.submarino.add(this.peces);
    this.disposables.push(cuerpo, caudal, dorsal, geoPez, matPez);

    const sedimentos = this.crearParticulas(hi(calidad, 4200, 1800), r, new THREE.Color('#9b8257'), 0.02, false, 1);
    const mercurio = this.crearParticulas(hi(calidad, 1600, 700), r, new THREE.Color('#eef3f5'), 0.016, true, 4.2);
    this.submarino.add(sedimentos, mercurio);

    const texRayo = this.texturaRayo();
    const matRayo = new THREE.MeshBasicMaterial({
      map: texRayo,
      color: '#d5e6cf',
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    const geoRayo = new THREE.PlaneGeometry(1.4, 6);
    for (let i = 0; i < 9; i++) {
      const z = 14 - i * 4.2 + r() * 2;
      const m = new THREE.Mesh(geoRayo, matRayo);
      m.position.set(rioX(z) + (r() - 0.5) * 6, NIVEL_AGUA - 2.4, z);
      m.rotation.set(0.25, r() * Math.PI, 0.2);
      this.rayos.push(m);
      this.submarino.add(m);
    }
    this.disposables.push(texRayo, matRayo, geoRayo);
    this.grupo.add(this.submarino);

    // ---------- Aves al amanecer (escena 6): «V» dibujadas con líneas ----------
    const nAves = 13;
    const geoAves = new THREE.BufferGeometry();
    geoAves.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nAves * 4 * 3), 3));
    for (let i = 0; i < nAves; i++) {
      this.datosAves.push({ x: -14 + r() * 30, y: 9 + r() * 7, z: -78 - r() * 40, v: 2.2 + r() * 1.2, f: r() * 6, e: 0.35 + r() * 0.25 });
    }
    const matAves = new THREE.LineBasicMaterial({ color: '#3a2c1c' });
    this.aves = new THREE.LineSegments(geoAves, matAves);
    this.aves.frustumCulled = false;
    this.grupo.add(this.aves);
    this.disposables.push(geoAves, matAves);

    this.aplicarAmbiente(TARDE);
  }

  private materialAgua(colorAgua: THREE.Color, colorProfundo: THREE.Color, brillo = 1) {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...this.uAgua,
        uColorAgua: { value: colorAgua },
        uColorProfundo: { value: colorProfundo },
        uBrillo: { value: brillo },
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      },
      fog: true,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPos = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTiempo; uniform vec3 uColorAgua; uniform vec3 uColorProfundo; uniform vec3 uCielo;
        uniform vec3 uSolDir; uniform vec3 uSolColor; uniform float uBrillo;
        varying vec3 vPos;
        #include <fog_pars_fragment>
        float hs(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float ns(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y);
        }
        float olas(vec2 q) { return ns(q) + 0.5 * ns(q * 2.3 + vec2(-uTiempo * 0.12, 0.0)) + 0.25 * ns(q * 5.1 + uTiempo * 0.2); }
        void main() {
          vec2 q = vPos.xz * 0.42 + vec2(0.0, uTiempo * 0.32);
          float e = 0.12;
          float a = olas(q);
          vec3 N = normalize(vec3((a - olas(q + vec2(e, 0.0))) * 0.75, 1.0, (a - olas(q + vec2(0.0, e))) * 0.75));
          vec3 V = normalize(cameraPosition - vPos);
          vec3 col;
          if (cameraPosition.y < vPos.y) {
            // Desde abajo: superficie luminosa y difusa, con la ventana de Snell insinuada.
            float mira = pow(max(dot(-N, V), 0.0), 2.0);
            col = mix(uColorProfundo, uCielo * 0.75 + uSolColor * 0.15, mira * 0.65);
          } else {
            float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
            vec3 R = reflect(-V, N);
            float s = max(dot(R, normalize(uSolDir)), 0.0);
            float spec = pow(s, 220.0) * 2.4 + pow(s, 24.0) * 0.22;
            col = mix(uColorAgua, uCielo, clamp(fres * 0.7 + 0.03, 0.0, 1.0)) + uSolColor * spec * uBrillo;
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
  }

  private crearParticulas(n: number, r: () => number, color: THREE.Color, tam: number, brillo: boolean, tamExtra: number) {
    const p = new Float32Array(n * 3);
    const fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = -34 + r() * 66;
      const fondo = brillo ? Math.pow(r(), 1.8) : r();
      p.set([rioX(z) + (r() - 0.5) * RIO_SEMIANCHO * 1.8, NIVEL_AGUA - 3.1 + fondo * 2.9, z], i * 3);
      fase[i] = r() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { ...this.uParticulas, uColor: { value: color }, uTam: { value: tam * tamExtra }, uBrillo: { value: brillo ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
      blending: brillo ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */ `
        uniform float uTiempo; uniform float uEscala; uniform float uTam; uniform float uBrillo;
        attribute float aFase; varying float vA;
        void main() {
          vec3 p = position;
          p.x += sin(uTiempo * 0.3 + aFase) * 0.25;
          p.y += sin(uTiempo * 0.45 + aFase * 1.7) * 0.18;
          p.z += sin(uTiempo * 0.2 + aFase * 0.6) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = -mv.z;
          gl_PointSize = max(1.0, uTam * uEscala / d);
          float tit = uBrillo > 0.5 ? 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTiempo * 2.3 + aFase * 3.1), 3.0) : 0.7;
          vA = tit * (1.0 - smoothstep(9.0, 22.0, d));
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          gl_FragColor = vec4(uColor, vA * smoothstep(0.5, 0.15, r));
          #include <colorspace_fragment>
        }`,
    });
    this.disposables.push(g, m);
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }

  private texturaRayo() {
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 128;
    const g = cv.getContext('2d')!;
    const lin = g.createLinearGradient(0, 0, 0, 128);
    lin.addColorStop(0, 'rgba(255,255,255,0.9)');
    lin.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lin;
    g.fillRect(0, 0, 32, 128);
    const lat = g.createLinearGradient(0, 0, 32, 0);
    lat.addColorStop(0, 'rgba(0,0,0,1)');
    lat.addColorStop(0.5, 'rgba(0,0,0,0)');
    lat.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = lat;
    g.fillRect(0, 0, 32, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /** Mezcla de ambientes: 0 = tarde, 1 = altura (ascenso). `amanecer` 0..1 domina si > 0. */
  setAmbiente(altitud: number, amanecer: number) {
    const a = this.ambienteActual;
    const mezcla = (k: keyof Ambiente) => {
      const base = TARDE[k] as THREE.Color;
      (a[k] as THREE.Color).copy(base).lerp(ALTURA[k] as THREE.Color, altitud).lerp(AMANECER[k] as THREE.Color, amanecer);
    };
    (['zenit', 'horizonte', 'suelo', 'solColor', 'niebla', 'hemiCielo', 'hemiSuelo', 'luzColor', 'agua'] as const).forEach(mezcla);
    a.sol.copy(TARDE.sol).lerp(AMANECER.sol, amanecer).normalize();
    a.densidad = lerp(lerp(TARDE.densidad, ALTURA.densidad, altitud), AMANECER.densidad, amanecer);
    a.hemiI = lerp(lerp(TARDE.hemiI, ALTURA.hemiI, altitud), AMANECER.hemiI, amanecer);
    a.luzI = lerp(lerp(TARDE.luzI, ALTURA.luzI, altitud), AMANECER.luzI, amanecer);
    this.mineria.visible = amanecer < 0.5;
    this.aplicarAmbiente(a);
  }

  private aplicarAmbiente(a: Ambiente) {
    this.uCielo.uZenit.value.copy(a.zenit);
    this.uCielo.uHorizonte.value.copy(a.horizonte);
    this.uCielo.uSuelo.value.copy(a.suelo);
    this.uCielo.uSolDir.value.copy(a.sol);
    this.uCielo.uSolColor.value.copy(a.solColor);
    this.uAgua.uCielo.value.copy(a.horizonte).lerp(a.zenit, 0.25);
    this.hemi.color.copy(a.hemiCielo);
    this.hemi.groundColor.copy(a.hemiSuelo);
    this.hemi.intensity = a.hemiI;
    this.sol.color.copy(a.luzColor);
    this.sol.intensity = a.luzI;
    this.sol.position.copy(a.sol).multiplyScalar(100);
    this.niebla.color.copy(a.niebla);
    this.niebla.density = a.densidad;
  }

  update(camara: THREE.Camera, tiempo: number, dt: number, verSubmarino: boolean, verAves: boolean, escalaPx: number) {
    this.uAgua.uTiempo.value = tiempo;
    this.uParticulas.uTiempo.value = tiempo;
    this.uParticulas.uEscala.value = escalaPx;
    this.cielo.position.copy(camara.position);

    this.bajoAgua = camara.position.y < NIVEL_AGUA;
    if (this.bajoAgua) {
      this.niebla.color.copy(NIEBLA_AGUA);
      this.niebla.density = 0.062;
    }
    this.cielo.visible = !this.bajoAgua;

    this.submarino.visible = verSubmarino;
    if (verSubmarino) {
      this.datosPeces.forEach((p, i) => {
        p.z -= p.v * dt;
        if (p.z < -30) p.z += 58;
        const x = rioX(p.z) + p.x + Math.sin(tiempo * 0.7 + p.f) * p.amp;
        const y = p.y + Math.sin(tiempo * 0.9 + p.f * 2) * 0.12;
        const giro = Math.sin(tiempo * 6 * p.v + p.f) * 0.18; // aleteo
        this.tmp.position.set(x, y, p.z);
        this.tmp.rotation.set(0, Math.PI / 2 + giro + (rioX(p.z - 1) - rioX(p.z)) * 0.8, 0);
        this.tmp.scale.setScalar(1.1 + (i % 5) * 0.16);
        this.tmp.updateMatrix();
        this.peces.setMatrixAt(i, this.tmp.matrix);
      });
      this.peces.instanceMatrix.needsUpdate = true;
      this.rayos.forEach((m, i) => {
        m.rotation.z = 0.2 + Math.sin(tiempo * 0.4 + i) * 0.08;
      });
    }

    this.aves.visible = verAves;
    if (verAves) {
      const arr = (this.aves.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      this.datosAves.forEach((a, i) => {
        a.z -= a.v * dt * 0.6;
        a.x += Math.sin(tiempo * 0.2 + a.f) * dt * 0.4;
        if (a.z < -140) a.z = -70;
        const ala = Math.sin(tiempo * 7 + a.f) * 0.32;
        const o = i * 12;
        arr.set([a.x - a.e, a.y + ala, a.z, a.x, a.y, a.z, a.x, a.y, a.z, a.x + a.e, a.y + ala, a.z], o);
      });
      this.aves.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
