import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Columns2,
  Download,
  FlaskConical,
  Globe2,
  Layers,
  Map as MapaIcono,
  Pentagon,
  Satellite,
  Save,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { ANIOS_S2, CAPAS, ESTUDIOS, MODELO, atribucionS2, type AnioS2, type IdCapa } from '@/data/laboratorio';
import { LUGARES } from '@/data/mapa-lugares';
import { LOCALIDADES_BENI } from '@/data/localidades-beni';
import { useSolicitudes } from '@/app/useSolicitudes';
import { api, hayApi, type TramosApi } from '@/lib/api';
import { useSesion } from '@/app/sesion';
import { cssTono, tonoOficial, tonoVirtual } from '../mapa/senales';
import type { GloboLab, PuntoLab } from './GloboLab';
import { areaKm2, dentro, indicadoresDemo, informeMarkdown } from './zona';
import './laboratorio.css';

type IdPanel = 'explorador' | 'satelites' | 'ia' | 'mediciones' | 'estudios' | 'solicitudes' | 'investigar';
const HERRAMIENTAS: { id: IdPanel; icono: typeof Layers }[] = [
  { id: 'explorador', icono: Layers },
  { id: 'satelites', icono: Satellite },
  { id: 'ia', icono: Brain },
  { id: 'mediciones', icono: FlaskConical },
  { id: 'estudios', icono: BookOpen },
  { id: 'solicitudes', icono: Users },
  { id: 'investigar', icono: Pentagon },
];

/**
 * Laboratorio. Registro: sobrio-profesional tipo observatorio; movimiento nivel 1–2.
 * 3D: sí, el globo es la herramienta (el territorio es el contenido); con modo 2D a un toque.
 */
export default function Laboratorio() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { esInstitucion } = useSesion();
  const lienzo = useRef<HTMLDivElement>(null);
  const lienzoB = useRef<HTMLDivElement>(null);
  const globo = useRef<GloboLab | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(false);
  const [panel, setPanel] = useState<IdPanel | null>(innerWidth >= 900 ? 'explorador' : null);
  const [capas, setCapas] = useState<Set<IdCapa>>(new Set(['s2', 'rios', 'tramos', 'lugares', 'mediciones', 'estudios']));
  // Prioridad de muestreo por tramo (pipeline science/, vía API). Sin API: null y el panel muestra la demo.
  const [tramos, setTramos] = useState<TramosApi | null>(null);
  useEffect(() => {
    if (hayApi) api.laboratorioTramos().then((fc) => fc.features.length && setTramos(fc)).catch(() => undefined);
  }, []);
  const [anio, setAnio] = useState<AnioS2>(2025);
  const [anioB, setAnioB] = useState<AnioS2>(2016);
  const [fecha, setFecha] = useState(() => new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10));
  const [comparando, setComparando] = useState(false);
  const [corte, setCorte] = useState(50);
  const [esGlobo, setEsGlobo] = useState(true);
  const [vista, setVista] = useState({ lat: -16.6, lon: -64.9, zoom: 2.2 });
  const [punto, setPunto] = useState<PuntoLab | null>(null);
  const [dibujo, setDibujo] = useState<'no' | 'dibujando' | 'cerrado'>('no');
  const [vertices, setVertices] = useState(0);
  const [poligono, setPoligono] = useState<[number, number][] | null>(null);

  const { lista: solicitudes } = useSolicitudes();
  const puntos = useMemo<PuntoLab[]>(() => {
    const lugares = LUGARES.map((l) => ({
      id: l.id,
      capa: 'lugares' as const,
      nombre: l.nombre,
      lat: l.lat,
      lon: l.lon,
      tono: l.virtual.nivel === 'posible_riesgo' ? ('riesgo' as const) : ('neutro' as const),
      ficticio: l.ficticio,
    }));
    const mediciones = LUGARES.filter((l) => l.oficial.valor).map((l) => ({
      id: l.id,
      capa: 'mediciones' as const,
      nombre: `${l.nombre} · ${l.oficial.valor}`,
      lat: l.lat + 0.03,
      lon: l.lon + 0.03,
      tono: tonoOficial(l.oficial.nivel),
      ficticio: true,
    }));
    const sols = solicitudes
      .map((s) => ({ s, l: LUGARES.find((l) => l.id === s.lugarId) }))
      .filter((x) => x.l)
      .map(({ s, l }) => ({ id: s.id, capa: 'solicitudes' as const, nombre: s.lugar, lat: l!.lat - 0.03, lon: l!.lon - 0.03, tono: 'proceso' as const, ficticio: true }));
    const estudios = ESTUDIOS.map((e) => ({ id: e.id, capa: 'estudios' as const, nombre: e.titulo, lat: e.lat, lon: e.lon, tono: 'proceso' as const, ficticio: false }));
    return [...lugares, ...mediciones, ...sols, ...estudios];
  }, [solicitudes]);

  // Globo: se crea una vez, fuera de React.
  useEffect(() => {
    if (!lienzo.current) return;
    let vivo = true;
    import('./GloboLab').then(({ GloboLab }) => {
      if (!vivo || !lienzo.current) return;
      try {
        globo.current = new GloboLab(lienzo.current, {
          onListo: () => setListo(true),
          onError: () => setError(true),
          onPunto: ({ id, capa }) => setPunto(puntos.find((p) => p.id === id && p.capa === capa) ?? null),
          onVista: setVista,
          onPoligono: (v) => {
            setPoligono(v);
            setDibujo('cerrado');
          },
        });
      } catch {
        setError(true);
      }
    });
    return () => {
      vivo = false;
      globo.current?.destroy();
      globo.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listo) globo.current?.setPuntos(puntos);
  }, [listo, puntos]);
  useEffect(() => {
    if (listo && tramos) globo.current?.setTramos(tramos);
  }, [listo, tramos]);
  useEffect(() => {
  }, [listo, puntos]);
  useEffect(() => globo.current?.setCapas(capas), [capas]);
  useEffect(() => globo.current?.setAnio(anio), [anio]);
  useEffect(() => globo.current?.setFecha(fecha), [fecha]);
  useEffect(() => globo.current?.setGlobo(esGlobo), [esGlobo]);

  // Llegada desde el Mapa comunitario: /laboratorio?lat=…&lon=…
  useEffect(() => {
    const lat = Number(params.get('lat'));
    const lon = Number(params.get('lon'));
    if (listo && Number.isFinite(lat) && Number.isFinite(lon) && params.get('lat')) globo.current?.volar(lat, lon, 11);
  }, [listo, params]);

  useEffect(() => {
    if (!comparando || !lienzoB.current) {
      globo.current?.cerrarComparador();
      return;
    }
    globo.current?.abrirComparador(lienzoB.current, anioB);
  }, [comparando, anioB]);

  const alternar = (c: IdCapa) =>
    setCapas((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  const abrir = (p: IdPanel) => {
    setPanel((actual) => (actual === p ? null : p));
    if (p === 'investigar' && dibujo === 'no') {
      globo.current?.empezarDibujo();
      setDibujo('dibujando');
      setVertices(0);
    }
  };

  // Contador de vértices mientras se dibuja.
  useEffect(() => {
    if (dibujo !== 'dibujando') return;
    const id = setInterval(() => setVertices(globo.current?.verticesActuales ?? 0), 200);
    return () => clearInterval(id);
  }, [dibujo]);

  const cancelarZona = () => {
    globo.current?.limpiarZona();
    setDibujo('no');
    setPoligono(null);
    setPanel(null);
  };

  return (
    <div className={'lab' + (dibujo === 'dibujando' ? ' is-dibujando' : '')}>
      <h1 className="sr-only">{t('laboratorio.titulo')}</h1>
      <div ref={lienzo} className="lab__globo" role="region" aria-label={t('laboratorio.globoEtiqueta')} />
      {comparando && (
        <>
          <div ref={lienzoB} className="lab__globo lab__globo--b" style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }} aria-hidden="true" />
          <div className="comparador" style={{ left: `${corte}%` }} aria-hidden="true">
            <span className="comparador__año comparador__año--a num">{anioB}</span>
            <span className="comparador__año comparador__año--b num">{anio}</span>
          </div>
          <label className="sr-only" htmlFor="corte">
            {t('laboratorio.deslizar')}
          </label>
          <input id="corte" className="comparador__control" type="range" min={0} max={100} value={corte} onChange={(e) => setCorte(Number(e.target.value))} />
        </>
      )}
      {!listo && !error && <div className="lab__cargando" aria-hidden="true" />}
      {error && (
        <p className="lab__error" role="alert">
          {t('laboratorio.error')}
        </p>
      )}

      {/* Barra de herramientas */}
      <nav className="lab__riel vidrio" aria-label={t('laboratorio.herramientas')}>
        {HERRAMIENTAS.map(({ id, icono: Icono }) => (
          <button key={id} type="button" className="riel__boton" aria-pressed={panel === id} onClick={() => abrir(id)} title={t(`laboratorio.paneles.${id}`)}>
            <Icono aria-hidden="true" />
            <span>{t(`laboratorio.paneles.${id}`)}</span>
          </button>
        ))}
      </nav>

      {/* HUD */}
      <div className="lab__hud">
        <p className="hud-lab num" aria-hidden="true">
          {Math.abs(vista.lat).toFixed(2)}°{vista.lat < 0 ? 'S' : 'N'} · {Math.abs(vista.lon).toFixed(2)}°{vista.lon < 0 ? 'O' : 'E'} · z{vista.zoom.toFixed(1)}
        </p>
        <div className="segmento" role="group">
          <button type="button" aria-pressed={esGlobo} onClick={() => setEsGlobo(true)}>
            <Globe2 aria-hidden="true" />
            {t('laboratorio.globo')}
          </button>
          <button type="button" aria-pressed={!esGlobo} onClick={() => setEsGlobo(false)}>
            <MapaIcono aria-hidden="true" />
            {t('laboratorio.plano')}
          </button>
        </div>
      </div>

      {/* Línea de tiempo de Sentinel-2 */}
      {capas.has('s2') && (
        <div className="linea-tiempo vidrio">
          {!comparando && <span className="linea-tiempo__etiqueta">{t('laboratorio.anio')}</span>}
          <div className="linea-tiempo__anios" role="radiogroup" aria-label={t('laboratorio.anio')}>
            {ANIOS_S2.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={anio === a} className="num" onClick={() => setAnio(a)}>
                {a}
              </button>
            ))}
          </div>
          <button type="button" className={'boton-lab' + (comparando ? ' is-activo' : '')} onClick={() => setComparando((c) => !c)}>
            <Columns2 aria-hidden="true" />
            {comparando ? t('laboratorio.compararCerrar') : t('laboratorio.comparar')}
          </button>
          {comparando && (
            <label className="linea-tiempo__b">
              {t('laboratorio.antes')}
              <select value={anioB} onChange={(e) => setAnioB(Number(e.target.value) as AnioS2)} className="num">
                {ANIOS_S2.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Paneles */}
      {panel && (
        <aside className="lab__panel vidrio" aria-labelledby="panel-titulo">
          <header className="lab__panel-cabeza">
            <h2 id="panel-titulo">{t(`laboratorio.paneles.${panel}`)}</h2>
            <button type="button" className="boton-redondo" onClick={() => (panel === 'investigar' ? cancelarZona() : setPanel(null))} aria-label={t('mapa.cerrar')}>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="lab__panel-cuerpo">
            {panel === 'explorador' && <Explorador capas={capas} alternar={alternar} />}
            {panel === 'satelites' && <Satelites anio={anio} fecha={fecha} setFecha={setFecha} capas={capas} alternar={alternar} />}
            {panel === 'ia' && <PanelIA tramos={tramos} onVer={(lat, lon) => globo.current?.volar(lat, lon, 10)} />}
            {panel === 'mediciones' && <Mediciones onVer={(lat, lon) => globo.current?.volar(lat, lon, 11)} />}
            {panel === 'estudios' && <Estudios onVer={(lat, lon) => globo.current?.volar(lat, lon, 7)} />}
            {panel === 'solicitudes' && <Solicitudes esInstitucion={esInstitucion} onVer={(lat, lon) => globo.current?.volar(lat, lon, 11)} />}
            {panel === 'investigar' && (
              <Investigar
                estado={dibujo}
                vertices={vertices}
                poligono={poligono}
                globo={globo.current}
                onCerrar={() => globo.current?.cerrarPoligono()}
                onDeshacer={() => globo.current?.deshacerVertice()}
                onNueva={() => {
                  globo.current?.empezarDibujo();
                  setPoligono(null);
                  setDibujo('dibujando');
                }}
                onCancelar={cancelarZona}
              />
            )}
          </div>
        </aside>
      )}

      {/* Ficha del punto tocado */}
      {punto && !panel?.startsWith('investigar') && (
        <div className="lab__ficha vidrio" role="status">
          <span className="lab__ficha-tono" style={{ background: cssTono(punto.tono) }} aria-hidden="true" />
          <div>
            <p className="lab__ficha-capa">
              {t(`laboratorio.capas.${punto.capa}`)} {punto.ficticio && <span className="etiqueta-demo">{t('mapa.demo')}</span>}
            </p>
            <p className="lab__ficha-nombre">{punto.nombre}</p>
          </div>
          {punto.capa !== 'estudios' && (
            <Link className="boton-lab" to="/mapa">
              {t('laboratorio.irMapa')}
            </Link>
          )}
          <button type="button" className="boton-redondo" onClick={() => setPunto(null)} aria-label={t('mapa.cerrar')}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <p className="lab__atribucion">{capas.has('s2') ? atribucionS2(comparando ? anioB : anio) : ''}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Paneles

function Explorador({ capas, alternar }: { capas: Set<IdCapa>; alternar: (c: IdCapa) => void }) {
  const { t } = useTranslation();
  const grupos = ['imagen', 'territorio', 'evidencia'] as const;
  return (
    <>
      <p className="lab__nota">{t('laboratorio.noMideHg')}</p>
      {grupos.map((g) => (
        <section key={g} className="grupo-capas">
          <h3>{t(`laboratorio.grupos.${g}`)}</h3>
          <ul>
            {CAPAS.filter((c) => c.grupo === g).map((c) => (
              <li key={c.id}>
                <label className="capa">
                  <input type="checkbox" checked={capas.has(c.id)} onChange={() => alternar(c.id)} />
                  <span className={`capa__muestra capa__muestra--${c.id}`} aria-hidden="true" />
                  <span className="capa__nombre">
                    {t(`laboratorio.capas.${c.id}`)}
                    <span className="capa__fuente">
                      {c.fuente}
                      {c.resolucion ? ` · ${c.resolucion}` : ''}
                    </span>
                  </span>
                  <span className={c.real ? 'capa__real' : 'etiqueta-demo'}>{c.real ? t('laboratorio.real') : t('laboratorio.demo')}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Satelites({ anio, fecha, setFecha, capas, alternar }: { anio: AnioS2; fecha: string; setFecha: (f: string) => void; capas: Set<IdCapa>; alternar: (c: IdCapa) => void }) {
  const { t } = useTranslation();
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Fila titulo={t('laboratorio.capas.s2')} real>
        <p>
          {t('laboratorio.sinNubes')} · <span className="num">{anio}</span> · 10 m
        </p>
        <p className="lab__fuente">{atribucionS2(anio)}</p>
      </Fila>
      <Fila titulo={t('laboratorio.capas.modis')} real>
        <label className="campo-lab">
          {t('laboratorio.fecha')}
          <input type="date" value={fecha} max={hoy} min="2012-01-01" onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </label>
        <div className="chips">
          {(['modis', 'ndvi'] as const).map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={capas.has(c)} onClick={() => alternar(c)}>
              {t(`laboratorio.capas.${c}`)}
            </button>
          ))}
        </div>
        <p className="lab__fuente">NASA EOSDIS GIBS · MODIS Terra · 250 m</p>
      </Fila>
      <p className="lab__nota">{t('laboratorio.noMideHg')}</p>
    </>
  );
}

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2, insuficiente: 3 } as const;
const TONO_PRIORIDAD = { alta: 'alto', media: 'riesgo', baja: 'agua', insuficiente: 'neutro' } as const;

function PanelIA({ tramos, onVer }: { tramos: TramosApi | null; onVer: (lat: number, lon: number) => void }) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState<string | null>(null);
  const prioridadDemo = LUGARES.filter((l) => l.virtual.nivel !== 'sin_analisis');
  const lista = tramos
    ? [...tramos.features].sort(
        (a, b) =>
          ORDEN_PRIORIDAD[a.properties.prioridad ?? 'insuficiente'] - ORDEN_PRIORIDAD[b.properties.prioridad ?? 'insuficiente'] ||
          (b.properties.mineriaAguasArribaHa ?? 0) - (a.properties.mineriaAguasArribaHa ?? 0),
      )
    : [];
  return (
    <>
      {tramos ? (
        <Fila titulo={t('laboratorio.riesgoTitulo', { anio: lista[0]?.properties.anio ?? '' })}>
          <span className="estado-lab">{t('laboratorio.riesgoEstado')}</span>
          <p className="lab__nota">{tramos.aviso}</p>
          <ul className="lista-lab">
            {lista.map((f) => {
              const p = f.properties;
              const pr = p.prioridad ?? 'insuficiente';
              const medio = f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)]!;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-expanded={abierto === p.id}
                    onClick={() => {
                      setAbierto(abierto === p.id ? null : p.id);
                      onVer(medio[1]!, medio[0]!);
                    }}
                  >
                    <span className="punto-tono" style={{ background: cssTono(TONO_PRIORIDAD[pr]) }} aria-hidden="true" />
                    <span>
                      <strong>
                        {t('laboratorio.tramo', { rio: p.rio, n: p.id.split('-').pop() })}
                      </strong>
                      <span className="num">{t('laboratorio.mineriaArriba', { ha: Math.round(p.mineriaAguasArribaHa ?? 0).toLocaleString('es-BO') })}</span>
                    </span>
                    <span className="lista-lab__valor" style={{ color: cssTono(TONO_PRIORIDAD[pr]) }}>
                      {t(`laboratorio.prioridades.${pr}`)}
                    </span>
                  </button>
                  {abierto === p.id && (
                    <div className="lab__detalle">
                      {(p.reglas ?? []).map((r) => (
                        <p key={r.id}>
                          <strong>{r.id}</strong> · {r.texto}
                        </p>
                      ))}
                      {(p.faltantes ?? []).map((x) => (
                        <p key={x} className="lab__nota">
                          {t('laboratorio.falta')}: {x}
                        </p>
                      ))}
                      {!p.reglas?.length && !p.faltantes?.length && <p className="lab__nota">{t('laboratorio.sinReglas')}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="lab__nota">{t('laboratorio.riesgoFuentes')}</p>
        </Fila>
      ) : (
        <Fila titulo={t('laboratorio.iaPrioridad')} demo>
          <p className="lab__nota">{t('laboratorio.iaPrioridadNota')}</p>
          <ul className="lista-lab">
            {prioridadDemo.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onVer(l.lat, l.lon)}>
                  <span className="punto-tono" style={{ background: cssTono(tonoVirtual(l.virtual.nivel)) }} aria-hidden="true" />
                  <span>
                    <strong>{l.nombre}</strong>
                    <span>{l.virtual.detalle}</span>
                  </span>
                  <span className="lista-lab__valor" style={{ color: cssTono(tonoVirtual(l.virtual.nivel)) }}>
                    {t(`mapa.virtual.${l.virtual.nivel}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Fila>
      )}
      <Fila titulo={t('laboratorio.iaTitulo')}>
        <span className="estado-lab">{t('laboratorio.iaEstado')}</span>
        <p>{t('laboratorio.iaTexto')}</p>
        <ol className="pasos-lab">
          {MODELO.pasos.map((p) => (
            <li key={p.id} className={p.hecho ? 'is-hecho' : ''}>
              {t(`laboratorio.iaPasos.${p.id}`)}
            </li>
          ))}
        </ol>
        <p className="lab__nota">{t('laboratorio.iaSinPrediccion')}</p>
      </Fila>
    </>
  );
}

function Mediciones({ onVer }: { onVer: (lat: number, lon: number) => void }) {
  const { t } = useTranslation();
  const lista = LUGARES.filter((l) => l.oficial.nivel !== 'sin_analisis');
  return (
    <>
      <p className="lab__nota">{t('laboratorio.medTexto')}</p>
      <ul className="lista-lab">
        {lista.map((l) => (
          <li key={l.id}>
            <button type="button" onClick={() => onVer(l.lat, l.lon)}>
              <span className="punto-tono" style={{ background: cssTono(tonoOficial(l.oficial.nivel)) }} aria-hidden="true" />
              <span>
                <strong>
                  {l.nombre} {l.ficticio && <span className="etiqueta-demo">{t('mapa.demo')}</span>}
                </strong>
                <span>{l.oficial.detalle}</span>
              </span>
              <span className="lista-lab__valor num" style={{ color: cssTono(tonoOficial(l.oficial.nivel)) }}>
                {l.oficial.valor ?? t(`mapa.oficial.${l.oficial.nivel}`)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="lab__nota">{t('laboratorio.medVacio')}</p>
    </>
  );
}

function Estudios({ onVer }: { onVer: (lat: number, lon: number) => void }) {
  const { t } = useTranslation();
  const [tipo, setTipo] = useState<'todos' | 'articulo' | 'dataset' | 'informe'>('todos');
  const lista = ESTUDIOS.filter((e) => tipo === 'todos' || e.tipo === tipo).sort((a, b) => b.anio - a.anio);
  return (
    <>
      <p className="lab__nota">{t('laboratorio.estTexto')}</p>
      <div className="chips">
        {(['todos', 'articulo', 'dataset', 'informe'] as const).map((k) => (
          <button key={k} type="button" className="chip" aria-pressed={tipo === k} onClick={() => setTipo(k)}>
            {k === 'todos' ? t('laboratorio.estTodos') : t(`laboratorio.estTipos.${k}`)}
          </button>
        ))}
      </div>
      <ul className="estudios-lab">
        {lista.map((e) => (
          <li key={e.id} className="estudio-lab">
            <p className="estudio-lab__meta num">
              {t(`laboratorio.estTipos.${e.tipo}`)} · {e.anio} · {e.zona}
            </p>
            <p className="estudio-lab__titulo">{e.titulo}</p>
            <p className="estudio-lab__autores">{e.autores}</p>
            <p className="estudio-lab__nota">{e.nota}</p>
            <div className="estudio-lab__acciones">
              <a href={e.url} target="_blank" rel="noreferrer" className="boton-lab">
                {t('laboratorio.abrirFuente')}
                <ArrowUpRight aria-hidden="true" />
              </a>
              <button type="button" className="boton-lab" onClick={() => onVer(e.lat, e.lon)}>
                {t('laboratorio.verEnGlobo')}
              </button>
              {e.descargable && <span className="capa__real">{t('laboratorio.estDescargable')}</span>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Solicitudes({ esInstitucion, onVer }: { esInstitucion: boolean; onVer: (lat: number, lon: number) => void }) {
  const { t } = useTranslation();
  const { lista } = useSolicitudes();
  return (
    <>
      <p className="lab__nota">{t('laboratorio.solTexto')}</p>
      <ul className="lista-lab">
        {lista.map((s) => {
          const l = LUGARES.find((x) => x.id === s.lugarId);
          return (
            <li key={s.id}>
              <button type="button" onClick={() => l && onVer(l.lat, l.lon)}>
                <span className="punto-tono" style={{ background: cssTono('proceso') }} aria-hidden="true" />
                <span>
                  <strong>{s.lugar}</strong>
                  <span>«{s.motivo}»</span>
                </span>
                <span className="lista-lab__valor">{t(`cuenta.estados.${s.estado}`)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Link className="boton-oro boton-oro--ancho" to={esInstitucion ? '/panel' : '/login'}>
        {t('laboratorio.irPanel')}
      </Link>
    </>
  );
}

function Investigar({
  estado,
  vertices,
  poligono,
  globo,
  onCerrar,
  onDeshacer,
  onNueva,
  onCancelar,
}: {
  estado: 'no' | 'dibujando' | 'cerrado';
  vertices: number;
  poligono: [number, number][] | null;
  globo: GloboLab | null;
  onCerrar: () => void;
  onDeshacer: () => void;
  onNueva: () => void;
  onCancelar: () => void;
}) {
  const { t } = useTranslation();
  const [desde, setDesde] = useState<AnioS2>(2018);
  const [hasta, setHasta] = useState<AnioS2>(2025);
  const [informe, setInforme] = useState<ReturnType<typeof construir> | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [aviso, setAviso] = useState('');

  function construir(p: [number, number][]) {
    const area = areaKm2(p);
    const comunidades = [
      ...LOCALIDADES_BENI.filter((l) => dentro([l.lon, l.lat], p)).map((l) => l.nombre),
      ...LUGARES.filter((l) => l.ficticio && dentro([l.lon, l.lat], p)).map((l) => `${l.nombre} (demo)`),
    ];
    const cx = p.reduce((s, v) => s + v[0], 0) / p.length;
    const cy = p.reduce((s, v) => s + v[1], 0) / p.length;
    const estudios = ESTUDIOS.filter((e) => Math.hypot(e.lon - cx, e.lat - cy) < 4).map((e) => `${e.autores} (${e.anio})`);
    return {
      area,
      centro: [cy, cx] as [number, number],
      desde,
      hasta,
      imagenes: ANIOS_S2.filter((a) => a >= desde && a <= hasta),
      indicadores: indicadoresDemo(p, desde, hasta),
      rios: globo?.riosEnZona(p) ?? [],
      comunidades,
      estudios,
    };
  }

  if (estado === 'dibujando') {
    return (
      <>
        <p>{t('laboratorio.invPaso1')}</p>
        <p className="num lab__contador">{t('laboratorio.invVertices', { count: vertices })}</p>
        <div className="fila-botones">
          <button type="button" className="boton-oro" disabled={vertices < 3} onClick={onCerrar}>
            <Pentagon aria-hidden="true" />
            {t('laboratorio.invCerrar')}
          </button>
          <button type="button" className="boton-lab" disabled={vertices === 0} onClick={onDeshacer}>
            <Undo2 aria-hidden="true" />
            {t('laboratorio.invDeshacer')}
          </button>
          <button type="button" className="boton-lab" onClick={onCancelar}>
            {t('laboratorio.invCancelar')}
          </button>
        </div>
      </>
    );
  }

  if (!poligono) return null;

  if (!informe) {
    return (
      <>
        <p className="num lab__contador">
          {t('laboratorio.informeArea')}: {Math.round(areaKm2(poligono)).toLocaleString('es-BO')} km²
        </p>
        <div className="fila-campos">
          <label className="campo-lab">
            {t('laboratorio.invDesde')}
            <select value={desde} onChange={(e) => setDesde(Number(e.target.value) as AnioS2)} className="num">
              {ANIOS_S2.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="campo-lab">
            {t('laboratorio.invHasta')}
            <select value={hasta} onChange={(e) => setHasta(Number(e.target.value) as AnioS2)} className="num">
              {ANIOS_S2.filter((a) => a > desde).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="fila-botones">
          <button
            type="button"
            className="boton-oro"
            disabled={analizando}
            aria-busy={analizando}
            onClick={() => {
              setAnalizando(true);
              // Breve espera honesta: se consultan los datos cargados (ríos, lugares, estudios).
              setTimeout(() => {
                setInforme(construir(poligono));
                setAnalizando(false);
              }, 600);
            }}
          >
            {analizando ? t('laboratorio.invAnalizando') : t('laboratorio.invAnalizar')}
          </button>
          <button type="button" className="boton-lab" onClick={onNueva}>
            {t('laboratorio.invNueva')}
          </button>
        </div>
      </>
    );
  }

  const md = informeMarkdown(informe, (k, o) => t(k, (o ?? {}) as never));
  return (
    <div className="informe">
      <h3>{t('laboratorio.informe')}</h3>
      <dl className="informe__datos">
        <div>
          <dt>{t('laboratorio.informeArea')}</dt>
          <dd className="num">{Math.round(informe.area).toLocaleString('es-BO')} km²</dd>
        </div>
        <div>
          <dt>{t('laboratorio.informeImagenes')}</dt>
          <dd className="num">Sentinel-2 {informe.imagenes.join(', ')}</dd>
        </div>
      </dl>
      <section>
        <h4>
          {t('laboratorio.informeIndicadores')} <span className="etiqueta-demo">{t('mapa.demo')}</span>
        </h4>
        <ul className="indicadores">
          {informe.indicadores.map((i) => (
            <li key={i.clave}>
              <span>{t(`laboratorio.${i.clave}`)}</span>
              <strong className="num">{i.valor}</strong>
            </li>
          ))}
        </ul>
        <p className="lab__nota">{t('laboratorio.informeIndicadoresNota')}</p>
      </section>
      <Lista titulo={t('laboratorio.informeRios')} items={informe.rios} />
      <Lista titulo={t('laboratorio.informeComunidades')} items={informe.comunidades} />
      <Lista titulo={t('laboratorio.informeEstudios')} items={informe.estudios} />
      <section>
        <h4>{t('laboratorio.informeLimitaciones')}</h4>
        <ul className="informe__lista">
          {(t('laboratorio.limitaciones', { returnObjects: true }) as string[]).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
      <div className="fila-botones">
        <button
          type="button"
          className="boton-lab"
          onClick={() => {
            const guardados = JSON.parse(localStorage.getItem('g2:informes:v1') ?? '[]') as unknown[];
            localStorage.setItem('g2:informes:v1', JSON.stringify([{ fecha: new Date().toISOString(), md }, ...guardados].slice(0, 20)));
            setAviso(t('laboratorio.guardado'));
          }}
        >
          <Save aria-hidden="true" />
          {t('laboratorio.guardar')}
        </button>
        <button
          type="button"
          className="boton-lab"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `informe-zona-${new Date().toISOString().slice(0, 10)}.md`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download aria-hidden="true" />
          {t('laboratorio.descargar')}
        </button>
        <Link className="boton-oro" to="/mapa">
          {t('laboratorio.pedirAnalisis')}
        </Link>
        <button type="button" className="boton-lab" onClick={onNueva}>
          {t('laboratorio.invNueva')}
        </button>
      </div>
      {aviso && (
        <p className="lab__nota" role="status">
          {aviso}
        </p>
      )}
    </div>
  );
}

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  const { t } = useTranslation();
  return (
    <section>
      <h4>{titulo}</h4>
      <p className="informe__items">{items.length ? items.join(' · ') : t('laboratorio.ninguno')}</p>
    </section>
  );
}

function Fila({ titulo, real, demo, children }: { titulo: string; real?: boolean; demo?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <section className="fila-lab">
      <h3>
        {titulo}
        {real && <span className="capa__real">{t('laboratorio.real')}</span>}
        {demo && <span className="etiqueta-demo">{t('laboratorio.demo')}</span>}
      </h3>
      {children}
    </section>
  );
}
