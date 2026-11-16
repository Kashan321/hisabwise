/** Register the production service worker on every page load. */
export function registerAppServiceWorker() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        const listen = (worker: ServiceWorker | null) => {
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        };
        listen(registration.installing);
        registration.addEventListener('updatefound', () => listen(registration.installing));
        if (registration.waiting && navigator.serviceWorker.controller) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(() => undefined);
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('sw-skip-reload') === '1') return;
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}