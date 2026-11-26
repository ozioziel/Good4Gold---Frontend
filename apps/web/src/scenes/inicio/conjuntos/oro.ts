import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { type Calidad, hi } from '../../comun/calidad';
import { azar, banda, clamp01, easeInOut, easeOut, suave } from '../../comun/util';

/**
 * Escenas 1 y 2.
 * 1 — Gotas de oro líquido se funden en un lingote que flota sobre un río oscuro, de noche, con la línea
 *     del bosque al fondo. El agua refleja el oro: el valor visible.
 * 2 — Al girar la cámara se ve lo que cae del lingote: gotas de mercurio que caen al río y abren ondas.
 *     Una etiqueta DOM («Mercurio (Hg)») explica qué es. El costo oculto del oro llega al agua.
 * El lingote nace como elipsoide (igual que las gotas) y se asienta en su forma con un morph target.
 */
export const NIVEL_RIO = -0.85;
const MAX_GOTAS = 18;
const MAX_ONDAS = 8;

interface Gota {
  x: number;
  z: number;
  y: number;
  v: number;
  fase: 'espera' | 'crece' | 'cae';
  t: number;
  espera: number;
}

export class ConjuntoOro {
  readonly grupo = new THREE.Group();
  readonly lingote: THREE.Mesh;
  /** Punto de anclaje de la etiqueta «Mercurio (Hg)», en el mundo. */
  readonly anclaHg = new THREE.Vector3(0.62, -0.5, 0.25);

  private gotasOro: MarchingCubes;
  private semillas: { x: number; y: number; z: number; fase: number; vel: number }[] = [];
  private mercurio: THREE.InstancedMesh;
  private gotas: Gota[] = [];
  private espejo: Reflector;
  private uAgua = {
    uTiempo: { value: 0 },
    uOndas: { value: Array.from({ length: MAX_ONDAS }, () => new THREE.Vector4(0, 0, -99, 0)) },
  };
  private ondaSig = 0;
  private uPolvo = { uTiempo: { value: 0 }, uEscala: { value: 1 }, uFuerza: { value: 1 } };
  private brillo: THREE.Sprite;
  private disposables: { dispose(): void }[] = [];
  private inclinacion = new THREE.Vector2();
  private tmp = new THREE.Object3D();
  private azar = azar(31);

  constructor(calidad: Calidad, anchoPx: number, altoPx: number) {
    const r = azar(11);

    // Oro: metal con un satinado leve. Sin barniz: el barniz refleja en blanco y «platea» el oro.
    const matOro = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#e7b04a'),
      metalness: 1,
      roughness: 0.24,
      envMapIntensity: 0.95,
    });
    this.disposables.push(matOro);

    // ---- Gotas de oro líquido (marching cubes) ----
    this.gotasOro = new MarchingCubes(hi(calidad, 52, 36), matOro, false, false, hi(calidad, 60000, 28000));
    this.gotasOro.scale.setScalar(1.45);
    this.gotasOro.isolation = 80;
    this.grupo.add(this.gotasOro);
    const n = hi(calidad, 9, 7);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r() * 0.6;
      const rad = 0.24 + r() * 0.12;
      this.semillas.push({
        x: Math.cos(ang) * rad,
        y: (r() - 0.5) * 0.22,
        z: Math.sin(ang) * rad * 0.7,
        fase: r() * Math.PI * 2,
        vel: 0.6 + r() * 0.6,
      });
    }

    // ---- Lingote: trapecio extruido, con conicidad en ambos ejes y morph hacia un elipsoide ----
    const forma = new THREE.Shape();
    const ab = 0.62;
    const ar = 0.47;
    const al = 0.5;
    forma.moveTo(-ab, 0);
    forma.lineTo(ab, 0);
    forma.lineTo(ar, al);
    forma.lineTo(-ar, al);
    forma.closePath();
    const geo = new THREE.ExtrudeGeometry(forma, {
      depth: 2.3,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: hi(calidad, 5, 3),
      curveSegments: 1,
      steps: 6,
    });
    geo.translate(0, -al / 2, -1.15);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 - 0.09 * ((pos.getY(i) + al / 2) / al);
      pos.setZ(i, pos.getZ(i) * k);
    }
    geo.computeVertexNormals();
    const radios = new THREE.Vector3(0.95, 0.42, 1.25);
    const pElip = new Float32Array(pos.count * 3);
    const nElip = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).divide(radios).normalize();
      const nx = v.x / radios.x;
      const ny = v.y / radios.y;
      const nz = v.z / radios.z;
      v.multiply(radios);
      pElip.set([v.x, v.y, v.z], i * 3);
      const l = Math.hypot(nx, ny, nz) || 1;
      nElip.set([nx / l, ny / l, nz / l], i * 3);
    }
    geo.morphAttributes.position = [new THREE.BufferAttribute(pElip, 3)];
    geo.morphAttributes.normal = [new THREE.BufferAttribute(nElip, 3)];
    geo.rotateY(Math.PI / 2);
    this.lingote = new THREE.Mesh(geo, matOro);
    this.lingote.morphTargetInfluences = [1];
    this.lingote.visible = false;
    this.grupo.add(this.lingote);
    this.disposables.push(geo);

    // ---- Río oscuro: espejo real (Reflector) con ondas y desvanecido hacia la noche ----
    const factor = hi(calidad, 0.7, 0.45);
    const geoRio = new THREE.PlaneGeometry(80, 80);
    this.espejo = new Reflector(geoRio, {
      color: new THREE.Color('#a49d8c'),
      textureWidth: Math.round(anchoPx * factor),
      textureHeight: Math.round(altoPx * factor),
      clipBias: 0.003,
      multisample: calidad === 'alta' ? 4 : 0,
      shader: {
        name: 'RioOscuro',
        uniforms: {
          color: { value: null },
          tDiffuse: { value: null },
          textureMatrix: { value: null },
          ...this.uAgua,
        },
        vertexShader: /* glsl */ `
          uniform mat4 textureMatrix;
          varying vec4 vUv;
          varying vec3 vPos;
          void main() {
            vUv = textureMatrix * vec4(position, 1.0);
            vPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 color; uniform sampler2D tDiffuse;
          uniform float uTiempo; uniform vec4 uOndas[${MAX_ONDAS}];
          varying vec4 vUv; varying vec3 vPos;
          void main() {
            vec2 desvio = vec2(0.0);
            float anillo = 0.0;
            for (int i = 0; i < ${MAX_ONDAS}; i++) {
              vec4 o = uOndas[i];
              float edad = uTiempo - o.z;
              if (o.w <= 0.0 || edad < 0.0 || edad > 4.0) continue;
              vec2 dxy = vPos.xz - o.xy;
              float d = length(dxy);
              float r = edad * 0.5;
              float w = sin((d - r) * 30.0) * exp(-abs(d - r) * 9.0) * exp(-edad * 1.15) * o.w;
              desvio += dxy / max(d, 1e-3) * w;
              anillo += abs(w);
            }
            // Corriente lenta: el río no es un espejo perfecto.
            desvio += vec2(sin(vPos.x * 1.4 + uTiempo * 0.5), cos(vPos.z * 1.1 + uTiempo * 0.4)) * 0.05;
            vec4 uv = vUv;
            uv.xy += desvio * 0.035 * uv.w;
            vec3 refl = texture2DProj(tDiffuse, uv).rgb * color;
            float cerca = exp(-length(vPos.xz - vec2(0.0, -0.6)) * 0.085);
            vec3 noche = vec3(0.018, 0.02, 0.017);
            vec3 col = mix(noche, refl * 0.82 + noche, cerca);
            col += vec3(0.78, 0.82, 0.86) * anillo * 0.09 * cerca;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      },
    });
    this.espejo.rotation.x = -Math.PI / 2;
    this.espejo.position.y = NIVEL_RIO;
    this.grupo.add(this.espejo);
    this.disposables.push(geoRio, this.espejo.getRenderTarget(), this.espejo.material as THREE.Material);

    // ---- Cielo nocturno con horizonte cálido (el resplandor del oro) ----
    const geoCielo = new THREE.SphereGeometry(70, 32, 16);
    const matCielo = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: /* glsl */ `
        varying vec3 vD;
        void main() {
          float h = vD.y;
          vec3 cenit = vec3(0.012, 0.014, 0.013);
          vec3 horizonte = vec3(0.085, 0.07, 0.045);
          vec3 c = mix(horizonte, cenit, smoothstep(-0.02, 0.38, h));
          c += vec3(0.16, 0.11, 0.04) * exp(-pow(h * 9.0, 2.0)) * smoothstep(-0.6, 0.2, -vD.z);
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.grupo.add(new THREE.Mesh(geoCielo, matCielo));
    this.disposables.push(geoCielo, matCielo);

    // ---- Línea del bosque amazónico al fondo, recortada contra el horizonte ----
    const texBosque = this.texturaBosque(r);
    const matBosque = new THREE.MeshBasicMaterial({ map: texBosque, transparent: true, depthWrite: false, toneMapped: false });
    const bosque = new THREE.Mesh(new THREE.PlaneGeometry(260, 7), matBosque);
    bosque.position.set(0, NIVEL_RIO + 2.9, -50);
    this.grupo.add(bosque);
    const bosque2 = new THREE.Mesh(new THREE.PlaneGeometry(240, 4.6), matBosque);
    bosque2.position.set(0, NIVEL_RIO + 1.9, -36);
    bosque2.scale.x = -1;
    this.grupo.add(bosque2);
    this.disposables.push(texBosque, matBosque, bosque.geometry, bosque2.geometry);

    // ---- Resplandor detrás del lingote ----
    const texBrillo = this.texturaBrillo();
    const matBrillo = new THREE.SpriteMaterial({
      map: texBrillo,
      color: new THREE.Color('#e2b25c'),
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.brillo = new THREE.Sprite(matBrillo);
    this.brillo.position.set(0, 0.25, -5);
    this.brillo.scale.set(11, 7, 1);
    this.grupo.add(this.brillo);
    this.disposables.push(texBrillo, matBrillo);

    // ---- Polvo dorado en suspensión (bokeh) ----
    const nP = hi(calidad, 420, 180);
    const pp = new Float32Array(nP * 3);
    const fp = new Float32Array(nP);
    for (let i = 0; i < nP; i++) {
      pp.set([(r() - 0.5) * 12, NIVEL_RIO + 0.2 + r() * 4, -7 + r() * 10], i * 3);
      fp[i] = r() * 100;
    }
    const geoPolvo = new THREE.BufferGeometry();
    geoPolvo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    geoPolvo.setAttribute('aFase', new THREE.BufferAttribute(fp, 1));
    const matPolvo = new THREE.ShaderMaterial({
      uniforms: this.uPolvo,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTiempo; uniform float uEscala; attribute float aFase; varying float vA;
        void main() {
          vec3 p = position;
          p.y += mod(uTiempo * 0.06 + aFase, 4.0) - 2.0;
          p.x += sin(uTiempo * 0.3 + aFase) * 0.25;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float tam = 0.018 + fract(aFase * 3.7) * 0.03;
          gl_PointSize = max(1.0, tam * uEscala / -mv.z);
          vA = (0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTiempo * 1.3 + aFase * 5.0), 2.0)) * smoothstep(0.6, 2.5, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uFuerza; varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(1.0, 0.82, 0.48), vA * uFuerza * smoothstep(0.5, 0.0, r) * 0.6);
        }`,
    });
    const polvo = new THREE.Points(geoPolvo, matPolvo);
    polvo.frustumCulled = false;
    this.grupo.add(polvo);
    this.disposables.push(geoPolvo, matPolvo);

    // ---- Gotas de mercurio: plata líquida que cae del lingote al río ----
    const geoGota = new THREE.SphereGeometry(1, 20, 14);
    const matHg = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#dde3e6'), metalness: 1, roughness: 0.05, envMapIntensity: 1.3 });
    this.mercurio = new THREE.InstancedMesh(geoGota, matHg, MAX_GOTAS);
    this.mercurio.frustumCulled = false;
    for (let i = 0; i < MAX_GOTAS; i++) {
      this.gotas.push({ x: 0, z: 0, y: 0, v: 0, fase: 'espera', t: 0, espera: r() * 1.6 });
      this.tmp.scale.setScalar(0);
      this.tmp.updateMatrix();
      this.mercurio.setMatrixAt(i, this.tmp.matrix);
    }
    this.grupo.add(this.mercurio);
    this.disposables.push(geoGota, matHg);

    // Luces propias del estudio del oro (el entorno PMREM da los reflejos; estas, el modelado).
    const clave = new THREE.DirectionalLight('#ffe2b0', 2.2);
    clave.position.set(2.5, 3.5, 3);
    const contra = new THREE.DirectionalLight('#a9c2d1', 1.4);
    contra.position.set(-3, 1.5, -4);
    const rel = new THREE.PointLight('#ffd27a', 5, 5, 2);
    rel.position.set(0, -0.6, 1.2);
    this.grupo.add(clave, contra, rel);
  }

  private texturaBosque(r: () => number) {
    const cv = document.createElement('canvas');
    cv.width = 2048;
    cv.height = 128;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#0b0d0a';
    // Dosel: muchas copas pequeñas y, de vez en cuando, un árbol emergente más alto (perfil de selva amazónica).
    for (let x = -10; x < 2058; x += 3 + r() * 7) {
      const emergente = r() < 0.05;
      const alto = 40 + r() * 18 + (emergente ? 34 + r() * 16 : 0);
      const rad = emergente ? 9 + r() * 7 : 4 + r() * 7;
      g.beginPath();
      g.ellipse(x, 128 - alto, rad * (emergente ? 1.5 : 1.25), rad * (emergente ? 0.85 : 1), 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - (emergente ? 1.2 : rad), 128 - alto, emergente ? 2.4 : rad * 2, alto);
    }
    // Neblina sobre la base del bosque.
    const neb = g.createLinearGradient(0, 64, 0, 128);
    neb.addColorStop(0, 'rgba(46,40,28,0)');
    neb.addColorStop(1, 'rgba(46,40,28,0.9)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = neb;
    g.fillRect(0, 0, 2048, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(2, 1); // los planos miden ~250 u: se repite para no estirar las copas
    return t;
  }

  private texturaBrillo() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d')!;
    const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rad.addColorStop(0, 'rgba(255,255,255,1)');
    rad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  resize(anchoPx: number, altoPx: number, calidad: Calidad) {
    const f = hi(calidad, 0.7, 0.45);
    this.espejo.getRenderTarget().setSize(Math.round(anchoPx * f), Math.round(altoPx * f));
  }

  setInclinacion(x: number, y: number) {
    this.inclinacion.set(x, y);
  }

  private onda(x: number, z: number, tiempo: number, fuerza: number) {
    this.uAgua.uOndas.value[this.ondaSig].set(x, z, tiempo, fuerza);
    this.ondaSig = (this.ondaSig + 1) % MAX_ONDAS;
  }

  /**
   * @param intro 0..1 progreso de la fusión inicial (por tiempo, no por scroll)
   * @param t tiempo de recorrido (0..6)
   */
  update(intro: number, t: number, tiempo: number, dt: number, escalaPx: number) {
    this.uAgua.uTiempo.value = tiempo;
    this.uPolvo.uTiempo.value = tiempo;
    this.uPolvo.uEscala.value = escalaPx;

    // --- Fusión del oro ---
    const juntar = easeInOut(clamp01(intro / 0.62));
    const fundir = suave(0.42, 0.78, intro);
    const asentar = suave(0.55, 1, intro);
    const gotasVivas = fundir < 0.999;
    this.gotasOro.visible = gotasVivas;
    const flota = Math.sin(tiempo * 0.9) * 0.035 * asentar;
    if (gotasVivas) {
      this.gotasOro.reset();
      const n = this.semillas.length;
      const fuerza = (1.2 / ((Math.sqrt(n) - 1) / 4 + 1)) * (1 - fundir * 0.92);
      for (const s of this.semillas) {
        const f = 1 - juntar;
        this.gotasOro.addBall(
          0.5 + s.x * f + Math.sin(tiempo * s.vel + s.fase) * 0.035 * f,
          0.5 + s.y * f + Math.cos(tiempo * s.vel * 0.8 + s.fase) * 0.03 * f,
          0.5 + s.z * f + Math.sin(tiempo * s.vel * 0.6 + s.fase * 2) * 0.03 * f,
          fuerza,
          12,
        );
      }
      this.gotasOro.update();
    }
    this.lingote.visible = fundir > 0.001;
    const crecer = easeOut(fundir);
    const rebote = Math.sin(asentar * Math.PI * 2.5) * (1 - asentar) * 0.06;
    this.lingote.scale.set(0.55 + 0.45 * crecer, (0.55 + 0.45 * crecer) * (1 - rebote), 0.55 + 0.45 * crecer);
    this.lingote.morphTargetInfluences![0] = 1 - easeInOut(asentar);
    this.lingote.position.y = flota;
    const k = 1 - Math.exp(-dt * 3);
    this.lingote.rotation.x += (this.inclinacion.y * 0.1 - this.lingote.rotation.x) * k;
    this.lingote.rotation.y += (this.inclinacion.x * 0.16 + 0.08 - this.lingote.rotation.y) * k;
    this.gotasOro.position.y = flota;
    this.brillo.material.opacity = 0.34 * (1 - suave(1.2, 1.5, t));

    // --- Mercurio: gotea solo en la escena 2 (y un poco antes, para que la cámara lo encuentre) ---
    const goteo = banda(t, 0.62, 0.92, 1.62, 1.75);
    const fondo = flota - 0.3;
    this.gotas.forEach((g, i) => {
      if (g.fase === 'espera') {
        g.espera -= dt;
        if (g.espera <= 0 && goteo > 0.05 && this.azar() < goteo) {
          g.fase = 'crece';
          g.t = 0;
          g.x = (this.azar() - 0.5) * 1.9;
          g.z = (this.azar() - 0.5) * 0.6;
          g.y = fondo;
          g.v = 0;
        } else if (g.espera <= 0) {
          g.espera = 0.2 + this.azar() * 0.6;
        }
      } else if (g.fase === 'crece') {
        g.t += dt;
        if (g.t > 0.55) g.fase = 'cae';
      } else {
        g.v += 7.5 * dt;
        g.y -= g.v * dt;
        if (g.y <= NIVEL_RIO) {
          this.onda(g.x, g.z, tiempo, 1);
          g.fase = 'espera';
          g.espera = 0.15 + this.azar() * 0.9;
        }
      }
      const rad = g.fase === 'crece' ? 0.062 * easeOut(clamp01(g.t / 0.55)) : g.fase === 'cae' ? 0.056 : 0;
      this.tmp.position.set(g.x, g.fase === 'crece' ? g.y - rad * 0.7 : g.y, g.z);
      this.tmp.scale.set(rad, rad * (g.fase === 'cae' ? 1.35 : 1.15), rad);
      this.tmp.updateMatrix();
      this.mercurio.setMatrixAt(i, this.tmp.matrix);
    });
    this.mercurio.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.gotasOro.geometry.dispose();
    this.espejo.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
