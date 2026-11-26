import * as THREE from 'three';
import { type Calidad, dprPara } from '../comun/calidad';
import { lerp, suave } from '../comun/util';
import { ConjuntoOro, NIVEL_RIO } from './conjuntos/oro';
import { ConjuntoPaisaje, NIVEL_AGUA, rioX } from './conjuntos/paisaje';
import { ConjuntoGlobo } from './conjuntos/globo';
import type { Mascaras } from './mascaras';
import { crearEstudio } from './estudio';

/**
 * Escena única del Inicio. Todo depende del tiempo de recorrido `t` (0..6, un capítulo por unidad):
 * cámara, conjunto visible, ambiente y velos. Así el recorrido es reversible y no depende de la
 * velocidad del scroll. React no participa en el render por cuadro.
 *
 *   0 ─ Oro: gotas → lingote          3 ─ Ascenso → globo (Bolivia)
 *   1 ─ Mercurio → paisaje minero     4 ─ Globo de fondo + paneles (DOM)
 *   2 ─ Río: superficie → bajo el agua 5 ─ Amanecer sobre el río
 */
export const T_FIN = 6;

/** Cortes entre conjuntos: cada uno queda tapado por un velo DOM (ver Recorrido.velo). */
export const CORTES = { oroPaisaje: 1.585, paisajeGlobo: 3.62, globoAmanecer: 5.07 } as const;

type Fase = 'oro' | 'paisaje' | 'globo' | 'amanecer';

interface Clave {
  t: number;
  pos: [number, number, number];
  mira: [number, number, number];
}

const v3 = (x: number, y: number, z: number): [number, number, number] => [x, y, z];
const rio = (z: number, y: number, dx = 0) => v3(rioX(z) + dx, y, z);

// Recorrido de cámara por el paisaje (escenas 2 y 3 y el ascenso de la 4).
const CLAVES_PAISAJE: Clave[] = [
  { t: 1.56, pos: rio(66, 36, -42), mira: rio(-14, 0, 14) },
  { t: 1.82, pos: rio(54, 29, -34), mira: rio(-12, 0, 12) },
  { t: 2.04, pos: rio(40, 15, -14), mira: rio(-6, 0, 6) },
  { t: 2.26, pos: rio(24, NIVEL_AGUA + 1.6, -1), mira: rio(10, NIVEL_AGUA + 0.2) },
  { t: 2.38, pos: rio(18, NIVEL_AGUA - 1.5), mira: rio(6, NIVEL_AGUA - 2.1) },
  { t: 2.7, pos: rio(6, NIVEL_AGUA - 1.7), mira: rio(-6, NIVEL_AGUA - 2.0) },
  { t: 2.98, pos: rio(-6, NIVEL_AGUA - 1.4), mira: rio(-18, NIVEL_AGUA - 1.2) },
  { t: 3.1, pos: rio(-12, NIVEL_AGUA + 2.4), mira: rio(-28, NIVEL_AGUA + 3.2) },
  { t: 3.36, pos: rio(-24, 42), mira: rio(-62, 22) },
  { t: 3.62, pos: rio(-30, 130), mira: rio(-44, 420, -6) },
];

// Amanecer (escena 6): río abajo, de cara al sol naciente.
const CLAVES_AMANECER: Clave[] = [
  { t: 5.05, pos: rio(-36, 13), mira: rio(-96, 2.5) },
  { t: 5.5, pos: rio(-44, 9.5), mira: rio(-104, 2) },
  { t: 6.0, pos: rio(-54, 7.2), mira: rio(-116, 1.6) },
];

class Ruta {
  private pos: THREE.CatmullRomCurve3;
  private mira: THREE.CatmullRomCurve3;
  constructor(private claves: Clave[]) {
    this.pos = new THREE.CatmullRomCurve3(claves.map((c) => new THREE.Vector3(...c.pos)), false, 'centripetal');
    this.mira = new THREE.CatmullRomCurve3(claves.map((c) => new THREE.Vector3(...c.mira)), false, 'centripetal');
  }
  /** Parámetro de curva para t: tramos uniformes entre claves, interpolación lineal dentro del tramo. */
  private u(t: number) {
    const c = this.claves;
    if (t <= c[0].t) return 0;
    if (t >= c[c.length - 1].t) return 1;
    let i = 0;
    while (i < c.length - 2 && t > c[i + 1].t) i++;
    const local = (t - c[i].t) / (c[i + 1].t - c[i].t);
    return (i + local) / (c.length - 1);
  }
  en(t: number, pos: THREE.Vector3, mira: THREE.Vector3) {
    const u = this.u(t);
    this.pos.getPoint(u, pos);
    this.mira.getPoint(u, mira);
  }
}

export interface OpcionesEscena {
  canvas: HTMLCanvasElement;
  calidad: Calidad;
  mascaras: Mascaras | null;
}

export class EscenaInicio {
  readonly renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(42, 1, 0.05, 2000);
  private oro: ConjuntoOro;
  private paisaje: ConjuntoPaisaje;
  private globo: ConjuntoGlobo;
  private rutaPaisaje = new Ruta(CLAVES_PAISAJE);
  private rutaAmanecer = new Ruta(CLAVES_AMANECER);
  private entorno: THREE.Texture;
  private pos = new THREE.Vector3();
  private mira = new THREE.Vector3();
  private fondoOro = new THREE.Color('#181a17');
  private fondoEspacio = new THREE.Color('#05070a');
  private ancho = 1;
  private alto = 1;
  private fase: Fase | null = null;

  constructor(private o: OpcionesEscena) {
    // Si WebGL falla, el constructor lanza y Recorrido muestra la versión ligera.
    this.renderer = new THREE.WebGLRenderer({
      canvas: o.canvas,
      antialias: o.calidad === 'alta',
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(dprPara(o.calidad));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;

    this.entorno = crearEstudio(this.renderer);
    this.escena.environment = this.entorno;

    const pr = this.renderer.getPixelRatio();
    this.oro = new ConjuntoOro(o.calidad, innerWidth * pr, innerHeight * pr);
    this.paisaje = new ConjuntoPaisaje(o.calidad);
    this.globo = new ConjuntoGlobo(o.calidad, o.mascaras);
    this.escena.add(this.oro.grupo, this.paisaje.grupo, this.globo.grupo);
    this.resize();
  }

  resize() {
    const w = this.o.canvas.clientWidth || innerWidth;
    const h = this.o.canvas.clientHeight || innerHeight;
    if (w === this.ancho && h === this.alto) return;
    this.ancho = w;
    this.alto = h;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    this.oro.resize(w * pr, h * pr, this.o.calidad);
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
  }

  private get vertical() {
    return this.ancho / this.alto < 0.85;
  }

  /** Desplaza el encuadre (no la cámara) para dejar sitio al texto: a la derecha en escritorio, arriba en vertical. */
  private encuadre(dx: number, dy: number) {
    const w = this.ancho;
    const h = this.alto;
    if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) {
      this.camara.clearViewOffset();
    } else {
      this.camara.setViewOffset(w, h, -dx * w, dy * h, w, h);
    }
  }

  private setFase(f: Fase) {
    if (f === this.fase) return;
    this.fase = f;
    this.oro.grupo.visible = f === 'oro';
    this.paisaje.grupo.visible = f === 'paisaje' || f === 'amanecer';
    this.globo.grupo.visible = f === 'globo';
    this.escena.fog = this.paisaje.grupo.visible ? this.paisaje.niebla : null;
    this.escena.background = f === 'oro' ? this.fondoOro : f === 'globo' ? this.fondoEspacio : null;
  }

  setInclinacion(x: number, y: number) {
    this.oro.setInclinacion(x, y);
  }

  /** Dibuja el cuadro para el tiempo de recorrido `t`, la fusión inicial `intro` (0..1) y el reloj `tiempo`. */
  update(t: number, intro: number, tiempo: number, dt: number) {
    const fase: Fase =
      t < CORTES.oroPaisaje ? 'oro' : t < CORTES.paisajeGlobo ? 'paisaje' : t < CORTES.globoAmanecer ? 'globo' : 'amanecer';
    this.setFase(fase);
    const vert = this.vertical;
    this.camara.fov = vert ? 52 : 42;
    const escalaPx = (this.alto * this.renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camara.fov) / 2));

    if (fase === 'oro') {
      // 1: el lingote sobre el río, casi de frente. 2: la cámara gira y baja para ver lo que cae del lingote
      // (mercurio) y, al final, se acerca a la superficie donde caen las gotas.
      const giro = 0.22 * suave(0.05, 0.75, t) + 0.62 * suave(0.72, 1.12, t) + 0.08 * suave(1.12, 1.4, t);
      // En vertical el campo horizontal es estrecho: la cámara se aleja para que el lingote quepa entero.
      const base = vert ? 4.5 / Math.max(0.6, this.ancho / this.alto / 1.25) : 4.5;
      const radio = base * (1 + 0.08 * suave(0.72, 1.12, t));
      const y = lerp(vert ? 1.1 : 0.72, vert ? 0.75 : 0.5, suave(0.72, 1.12, t));
      this.pos.set(Math.sin(giro) * radio, y, Math.cos(giro) * radio);
      this.mira.set(0, -0.3 * suave(0.72, 1.12, t), 0);
      const entrar = suave(1.3, 1.585, t);
      if (entrar > 0) {
        const e = entrar * entrar;
        this.pos.lerp(new THREE.Vector3(0.7, NIVEL_RIO + 0.14, 1.1), e);
        this.mira.lerp(new THREE.Vector3(0.2, NIVEL_RIO, -0.5), e);
      }
      const dx = lerp(0.11, 0.05, suave(0.72, 1.12, t));
      const dy = lerp(0.1, 0.04, suave(0.72, 1.12, t));
      this.encuadre(vert ? 0 : dx * (1 - entrar), vert ? dy * (1 - entrar) : 0);
      this.oro.update(intro, t, tiempo, dt, escalaPx);
    } else if (fase === 'paisaje') {
      this.rutaPaisaje.en(t, this.pos, this.mira);
      this.encuadre(0, 0);
      this.paisaje.setAmbiente(suave(3.08, 3.6, t), 0);
    } else if (fase === 'globo') {
      // Llegada al espacio, giro hasta Bolivia, globo de fondo para los paneles y zambullida final.
      const llegar = suave(3.62, 4.0, t);
      const atras = suave(4.08, 4.45, t);
      const zambullir = suave(4.88, 5.07, t);
      let dist = lerp(78, vert ? 36 : 29, llegar);
      dist = lerp(dist, vert ? 44 : 34, atras);
      dist = lerp(dist, 13, zambullir * zambullir);
      this.pos.set(0, 0, dist);
      this.mira.set(0, 0, 0);
      this.globo.orientar(suave(3.62, 4.02, t), Math.sin(tiempo * 0.08) * 3);
      const lado = atras * (1 - zambullir);
      this.encuadre(vert ? 0 : 0.08 * llegar * (1 - atras) + 0.24 * lado, vert ? 0.14 * llegar + 0.12 * lado : 0);
      this.globo.update(tiempo, suave(3.6, 3.95, t), escalaPx, this.camara);
    } else {
      this.rutaAmanecer.en(t, this.pos, this.mira);
      this.encuadre(0, vert ? 0.06 : 0);
      this.paisaje.setAmbiente(0, 1);
    }

    this.camara.position.copy(this.pos);
    this.camara.lookAt(this.mira);
    this.camara.updateProjectionMatrix();
    if (this.paisaje.grupo.visible) {
      this.paisaje.update(this.camara, tiempo, dt, t > 2.2 && t < 3.12, fase === 'amanecer', escalaPx);
    }
    this.renderer.render(this.escena, this.camara);
  }

  /** Posición en pantalla (px CSS) de la etiqueta del mercurio, o null si no se ve. */
  puntoHg(): { x: number; y: number } | null {
    if (this.fase !== 'oro') return null;
    const p = this.oro.anclaHg.clone().project(this.camara);
    if (p.z > 1 || p.z < -1) return null;
    return { x: ((p.x + 1) / 2) * this.ancho, y: ((1 - p.y) / 2) * this.alto };
  }

  /** Captura el cuadro actual como imagen (para los pósteres de la versión ligera). */
  capturar(tipo = 'image/webp', calidad = 0.84) {
    return this.renderer.domElement.toDataURL(tipo, calidad);
  }

  dispose() {
    this.oro.dispose();
    this.paisaje.dispose();
    this.globo.dispose();
    this.entorno.dispose();
    this.renderer.dispose();
  }
}

export const capituloDe = (t: number) => Math.min(5, Math.max(0, Math.floor(t)));
