// src/utils/registerServiceWorker.js
// Registración del Service Worker para PWA

/**
 * Registra el Service Worker si está soportado por el navegador
 */
export const registerServiceWorker = () => {
  // Verificar si Service Workers están soportados
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers no están soportados en este navegador');
    return;
  }

  // Esperar a que la página esté completamente cargada
  window.addEventListener('load', async () => {
    try {
      // Registrar el service worker
      const registration = await navigator.serviceWorker.register(
        '/TNSTrack/service-worker.js',
        { scope: '/TNSTrack/' }
      );

      console.log('[PWA] Service Worker registrado exitosamente:', registration);

      // Manejar actualizaciones del Service Worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] Nueva versión del Service Worker encontrada');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nueva versión disponible
            console.log('[PWA] Nueva versión disponible');
            
            // Opcional: Mostrar notificación al usuario
            if (window.confirm('Nueva versión disponible. ¿Desea actualizar ahora?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      });

      // Escuchar cuando el Service Worker tome control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

    } catch (error) {
      console.error('[PWA] Error al registrar Service Worker:', error);
    }
  });
};

/**
 * Desregistrar el Service Worker (útil para desarrollo)
 */
export const unregisterServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('[PWA] Service Worker desregistrado');
  } catch (error) {
    console.error('[PWA] Error al desregistrar Service Worker:', error);
  }
};

/**
 * Verificar si hay actualizaciones disponibles
 */
export const checkForUpdates = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('[PWA] Verificación de actualizaciones completada');
  } catch (error) {
    console.error('[PWA] Error al verificar actualizaciones:', error);
  }
};

export default registerServiceWorker;
