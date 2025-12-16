// httpInterceptor.js
// HTTP fetch wrapper with 401 interception and auth:unauthorized event dispatch
// Feature: 003-fix-session-expiry-handling

/**
 * Authenticated fetch wrapper
 * Automatically dispatches 'auth:unauthorized' CustomEvent on 401 responses
 *
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 *
 * @example
 * import { authenticatedFetch } from './utils/httpInterceptor';
 *
 * const response = await authenticatedFetch('/api/users', {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 */
export async function authenticatedFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Always include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Dispatch auth:unauthorized event on 401 responses
    if (response.status === 401) {
      console.log('[httpInterceptor] 401 Unauthorized detected, dispatching event:', url);

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
 * Parses response as JSON automatically
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
