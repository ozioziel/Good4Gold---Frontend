import * as THREE from 'three';
import { type Calidad, hi } from '../../comun/calidad';
import { azar } from '../../comun/util';
import type { Mascaras } from '../mascaras';
import { LOCALIDADES_BENI } from '@/data/localidades-beni';

/**
 * Escenas 4 y 5: la Tierra como globo de puntos (continentes de Natural Earth), Bolivia en oro y las
 * localidades reales de la cuenca del Beni como puntos de referencia. Anticipa el globo del Laboratorio
 * sin ejecutar sus análisis. Los puntos NO representan contaminación.
 */
export const RADIO = 10;
export const BOLIVIA_LAT = -16.3;
export const BOLIVIA_LON = -64.7;

const aVec = (lat: number, lon: number, r = RADIO, v = new THREE.Vector3()) => {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return v.set(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
};

export class ConjuntoGlobo {
  readonly grupo = new THREE.Group();
  /** Rota con el planeta (lat/lon); el grupo exterior queda fijo para la cámara. */
  readonly tierra = new THREE.Group();
  private uPuntos = { uTiempo: { value: 0 }, uEscala: { value: 1 }, uAparicion: { value: 0 } };
  private disposables: { dispose(): void }[] = [];
  private estrellas: THREE.Points;

  constructor(calidad: Calidad, mascaras: Mascaras | null) {
    this.grupo.add(this.tierra);
    const r = azar(3);

    // ---- Océano y atmósfera ----
    const geoMar = new THREE.SphereGeometry(RADIO * 0.992, 64, 48);
    const matMar = new THREE.MeshBasicMaterial({ color: '#0e1613' });
    this.tierra.add(new THREE.Mesh(geoMar, matMar));
    const geoAtm = new THREE.SphereGeometry(RADIO * 1.14, 64, 48);
    const matAtm = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#5f93ad') } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = pow(clamp(1.0 + dot(vN, vV) * 1.0, 0.0, 1.0), 3.2);
          gl_FragColor = vec4(uColor * f * 1.15, f);
        }`,
    });
    this.grupo.add(new THREE.Mesh(geoAtm, matAtm));
    this.disposables.push(geoMar, matMar, geoAtm, matAtm);

    // ---- Retícula sutil (paralelos y meridianos cada 30°) ----
    const lineas: number[] = [];
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lon = -180; lon < 180; lon += 4) {
        aVec(lat, lon, RADIO * 1.001, v1);
        aVec(lat, lon + 4, RADIO * 1.001, v2);
        lineas.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -88; lat < 88; lat += 4) {
        aVec(lat, lon, RADIO * 1.001, v1);
        aVec(lat + 4, lon, RADIO * 1.001, v2);
        lineas.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
    const geoRet = new THREE.BufferGeometry();
    geoRet.setAttribute('position', new THREE.Float32BufferAttribute(lineas, 3));
    const matRet = new THREE.LineBasicMaterial({ color: '#f3f0e4', transparent: true, opacity: 0.05, depthWrite: false });
    this.tierra.add(new THREE.LineSegments(geoRet, matRet));
    this.disposables.push(geoRet, matRet);

    // ---- Continentes: puntos sobre una esfera de Fibonacci filtrados por la máscara de tierra ----
    const N = hi(calidad, 46000, 22000);
    const pos: number[] = [];
    const tipo: number[] = []; // 0 tierra, 1 Bolivia, 2 localidad
    const fase: number[] = [];
    const oro = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const lat = THREE.MathUtils.radToDeg(Math.asin(y));
      const lon = THREE.MathUtils.radToDeg(((i * oro) % (Math.PI * 2)) - Math.PI);
      const boli = mascaras?.esBolivia(lat, lon) ?? false;
      const tierra = boli || (mascaras ? mascaras.esTierra(lat, lon) : Math.abs(lat) < 60 && Math.sin(lon * 0.05) > 0);
      if (!tierra) continue;
      aVec(lat, lon, RADIO * 1.004, v1);
      pos.push(v1.x, v1.y, v1.z);
      tipo.push(boli ? 1 : 0);
      fase.push(r() * 10);
    }
    // Bolivia con más densidad para que se lea como territorio y no como una mancha.
    if (mascaras) {
      for (let lat = -9.6; lat > -23; lat -= 0.32) {
        for (let lon = -69.7; lon < -57.4; lon += 0.32) {
          const la = lat + (r() - 0.5) * 0.2;
          const lo = lon + (r() - 0.5) * 0.2;
          if (!mascaras.esBolivia(la, lo)) continue;
          aVec(la, lo, RADIO * 1.005, v1);
          pos.push(v1.x, v1.y, v1.z);
          tipo.push(1);
          fase.push(r() * 10);
        }
      }
    }
    for (const l of LOCALIDADES_BENI) {
      aVec(l.lat, l.lon, RADIO * 1.012, v1);
      pos.push(v1.x, v1.y, v1.z);
      tipo.push(2);
      fase.push(r() * 10);
    }
    const geoP = new THREE.BufferGeometry();
    geoP.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geoP.setAttribute('aTipo', new THREE.Float32BufferAttribute(tipo, 1));
    geoP.setAttribute('aFase', new THREE.Float32BufferAttribute(fase, 1));
    const matP = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uPuntos,
        uTierra: { value: new THREE.Color('#e9e3cc') },
        uOro: { value: new THREE.Color('#e2b75a') },
        uLocal: { value: new THREE.Color('#fff3cf') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTiempo; uniform float uEscala; uniform float uAparicion;
        attribute float aTipo; attribute float aFase;
        varying float vA; varying float vTipo;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vec3 n = normalize(wp.xyz);
          vec3 v = normalize(cameraPosition - wp.xyz);
          float cara = dot(n, v);
          vec4 mv = viewMatrix * wp;
          gl_Position = projectionMatrix * mv;
          float tam = aTipo > 1.5 ? 0.16 : (aTipo > 0.5 ? 0.075 : 0.052);
          float pulso = aTipo > 1.5 ? 1.0 + 0.35 * sin(uTiempo * 2.2 + aFase) : 1.0;
          gl_PointSize = max(1.0, tam * pulso * uEscala / -mv.z);
          // Aparición escalonada: los puntos se encienden poco a poco al llegar al espacio.
          float barrido = smoothstep(aFase * 0.06, aFase * 0.06 + 0.35, uAparicion * 1.0);
          vA = smoothstep(-0.05, 0.35, cara) * barrido * (aTipo > 0.5 ? 1.0 : 0.62);
          vTipo = aTipo;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTierra; uniform vec3 uOro; uniform vec3 uLocal;
        varying float vA; varying float vTipo;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          vec3 c = vTipo > 1.5 ? uLocal : (vTipo > 0.5 ? uOro : uTierra);
          float halo = vTipo > 1.5 ? smoothstep(0.5, 0.0, r) : smoothstep(0.5, 0.2, r);
          gl_FragColor = vec4(c, vA * halo);
          #include <colorspace_fragment>
        }`,
    });
    const puntos = new THREE.Points(geoP, matP);
    puntos.frustumCulled = false;
    this.tierra.add(puntos);
    this.disposables.push(geoP, matP);

    // ---- Estrellas lejanas ----
    const nE = hi(calidad, 2400, 1100);
    const pe = new Float32Array(nE * 3);
    const fe = new Float32Array(nE);
    for (let i = 0; i < nE; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = 260 + r() * 200;
      pe.set([s * Math.cos(th) * d, u * d, s * Math.sin(th) * d], i * 3);
      fe[i] = r() * 10;
    }
    const geoE = new THREE.BufferGeometry();
    geoE.setAttribute('position', new THREE.BufferAttribute(pe, 3));
    geoE.setAttribute('aFase', new THREE.BufferAttribute(fe, 1));
    const matE = new THREE.ShaderMaterial({
      uniforms: this.uPuntos,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTiempo; uniform float uAparicion; attribute float aFase; varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = 1.0 + fract(aFase * 7.3) * 1.6;
          vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTiempo * (0.6 + fract(aFase) * 1.4) + aFase))) * clamp(uAparicion * 1.5, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.95, 0.93, 0.86), vA * smoothstep(0.5, 0.0, r));
        }`,
    });
    this.estrellas = new THREE.Points(geoE, matE);
    this.estrellas.frustumCulled = false;
    this.grupo.add(this.estrellas);
    this.disposables.push(geoE, matE);
  }

  /** Orienta el planeta: `giro` 0..1 lleva desde el Atlántico hasta Bolivia de frente a +Z. */
  orientar(giro: number, deriva: number) {
    const lon = THREE.MathUtils.lerp(-18, BOLIVIA_LON, giro) + deriva;
    const lat = THREE.MathUtils.lerp(4, BOLIVIA_LAT, giro);
    this.tierra.rotation.set(THREE.MathUtils.degToRad(lat), THREE.MathUtils.degToRad(-lon), 0, 'XYZ');
  }

  update(tiempo: number, aparicion: number, escalaPx: number, camara: THREE.Camera) {
    this.uPuntos.uTiempo.value = tiempo;
    this.uPuntos.uAparicion.value = aparicion;
    this.uPuntos.uEscala.value = escalaPx;
    this.estrellas.position.copy(camara.position);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
