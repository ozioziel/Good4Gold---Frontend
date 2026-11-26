import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowRight, BadgeCheck, Check, ChevronsDown, FileText, Loader2, MapPinned, ShieldCheck, Wallet } from 'lucide-react';
import { CAMPANAS, PLANTAS_DEMO, TX_DEMO, type Campana, type Causa } from '@/data/campanas';
import { Hoja } from '@/components/ui/Hoja';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Ilustracion } from '../informate/Ilustracion';
import type { Transformacion } from './Transformacion';
import './donaciones.css';

/**
 * Donaciones. Registro: capítulo inmersivo ligero + flujo cálido (nivel 2–3). Narrativa propia:
 * el oro se transforma en vida (no repite la del Inicio). Canvas 2D en el hero, SVG en plantas y río.
 */
const CLAVE = 'g2:donaciones:v1';
const MONTOS = [5, 10, 25, 50, 100];
const CAUSAS: { id: Causa; ilus: Parameters<typeof Ilustracion>[0]['ilus'] }[] = [
  { id: 'investigar', ilus: 'frasco' },
  { id: 'proteger', ilus: 'manos' },
  { id: 'educar', ilus: 'documento' },
  { id: 'restaurar', ilus: 'bosque' },
];

interface Aporte {
  monto: number;
  campana: string;
  campanaId: string;
  fecha: string;
  tx: string;
}

const leerAportes = (): Aporte[] => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as Aporte[];
  } catch {
    return [];
  }
};

export default function Donaciones() {
  const { t } = useTranslation();
  const reducido = useReducedMotion();
  const [causa, setCausa] = useState<Causa>('investigar');
  const [campanaId, setCampanaId] = useState(() => new URLSearchParams(location.search).get('campana') ?? CAMPANAS[0].id);
  const [monto, setMonto] = useState(25);
  const [aportes, setAportes] = useState<Aporte[]>(leerAportes);
  const [dialogo, setDialogo] = useState(false);
  const campana = CAMPANAS.find((c) => c.id === campanaId) ?? CAMPANAS[0];
  const rio = useRef<HTMLElement>(null);

  // La causa elegida sugiere su campaña (sin bloquear la elección manual).
  const elegirCausa = (c: Causa) => {
    setCausa(c);
    const primera = CAMPANAS.find((x) => x.causa === c);
    if (primera) setCampanaId(primera.id);
  };
  useEffect(() => {
    setCausa(campana.causa);
  }, [campana.causa]);

  return (
    <div className="donar">
      <Hero reducido={reducido} />

      <section className="donar__seccion" aria-labelledby="proteger">
        <h2 id="proteger" className="donar__titulo">
          {t('donaciones.protegerTitulo')}
        </h2>
        <ul className="causas">
          {CAUSAS.map((c) => (
            <li key={c.id}>
              <button type="button" className="causa" aria-pressed={causa === c.id} onClick={() => elegirCausa(c.id)}>
                <span className="causa__ilus">
                  <Ilustracion ilus={c.ilus} />
                </span>
                <strong>{t(`donaciones.causas.${c.id}.titulo`)}</strong>
                <span>{t(`donaciones.causas.${c.id}.texto`)}</span>
                {causa === c.id && <Check className="causa__check" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="donar__seccion donar__crecer" aria-labelledby="crecer">
        <div className="crecer__texto">
          <h2 id="crecer" className="donar__titulo">
            {t('donaciones.crecerTitulo')}
          </h2>
          <p className="donar__lema">{t('donaciones.crecerTexto')}</p>
          <div className="montos" role="radiogroup" aria-label={t('donaciones.crecerTexto')}>
            {MONTOS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={monto === m} className="monto num" onClick={() => setMonto(m)}>
                {m}
                <span>USDC</span>
              </button>
            ))}
          </div>
          <label className="monto-libre">
            <span>{t('donaciones.otroMonto')}</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={10000}
              value={monto}
              onChange={(e) => setMonto(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))}
              className="num"
            />
            <span>USDC</span>
          </label>
          <input
            type="range"
            min={1}
            max={200}
            value={Math.min(monto, 200)}
            onChange={(e) => setMonto(Number(e.target.value))}
            className="monto-deslizador"
            aria-label={t('donaciones.crecerTexto')}
          />
          <button type="button" className="boton-oro boton-oro--ancho" disabled={monto < 1} onClick={() => setDialogo(true)}>
            {t('donaciones.aportarA', { campana: campana.titulo })}
            <ArrowRight aria-hidden="true" />
          </button>
          <p className="donar__nota">
            <span className="etiqueta-demo">TESTNET</span> {t('donaciones.simbolico')}
          </p>
        </div>
        <PlantaAporte monto={monto} />
      </section>

      <section className="donar__seccion" aria-labelledby="campanas">
        <h2 id="campanas" className="donar__titulo">
          {t('donaciones.campanasTitulo')}
        </h2>
        <p className="donar__lema">{t('donaciones.campanasTexto')}</p>
        <ul className="campanas">
          {CAMPANAS.map((c) => (
            <li key={c.id}>
              <TarjetaCampana
                c={c}
                elegida={c.id === campana.id}
                extra={aportes.filter((a) => a.campanaId === c.id).reduce((s, a) => s + a.monto, 0)}
                onElegir={() => {
                  setCampanaId(c.id);
                  rio.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section ref={rio} className="donar__seccion" aria-labelledby="rio">
        <h2 id="rio" className="donar__titulo">
          {t('donaciones.rioTitulo')}
        </h2>
        <p className="donar__lema">
          {campana.titulo} · {t('donaciones.rioTexto')}
        </p>
        <RioTransparencia c={campana} aportes={aportes.filter((a) => a.campanaId === campana.id)} />
      </section>

      <section className="donar__seccion" aria-labelledby="bosque">
        <h2 id="bosque" className="donar__titulo">
          {t('donaciones.bosqueTitulo')}
        </h2>
        <p className="donar__lema">{t('donaciones.bosqueTexto')}</p>
        <Bosque cuenta={PLANTAS_DEMO + aportes.length} nuevas={aportes.length} />
        <p className="donar__nota">{t('donaciones.bosqueNota')}</p>
      </section>

      <DialogoAporte
        abierto={dialogo}
        monto={monto}
        c={campana}
        onCerrar={() => setDialogo(false)}
        onConfirmado={(a) => {
          const nuevos = [a, ...aportes];
          setAportes(nuevos);
          localStorage.setItem(CLAVE, JSON.stringify(nuevos));
        }}
        onVerRio={() => {
          setDialogo(false);
          rio.current?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Hero: oro → agua → vida

function Hero({ reducido }: { reducido: boolean }) {
  const { t } = useTranslation();
  const seccion = useRef<HTMLElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const escena = useRef<Transformacion | null>(null);
  const [p, setP] = useState(reducido ? 1 : 0);

  useEffect(() => {
    if (!lienzo.current) return;
    let vivo = true;
    import('./Transformacion').then(({ Transformacion }) => {
      if (!vivo || !lienzo.current) return;
      escena.current = new Transformacion(lienzo.current, reducido);
    });
    return () => {
      vivo = false;
      escena.current?.destroy();
      escena.current = null;
    };
  }, [reducido]);

  useEffect(() => {
    if (reducido) return;
    const on = () => {
      const el = seccion.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const v = Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
      setP(v);
      escena.current?.setProgreso(v);
    };
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, [reducido]);

  const etapas = t('donaciones.etapas', { returnObjects: true }) as string[];
  const etapa = p < 0.3 ? 0 : p < 0.7 ? 1 : 2;
  return (
    <section ref={seccion} className={'donar-hero' + (reducido ? ' donar-hero--quieto' : '')} aria-labelledby="donar-titulo">
      <div className="donar-hero__escenario">
        <canvas ref={lienzo} className="donar-hero__lienzo" aria-hidden="true" />
        <div className="donar-hero__texto">
          <h1 id="donar-titulo">{t('donaciones.heroTitulo')}</h1>
          <p>{t('donaciones.heroTexto')}</p>
        </div>
        <ol className="donar-hero__etapas" aria-hidden="true">
          {etapas.map((e, i) => (
            <li key={e} className={i === etapa ? 'is-activa' : i < etapa ? 'is-pasada' : ''}>
              {e}
            </li>
          ))}
        </ol>
        <a className="donar-hero__saltar" href="#campanas">
          {p < 0.95 ? <ChevronsDown aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
          {p < 0.95 ? t('donaciones.heroDesliza') : t('donaciones.saltar')}
        </a>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Planta que crece con el aporte

function PlantaAporte({ monto }: { monto: number }) {
  // Escala logarítmica: 5 USDC ya brota; 200+ llega a planta completa. Simbólico.
  const p = Math.max(0.08, Math.min(1, Math.log10(Math.max(1, monto)) / Math.log10(200)));
  const hojas = [
    { t: 0.15, d: 'M100 150 q-34-4-42-30 q32 0 42 30z' },
    { t: 0.3, d: 'M100 128 q34-6 46-30 q-34 0-46 30z' },
    { t: 0.48, d: 'M100 104 q-30-6-36-32 q28 4 36 32z' },
    { t: 0.66, d: 'M100 84 q28-8 36-32 q-28 4-36 32z' },
    { t: 0.84, d: 'M100 62 q-20-10-20-34 q20 8 20 34z' },
  ];
  return (
    <div className="planta-aporte" aria-hidden="true">
      <svg viewBox="0 0 200 220">
        <ellipse cx="100" cy="200" rx="64" ry="9" fill="#183528" />
        <path d="M100 200 C 98 160 104 120 100 40" className="planta-aporte__tallo" pathLength={1} style={{ strokeDashoffset: 1 - p }} />
        {hojas.map((h) => (
          <path key={h.t} d={h.d} className={'planta-aporte__hoja' + (p >= h.t ? ' is-abierta' : '')} />
        ))}
        <circle cx="100" cy="36" r="7" className={'planta-aporte__flor' + (p >= 0.98 ? ' is-abierta' : '')} />
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={`${monto}-${i}`} className="planta-aporte__chispa" cx={70 + ((i * 37) % 60)} cy={190} r={2.2} style={{ animationDelay: `${i * 70}ms` }} />
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- Campaña

function TarjetaCampana({ c, elegida, extra, onElegir }: { c: Campana; elegida: boolean; extra: number; onElegir: () => void }) {
  const { t } = useTranslation();
  const reunido = c.reunido + extra;
  const pct = Math.min(100, Math.round((reunido / c.meta) * 100));
  return (
    <article className={'campana' + (elegida ? ' is-elegida' : '')}>
      <div className="campana__cabeza">
        <span className="campana__causa">{t(`donaciones.causas.${c.causa}.titulo`)}</span>
        <span className="etiqueta-demo">{t('comun.demo')}</span>
      </div>
      <h3>{c.titulo}</h3>
      <div className="campana__progreso" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('donaciones.recaudado')}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="campana__cifras num">
        <strong>{reunido.toLocaleString('es-BO')}</strong> / {c.meta.toLocaleString('es-BO')} USDC · {pct}%
      </p>
      <ol className="hitos">
        {c.hitos.map((h) => (
          <li key={h.titulo} className={`hito hito--${h.estado}`}>
            <span className="hito__punto" aria-hidden="true" />
            <span>{h.titulo}</span>
            <span className="hito__estado">{t(`donaciones.hitos.${h.estado}`)}</span>
          </li>
        ))}
      </ol>
      <p className="campana__meta">
        <BadgeCheck aria-hidden="true" /> {c.responsable} · {t('donaciones.verificador')}: {c.verificador}
      </p>
      <div className="campana__acciones">
        <button type="button" className={elegida ? 'boton-oro' : 'boton-linea'} onClick={onElegir} aria-pressed={elegida}>
          {elegida ? t('donaciones.elegida') : t('donaciones.elegir')}
        </button>
        <Link to="/mapa" className="boton-linea">
          <MapPinned aria-hidden="true" />
          {t('donaciones.verEnMapa')}
        </Link>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- Río de transparencia

type Nodo = 'donacion' | 'fondos' | 'investigacion' | 'impacto';
const NODOS: { id: Nodo; x: number; y: number }[] = [
  { id: 'donacion', x: 70, y: 110 },
  { id: 'fondos', x: 300, y: 70 },
  { id: 'investigacion', x: 540, y: 120 },
  { id: 'impacto', x: 780, y: 80 },
];

function RioTransparencia({ c, aportes }: { c: Campana; aportes: Aporte[] }) {
  const { t } = useTranslation();
  const [nodo, setNodo] = useState<Nodo>('fondos');
  const hechos = c.hitos.filter((h) => h.estado === 'hecho').length;
  const enCurso = c.hitos.some((h) => h.estado === 'curso');
  const estadoNodo: Record<Nodo, 'hecho' | 'curso' | 'pendiente'> = {
    donacion: 'hecho',
    fondos: 'hecho',
    investigacion: hechos > 0 ? 'hecho' : enCurso ? 'curso' : 'pendiente',
    impacto: hechos === c.hitos.length ? 'hecho' : hechos > 0 ? 'curso' : 'pendiente',
  };
  const txs = useMemo(() => [...aportes.map((a) => a.tx), ...TX_DEMO].slice(0, 4), [aportes]);
  return (
    <div className="rio-tx">
      <svg className="rio-tx__svg" viewBox="0 0 850 190" role="group" aria-label={t('donaciones.rioTitulo')}>
        <path className="rio-tx__cauce" d="M10 120 C 120 120, 160 60, 300 70 S 440 140, 540 120 S 700 60, 840 84" />
        <path className="rio-tx__agua" d="M10 120 C 120 120, 160 60, 300 70 S 440 140, 540 120 S 700 60, 840 84" />
        {NODOS.map((n) => (
          <g key={n.id} className={`rio-tx__nodo rio-tx__nodo--${estadoNodo[n.id]}${nodo === n.id ? ' is-activo' : ''}`} transform={`translate(${n.x} ${n.y})`}>
            <circle r="18" />
            <circle r="7" className="rio-tx__centro" />
            <text y="44" textAnchor="middle">
              {t(`donaciones.nodos.${n.id}`)}
            </text>
          </g>
        ))}
      </svg>
      <div className="rio-tx__botones" role="tablist" aria-label={t('donaciones.rioTitulo')}>
        {NODOS.map((n) => (
          <button key={n.id} type="button" role="tab" aria-selected={nodo === n.id} onClick={() => setNodo(n.id)} className={`rio-tx__tab rio-tx__tab--${estadoNodo[n.id]}`}>
            {t(`donaciones.nodos.${n.id}`)}
            <span>{t(`donaciones.hitos.${estadoNodo[n.id]}`)}</span>
          </button>
        ))}
      </div>
      <div className="rio-tx__detalle" role="tabpanel">
        <p>{t(`donaciones.nodosTexto.${nodo}`)}</p>
        {(nodo === 'donacion' || nodo === 'fondos') && (
          <div className="rio-tx__bloque">
            <h4>{t('donaciones.transacciones')}</h4>
            <ul>
              {txs.map((tx) => (
                <li key={tx} className="num">
                  <ShieldCheck aria-hidden="true" /> {tx} <span className="etiqueta-demo">{t('donaciones.txSimulada')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(nodo === 'investigacion' || nodo === 'impacto') && (
          <div className="rio-tx__bloque">
            <h4>{t('donaciones.evidencias')}</h4>
            <ul>
              {c.hitos.map((h) => (
                <li key={h.titulo} className={`hito--${h.estado}`}>
                  <FileText aria-hidden="true" /> {h.titulo}: {h.evidencia ?? t(`donaciones.hitos.${h.estado}`)}
                  <span className="num"> · {h.monto} USDC</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="rio-tx__resp">
          {t('donaciones.responsable')}: {c.responsable} · {t('donaciones.verificador')}: {c.verificador}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Bosque colectivo (sin rankings)

function Bosque({ cuenta, nuevas }: { cuenta: number; nuevas: number }) {
  const { t } = useTranslation();
  const plantas = useMemo(() => {
    let s = 3;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: cuenta }, (_, i) => ({ x: 20 + r() * 760, alto: 18 + r() * 34, tono: r(), nueva: i >= cuenta - nuevas }));
  }, [cuenta, nuevas]);
  return (
    <div className="bosque">
      <svg viewBox="0 0 800 140" aria-label={t('donaciones.plantas', { count: cuenta })} role="img">
        <path d="M0 120 C 200 108, 600 132, 800 116 V140 H0z" fill="#183528" />
        {plantas
          .sort((a, b) => a.alto - b.alto)
          .map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${124 - (i % 3) * 3})`} className={p.nueva ? 'bosque__nueva' : undefined}>
              <path d={`M0 0 Q ${p.tono * 4 - 2} ${-p.alto / 2} 0 ${-p.alto}`} stroke="#6d8f62" strokeWidth="1.6" fill="none" />
              <path d={`M0 ${-p.alto * 0.55} q -10 -2 -12 -10 q 10 0 12 10z`} fill={p.tono > 0.5 ? '#a9bf92' : '#8fae7a'} />
              <path d={`M0 ${-p.alto * 0.75} q 10 -2 12 -10 q -10 0 -12 10z`} fill={p.tono > 0.3 ? '#a9bf92' : '#b8c9a2'} />
              {p.nueva && <circle cy={-p.alto} r="3" fill="#c7a354" />}
            </g>
          ))}
      </svg>
      <p className="bosque__cuenta num">{t('donaciones.plantas', { count: cuenta })}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Diálogo de aporte (simulación de testnet)

function DialogoAporte({
  abierto,
  monto,
  c,
  onCerrar,
  onConfirmado,
  onVerRio,
}: {
  abierto: boolean;
  monto: number;
  c: Campana;
  onCerrar: () => void;
  onConfirmado: (a: Aporte) => void;
  onVerRio: () => void;
}) {
  const { t } = useTranslation();
  const [paso, setPaso] = useState<'confirmar' | 'conectada' | 'enviando' | 'confirmando' | 'listo'>('confirmar');
  const [tx, setTx] = useState('');
  useEffect(() => {
    if (!abierto) setPaso('confirmar');
  }, [abierto]);

  const firmar = () => {
    setPaso('enviando');
    const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
    const corto = `${hash.slice(0, 4)}…${hash.slice(-4)}`;
    setTx(corto);
    setTimeout(() => setPaso('confirmando'), 900);
    setTimeout(() => {
      setPaso('listo');
      onConfirmado({ monto, campana: c.titulo, campanaId: c.id, fecha: new Date().toISOString().slice(0, 10), tx: corto });
    }, 2100);
  };

  const valido = monto >= 1 && monto <= 10000;
  return (
    <Hoja abierta={abierto} titulo={paso === 'listo' ? t('donaciones.listo') : t('donaciones.confirmarTitulo')} onCerrar={onCerrar}>
      <div className="aporte">
        <p className="aporte__monto num">
          {monto.toLocaleString('es-BO')} <span>USDC</span>
        </p>
        <dl className="aporte__datos">
          <div>
            <dt>{t('donaciones.campanasTitulo')}</dt>
            <dd>{c.titulo}</dd>
          </div>
          <div>
            <dt>{t('donaciones.red')}</dt>
            <dd>
              {t('donaciones.redValor')} <span className="etiqueta-demo">TESTNET</span>
            </dd>
          </div>
          <div>
            <dt>{t('donaciones.verificador')}</dt>
            <dd>{c.verificador}</dd>
          </div>
          {tx && (
            <div>
              <dt>{t('donaciones.transacciones')}</dt>
              <dd className="num">
                {tx} <span className="etiqueta-demo">{t('donaciones.txSimulada')}</span>
              </dd>
            </div>
          )}
        </dl>
        <p className="aporte__aviso">
          <ShieldCheck aria-hidden="true" />
          {paso === 'listo' ? t('donaciones.listoNota') : t('donaciones.simulacion')}
        </p>
        {!valido && <p className="aporte__error">{t('donaciones.montoInvalido')}</p>}
        <div className="aporte__acciones" aria-live="polite">
          {paso === 'confirmar' && (
            <button type="button" className="boton-linea boton-oro--ancho" disabled={!valido} onClick={() => setPaso('conectada')}>
              <Wallet aria-hidden="true" />
              {t('donaciones.conectar')}
            </button>
          )}
          {paso === 'conectada' && (
            <>
              <p className="aporte__ok">
                <Check aria-hidden="true" />
                {t('donaciones.conectada')}
              </p>
              <button type="button" className="boton-oro boton-oro--ancho" onClick={firmar}>
                {t('donaciones.firmar')}
              </button>
            </>
          )}
          {(paso === 'enviando' || paso === 'confirmando') && (
            <p className="aporte__espera">
              <Loader2 aria-hidden="true" className="gira-lento" />
              {paso === 'enviando' ? t('donaciones.enviando') : t('donaciones.confirmando')}
            </p>
          )}
          {paso === 'listo' && (
            <button type="button" className="boton-oro boton-oro--ancho" onClick={onVerRio}>
              {t('donaciones.verRio')}
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Hoja>
  );
}
