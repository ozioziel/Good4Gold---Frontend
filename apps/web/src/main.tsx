import { StrictMode, lazy, Suspense, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
// Newsreader con eje de tamaño óptico: los titulares grandes ganan contraste y los pequeños, legibilidad.
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './i18n';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/controles.css';
import './styles/paginas.css';
import { Layout } from './app/Layout';
import { ProveedorSesion } from './app/sesion';
import { EnConstruccion } from './pages/EnConstruccion';
import { registrarServiceWorker } from './app/pwa';

// Cada pestaña se descarga al visitarla: three, maplibre y gsap solo viajan a quien los usa.
const Inicio = lazy(() => import('./pages/inicio/Inicio'));
const Mapa = lazy(() => import('./pages/mapa/Mapa'));
const Laboratorio = lazy(() => import('./pages/laboratorio/Laboratorio'));
const Informate = lazy(() => import('./pages/informate/Informate'));
const Donaciones = lazy(() => import('./pages/donaciones/Donaciones'));
const Ingresar = lazy(() => import('./pages/cuenta/Cuenta').then((m) => ({ default: m.Ingresar })));
const Perfil = lazy(() => import('./pages/cuenta/Cuenta').then((m) => ({ default: m.Perfil })));
const Panel = lazy(() => import('./pages/cuenta/Cuenta').then((m) => ({ default: m.Panel })));

const diferido = (el: ReactNode) => <Suspense fallback={<div className="pagina-cargando" aria-busy="true" />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: diferido(<Inicio />) },
      { path: '/mapa', element: diferido(<Mapa />) },
      { path: '/laboratorio', element: diferido(<Laboratorio />) },
      { path: '/informate', element: diferido(<Informate />) },
      { path: '/donaciones', element: diferido(<Donaciones />) },
      { path: '/login', element: diferido(<Ingresar />) },
      { path: '/perfil', element: diferido(<Perfil />) },
      { path: '/panel', element: diferido(<Panel />) },
      { path: '*', element: <EnConstruccion titulo="404" /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorSesion>
      <RouterProvider router={router} />
    </ProveedorSesion>
  </StrictMode>,
);

registrarServiceWorker();
