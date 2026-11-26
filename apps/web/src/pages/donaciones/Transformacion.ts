/**
 * Transformación del hero de Donaciones: pepita de oro → partículas → gota de agua → brote.
 * Canvas 2D (el escalón más bajo que logra la idea; sin WebGL). El progreso lo da el scroll.
 * Formas muestreadas de trazos dibujados en un canvas fuera de pantalla: cero descargas.
 */
type Forma = Float32Array; // pares x,y normalizados en [-1, 1]

const COLORES: [number, number, number][] = [
  [226, 184, 92], // oro
  [150, 205, 222], // agua
  [176, 205, 140], // vida
];

function muestrear(dibujar: (g: CanvasRenderingContext2D) => void, n: number, semilla: number): Forma {
  const L = 240;
  const cv = document.createElement('canvas');
  cv.width = cv.height = L;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  dibujar(g);
  const px = g.getImageData(0, 0, L, L).data;
  const pts: number[] = [];
  for (let y = 0; y < L; y += 2) for (let x = 0; x < L; x += 2) if (px[(y * L + x) * 4 + 3] > 128) pts.push(x, y);
  let s = semilla;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const out = new Float32Array(n * 2);
  const total = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * total);
    out[i * 2] = (pts[k * 2] + (r() - 0.5) * 2) / (L / 2) - 1;
    out[i * 2 + 1] = (pts[k * 2 + 1] + (r() - 0.5) * 2) / (L / 2) - 1;
  }
  return out;
}

const pepita = (g: CanvasRenderingContext2D) => {
  g.beginPath();
  g.moveTo(70, 150);
  g.bezierCurveTo(52, 112, 82, 82, 118, 86);
  g.bezierCurveTo(150, 70, 186, 92, 182, 126);
  g.bezierCurveTo(196, 158, 160, 178, 128, 172);
  g.bezierCurveTo(98, 182, 74, 172, 70, 150);
  g.fill();
};
const gota = (g: CanvasRenderingContext2D) => {
  g.beginPath();
  g.moveTo(120, 40);
  g.bezierCurveTo(150, 92, 176, 120, 176, 152);
  g.arc(120, 152, 56, 0, Math.PI, false);
  g.bezierCurveTo(64, 120, 90, 92, 120, 40);
  g.fill();
};
const brote = (g: CanvasRenderingContext2D) => {
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(120, 214);
  g.bezierCurveTo(118, 170, 124, 140, 120, 96);
  g.stroke();
  g.beginPath();
  g.moveTo(120, 140);
  g.bezierCurveTo(70, 140, 44, 110, 46, 72);
  g.bezierCurveTo(90, 74, 116, 100, 120, 140);
  g.fill();
  g.beginPath();
  g.moveTo(121, 112);
  g.bezierCurveTo(160, 112, 192, 88, 194, 50);
  g.bezierCurveTo(150, 52, 124, 74, 121, 112);
  g.fill();
  g.beginPath();
  g.ellipse(120, 214, 46, 7, 0, 0, Math.PI * 2);
  g.fill();
};

export class Transformacion {
  private ctx: CanvasRenderingContext2D;
  private formas: Forma[];
  private dispersion: Float32Array;
  private retraso: Float32Array;
  private n: number;
  private progreso = 0;
  private objetivo = 0;
  private raf = 0;
  private visible = true;
  private observador: IntersectionObserver;
  private t0 = performance.now();

  constructor(
    private canvas: HTMLCanvasElement,
    private reducido: boolean,
  ) {
    this.ctx = canvas.getContext('2d')!;
    const movil = Math.min(innerWidth, innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
    this.n = movil ? 900 : 1900;
    this.formas = [muestrear(pepita, this.n, 7), muestrear(gota, this.n, 11), muestrear(brote, this.n, 13)];
    this.dispersion = new Float32Array(this.n * 2);
    this.retraso = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 0.6 + Math.random() * 0.9;
      this.dispersion[i * 2] = Math.cos(a) * d;
      this.dispersion[i * 2 + 1] = Math.sin(a) * d * 0.8;
      this.retraso[i] = Math.random();
    }
    this.observador = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.bucle();
    });
    this.observador.observe(canvas);
    addEventListener('resize', this.medir);
    document.addEventListener('visibilitychange', this.bucle);
    this.medir();
    if (reducido) this.progreso = this.objetivo = 1;
    this.bucle();
  }

  private medir = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.dibujar(performance.now());
  };

  /** 0 = pepita, 0.5 = gota, 1 = brote. */
  setProgreso(p: number) {
    this.objetivo = this.reducido ? 1 : Math.max(0, Math.min(1, p));
    this.bucle();
  }

  private bucle = () => {
    if (this.raf || !this.visible || document.hidden) return;
    this.raf = requestAnimationFrame((ts) => {
      this.raf = 0;
      this.progreso += (this.objetivo - this.progreso) * 0.09;
      this.dibujar(ts);
      // Respira despacio aun quieto (solo con movimiento permitido).
      if (!this.reducido) this.bucle();
    });
  };

  private dibujar(ts: number) {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const escala = Math.min(w, h) * 0.27;
    const cx = w / 2;
    const cy = h * 0.36; // por encima del titular
    const s = this.progreso * 2; // 0..2
    const tramo = Math.min(1, Math.floor(s));
    const local = s - tramo;
    const A = this.formas[tramo];
    const B = this.formas[Math.min(2, tramo + 1)];
    const ca = COLORES[tramo];
    const cb = COLORES[Math.min(2, tramo + 1)];
    const tiempo = (ts - this.t0) / 1000;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      const d = this.retraso[i] * 0.35;
      const k = Math.max(0, Math.min(1, (local - d) / 0.65));
      const e = k * k * (3 - 2 * k);
      // Curva por un punto de dispersión: el oro se deshace en partículas antes de rehacerse.
      const dx = this.dispersion[i * 2] * (tramo === 0 ? 1 : 0.45);
      const dy = this.dispersion[i * 2 + 1] * (tramo === 0 ? 1 : 0.45);
      const u = 1 - e;
      const x = u * u * A[i * 2] + 2 * u * e * dx + e * e * B[i * 2];
      const y = u * u * A[i * 2 + 1] + 2 * u * e * dy + e * e * B[i * 2 + 1];
      const vaiven = this.reducido ? 0 : Math.sin(tiempo * 1.3 + i) * 0.006;
      const r = Math.round(ca[0] + (cb[0] - ca[0]) * e);
      const g = Math.round(ca[1] + (cb[1] - ca[1]) * e);
      const b = Math.round(ca[2] + (cb[2] - ca[2]) * e);
      const brillo = 0.62 + 0.38 * Math.sin(tiempo * 2 + i * 1.7) ** 2;
      ctx.fillStyle = `rgba(${r},${g},${b},${brillo})`;
      const t = (1.5 + (i % 3) * 0.7) * dpr;
      ctx.fillRect(cx + (x + vaiven) * escala - t / 2, cy + (y + vaiven) * escala - t / 2, t, t);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.observador.disconnect();
    removeEventListener('resize', this.medir);
    document.removeEventListener('visibilitychange', this.bucle);
  }
}
