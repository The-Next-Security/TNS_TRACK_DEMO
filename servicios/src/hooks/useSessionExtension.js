// useSessionExtension.js
// Custom hook for extending user session
// Feature: 003-fix-session-expiry-handling

import { useState } from 'react';
import { authenticatedFetch } from '../utils/httpInterceptor_Utils';
import analyticsService from '../services/analyticsService';

/**
 * Session extension hook
 * Provides function to extend session and loading state
 *
 * @returns {Object} - { extendSession, isExtending, error }
 *
 * @example
 * const { extendSession, isExtending, error } = useSessionExtension();
 *
 * const handleExtend = async () => {
 *   const result = await extendSession();
 *   if (result.success) {
 *     console.log('Session extended until', result.expiresAt);
 *   }
 * };
 */
export function useSessionExtension() {
  const [isExtending, setIsExtending] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Extend current session by calling /api/auth/extend-session
   * @returns {Promise<Object>} - { success, expiresAt, expiresIn, message }
   */
  const extendSession = async () => {
    setIsExtending(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/auth/extend-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Track session extension in analytics
      analyticsService.trackEvent('session_extended', {
        expiresAt: data.expiresAt,
        expiresIn: data.expiresIn,
        timestamp: Date.now()
      });

      console.log('[useSessionExtension] Session extended successfully:', data);

      return {
        success: true,
        expiresAt: data.expiresAt,
        expiresIn: data.expiresIn,
        message: data.message
      };
    } catch (err) {
      console.error('[useSessionExtension] Error extending session:', err);

      // Track extension failure in analytics
      analyticsService.trackEvent('session_extension_failed', {
        error: err.message,
        timestamp: Date.now()
      });

      setError(err.message);

      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsExtending(false);
    }
  };

  return {
    extendSession,
    isExtending,
    error
  };
}
