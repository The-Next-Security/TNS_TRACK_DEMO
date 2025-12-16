// service-worker.js - TNS Track PWA
// Service Worker para funcionalidad offline y caching

const CACHE_VERSION = 'TNSTrack-v1.0.1';
const BASE_PATH = '/TNSTrack';

// Assets críticos que siempre deben estar en caché
const CRITICAL_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/bundle.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icons/icon-192x192.png`,
  `${BASE_PATH}/icons/icon-512x512.png`,
];

// Rutas que siempre deben ir a la red (API calls)
const NETWORK_ONLY_PATTERNS = [
  /\/api\//,
  /socket\.io/,
];

// Rutas que se pueden cachear después de la primera carga
const CACHE_FIRST_PATTERNS = [
  /\/icons\//,
  /\/static\//,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.svg$/,
  /\.woff2$/,
  /\.woff$/,
  /\.ttf$/,
];

/**
 * Evento de instalación del Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[Service Worker] Precacheando assets críticos');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Assets críticos cacheados exitosamente');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Error en precache:', error);
      })
  );
});

/**
 * Evento de activación del Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_VERSION) {
              console.log('[Service Worker] Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activado y listo');
        return self.clients.claim();
      })
  );
});

/**
 * Evento de fetch - Estrategias de caching
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests de otros dominios
  if (url.origin !== location.origin) {
    return;
  }

  // Estrategia 1: Network Only (APIs y Socket.IO)
  if (NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(fetch(request));
    return;
  }

  // Estrategia 2: Cache First (Assets estáticos)
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Actualizar caché en background
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_VERSION).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            }).catch(() => {
              // No hacer nada si falla la actualización
            });
            
            return cachedResponse;
          }
          
          // Si no está en caché, buscar en red y cachear
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_VERSION).then((cache) => {
                  cache.put(request, responseToCache);
                });
              }
              return networkResponse;
            });
        })
    );
    return;
  }

  // Estrategia 3: Network First con fallback a caché
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si es una navegación, devolver index.html
            if (request.mode === 'navigate') {
              return caches.match(`${BASE_PATH}/index.html`);
            }
            
            return new Response('Offline - Recurso no disponible', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain',
              }),
            });
          });
      })
  );
});

/**
 * Evento de mensaje desde el cliente
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

/**
 * Evento PUSH - Recibe notificaciones push del servidor
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification recibida');

  // Opciones por defecto
  const defaultOptions = {
    icon: `${BASE_PATH}/icons/icon-192x192.png`,
    badge: `${BASE_PATH}/icons/icon-72x72.png`,
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: `${BASE_PATH}/`
    },
    actions: [
      { action: 'open', title: 'Abrir App', icon: `${BASE_PATH}/icons/icon-72x72.png` },
      { action: 'close', title: 'Cerrar', icon: `${BASE_PATH}/icons/icon-72x72.png` }
    ]
  };

  try {
    // Parsear datos del servidor
    const payload = event.data ? event.data.json() : {};

    const title = payload.title || 'TNS Track - Notificación';
    const options = {
      ...defaultOptions,
      body: payload.body || 'Nueva notificación del sistema',
      icon: payload.icon || defaultOptions.icon,
      badge: payload.badge || defaultOptions.badge,
      vibrate: payload.vibrate || defaultOptions.vibrate,
      data: {
        ...defaultOptions.data,
        ...payload.data,
        url: payload.data?.url || defaultOptions.data.url
      },
      tag: payload.tag || 'general-notification',
      renotify: payload.renotify !== undefined ? payload.renotify : false,
      requireInteraction: payload.requireInteraction !== undefined ? payload.requireInteraction : false
    };

    // Si hay actions personalizadas, usar esas
    if (payload.actions && Array.isArray(payload.actions)) {
      options.actions = payload.actions;
    }

    console.log('[Service Worker] Mostrando notificación:', title);

    // Mostrar notificación
    event.waitUntil(
      self.registration.showNotification(title, options)
    );

  } catch (error) {
    console.error('[Service Worker] Error procesando push notification:', error);

    // Mostrar notificación genérica en caso de error
    event.waitUntil(
      self.registration.showNotification('TNS Track', {
        ...defaultOptions,
        body: 'Nueva notificación del sistema de monitoreo'
      })
    );
  }
});

/**
 * Evento NOTIFICATIONCLICK - Maneja clics en notificaciones
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificación clickeada:', event.action);

  // Cerrar la notificación
  event.notification.close();

  // Determinar URL a abrir según la acción
  let targetUrl = BASE_PATH;

  if (event.action === 'close') {
    // No hacer nada, solo cerrar
    return;
  }

  if (event.action === 'open' || !event.action) {
    // Usar URL de los datos si existe
    targetUrl = event.notification.data?.url || BASE_PATH;
  }

  // Abrir/Enfocar ventana de la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta de la app
        for (const client of clientList) {
          if (client.url.includes(BASE_PATH) && 'focus' in client) {
            // Si existe, enfocarla y navegar a la URL objetivo
            return client.focus().then((focusedClient) => {
              if (focusedClient.url !== targetUrl) {
                return focusedClient.navigate(targetUrl);
              }
              return focusedClient;
            });
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          console.log('[Service Worker] Abriendo nueva ventana:', targetUrl);
          return clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Error manejando click en notificación:', error);
      })
  );
});

/**
 * Evento NOTIFICATIONCLOSE - Cuando el usuario cierra la notificación sin interactuar
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificación cerrada:', event.notification.tag);

  // Aquí podrías registrar analytics o estadísticas
  // Por ahora solo lo logueamos
});

console.log('[Service Worker] Cargado exitosamente con soporte para Push Notifications');
