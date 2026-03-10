// axiosInterceptor.js
// Global axios interceptor for handling 401 Unauthorized responses
// Feature: 003-fix-session-expiry-handling

import axios from 'axios';

/**
 * Setup global axios interceptor to dispatch auth:unauthorized events on 401 responses
 * This captures ALL axios requests across the application (40+ files)
 *
 * Call this ONCE at application startup (App.js useEffect)
 *
 * @example
 * import { setupAxiosInterceptor } from './utils/axiosInterceptor';
 *
 * useEffect(() => {
 *   setupAxiosInterceptor();
 * }, []);
 */
export function setupAxiosInterceptor() {
  // Add response interceptor
  axios.interceptors.response.use(
    // Pass through successful responses (2xx status codes)
    (response) => response,

    // Handle errors (4xx, 5xx status codes)
    (error) => {
      // Intercept 401 Unauthorized responses
      if (error.response && error.response.status === 401) {
        console.log('[axiosInterceptor] 🔴 401 Unauthorized detected:', error.config?.url);

        // Dispatch custom event to trigger logout flow
        // This event is listened to by App.js
        window.dispatchEvent(new CustomEvent('auth:unauthorized', {
          detail: {
            url: error.config?.url || 'unknown',
            timestamp: Date.now(),
            method: error.config?.method || 'unknown',
            source: 'axios'
          }
        }));
      }

      // Re-throw error so components can handle it locally if needed
      return Promise.reject(error);
    }
  );

  console.log('[axiosInterceptor] ✅ Global axios interceptor configured');
}
