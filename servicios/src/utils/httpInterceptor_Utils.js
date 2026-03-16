// httpInterceptor_Utils.js
// HTTP fetch wrapper con Authorization header y manejo de 401
// Feature: 003-fix-session-expiry-handling

/**
 * Authenticated fetch wrapper
 * Añade automáticamente el header Authorization: Bearer <token> desde localStorage
 * Despacha 'auth:unauthorized' CustomEvent en respuestas 401
 *
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 *
 * @example
 * import { authenticatedFetch } from './utils/httpInterceptor_Utils';
 *
 * const response = await authenticatedFetch('/api/users', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 */
export async function authenticatedFetch(url, options = {}) {
  try {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });

    // Despachar auth:unauthorized en respuestas 401
    if (response.status === 401) {
      console.log('[httpInterceptor] 401 Unauthorized detectado:', url);
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: {
          url,
          timestamp: Date.now(),
          method: options.method || 'GET'
        }
      }));
    }

    return response;
  } catch (error) {
    console.error('[httpInterceptor] Network error:', error);
    throw error;
  }
}

/**
 * Authenticated JSON fetch helper
 * Parsea la respuesta como JSON automáticamente
 *
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 * @throws {Error} - If response is not OK or JSON parsing fails
 */
export async function authenticatedFetchJSON(url, options = {}) {
  const response = await authenticatedFetch(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}
