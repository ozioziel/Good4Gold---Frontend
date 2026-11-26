import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, ArrowUpRight, CloudCheck } from 'lucide-react';
import { CARTAS, CATEGORIAS, type Categoria } from '@/data/cartas';
import { Ilustracion } from './Ilustracion';
import { Planta } from './Planta';
import './informate.css';

/**
 * Infórmate. Registro: cálido-editorial (crema, verde desaturado y dorado), movimiento nivel 2, sin 3D.
 * Una idea por carta, sin avance automático. La planta del borde inferior crece al recorrerlas.
 */
export default function Informate() {
  const { t } = useTranslation();
  const [cat, setCat] = useState<Categoria | 'todas'>('todas');
  const [actual, setActual] = useState(0);
  const [visto, setVisto] = useState(0);
  const [offline, setOffline] = useState(false);
  const pista = useRef<HTMLUListElement>(null);
  const cartas = useMemo(() => (cat === 'todas' ? CARTAS : CARTAS.filter((c) => c.categoria === cat)), [cat]);

  // La carta actual se deduce del scroll (funciona igual con dedo, rueda, flechas o teclado).
  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    let raf = 0;
    const medir = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const primera = el.firstElementChild as HTMLElement | null;
        if (!primera) return;
        const paso = primera.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0');
        const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        const i = fin ? cartas.length - 1 : Math.round(el.scrollLeft / paso);
        setActual(i);
        setVisto((v) => Math.max(v, i));
      });
    };
    el.addEventListener('scroll', medir, { passive: true });
    return () => {
      el.removeEventListener('scroll', medir);
      cancelAnimationFrame(raf);
    };
  }, [cartas.length]);

  useEffect(() => {
    pista.current?.scrollTo({ left: 0 });
    setActual(0);
    setVisto(0);
  }, [cat]);

  useEffect(() => {
    navigator.serviceWorker?.getRegistration?.().then((r) => setOffline(Boolean(r?.active)));
  }, []);

  const ir = useCallback(
    (i: number) => {
      const el = pista.current;
      const objetivo = el?.children[Math.max(0, Math.min(cartas.length - 1, i))] as HTMLElement | undefined;
      if (!el || !objetivo) return;
      const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollTo({ left: objetivo.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: reducido ? 'auto' : 'smooth' });
    },
    [cartas.length],
  );

  const progreso = cartas.length > 1 ? visto / (cartas.length - 1) : 1;

  return (
    <div className="informate">
      <header className="informate__cabeza">
        <p className="overline-crema">{t('informate.overline')}</p>
        <h1>{t('informate.titulo')}</h1>
        <p className="informate__lema">{t('informate.lema')}</p>
        {offline && (
          <p className="informate__offline">
            <CloudCheck aria-hidden="true" />
            {t('informate.sinConexion')}
          </p>
        )}
      </header>

      <div className="temas" role="group" aria-label={t('informate.filtros')}>
        {(['todas', ...CATEGORIAS] as const).map((k) => (
          <button key={k} type="button" className="tema" aria-pressed={cat === k} onClick={() => setCat(k)}>
            {k === 'todas' ? t('informate.todas') : t(`informate.categorias.${k}`)}
          </button>
        ))}
      </div>

      <section className="carrusel" aria-roledescription="carrusel" aria-label={t('informate.carrusel')}>
        <ul
          ref={pista}
          className="carrusel__pista"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              ir(actual + 1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              ir(actual - 1);
            }
          }}
        >
          {cartas.map((c, i) => (
            <li key={c.id} className="carta" role="group" aria-roledescription="carta" aria-label={t('informate.cartaDe', { n: i + 1, total: cartas.length })}>
              <div className={`carta__ilus carta__ilus--${c.categoria}`}>
                <Ilustracion ilus={c.ilus} />
              </div>
              <div className="carta__cuerpo">
                <p className="carta__categoria">{t(`informate.categorias.${c.categoria}`)}</p>
                <h2>{c.titulo}</h2>
                <p className="carta__texto">{c.texto}</p>
              </div>
              <footer className="carta__pie">
                {c.fuente.url.startsWith('/') ? (
                  <Link to={c.fuente.url} className="carta__fuente">
                    {c.fuente.titulo}
                  </Link>
                ) : (
                  <a href={c.fuente.url} target="_blank" rel="noreferrer" className="carta__fuente">
                    {t('informate.verFuente')}: {c.fuente.titulo}
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                )}
                {c.accion && (
                  <Link to={c.accion.to} className="carta__accion">
                    {c.accion.texto}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )}
                <span className="carta__estado" title={t('informate.enRevisionNota')}>
                  {t('informate.enRevision')}
                </span>
              </footer>
            </li>
          ))}
        </ul>

        <div className="carrusel__controles">
          <button type="button" className="flecha" onClick={() => ir(actual - 1)} disabled={actual === 0} aria-label={t('informate.anterior')}>
            <ArrowLeft aria-hidden="true" />
          </button>
          <p className="carrusel__cuenta num" aria-live="polite">
            <strong>{String(actual + 1).padStart(2, '0')}</strong> / {String(cartas.length).padStart(2, '0')}
          </p>
          <div className="carrusel__barra" aria-hidden="true">
            <span style={{ transform: `scaleX(${(actual + 1) / cartas.length})` }} />
          </div>
          <button type="button" className="flecha" onClick={() => ir(actual + 1)} disabled={actual >= cartas.length - 1} aria-label={t('informate.siguiente')}>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </section>

      <Planta progreso={progreso} />
    </div>
  );
}
