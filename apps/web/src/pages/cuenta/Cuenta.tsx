import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BadgeCheck, ChevronDown, FlaskConical, Landmark, LogOut, MapPinned, Microscope, ShieldCheck, Sprout, UserRound, Users } from 'lucide-react';
import { useSesion } from '@/app/sesion';
import type { Publicacion, Rol } from '@/data/mapa-lugares';
import { accionesPara, guardarSolicitudes, PASOS, SOLICITUDES_DEMO, type SolicitudPanel } from '@/data/solicitudes';
import { useSolicitudes } from '@/app/useSolicitudes';
import './cuenta.css';

const ROLES: { rol: Rol; icono: typeof UserRound }[] = [
  { rol: 'ciudadano', icono: UserRound },
  { rol: 'representante', icono: Users },
  { rol: 'investigador', icono: Microscope },
  { rol: 'laboratorio', icono: FlaskConical },
  { rol: 'autoridad', icono: Landmark },
  { rol: 'moderador', icono: ShieldCheck },
];

// ---------------------------------------------------------------- Ingresar

export function Ingresar() {
  const { t } = useTranslation();
  const { rol, ingresar } = useSesion();
  const navegar = useNavigate();
  return (
    <section className="cuenta">
      <div className="cuenta__lema">
        <p className="overline">{t('nav.ingresar')}</p>
        <h1>{t('cuenta.ingresarTitulo')}</h1>
        <p>{t('cuenta.ingresarLema')}</p>
      </div>
      <div className="cuenta__tarjeta vidrio">
        <h2>
          {t('cuenta.demoTitulo')} <span className="etiqueta-demo">{t('comun.demo')}</span>
        </h2>
        <p className="cuenta__nota">{t('cuenta.demoTexto')}</p>
        <ul className="roles">
          {ROLES.map(({ rol: r, icono: Icono }) => (
            <li key={r}>
              <button
                type="button"
                className="rol-opcion"
                aria-pressed={rol === r}
                onClick={() => {
                  ingresar(r);
                  navegar(['investigador', 'laboratorio', 'autoridad', 'moderador'].includes(r) ? '/panel' : '/perfil');
                }}
              >
                <Icono aria-hidden="true" />
                <span>
                  <strong>{t(`mapa.roles.${r}`)}</strong>
                  <span>{t(`cuenta.rolesDesc.${r}`)}</span>
                </span>
                <ArrowRight aria-hidden="true" className="rol-opcion__flecha" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Perfil

function leerJson<T>(clave: string, defecto: T): T {
  try {
    return (JSON.parse(localStorage.getItem(clave) ?? 'null') as T) ?? defecto;
  } catch {
    return defecto;
  }
}

export function Perfil() {
  const { t } = useTranslation();
  const { rol, salir, esInstitucion } = useSesion();
  const navegar = useNavigate();
  const pubs = leerJson<{ publicaciones?: Publicacion[] }>('g2:mapa:v2', {}).publicaciones ?? [];
  const aportes = leerJson<{ monto: number; campana: string; fecha: string }[]>('g2:donaciones:v1', []);
  if (rol === 'visitante') return <Ingresar />;
  return (
    <section className="cuenta cuenta--perfil">
      <div className="cuenta__lema">
        <p className="overline">{t('cuenta.verPerfil')}</p>
        <h1>
          {t(`mapa.roles.${rol}`)} <span className="etiqueta-demo">{t('comun.demo')}</span>
        </h1>
        <div className="cuenta__acciones">
          {esInstitucion && (
            <Link to="/panel" className="btn btn--primario">
              {t('cuenta.verPanel')}
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            className="btn"
            onClick={() => {
              salir();
              navegar('/');
            }}
          >
            <LogOut aria-hidden="true" />
            {t('cuenta.salir')}
          </button>
        </div>
      </div>
      <div className="perfil__columnas">
        <div className="cuenta__tarjeta vidrio">
          <h2>
            <MapPinned aria-hidden="true" /> {t('cuenta.tusPublicaciones')}
          </h2>
          {pubs.length === 0 ? (
            <p className="cuenta__nota">
              {t('cuenta.nada')} <Link to="/mapa">{t('cuenta.irMapa')}</Link>
            </p>
          ) : (
            <ul className="lista-simple">
              {pubs.map((p) => (
                <li key={p.id}>
                  <strong>{t(`mapa.tipos.${p.tipo}`)}</strong> · {p.texto}
                  <span>{p.pendiente ? t('mapa.pendientes', { count: 1 }) : p.fecha}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="cuenta__tarjeta vidrio">
          <h2>
            <Sprout aria-hidden="true" /> {t('cuenta.tusAportes')}
          </h2>
          {aportes.length === 0 ? (
            <p className="cuenta__nota">
              {t('cuenta.nada')} <Link to="/donaciones">{t('cuenta.irDonar')}</Link>
            </p>
          ) : (
            <ul className="lista-simple">
              {aportes.map((a, i) => (
                <li key={i}>
                  <strong className="num">{a.monto} USDC</strong> · {a.campana}
                  <span>TESTNET · {a.fecha}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Panel institucional

export function Panel() {
  const { t } = useTranslation();
  const { rol, esInstitucion, ingresar } = useSesion();
  const { lista, setLista, remoto, error, cambiar } = useSolicitudes();
  const [filtro, setFiltro] = useState<'activas' | 'todas'>('activas');
  const visibles = useMemo(() => (filtro === 'todas' ? lista : lista.filter((s) => s.estado !== 'cerrada' && s.estado !== 'rechazada')), [lista, filtro]);

  if (!esInstitucion) {
    return (
      <section className="cuenta">
        <div className="cuenta__lema">
          <p className="overline">{t('cuenta.verPanel')}</p>
          <h1>{t('cuenta.panelTitulo')}</h1>
          <p>{t('cuenta.panelSinPermiso')}</p>
          <div className="cuenta__acciones">
            <button type="button" className="btn btn--primario" onClick={() => ingresar('laboratorio')}>
              <FlaskConical aria-hidden="true" />
              {t('cuenta.panelEntrarComo')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Sin servidor, el cambio se simula aquí; con servidor, lo valida el backend.
  const local = (id: string, a: SolicitudPanel['estado'], nota?: string) =>
    lista.map((s) =>
      s.id === id
        ? {
            ...s,
            estado: a,
            organizacion: s.organizacion ?? (a === 'asignada' ? `${t(`mapa.roles.${rol}`)} (demo)` : undefined),
            historial: [...s.historial, { estado: a, fecha: new Date().toISOString().slice(0, 10), actor: `${t(`mapa.roles.${rol}`)} (demo)`, nota }],
          }
        : s,
    );
  const actualizar = (id: string, a: SolicitudPanel['estado'], nota?: string) => void cambiar(id, a, () => local(id, a, nota), nota);

  return (
    <section className="panel-inst">
      <header className="panel-inst__cabeza">
        <div>
          <p className="overline">
            {t('cuenta.verPanel')} · {t(`mapa.roles.${rol}`)} <span className="etiqueta-demo">{t('comun.demo')}</span>
          </p>
          <h1>{t('cuenta.panelTitulo')}</h1>
          <p>{t('cuenta.panelTexto')}</p>
        </div>
        <div className="chips-panel" role="group">
          {(['activas', 'todas'] as const).map((f) => (
            <button key={f} type="button" className="chip-panel" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {t(`cuenta.filtros.${f}`)}
            </button>
          ))}
          {!remoto && (
            <button
              type="button"
              className="chip-panel"
              onClick={() => {
                setLista(SOLICITUDES_DEMO);
                guardarSolicitudes(SOLICITUDES_DEMO);
              }}
            >
              {t('cuenta.reiniciar')}
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="cuenta__nota" role="alert">
          {error}
        </p>
      )}
      <ul className="casos">
        {visibles.map((s) => (
          <li key={s.id}>
            <Caso s={s} rol={rol} onAccion={actualizar} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Caso({ s, rol, onAccion }: { s: SolicitudPanel; rol: Rol; onAccion: (id: string, a: SolicitudPanel['estado'], nota?: string) => void }) {
  const { t } = useTranslation();
  const [historial, setHistorial] = useState(false);
  const [motivo, setMotivo] = useState('');
  // Con servidor, las acciones las decide el backend para esta sesión.
  const acciones = s.acciones ?? accionesPara(rol, s.estado);
  const idx = PASOS.indexOf(s.estado);
  return (
    <article className={`caso caso--${s.estado} vidrio`}>
      <div className="caso__cabeza">
        <div>
          <h2>{s.lugar}</h2>
          <p className="caso__motivo">«{s.motivo}»</p>
        </div>
        <span className="caso__estado">{t(`cuenta.estados.${s.estado}`)}</span>
      </div>
      <ol className="caso__pasos" aria-label={t(`cuenta.estados.${s.estado}`)}>
        {PASOS.map((p, i) => (
          <li key={p} className={i < idx ? 'is-hecho' : i === idx ? 'is-actual' : ''} title={t(`cuenta.estados.${p}`)} />
        ))}
      </ol>
      <p className="caso__meta">
        <span className="num">{t('cuenta.apoyos', { count: s.apoyos })}</span>
        {s.organizacion && (
          <>
            {' · '}
            <BadgeCheck aria-hidden="true" /> {s.organizacion}
          </>
        )}
      </p>
      <div className="caso__acciones">
        {acciones.length === 0 && <span className="caso__espera">{t('cuenta.sinAcciones')}</span>}
        {acciones.some((a) => a.a === 'rechazada') && (
          <input className="campo-caso" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={t('cuenta.motivoRechazo')} aria-label={t('cuenta.motivoRechazo')} />
        )}
        {acciones.map((a) => (
          <button
            key={a.clave}
            type="button"
            className={a.a === 'rechazada' ? 'btn btn--fantasma' : 'btn btn--primario'}
            disabled={a.a === 'rechazada' && motivo.trim().length < 5}
            onClick={() => onAccion(s.id, a.a, a.a === 'rechazada' ? motivo.trim() : undefined)}
          >
            {t(`cuenta.acciones.${a.clave}`)}
          </button>
        ))}
        <Link className="btn btn--fantasma" to="/mapa">
          <MapPinned aria-hidden="true" />
          {t('cuenta.verEnMapa')}
        </Link>
        <button type="button" className="btn btn--fantasma" aria-expanded={historial} onClick={() => setHistorial((h) => !h)}>
          <ChevronDown aria-hidden="true" />
          {t('cuenta.historial')}
        </button>
      </div>
      {historial && (
        <ol className="caso__historial">
          {s.historial.map((h, i) => (
            <li key={i}>
              <span className="num">{h.fecha}</span>
              <strong>{t(`cuenta.estados.${h.estado}`)}</strong>
              <span>{h.actor}</span>
              {h.nota && <em>{h.nota}</em>}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
