import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ChevronDown, Droplets, FlaskConical, MessageCircle, Plus, Satellite, Users, Waves, X } from 'lucide-react';
import type { Lugar } from '@/data/mapa-lugares';
import { ESTUDIO_REGIONAL } from '@/data/mapa-lugares';
import { useMapa } from './estado';
import { cssTono, tonoComunidad, tonoOficial, tonoVirtual } from './senales';

/**
 * Tarjeta de un río o lugar: solo tres señales, siempre separadas. Cada fila se abre para ver el porqué.
 * Comunidad ≠ Laboratorio virtual ≠ Laboratorio oficial: ninguna reemplaza a la otra.
 */
export function Tarjeta({ lugar, onCerrar, onPublicar, onVer }: { lugar: Lugar; onCerrar: () => void; onPublicar: () => void; onVer: () => void }) {
  const { t } = useTranslation();
  const { senales, publicacionesDe } = useMapa();
  const s = senales(lugar);
  const n = publicacionesDe(lugar.id).length;
  const Icono = lugar.tipo === 'rio' || lugar.tipo === 'arroyo' ? Waves : Droplets;

  const valorComunidad =
    s.comunidad.nivel === 'riesgoso'
      ? t('mapa.comunidad.riesgoso')
      : s.comunidad.nivel === 'reportes'
        ? t('mapa.comunidad.reportes', { count: s.comunidad.reportes })
        : t('mapa.comunidad.sin_reportes');
  const detalleComunidad =
    s.comunidad.nivel === 'riesgoso'
      ? t('mapa.comunidad.detalle_riesgoso', { count: s.comunidad.respaldos })
      : s.comunidad.nivel === 'reportes'
        ? t('mapa.comunidad.detalle_reportes')
        : t('mapa.comunidad.detalle_sin_reportes');

  return (
    <section className="tarjeta vidrio" aria-labelledby="tarjeta-titulo">
      <header className="tarjeta__cabeza">
        <span className="tarjeta__icono" aria-hidden="true">
          <Icono />
        </span>
        <div className="tarjeta__nombre">
          <h2 id="tarjeta-titulo">{lugar.nombre}</h2>
          {(lugar.cerca || lugar.ficticio) && <p>{lugar.ficticio ? t('mapa.ficticio') : lugar.cerca}</p>}
        </div>
        {lugar.ficticio && <span className="etiqueta-demo">{t('mapa.demo')}</span>}
        <button type="button" className="boton-redondo" onClick={onCerrar} aria-label={t('mapa.cerrar')}>
          <X aria-hidden="true" />
        </button>
      </header>

      <ul className="senales">
        <Senal icono={<Users />} etiqueta={t('mapa.senales.comunidad')} valor={valorComunidad} tono={cssTono(tonoComunidad(s.comunidad.nivel))}>
          <p>{detalleComunidad}</p>
        </Senal>
        <Senal icono={<Satellite />} etiqueta={t('mapa.senales.virtual')} valor={t(`mapa.virtual.${lugar.virtual.nivel}`)} tono={cssTono(tonoVirtual(lugar.virtual.nivel))} estimacion>
          <p>{lugar.virtual.detalle}</p>
          <p className="senal__nota">{t('mapa.virtual.nota')}</p>
          <Link className="senal__enlace" to={`/laboratorio?lat=${lugar.lat.toFixed(4)}&lon=${lugar.lon.toFixed(4)}`}>
            {t('mapa.abrirLaboratorio')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Senal>
        <Senal
          icono={<FlaskConical />}
          etiqueta={t('mapa.senales.oficial')}
          valor={lugar.oficial.valor ? `${t(`mapa.oficial.${s.oficial}`)} · ${lugar.oficial.valor}` : t(`mapa.oficial.${s.oficial}`)}
          tono={cssTono(tonoOficial(s.oficial))}
        >
          <p>{s.oficial === 'solicitado' ? t('mapa.analisisPedido') : lugar.oficial.detalle}</p>
          {!lugar.ficticio && (
            <a className="senal__enlace" href={ESTUDIO_REGIONAL.url} target="_blank" rel="noreferrer">
              {t('mapa.verEstudio')}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </Senal>
      </ul>

      <footer className="tarjeta__acciones">
        <button type="button" className="boton-oro" onClick={onPublicar}>
          <Plus aria-hidden="true" />
          {t('mapa.publicarAqui')}
        </button>
        <button type="button" className="boton-linea" onClick={onVer} disabled={n === 0}>
          <MessageCircle aria-hidden="true" />
          <span className="num">{t('mapa.publicaciones', { count: n })}</span>
        </button>
      </footer>
    </section>
  );
}

function Senal({
  icono,
  etiqueta,
  valor,
  tono,
  estimacion,
  children,
}: {
  icono: ReactNode;
  etiqueta: string;
  valor: string;
  tono: string;
  estimacion?: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <li className={'senal' + (abierta ? ' is-abierta' : '')} style={{ ['--tono' as string]: tono }}>
      <button type="button" className="senal__fila" aria-expanded={abierta} onClick={() => setAbierta((a) => !a)}>
        <span className={'senal__icono' + (estimacion ? ' senal__icono--estimacion' : '')} aria-hidden="true">
          {icono}
        </span>
        <span className="senal__etiqueta">{etiqueta}</span>
        <span className="senal__valor">{valor}</span>
        <ChevronDown className="senal__flecha" aria-hidden="true" />
      </button>
      {abierta && <div className="senal__detalle">{children}</div>}
    </li>
  );
}
