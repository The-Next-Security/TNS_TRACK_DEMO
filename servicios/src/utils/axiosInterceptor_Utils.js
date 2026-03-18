// axiosInterceptor_Utils.js
// Interceptores globales de axios: agrega Authorization header y maneja refresh automático en 401

import axios from 'axios';

// Flag para evitar múltiples intentos de refresh simultáneos
let isRefreshing = false;
// Cola de requests pendientes mientras se refresca el token
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Configura los interceptores globales de axios:
 * 1. Request: añade Authorization: Bearer <accessToken> a cada llamada
 * 2. Response: ante 401, intenta refresh automático; si falla, dispara auth:unauthorized
 *
 * Llamar ONCE al iniciar la aplicación (App.js useEffect)
 *
 * @example
 * import { setupAxiosInterceptor } from './utils/axiosInterceptor_Utils';
 * useEffect(() => { setupAxiosInterceptor(); }, []);
 */
export function setupAxiosInterceptor() {
  // ─── Interceptor REQUEST: añadir token a cada llamada ───────────────────────
  axios.interceptors.request.use(
    (config) => {
      // ✅ Solución robusta y dinámica:
      // Si estamos en producción (no localhost) y bajo /TNSTrack, anteponemos el prefijo a la API.
      // Esto soluciona el problema de direccionamiento en entornos con subdirectorios.
      if (typeof window !== 'undefined' && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1' &&
          window.location.pathname.startsWith('/TNSTrack') && 
          config.url && 
          config.url.startsWith('/api') && 
          !config.url.startsWith('/TNSTrack')) {
        // ✅ Solución robusta: Evitar doble slash al concatenar (ej: /TNSTrack//api -> /TNSTrack/api)
        // Usamos una expresión regular para colapsar slashes múltiples en uno solo
        const rawUrl = `/TNSTrack/${config.url}`;
        config.url = rawUrl.replace(/\/+/g, '/');
      }

      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ─── Interceptor RESPONSE: manejar 401 con refresh automático ───────────────
  axios.interceptors.response.use(
    (response) => response,

    async (error) => {
      const original = error.config;

      // Solo interceptar 401 que no sean del propio endpoint /refresh o /logout
      const isAuthEndpoint =
        original?.url?.includes('/api/auth/refresh') ||
        original?.url?.includes('/api/auth/logout') ||
        original?.url?.includes('/api/usuarios/login');

      if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
        console.log('[axiosInterceptor] 🔄 401 detectado, intentando refresh:', original?.url);

        if (isRefreshing) {
          // Encolar request mientras se está refrescando
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              original.headers.Authorization = `Bearer ${token}`;
              return axios(original);
            })
            .catch((err) => Promise.reject(err));
        }

        original._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          isRefreshing = false;
          processQueue(new Error('No refresh token'));
          _dispatchUnauthorized(original?.url);
          return Promise.reject(error);
        }

        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          console.log('[axiosInterceptor] ✅ Token refrescado exitosamente');
          processQueue(null, data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return axios(original);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          _dispatchUnauthorized(original?.url);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 401 en refresh o logout: sesión inválida → disparar evento de cierre
      // Login NO dispara el evento: un 401 ahí significa credenciales incorrectas,
      // no sesión expirada. El componente de login maneja ese error localmente.
      const isSessionEndpoint =
        original?.url?.includes('/api/auth/refresh') ||
        original?.url?.includes('/api/auth/logout');

      if (error.response?.status === 401 && isSessionEndpoint) {
        _dispatchUnauthorized(original?.url);
      }

      return Promise.reject(error);
    }
  );

  console.log('[axiosInterceptor] ✅ Interceptores globales configurados (Authorization header + auto-refresh)');
}

function _dispatchUnauthorized(url) {
  console.log('[axiosInterceptor] 🔴 Sesión expirada o inválida:', url);
  window.dispatchEvent(new CustomEvent('auth:unauthorized', {
    detail: {
      url: url || 'unknown',
      timestamp: Date.now(),
      source: 'axios'
    }
  }));
}
