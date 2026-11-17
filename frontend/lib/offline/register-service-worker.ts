/** Register the production service worker on every page load. */
export function registerAppServiceWorker() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  const maybeReloadForControl = () => {
    if (navigator.serviceWorker.controller) return;
    if (sessionStorage.getItem('sw-skip-reload') === '1') return;
    if (sessionStorage.getItem('sw-awaiting-control-reload') === '1') return;
    sessionStorage.setItem('sw-awaiting-control-reload', '1');
    window.location.reload();
  };

  const register = () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        const listen = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              maybeReloadForControl();
            }
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        };
        listen(registration.installing);
        listen(registration.active);
        registration.addEventListener('updatefound', () => listen(registration.installing));
        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        if (registration.active && !navigator.serviceWorker.controller) {
          maybeReloadForControl();
        }
      })
      .catch((err) => {
        console.warn('[Hisabwise] Service worker registration failed', err);
      });
  };

  register();

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('sw-skip-reload') === '1') return;
    if (refreshing) return;
    if (sessionStorage.getItem('sw-awaiting-control-reload') === '1') {
      sessionStorage.removeItem('sw-awaiting-control-reload');
    }
    refreshing = true;
    window.location.reload();
  });
}