import { NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, UserRound } from 'lucide-react';
import { RUTAS } from './rutas';
import { Marca } from '@/components/ui/Marca';
import { HiloRio } from '@/components/ui/HiloRio';
import { useEffect } from 'react';
import { useSesion } from './sesion';
import { COLOR_BARRA, fijarColorBarra, useModo } from './tema';

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { rol } = useSesion();
  const { modo, alternar } = useModo();
  const enInicio = pathname === '/';
  // Tema de la cabecera por pestaña: sobre la escena (Inicio), claro (Infórmate), bosque (Donaciones) u oscuro.
  const tema = enInicio ? 'escena' : /^\/informate/.test(pathname) ? 'claro' : /^\/donaciones/.test(pathname) ? 'bosque' : 'oscuro';

  // Barra del navegador: Inicio y Donaciones empiezan con su escena oscura; Infórmate es crema; el resto sigue al tema.
  useEffect(() => {
    fijarColorBarra(tema === 'escena' ? COLOR_BARRA.oscuro : tema === 'bosque' ? '#14281f' : tema === 'claro' ? COLOR_BARRA.claro : COLOR_BARRA[modo]);
  }, [tema, modo]);

  // Al cambiar de pestaña, empezar arriba (el Inicio gestiona su propio scroll).
  useEffect(() => {
    if (!enInicio) window.scrollTo(0, 0);
  }, [pathname, enInicio]);

  return (
    <div className={'app' + (enInicio ? ' app--inicio' : '')} data-tema={tema}>
      <a className="saltar-contenido" href="#contenido">
        {t('comun.saltarContenido')}
      </a>

      <header className="cabecera">
        <div className="cabecera__fila">
          <NavLink to="/" className="cabecera__marca" aria-label={t('nav.inicio')}>
            <Marca />
          </NavLink>

          <nav className="nav" aria-label={t('nav.principal')}>
            <ul>
              {RUTAS.map((r) => (
                <li key={r.id}>
                  <NavLink to={r.path} end={r.path === '/'} className="nav__enlace">
                    {({ isActive }) => (
                      <>
                        <span>{t(r.nombre)}</span>
                        {isActive && <HiloRio key={pathname} className="nav__hilo" />}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            className="btn btn--icono cabecera__modo"
            aria-pressed={modo === 'claro'}
            aria-label={t('tema.modoClaro')}
            title={modo === 'claro' ? t('tema.aOscuro') : t('tema.aClaro')}
            onClick={alternar}
          >
            {modo === 'claro' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>

          <NavLink to={rol === 'visitante' ? '/login' : '/perfil'} className="btn cabecera__ingresar">
            <UserRound aria-hidden="true" />
            <span>{rol === 'visitante' ? t('nav.ingresar') : t(`mapa.roles.${rol}`)}</span>
          </NavLink>
        </div>
      </header>

      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="tabbar" aria-label={t('nav.principal')}>
        <ul>
          {RUTAS.map((r) => {
            const Icono = r.icono;
            return (
              <li key={r.id}>
                <NavLink to={r.path} end={r.path === '/'} className="tabbar__item">
                  {({ isActive }) => (
                    <>
                      {isActive ? <HiloRio key={pathname} ancho={28} className="tabbar__hilo" /> : <span className="tabbar__hilo-vacio" />}
                      <Icono aria-hidden="true" />
                      <span>{t(r.corto)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
