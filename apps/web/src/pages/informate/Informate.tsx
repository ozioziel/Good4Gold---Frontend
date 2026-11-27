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
 * Una carta por pantalla, sin avance automático: flechas, teclado o deslizamiento. La planta del borde
 * inferior crece al recorrerlas.
 */
type Dir = 1 | -1;
const DURACION_MS = 420;

export default function Informate() {
  const { t } = useTranslation();
  const [cat, setCat] = useState<Categoria | 'todas'>('todas');
  // Visor de una carta por pantalla: la actual entra y la anterior sale deslizándose según la dirección.
  const [estado, setEstado] = useState<{ actual: number; previa: number | null; dir: Dir }>({ actual: 0, previa: null, dir: 1 });
  const [visto, setVisto] = useState(0);
  const [offline, setOffline] = useState(false);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const reloj = useRef(0);
  const cartas = useMemo(() => (cat === 'todas' ? CARTAS : CARTAS.filter((c) => c.categoria === cat)), [cat]);
  const { actual, previa, dir } = estado;

  useEffect(() => {
    setEstado({ actual: 0, previa: null, dir: 1 });
    setVisto(0);
  }, [cat]);

  useEffect(() => {
    navigator.serviceWorker?.getRegistration?.().then((r) => setOffline(Boolean(r?.active)));
    return () => clearTimeout(reloj.current);
  }, []);

  const ir = useCallback(
    (i: number) => {
      const destino = Math.max(0, Math.min(cartas.length - 1, i));
      if (destino === actual) return;
      clearTimeout(reloj.current);
      setEstado({ actual: destino, previa: actual, dir: destino > actual ? 1 : -1 });
      setVisto((v) => Math.max(v, destino));
      // La carta que sale se retira del DOM al terminar su animación.
      reloj.current = window.setTimeout(() => setEstado((e) => ({ ...e, previa: null })), DURACION_MS);
    },
    [actual, cartas.length],
  );

  const progreso = cartas.length > 1 ? visto / (cartas.length - 1) : 1;

  const carta = (i: number, fase: 'entra' | 'sale') => {
    const c = cartas[i];
    if (!c) return null;
    return (
      <article
        key={`${c.id}-${fase}`}
        className={`carta carta--${fase} carta--dir${dir === 1 ? 'Der' : 'Izq'}`}
        role="group"
        aria-roledescription="carta"
        aria-label={t('informate.cartaDe', { n: i + 1, total: cartas.length })}
        aria-hidden={fase === 'sale' || undefined}
        inert={fase === 'sale' || undefined}
      >
        <div className={`carta__ilus carta__ilus--${c.categoria}`}>
          <Ilustracion ilus={c.ilus} />
        </div>
        <div className="carta__contenido">
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
        </div>
      </article>
    );
  };

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

      <section
        className="visor"
        aria-roledescription="carrusel"
        aria-label={t('informate.carrusel')}
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
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') toque.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const inicio = toque.current;
          toque.current = null;
          if (!inicio) return;
          const dx = e.clientX - inicio.x;
          // Deslizamiento horizontal claro (no un desplazamiento vertical de la página).
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - inicio.y) * 1.5) ir(actual + (dx < 0 ? 1 : -1));
        }}
      >
        <button type="button" className="flecha flecha--izq" onClick={() => ir(actual - 1)} disabled={actual === 0} aria-label={t('informate.anterior')}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <div className="visor__marco">
          {previa !== null && carta(previa, 'sale')}
          {carta(actual, 'entra')}
        </div>
        <button type="button" className="flecha flecha--der" onClick={() => ir(actual + 1)} disabled={actual >= cartas.length - 1} aria-label={t('informate.siguiente')}>
          <ArrowRight aria-hidden="true" />
        </button>

        <div className="visor__progreso">
          <p className="carrusel__cuenta num" aria-live="polite">
            <strong>{String(actual + 1).padStart(2, '0')}</strong> / {String(cartas.length).padStart(2, '0')}
          </p>
          <div className="carrusel__barra" aria-hidden="true">
            <span style={{ transform: `scaleX(${(actual + 1) / cartas.length})` }} />
          </div>
        </div>
      </section>

      <Planta progreso={progreso} />
    </div>
  );
}
