import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudOff, LocateFixed, MoreHorizontal, Navigation, Plus, QrCode, RotateCcw, Search, Send, X } from 'lucide-react';
import { LOCALIDADES_BENI } from '@/data/localidades-beni';
import { idRio, lugarSinDatos, type Publicacion, type Rol } from '@/data/mapa-lugares';
import { ProveedorMapa, useMapa } from './estado';
import type { MapaRios, RioCercano } from './MapaRios';
import { Tarjeta } from './Tarjeta';
import { HojaPublicaciones } from './Publicaciones';
import { HojaComponer, type Ubicado } from './Componer';
import { HojaEscanear, HojaQr } from './Qr';
import { Hoja } from '@/components/ui/Hoja';
import { tieneInformacion, tonoLugar } from './senales';
import { modoActual, useModo } from '@/app/tema';
import './mapa.css';

/**
 * Mapa comunitario. Registro: cálido-interactivo sobre la noche del Inicio; movimiento nivel 1–2; sin 3D.
 * Pantalla = el mapa. Encima, solo lo imprescindible: buscar, mi ubicación, publicar y la tarjeta del río.
 */
export default function Mapa() {
  return (
    <ProveedorMapa>
      <PaginaMapa />
    </ProveedorMapa>
  );
}

function PaginaMapa() {
  const { t } = useTranslation();
  const { s, d, lugar, lugares, publicaciones, senales, enLinea, pendientes } = useMapa();
  const lienzo = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaRios | null>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState(false);
  const [cercanos, setCercanos] = useState<RioCercano[]>([]);
  const [ubicando, setUbicando] = useState(false);
  const [yo, setYo] = useState<{ lat: number; lon: number } | null>(null);
  const [ubicar, setUbicar] = useState(false);
  const [ubicado, setUbicado] = useState<Ubicado | null>(null);
  const [verPubs, setVerPubs] = useState(false);
  const [qr, setQr] = useState<Publicacion | null>(null);
  const [menu, setMenu] = useState(false);
  const [escanear, setEscanear] = useState(false);

  // Eventos del mapa → estado (refs para no recrear el mapa en cada render).
  const elegirRio = useRef<(n: string | null, lat: number, lon: number) => void>(() => {});
  elegirRio.current = (nombre, lat, lon) => {
    const n = nombre ?? t('mapa.rioSinNombre');
    const id = idRio(n);
    d({ tipo: 'elegir', lugar: lugares.find((l) => l.id === id) ?? lugarSinDatos(id, n, lat, lon) });
  };
  const elegirLugar = useRef<(id: string) => void>(() => {});
  elegirLugar.current = (id) => {
    const l = lugares.find((x) => x.id === id);
    if (!l) return;
    d({ tipo: 'elegir', lugar: l });
    // El punto queda a la vista, por encima de la tarjeta.
    mapa.current?.volar(l.lat, l.lon, undefined, innerWidth < 900 ? 330 : 0);
  };

  // El mapa ocupa la pantalla: la página no debe desplazarse por debajo (p. ej. al enfocar un botón).
  useEffect(() => {
    const raiz = document.documentElement;
    const previo = raiz.style.overflow;
    raiz.style.overflow = 'hidden';
    const fijar = () => window.scrollY !== 0 && window.scrollTo(0, 0);
    fijar();
    window.addEventListener('scroll', fijar, { passive: true });
    return () => {
      raiz.style.overflow = previo;
      window.removeEventListener('scroll', fijar);
    };
  }, []);

  useEffect(() => {
    if (!lienzo.current) return;
    let vivo = true;
    import('./MapaRios').then(({ MapaRios }) => {
      if (!vivo || !lienzo.current) return;
      mapa.current = new MapaRios(lienzo.current, modoActual(), {
        onLugar: (id) => elegirLugar.current(id),
        onRio: (n, lat, lon) => elegirRio.current(n, lat, lon),
        onVacio: () => d({ tipo: 'elegir', lugar: null }),
        onCercanos: setCercanos,
        onError: () => setError(true),
        onListo: () => setListo(true),
      });
    });
    return () => {
      vivo = false;
      mapa.current?.destroy();
      mapa.current = null;
    };
  }, [d]);

  // Tema → mapa: el mapa base y las capas propias se repintan sin recargar.
  const { modo } = useModo();
  useEffect(() => {
    if (listo) mapa.current?.setModo(modo);
  }, [listo, modo]);

  // Datos → mapa: solo los lugares con algo que decir y las publicaciones.
  const puntos = useMemo(
    () =>
      lugares
        .map((l) => ({ l, s: senales(l) }))
        .filter(({ l, s: x }) => tieneInformacion(l, x) && l.tipo !== 'punto')
        .map(({ l, s: x }) => ({ id: l.id, nombre: l.nombre, lat: l.lat, lon: l.lon, tono: tonoLugar(l, x), ficticio: l.ficticio })),
    [lugares, senales],
  );
  useEffect(() => {
    if (listo) mapa.current?.setLugares(puntos);
  }, [listo, puntos]);
  useEffect(() => {
    if (listo) mapa.current?.setPublicaciones(publicaciones.map((p) => ({ id: p.id, lugarId: p.lugarId, lat: p.lat, lon: p.lon, pendiente: Boolean(p.pendiente) })));
  }, [listo, publicaciones]);
  useEffect(() => {
    if (!listo) return;
    // Un río real se resalta por su nombre (todos sus tramos); un lugar, por su punto.
    const esRio = Boolean(lugar?.id.startsWith('rio:'));
    mapa.current?.seleccionar(lugar ? lugar.id : null, esRio && lugar ? lugar.nombre : null);
  }, [listo, lugar, puntos]);

  // Ubicación: si el permiso ya está concedido, se usa sola; si no, con el botón.
  const ubicarme = useCallback(
    (volar = true) => {
      if (!navigator.geolocation) return d({ tipo: 'aviso', texto: t('mapa.sinUbicacion') });
      setUbicando(true);
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setUbicando(false);
          const pos = { lat: p.coords.latitude, lon: p.coords.longitude };
          setYo(pos);
          mapa.current?.setUbicacion(pos.lat, pos.lon);
          if (volar) mapa.current?.volar(pos.lat, pos.lon, 11);
        },
        () => {
          setUbicando(false);
          d({ tipo: 'aviso', texto: t('mapa.sinUbicacion') });
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    },
    [d, t],
  );
  useEffect(() => {
    if (!listo) return;
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((r) => r.state === 'granted' && ubicarme(true))
      .catch(() => {});
  }, [listo, ubicarme]);

  const irA = (lat: number, lon: number, zoom?: number) => mapa.current?.volar(lat, lon, zoom, innerWidth < 900 ? 330 : 0);

  const empezarPublicar = () => {
    if (lugar) irA(lugar.lat, lugar.lon);
    else if (yo) mapa.current?.volar(yo.lat, yo.lon, 12);
    setUbicar(true);
  };
  const confirmarUbicacion = () => {
    const c = mapa.current?.centro();
    if (!c) return;
    setUbicar(false);
    // Si el punto sigue cerca del lugar elegido (< 3 km), la publicación es de ese lugar; si no, del río bajo la mira.
    const km = lugar ? Math.hypot((c.lon - lugar.lon) * 111.32 * Math.cos((c.lat * Math.PI) / 180), (c.lat - lugar.lat) * 110.57) : Infinity;
    const rioLugar = c.rio ? lugares.find((l) => l.id === idRio(c.rio!)) : null;
    setUbicado({ lat: c.lat, lon: c.lon, rio: c.rio, lugar: lugar && km < 3 ? lugar : (rioLugar ?? null) });
  };

  return (
    <div className={'mapa' + (ubicar ? ' is-ubicando' : '')}>
      <h1 className="sr-only">{t('mapa.titulo')}</h1>
      <div ref={lienzo} className="mapa__lienzo" role="region" aria-label={t('mapa.mapaEtiqueta')} />
      {!listo && !error && <div className="mapa__cargando" aria-hidden="true" />}
      {error && (
        <p className="mapa__error" role="alert">
          {t('mapa.errorMapa')}
        </p>
      )}

      {ubicar ? (
        <>
          <p className="ubicar__titulo" role="status">
            {t('mapa.ubicarTitulo')}
          </p>
          <span className="ubicar__mira" aria-hidden="true" />
          <div className="ubicar__acciones">
            <button type="button" className="boton-linea" onClick={() => setUbicar(false)}>
              {t('mapa.cancelar')}
            </button>
            <button type="button" className="boton-oro" onClick={confirmarUbicacion}>
              <Navigation aria-hidden="true" />
              {t('mapa.aqui')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mapa__arriba">
            <Buscador onIr={irA} />
            <button type="button" className="boton-redondo boton-redondo--vidrio" onClick={() => setMenu(true)} aria-label={t('mapa.mas')}>
              <MoreHorizontal aria-hidden="true" />
            </button>
          </div>

          {(!enLinea || pendientes > 0) && (
            <div className="conexion" role="status">
              {!enLinea && <CloudOff aria-hidden="true" />}
              <span>{!enLinea ? t('mapa.sinConexion') : t('mapa.pendientes', { count: pendientes })}</span>
              {enLinea && pendientes > 0 && (
                <button
                  type="button"
                  onClick={() => d({ tipo: 'sincronizar' })}
                >
                  <Send aria-hidden="true" />
                  {t('mapa.sincronizar')}
                </button>
              )}
              {!enLinea && pendientes > 0 && <span className="num">· {t('mapa.pendientes', { count: pendientes })}</span>}
            </div>
          )}

          <div className="mapa__abajo">
            <div className="mapa__botones">
              <button type="button" className="boton-redondo boton-redondo--vidrio boton-redondo--grande" onClick={() => ubicarme(true)} aria-label={t('mapa.miUbicacion')} aria-busy={ubicando}>
                <LocateFixed aria-hidden="true" className={ubicando ? 'late' : ''} />
              </button>
              {!lugar && (
                <button type="button" className="boton-oro boton-oro--flotante" onClick={empezarPublicar}>
                  <Plus aria-hidden="true" />
                  {t('mapa.publicar')}
                </button>
              )}
            </div>
            {lugar ? (
              <Tarjeta
                key={lugar.id}
                lugar={lugar}
                onCerrar={() => d({ tipo: 'elegir', lugar: null })}
                onPublicar={empezarPublicar}
                onVer={() => setVerPubs(true)}
              />
            ) : (
              cercanos.length > 0 && (
                <nav className="cercanos" aria-label={t('mapa.cerca')}>
                  <span className="cercanos__titulo">{t('mapa.cerca')}</span>
                  <ul>
                    {cercanos.map((r) => (
                      <li key={r.nombre}>
                        <button type="button" className="chip chip--vidrio" onClick={() => elegirRio.current(r.nombre, r.lat, r.lon)}>
                          {r.nombre}
                          <span className="num">{r.km < 1 ? '<1' : Math.round(r.km)} km</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )
            )}
          </div>
        </>
      )}

      <HojaPublicaciones lugar={lugar} abierta={verPubs} onCerrar={() => setVerPubs(false)} onQr={setQr} />
      <HojaComponer ubicado={ubicado} onCerrar={() => setUbicado(null)} onQr={setQr} />
      <HojaQr pub={qr} onCerrar={() => setQr(null)} />
      <HojaEscanear abierta={escanear} onCerrar={() => setEscanear(false)} />
      <Menu abierto={menu} onCerrar={() => setMenu(false)} onEscanear={() => setEscanear(true)} />

      <div className="aviso" role="status" aria-live="polite">
        {s.aviso && <p>{s.aviso}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Buscador compacto

function Buscador({ onIr }: { onIr: (lat: number, lon: number, zoom?: number) => void }) {
  const { t } = useTranslation();
  const { d, lugares } = useMapa();
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(0);
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const res = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    const ls = lugares.filter((l) => l.tipo !== 'punto' && norm(l.nombre).includes(n)).map((l) => ({ id: l.id, nombre: l.nombre, lat: l.lat, lon: l.lon, lugar: true }));
    const pueblos = LOCALIDADES_BENI.filter((p) => norm(p.nombre).includes(n)).map((p) => ({ id: `loc:${p.nombre}`, nombre: p.nombre, lat: p.lat, lon: p.lon, lugar: false }));
    return [...ls, ...pueblos].slice(0, 6);
  }, [q, lugares]);

  const elegir = (i: number) => {
    const r = res[i];
    if (!r) return;
    if (r.lugar) d({ tipo: 'elegir', lugar: lugares.find((l) => l.id === r.id) ?? null });
    onIr(r.lat, r.lon, r.lugar ? 11 : 12);
    setQ('');
  };

  return (
    <div className="buscar" role="search">
      <Search aria-hidden="true" className="buscar__icono" />
      <input
        className="buscar__campo"
        type="search"
        value={q}
        placeholder={t('mapa.buscar')}
        aria-label={t('mapa.buscar')}
        role="combobox"
        aria-expanded={res.length > 0}
        aria-controls="buscar-lista"
        aria-activedescendant={res[activo] ? `buscar-${activo}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value);
          setActivo(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActivo((a) => Math.min(a + 1, res.length - 1));
          else if (e.key === 'ArrowUp') setActivo((a) => Math.max(a - 1, 0));
          else if (e.key === 'Enter') elegir(activo);
          else if (e.key === 'Escape') setQ('');
        }}
      />
      {q && (
        <button type="button" className="buscar__limpiar" onClick={() => setQ('')} aria-label={t('mapa.cerrar')}>
          <X aria-hidden="true" />
        </button>
      )}
      {q.trim().length >= 2 && (
        <ul id="buscar-lista" className="buscar__lista vidrio" role="listbox">
          {res.length === 0 && <li className="buscar__vacio">{t('mapa.sinResultados')}</li>}
          {res.map((r, i) => (
            <li
              key={r.id}
              id={`buscar-${i}`}
              role="option"
              aria-selected={i === activo}
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(i);
              }}
            >
              {r.nombre}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Menú: rol demo, sin conexión, QR, leyenda

function Menu({ abierto, onCerrar, onEscanear }: { abierto: boolean; onCerrar: () => void; onEscanear: () => void }) {
  const { t } = useTranslation();
  const { s, d } = useMapa();
  const roles: Rol[] = ['visitante', 'ciudadano', 'representante', 'investigador', 'laboratorio', 'autoridad'];
  return (
    <Hoja abierta={abierto} titulo={t('mapa.mas')} onCerrar={onCerrar}>
      <section className="menu__bloque">
        <h3>
          {t('mapa.rolDemo')} <span className="etiqueta-demo">{t('mapa.demo')}</span>
        </h3>
        <div className="chips">
          {roles.map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={s.rol === r} onClick={() => d({ tipo: 'rol', rol: r })}>
              {t(`mapa.roles.${r}`)}
            </button>
          ))}
        </div>
      </section>
      <section className="menu__bloque menu__fila">
        <label className="interruptor">
          <input type="checkbox" role="switch" checked={s.sinConexionSimulada} onChange={(e) => d({ tipo: 'simularSinConexion', valor: e.target.checked })} />
          <span className="interruptor__pista" aria-hidden="true" />
          {t('mapa.simularSinConexion')}
        </label>
        <button
          type="button"
          className="boton-linea"
          onClick={() => {
            onCerrar();
            onEscanear();
          }}
        >
          <QrCode aria-hidden="true" />
          {t('mapa.escanearQr')}
        </button>
      </section>
      <section className="menu__bloque">
        <h3>{t('mapa.leyenda')}</h3>
        <ul className="leyenda">
          <li>
            <span className="leyenda__rio" aria-hidden="true" />
            {t('mapa.leyendaRios')}
          </li>
          <li>
            <span className="leyenda__lugar" aria-hidden="true" />
            {t('mapa.leyendaLugar')}
          </li>
          <li>
            <span className="leyenda__pub" aria-hidden="true" />
            {t('mapa.leyendaPublicacion')}
          </li>
          <li>
            <span className="leyenda__yo" aria-hidden="true" />
            {t('mapa.leyendaTu')}
          </li>
        </ul>
      </section>
      <button
        type="button"
        className="menu__reiniciar"
        onClick={() => {
          d({ tipo: 'reiniciar' });
          onCerrar();
        }}
      >
        <RotateCcw aria-hidden="true" />
        {t('mapa.reiniciar')}
      </button>
    </Hoja>
  );
}
