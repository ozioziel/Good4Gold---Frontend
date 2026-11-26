// Registro del service worker (public/sw.js): guarda la app y el contenido para usarla sin conexión.
// Solo en producción: en desarrollo, Vite sirve los módulos y un caché viejo confundiría las pruebas.
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin service worker la app sigue funcionando en línea */
    });
  });
}
