import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronsDown, Feather, Clapperboard, ExternalLink } from 'lucide-react';
import { MARCA } from '@/config/marca';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { detectarCalidad, webglDisponible } from '@/scenes/comun/calidad';
import { cargarMascaras } from '@/scenes/inicio/mascaras';
import type { Recorrido } from '@/scenes/inicio/Recorrido';
import { FUENTES_INICIO, fuente } from './fuentes';
import { IlusComunidad, IlusConocimiento, IlusLaboratorio, IlusRecursos } from './Ilustraciones';
import { FUENTE_LOCALIDADES } from '@/data/localidades-beni';
import './inicio.css';

const CLAVE_LIGERA = 'g2:inicio-ligera';
const DESTINOS = ['/mapa', '/laboratorio', '/informate', '/donaciones'] as const;
const ILUS = [IlusComunidad, IlusLaboratorio, IlusConocimiento, IlusRecursos];

function preferenciaLigera(reduce: boolean) {
  const q = new URLSearchParams(location.search);
  if (q.get('ligera') === '1' || q.get('reduced') === '1') return true;
  if (q.get('ligera') === '0') return false;
  const guardada = localStorage.getItem(CLAVE_LIGERA);
  if (guardada !== null) return guardada === '1';
  return reduce || !webglDisponible();
}

export default function Inicio() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [ligera, setLigera] = useState(() => preferenciaLigera(reduce));
  const [aviso, setAviso] = useState<string | null>(null);
  const [lista, setLista] = useState(false);
  const [cap, setCap] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  const velo = useRef<HTMLDivElement>(null);
  const rec = useRef<Recorrido | null>(null);

  // Si el sistema pide movimiento reducido mientras la página está abierta, pasamos a la versión ligera.
  useEffect(() => {
    if (reduce && localStorage.getItem(CLAVE_LIGERA) === null) setLigera(true);
  }, [reduce]);

  useEffect(() => {
    if (ligera) return;
    let vivo = true;
    setLista(false);
    (async () => {
      try {
        const mascaras = await cargarMascaras().catch(() => null);
        const { Recorrido } = await import('@/scenes/inicio/Recorrido');
        if (!vivo || !canvas.current || !pista.current || !capa.current || !velo.current) return;
        const r = await Recorrido.crear({
          canvas: canvas.current,
          pista: pista.current,
          capa: capa.current,
          velo: velo.current,
          calidad: detectarCalidad(),
          mascaras,
          onCapitulo: setCap,
        });
        if (!vivo) {
          r.destroy();
          return;
        }
        rec.current = r;
        setLista(true);
        if (import.meta.env.DEV) {
          (window as unknown as { __g2: unknown }).__g2 = {
            capturar: (tt: number) => r.capturar(tt),
            irA: (tt: number) => r.irA(tt),
            medir: (tt: number, n?: number) => r.medir(tt, n),
          };
        }
      } catch (e) {
        console.error('[Inicio] La escena no pudo iniciar; se muestra la versión ligera.', e);
        if (vivo) {
          setAviso(t('inicio.sinWebgl'));
          setLigera(true);
        }
      }
    })();
    return () => {
      vivo = false;
      rec.current?.destroy();
      rec.current = null;
    };
  }, [ligera, t]);

  const cambiarVersion = (l: boolean) => {
    localStorage.setItem(CLAVE_LIGERA, l ? '1' : '0');
    setAviso(null);
    setLigera(l);
    window.scrollTo(0, 0);
  };

  const ir = (i: number) => rec.current?.irACapitulo(i);
  const nombres = t('inicio.nombres', { returnObjects: true }) as string[];

  const fuentes = (
    <Fuentes
      ligera={ligera}
      onCambiar={() => cambiarVersion(!ligera)}
      textoCambiar={ligera ? t('inicio.versionAnimada') : t('inicio.versionLigera')}
      puedeAnimar={!reduce && webglDisponible()}
    />
  );

  if (ligera) {
    return (
      <div className="inicio inicio--ligera">
        <h1 className="sr-only">
          {MARCA.nombre} — {t('inicio.titulo')}
        </h1>
        {aviso && (
          <p className="inicio__aviso" role="status">
            {aviso}
          </p>
        )}
        {[C1, C2, C3, C4, C5, C6].map((C, i) => (
          <section key={i} className={`ligera-cap ligera-cap--${i + 1}`} aria-labelledby={`cap-${i + 1}`}>
            <Poster n={i + 1} />
            <div className="ligera-cap__contenido">
              <C />
            </div>
          </section>
        ))}
        {fuentes}
      </div>
    );
  }

  return (
    <div className={'inicio inicio--animada' + (lista ? ' is-lista' : '')}>
      <h1 className="sr-only">
        {MARCA.nombre} — {t('inicio.titulo')}
      </h1>
      <canvas ref={canvas} className="inicio__canvas" aria-hidden="true" />
      <div ref={velo} className="inicio__velo" aria-hidden="true" />
      <div className="inicio__vineta" aria-hidden="true" />
      {!lista && (
        <p className="inicio__cargando" role="status">
          <span className="inicio__cargando-linea" aria-hidden="true" />
          {t('inicio.cargandoEscena')}
        </p>
      )}

      {/* Capa de textos: cada bloque aparece en su banda de tiempo (data-banda = entra, lleno, sale, fuera). */}
      <div ref={capa} className="inicio__capa">
        <Bloque banda="-1,-0.5,0.6,0.86" clase="b-c1">
          <C1 />
        </Bloque>
        <Bloque banda="-1,-0.5,0.06,0.22" clase="b-desliza">
          <p className="desliza">
            <ChevronsDown aria-hidden="true" />
            {t('inicio.desliza')}
          </p>
        </Bloque>
        <div className="bloque etiqueta-hg" data-banda="0.95,1.08,1.42,1.52" data-ancla="hg">
          <span className="etiqueta-hg__punto" aria-hidden="true" />
          <span className="etiqueta-hg__linea" aria-hidden="true" />
          <p className="etiqueta-hg__caja">
            <strong>{t('inicio.c2.hgTitulo')}</strong>
            <span>{t('inicio.c2.hgTexto')}</span>
          </p>
        </div>
        <Bloque banda="1.0,1.16,1.95,2.06" clase="b-c2">
          <C2 sinDato />
        </Bloque>
        <Bloque banda="1.66,1.8,1.95,2.06" clase="b-c2-dato">
          <Dato2 />
        </Bloque>
        <Bloque banda="2.36,2.48,2.93,3.02" clase="b-c3">
          <C3 sinDato />
        </Bloque>
        <Bloque banda="2.52,2.64,2.93,3.02" clase="b-c3-dato">
          <Dato3 />
        </Bloque>
        <Bloque banda="3.7,3.84,4.04,4.14" clase="b-c4">
          <C4 sinLeyenda />
        </Bloque>
        <Bloque banda="3.74,3.88,4.06,4.16" clase="b-c4-leyenda">
          <Leyenda4 />
        </Bloque>
        <Bloque banda="4.14,4.3,4.92,5.02" clase="b-c5" interactiva>
          <C5 />
        </Bloque>
        <Bloque banda="5.24,5.42,7,8" clase="b-c6" interactiva>
          <C6 />
        </Bloque>
      </div>

      {/* HUD: capítulo actual, navegación por capítulos y salto directo. */}
      <div className="inicio__hud">
        <p className="hud__contador num" aria-hidden="true">
          <span>{t('inicio.contador', { n: String(cap + 1).padStart(2, '0'), total: '06' })}</span>
          <span className="hud__nombre">{nombres[cap]}</span>
        </p>
        <nav className="hud__puntos" aria-label={t('inicio.capitulos')}>
          {nombres.map((_, i) => (
            <button
              key={i}
              type="button"
              className="hud__punto"
              aria-label={t('inicio.capitulo', { n: i + 1, nombre: nombres[i] })}
              aria-current={cap === i ? 'step' : undefined}
              onClick={() => ir(i)}
            >
              <span />
            </button>
          ))}
        </nav>
      </div>
      {cap < 4 && (
        <div className="hud__acciones">
          <button type="button" className="btn hud__saltar" onClick={() => ir(4)}>
            {t('inicio.saltar')}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}

      <div ref={pista} className="inicio__pista" aria-hidden="true" />
      {fuentes}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Bloque({ banda, clase, interactiva, children }: { banda: string; clase: string; interactiva?: boolean; children: ReactNode }) {
  return (
    <div className={`bloque ${clase}`} data-banda={banda} data-interactiva={interactiva ? '' : undefined}>
      {children}
    </div>
  );
}

// Pósteres capturados de la escena real (versión ligera): uno horizontal y otro vertical para celular.
function Poster({ n }: { n: number }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className="ligera-cap__poster ligera-cap__poster--vacio" aria-hidden="true" />;
  return (
    <picture>
      <source media="(max-width: 899px) and (orientation: portrait)" srcSet={`/inicio/posters/c${n}-m.webp`} />
      <img
        className="ligera-cap__poster"
        src={`/inicio/posters/c${n}.webp`}
        alt=""
        width={1024}
        height={768}
        loading={n === 1 ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setOk(false)}
      />
    </picture>
  );
}

function C1() {
  const { t } = useTranslation();
  return (
    <div className="cap cap--1">
      <p className="overline">01 · {(t('inicio.nombres', { returnObjects: true }) as string[])[0]}</p>
      <h2 id="cap-1" className="cap__titulo cap__titulo--xl">
        {t('inicio.c1.titulo')}
      </h2>
    </div>
  );
}

function Dato2() {
  const { t } = useTranslation();
  const f = fuente('pnuma-gma-2018');
  return (
    <aside className="dato vidrio">
      <p className="dato__valor num">{t('inicio.c2.datoValor')}</p>
      <p className="dato__texto">{t('inicio.c2.datoTexto')}</p>
      <a className="dato__fuente" href={f.url} target="_blank" rel="noreferrer">
        {t('inicio.c2.datoFuente')}
        <ExternalLink aria-hidden="true" />
      </a>
      <p className="dato__nota">{t('inicio.c2.nota')}</p>
    </aside>
  );
}

function C2({ sinDato = false }: { sinDato?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="cap cap--2">
      <p className="overline">02 · {(t('inicio.nombres', { returnObjects: true }) as string[])[1]}</p>
      <h2 id="cap-2" className="cap__titulo">
        {t('inicio.c2.titulo')}
      </h2>
      {!sinDato && <Dato2 />}
    </div>
  );
}

function Dato3() {
  const { t } = useTranslation();
  const f = fuente('valdivieso-2025');
  return (
    <aside className="dato dato--compacto vidrio">
      <p className="dato__valor num">{t('inicio.c3.datoValor')}</p>
      <p className="dato__texto">{t('inicio.c3.datoTexto')}</p>
      <a className="dato__fuente" href={f.url} target="_blank" rel="noreferrer">
        {t('inicio.c3.datoFuente')}
        <ExternalLink aria-hidden="true" />
      </a>
    </aside>
  );
}

function C3({ sinDato = false }: { sinDato?: boolean }) {
  const { t } = useTranslation();
  const f = fuente('oms-mercurio');
  return (
    <div className="cap cap--3">
      <p className="overline">03 · {(t('inicio.nombres', { returnObjects: true }) as string[])[2]}</p>
      <h2 id="cap-3" className="cap__titulo">
        {t('inicio.c3.titulo')}
      </h2>
      <p className="cap__texto">{t('inicio.c3.texto')}</p>
      <a className="cap__fuente" href={f.url} target="_blank" rel="noreferrer">
        {t('comun.fuente')}: {t('inicio.c3.fuente')}
        <ExternalLink aria-hidden="true" />
      </a>
      <p className="cap__nota">{t('inicio.c3.nota')}</p>
      {!sinDato && <Dato3 />}
    </div>
  );
}

function Leyenda4() {
  const { t } = useTranslation();
  return (
    <aside className="leyenda">
      <p className="leyenda__fila">
        <span className="leyenda__punto leyenda__punto--localidad" aria-hidden="true" />
        {t('inicio.c4.leyendaLocalidades')}
      </p>
      <p className="leyenda__fila">
        <span className="leyenda__punto leyenda__punto--bolivia" aria-hidden="true" />
        Bolivia
      </p>
      <p className="leyenda__nota">{t('inicio.c4.leyendaNota')}</p>
      <a className="leyenda__fuente" href={FUENTE_LOCALIDADES.url} target="_blank" rel="noreferrer">
        © {t('inicio.c4.leyendaFuente')} · Natural Earth
      </a>
    </aside>
  );
}

function C4({ sinLeyenda = false }: { sinLeyenda?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="cap cap--4">
      <p className="overline">04 · {(t('inicio.nombres', { returnObjects: true }) as string[])[3]}</p>
      <h2 id="cap-4" className="cap__titulo">
        {t('inicio.c4.titulo')}
      </h2>
      <p className="cap__marca">{MARCA.nombre}</p>
      {!sinLeyenda && <Leyenda4 />}
    </div>
  );
}

function C5() {
  const { t } = useTranslation();
  const paneles = t('inicio.c5.paneles', { returnObjects: true }) as { titulo: string; texto: string; accion: string }[];
  return (
    <div className="cap cap--5">
      <p className="overline">05 · {t('inicio.c5.overline')}</p>
      <h2 id="cap-5" className="cap__titulo cap__titulo--m">
        {t('inicio.c5.titulo')}
      </h2>
      <ul className="paneles">
        {paneles.map((p, i) => {
          const Ilus = ILUS[i];
          return (
            <li key={p.titulo}>
              <Link to={DESTINOS[i]} className="panel vidrio">
                <span className="panel__ilus">
                  <Ilus />
                </span>
                <span className="panel__titulo">{p.titulo}</span>
                <span className="panel__texto">{p.texto}</span>
                <span className="panel__accion">
                  {p.accion}
                  <ArrowRight aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function C6() {
  const { t } = useTranslation();
  return (
    <div className="cap cap--6">
      <p className="overline">06 · {(t('inicio.nombres', { returnObjects: true }) as string[])[5]}</p>
      <h2 id="cap-6" className="cap__titulo cap__titulo--xl">
        <span>{t('inicio.c6.linea1')}</span>
        <span className="cap__oro">{t('inicio.c6.linea2')}</span>
      </h2>
      <div className="cap__acciones">
        <Link to="/mapa" className="btn btn--primario">
          {t('inicio.c6.cta1')}
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link to="/laboratorio" className="btn">
          {t('inicio.c6.cta2')}
        </Link>
      </div>
    </div>
  );
}

function Fuentes({
  ligera,
  onCambiar,
  textoCambiar,
  puedeAnimar,
}: {
  ligera: boolean;
  onCambiar: () => void;
  textoCambiar: string;
  puedeAnimar: boolean;
}) {
  const { t } = useTranslation();
  return (
    <footer className="inicio__fuentes">
      <div className="fuentes__cuerpo">
        <div className="fuentes__cabeza">
          <h2>{t('inicio.fuentes.titulo')}</h2>
          <p>{t('inicio.fuentes.nota')}</p>
          {(!ligera || puedeAnimar) && (
            <button type="button" className="btn btn--fantasma fuentes__version" onClick={onCambiar}>
              {ligera ? <Clapperboard aria-hidden="true" /> : <Feather aria-hidden="true" />}
              {textoCambiar}
            </button>
          )}
        </div>
        <ol className="fuentes__lista">
          {FUENTES_INICIO.map((f) => (
            <li key={f.id}>
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.titulo}
                <ExternalLink aria-hidden="true" />
              </a>
              <span className="fuentes__autor">
                {f.autor} · {f.anio}
              </span>
              <span className="fuentes__uso">{f.uso}</span>
            </li>
          ))}
        </ol>
      </div>
    </footer>
  );
}
