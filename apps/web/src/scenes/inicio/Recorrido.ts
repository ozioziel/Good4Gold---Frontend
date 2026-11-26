import type { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Calidad } from '../comun/calidad';
import { banda, clamp01 } from '../comun/util';
import type { Mascaras } from './mascaras';
import { EscenaInicio, T_FIN, capituloDe } from './EscenaInicio';

/**
 * Controlador del recorrido del Inicio.
 *
 * El recorrido avanza por PARADAS: cada gesto de scroll (rueda, deslizar, teclas) lleva la cámara
 * sola hasta el siguiente texto, con una transición continua. El usuario no tiene que «buscar» el
 * texto. Salidas siempre disponibles: «Saltar recorrido», puntos por capítulo y, tras la última parada,
 * el scroll vuelve a ser libre hacia las fuentes.
 *
 * scroll de la página → ScrollTrigger (progreso) → tiempo de recorrido `t` suavizado → escena, textos y velos.
 */
export interface OpcionesRecorrido {
  canvas: HTMLCanvasElement;
  pista: HTMLElement;
  capa: HTMLElement;
  velo: HTMLElement;
  calidad: Calidad;
  mascaras: Mascaras | null;
  onCapitulo: (i: number) => void;
}

/** Tiempos de recorrido donde se lee cada texto. La escena 2 tiene dos: el mercurio y el paisaje minero. */
export const PARADAS = [0.3, 1.16, 1.86, 2.7, 3.9, 4.62, 5.8];
/** Parada principal de cada capítulo (puntos del HUD). */
export const PARADA_DE_CAPITULO = [0, 1, 3, 4, 5, 6];

interface Banda {
  el: HTMLElement;
  b: [number, number, number, number];
  interactiva: boolean;
  ultimo: number;
  visible: boolean;
}

const VELOS: { b: [number, number, number, number]; color: string; max: number }[] = [
  { b: [1.44, 1.575, 1.6, 1.74], color: '#8f989c', max: 1 }, // de la superficie del río al paisaje
  { b: [2.3, 2.355, 2.37, 2.45], color: '#56664f', max: 0.5 }, // atravesar la superficie
  { b: [2.99, 3.03, 3.05, 3.12], color: '#8fa597', max: 0.45 }, // salir del agua
  { b: [3.48, 3.612, 3.63, 3.76], color: '#dfe9ee', max: 1 }, // atmósfera
  { b: [4.95, 5.062, 5.08, 5.22], color: '#f2c873', max: 1 }, // luz dorada del amanecer
];

const DURACION_INTRO = 2.7;

export class Recorrido {
  private t = 0;
  private objetivo = 0;
  private intro = 0;
  private tiempo = 0;
  private capitulo = -1;
  private bandas: Banda[] = [];
  private etiquetaHg: HTMLElement | null;
  private ultimoVelo = -1;
  private quitar: (() => void)[] = [];
  private lentos = 0;

  // Navegación por paradas
  private parada = 0;
  private viaje: gsap.core.Tween | null = null;
  private cola: number | null = null;
  private acumulado = 0;
  private ultimaRueda = 0;
  private toqueY: number | null = null;
  private quietoTimer = 0;

  private constructor(
    private o: OpcionesRecorrido,
    private escena: EscenaInicio,
    private gsap: typeof import('gsap').gsap,
    private st: ScrollTrigger,
  ) {
    this.etiquetaHg = o.capa.querySelector<HTMLElement>('[data-ancla="hg"]');
  }

  static async crear(o: OpcionesRecorrido): Promise<Recorrido> {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
    gsap.registerPlugin(ScrollTrigger);
    const escena = new EscenaInicio({ canvas: o.canvas, calidad: o.calidad, mascaras: o.mascaras });
    let rec: Recorrido | null = null;
    const st = ScrollTrigger.create({
      trigger: o.pista,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (s) => {
        if (rec) rec.objetivo = s.progress * T_FIN;
      },
    });
    rec = new Recorrido(o, escena, gsap, st);
    rec.iniciar();
    return rec;
  }

  private iniciar() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    this.objetivo = this.st.progress * T_FIN;
    this.t = this.objetivo;
    this.parada = this.paradaCercana(this.t);
    if (this.t > 0.3) this.intro = 1;

    this.o.capa.querySelectorAll<HTMLElement>('[data-banda]').forEach((el) => {
      const b = el.dataset.banda!.split(',').map(Number) as Banda['b'];
      this.bandas.push({ el, b, interactiva: el.hasAttribute('data-interactiva'), ultimo: -1, visible: false });
    });

    this.gsap.ticker.add(this.tick);
    this.gsap.ticker.lagSmoothing(0);

    this.escuchar('resize', () => this.escena.resize());
    this.escuchar('wheel', this.onRueda as EventListener, { passive: false });
    this.escuchar('touchstart', this.onToqueInicio as EventListener, { passive: true });
    this.escuchar('touchmove', this.onToqueMueve as EventListener, { passive: false });
    this.escuchar('touchend', this.onToqueFin as EventListener, { passive: true });
    this.escuchar('keydown', this.onTecla as EventListener);
    this.escuchar('scroll', this.onScroll, { passive: true });
    if (matchMedia('(pointer: fine)').matches) {
      this.escuchar(
        'pointermove',
        ((e: PointerEvent) =>
          this.escena.setInclinacion((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)) as EventListener,
        { passive: true },
      );
    }
  }

  private escuchar(tipo: string, fn: EventListener | (() => void), opts?: AddEventListenerOptions) {
    window.addEventListener(tipo, fn as EventListener, opts);
    this.quitar.push(() => window.removeEventListener(tipo, fn as EventListener, opts));
  }

  // ---------------- Navegación por paradas ----------------

  private yDe(t: number) {
    const pista = this.o.pista;
    const inicio = pista.getBoundingClientRect().top + scrollY;
    return inicio + (t / T_FIN) * (pista.offsetHeight - innerHeight);
  }

  private paradaCercana(t: number) {
    let mejor = 0;
    PARADAS.forEach((p, i) => {
      if (Math.abs(p - t) < Math.abs(PARADAS[mejor] - t)) mejor = i;
    });
    return mejor;
  }

  /** ¿El gesto lo maneja el recorrido? Pasada la última parada hacia abajo, el scroll es libre. */
  private controla(dir: number) {
    const ultima = PARADAS.length - 1;
    const yUltima = this.yDe(PARADAS[ultima]);
    if (scrollY > yUltima + 4) return dir < 0 && scrollY <= this.yDe(T_FIN) + 2; // desde el final, subir vuelve al recorrido
    if (this.parada === ultima && dir > 0 && !this.viaje) return false;
    return true;
  }

  /** Viaja a la parada `i` con una transición continua; si ya hay un viaje, encola el siguiente paso. */
  irAParada(i: number) {
    const destino = Math.max(0, Math.min(PARADAS.length - 1, i));
    if (this.viaje) {
      this.cola = destino;
      return;
    }
    const tDestino = PARADAS[destino];
    const y = this.yDe(tDestino);
    this.parada = destino;
    const distancia = Math.abs(tDestino - this.st.progress * T_FIN);
    const proxy = { y: scrollY };
    this.viaje = this.gsap.to(proxy, {
      y,
      duration: Math.min(3.2, 1.05 + distancia * 0.55),
      ease: 'power2.inOut',
      onUpdate: () => window.scrollTo(0, proxy.y),
      onComplete: () => {
        this.viaje = null;
        this.acumulado = 0;
        const sig = this.cola;
        this.cola = null;
        if (sig !== null && sig !== this.parada) this.irAParada(sig);
      },
    });
  }

  irACapitulo(cap: number) {
    this.cola = null;
    this.viaje?.kill();
    this.viaje = null;
    this.irAParada(PARADA_DE_CAPITULO[cap] ?? 0);
  }

  private paso(dir: number) {
    const base = this.cola ?? this.parada;
    this.irAParada(base + dir);
  }

  private onRueda = (e: WheelEvent) => {
    const dir = Math.sign(e.deltaY);
    if (!dir || e.ctrlKey || !this.controla(dir)) return;
    e.preventDefault();
    const ahora = performance.now();
    const pausa = ahora - this.ultimaRueda;
    this.ultimaRueda = ahora;
    // La inercia del trackpad sigue mandando eventos tras el gesto: durante un viaje solo cuenta un gesto nuevo.
    if (this.viaje && pausa < 160) return;
    if (pausa > 220) this.acumulado = 0;
    this.acumulado += e.deltaY;
    if (Math.abs(this.acumulado) >= 22) {
      this.acumulado = 0;
      this.paso(dir);
    }
  };

  private onToqueInicio = (e: TouchEvent) => {
    this.toqueY = e.touches[0]?.clientY ?? null;
  };

  private onToqueMueve = (e: TouchEvent) => {
    if (this.toqueY === null) return;
    const dy = this.toqueY - (e.touches[0]?.clientY ?? this.toqueY);
    if (Math.abs(dy) > 4 && this.controla(Math.sign(dy))) e.preventDefault();
  };

  private onToqueFin = (e: TouchEvent) => {
    if (this.toqueY === null) return;
    const dy = this.toqueY - (e.changedTouches[0]?.clientY ?? this.toqueY);
    this.toqueY = null;
    const dir = Math.sign(dy);
    if (Math.abs(dy) > 36 && this.controla(dir)) this.paso(dir);
  };

  private onTecla = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    const enControl = el?.tagName === 'BUTTON' || el?.tagName === 'A';
    const abajo = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey && !enControl);
    const arriba = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey && !enControl);
    if (abajo && this.controla(1)) {
      e.preventDefault();
      this.paso(1);
    } else if (arriba && this.controla(-1)) {
      e.preventDefault();
      this.paso(-1);
    } else if (e.key === 'Home' && scrollY <= this.yDe(T_FIN)) {
      e.preventDefault();
      this.irACapitulo(0);
    }
  };

  /** Si el scroll cambió por otra vía (barra de desplazamiento, buscar en la página), se asienta en la parada más cercana. */
  private onScroll = () => {
    if (this.viaje) return;
    clearTimeout(this.quietoTimer);
    this.quietoTimer = window.setTimeout(() => {
      if (this.viaje || scrollY > this.yDe(PARADAS[PARADAS.length - 1]) + 4) return;
      const t = this.st.progress * T_FIN;
      const i = this.paradaCercana(t);
      if (Math.abs(PARADAS[i] - t) > 0.02) this.irAParada(i);
      else this.parada = i;
    }, 180);
  };

  // ---------------- Cuadro ----------------

  private tick = (_time: number, deltaMs: number) => {
    if (document.hidden) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    this.tiempo += dt;
    // El tiempo de recorrido persigue al scroll con suavizado exponencial: reversible y sin saltos.
    this.t += (this.objetivo - this.t) * (1 - Math.exp(-dt * 7));
    if (Math.abs(this.objetivo - this.t) < 1e-4) this.t = this.objetivo;
    this.intro = clamp01(this.intro + dt / (this.t > 0.35 ? 0.4 : DURACION_INTRO));

    this.escena.update(this.t, this.intro, this.tiempo, dt);
    this.textos();
    this.etiqueta();
    this.velo();
    const cap = capituloDe(this.t + 0.04);
    if (cap !== this.capitulo) {
      this.capitulo = cap;
      this.o.onCapitulo(cap);
    }
    this.vigilarRendimiento(dt);
  };

  private textos() {
    for (const b of this.bandas) {
      const r = Math.round(banda(this.t, ...b.b) * 100) / 100;
      if (r === b.ultimo) continue;
      b.ultimo = r;
      b.el.style.opacity = String(r);
      b.el.style.translate = `0 ${((1 - r) * 18).toFixed(1)}px`;
      const visible = r > 0.01;
      if (visible !== b.visible) {
        b.visible = visible;
        b.el.style.visibility = visible ? 'visible' : 'hidden';
        b.el.toggleAttribute('inert', !visible);
        b.el.setAttribute('aria-hidden', String(!visible));
      }
      if (b.interactiva) b.el.style.pointerEvents = r > 0.6 ? 'auto' : 'none';
    }
  }

  /** La etiqueta «Mercurio (Hg)» sigue al punto 3D donde caen las gotas. */
  private etiqueta() {
    if (!this.etiquetaHg) return;
    const p = this.escena.puntoHg();
    if (!p) return;
    this.etiquetaHg.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    // La caja se abre hacia donde quepa: derecha, izquierda o, en pantallas angostas, debajo del punto (sobre el agua).
    const caja = this.etiquetaHg.querySelector<HTMLElement>('.etiqueta-hg__caja');
    const w = caja?.offsetWidth ?? 240;
    const lado = p.x + 80 + w <= innerWidth ? 'der' : p.x - 80 - w >= 0 ? 'izq' : 'abajo';
    if (this.etiquetaHg.dataset.lado !== lado) this.etiquetaHg.dataset.lado = lado;
    if (caja) caja.style.left = lado === 'abajo' ? `${Math.min(Math.max(12 - p.x, -w / 2), innerWidth - 12 - p.x - w)}px` : '';
  }

  private velo() {
    let max = 0;
    let color = '';
    for (const v of VELOS) {
      const a = banda(this.t, ...v.b) * v.max;
      if (a > max) {
        max = a;
        color = v.color;
      }
    }
    const r = Math.round(max * 100) / 100;
    if (r === this.ultimoVelo) return;
    this.ultimoVelo = r;
    this.o.velo.style.opacity = String(r);
    if (color) this.o.velo.style.backgroundColor = color;
  }

  private vigilarRendimiento(dt: number) {
    if (dt > 1 / 32) this.lentos++;
    else this.lentos = Math.max(0, this.lentos - 1);
    if (this.lentos > 90) {
      this.lentos = 0;
      const pr = this.escena.renderer.getPixelRatio();
      if (pr > 1) this.escena.renderer.setPixelRatio(Math.max(1, pr - 0.25));
    }
  }

  /** Solo desarrollo: lleva el recorrido a un tiempo exacto, sin animación. */
  irA(t: number) {
    this.viaje?.kill();
    this.viaje = null;
    window.scrollTo(0, this.yDe(t));
    this.objetivo = this.t = t;
    this.intro = 1;
    this.parada = this.paradaCercana(t);
  }

  medir(t: number, n = 20) {
    const gl = this.escena.renderer.getContext();
    this.escena.update(t, 1, this.tiempo, 0.016);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) this.escena.update(t, 1, this.tiempo + i * 0.016, 0.016);
    gl.finish();
    return (performance.now() - t0) / n;
  }

  capturar(t: number) {
    this.t = t;
    this.objetivo = t;
    this.intro = 1;
    this.escena.update(t, 1, this.tiempo, 0.016);
    return this.escena.capturar();
  }

  destroy() {
    this.viaje?.kill();
    clearTimeout(this.quietoTimer);
    this.gsap.ticker.remove(this.tick);
    this.gsap.ticker.lagSmoothing(500, 33);
    this.st.kill();
    this.quitar.forEach((f) => f());
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    this.escena.dispose();
  }
}
