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
 * Obtiene el prefijo de la aplicación basado en la URL actual.
 * Si la app corre bajo /TNSTrack, devuelve '/TNSTrack', de lo contrario cadena vacía.
 */
const getAppPrefix = () => {
  if (typeof window === 'undefined') return '';
  // Evitar localhost para no romper el proxy de desarrollo
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return '';
  
  // Detectar si el path actual comienza con /TNSTrack
  return window.location.pathname.startsWith('/TNSTrack') ? '/TNSTrack' : '';
};

/**
 * Limpia una URL colapsando slashes múltiples en uno solo, preservando el protocolo.
 */
const cleanUrl = (url) => {
  if (!url) return url;
  // Colapsar slashes duplicados pero NO tocar el http:// o https://
  return url.replace(/([^:]\/)\/+/g, "$1");
};

/**
 * Configura los interceptores globales de axios:
 * 1. Request: añade Authorization: Bearer <accessToken> a cada llamada
 * 2. Response: ante 401, intenta refresh automático; si falla, dispara auth:unauthorized
 *
 * Llamar ONCE al iniciar la aplicación (App.js useEffect)
 */
export function setupAxiosInterceptor() {
  // ─── Interceptor REQUEST: añadir token y prefijo dinámico ───────────────────
  axios.interceptors.request.use(
    (config) => {
      const prefix = getAppPrefix();
      
      // ✅ Aplicar prefijo dinámico si estamos en producción y la ruta es de la API
      if (prefix && config.url && config.url.startsWith('/api') && !config.url.startsWith(prefix)) {
        config.url = `${prefix}${config.url}`;
      }
      
      // ✅ Limpieza final de URL para evitar doble slash
      config.url = cleanUrl(config.url);

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
      const prefix = getAppPrefix();

      // Solo interceptar 401 que no sean del propio endpoint /refresh o /logout
      const isAuthEndpoint =
        original?.url?.includes('/api/auth/refresh') ||
        original?.url?.includes('/api/auth/logout') ||
        original?.url?.includes('/api/usuarios/login');

      if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
        console.log('[axiosInterceptor] 🔄 401 detectado, intentando refresh:', original?.url);

        if (isRefreshing) {
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
          // Asegurar que la petición de refresh también lleve el prefijo si es necesario
          const refreshUrl = cleanUrl(`${prefix}/api/auth/refresh`);
          const { data } = await axios.post(refreshUrl, { refreshToken });
          
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

      const isSessionEndpoint =
        original?.url?.includes('/api/auth/refresh') ||
        original?.url?.includes('/api/auth/logout');

      if (error.response?.status === 401 && isSessionEndpoint) {
        _dispatchUnauthorized(original?.url);
      }

      return Promise.reject(error);
    }
  );

  console.log('[axiosInterceptor] ✅ Interceptores globales configurados (Prefix Awareness + auto-refresh)');
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
