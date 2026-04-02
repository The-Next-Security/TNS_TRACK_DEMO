// useSessionExtension.js
// Custom hook for extending user session
// Feature: 003-fix-session-expiry-handling

import { useState } from 'react';
import axios from 'axios';
import analyticsService from '../services/analytics_Service';

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
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No hay refresh token disponible');
      }

      const { data } = await axios.post('/api/auth/extend-session', { refreshToken });

      // Guardar los nuevos tokens inmediatamente
      if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

      // Track session extension in analytics
      analyticsService.trackEvent('session_extended', {
        expiresAt: data.expiresAt,
        expiresIn: data.expiresIn,
        timestamp: Date.now()
      });

      console.log('[useSessionExtension] Sesión extendida correctamente:', data);

      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        expiresIn: data.expiresIn,
        message: data.message
      };
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Error al extender la sesión';
      console.error('[useSessionExtension] Error extending session:', err);

      // Track extension failure in analytics
      analyticsService.trackEvent('session_extension_failed', {
        error: message,
        timestamp: Date.now()
      });

      setError(message);

      return {
        success: false,
        error: message
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
