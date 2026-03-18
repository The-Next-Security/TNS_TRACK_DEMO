// SessionManager.jsx
// Global session management component
// Feature: 003-fix-session-expiry-handling

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SessionExpiryWarning } from './SessionExpiryWarning';
import { LogoutReason } from '../constants/logoutReason_Constants';
import { setLogoutReason } from '../utils/session_Utils';
import { broadcastLogout } from '../utils/crossTabSync_Utils';
import { useCrossTabLogout } from '../hooks/useCrossTabLogout_Hook';
import analyticsService from '../services/analytics_Service';
import { useAuth } from '../context/AuthContext';

// Warning threshold: show warning 5 minutes before expiry
const WARNING_THRESHOLD_SECONDS = 300;

function _performLogout(reason) {
  const refreshToken = localStorage.getItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  // Llamar logout endpoint para revocar refresh en servidor (fire and forget)
  axios.post('/api/auth/logout', refreshToken ? { refreshToken } : {})
    .catch((error) => {
      console.error('[SessionManager] Error calling /logout:', error);
    });

  broadcastLogout(reason);
  window.location.href = '/TNSTrack/';
}

/**
 * SessionManager Component
 * Monitors session expiration and shows warning when threshold is reached.
 * Obtiene isAuthenticated desde AuthContext (fuente única de verdad).
 */
export function SessionManager({ children }) {
  const { isAuthenticated } = useAuth();
  const [sessionData, setSessionData] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  // Listen for cross-tab logout events
  useCrossTabLogout(() => {
    console.log('[SessionManager] Cross-tab logout detected, redirecting...');
    window.location.href = '/TNSTrack/';
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Poll /api/auth/validate every 30 seconds para obtener metadata de sesión
    const pollSession = async () => {
      try {
        const response = await axios.get('/api/auth/validate');
        const data = response.data;

        if (data.session) {
          setSessionData(data.session);

          // AUTO-LOGOUT: If session expired (timeRemaining === 0)
          if (data.session.timeRemaining === 0) {
            try {
              localStorage.setItem('tns_logout_reason', 'session_expired');
            } catch (err) {
              console.error('[SessionManager] Failed to store logout reason:', err);
            }

            analyticsService.trackEvent('session_auto_expired', { timestamp: Date.now() });
            _performLogout(LogoutReason.SESSION_EXPIRED);
            return;
          }

          // Show warning if timeRemaining <= WARNING_THRESHOLD_SECONDS
          if (data.session.timeRemaining <= WARNING_THRESHOLD_SECONDS && data.session.timeRemaining > 0) {
            if (!showWarning) {
              setShowWarning(true);
            }
          } else {
            if (showWarning) {
              setShowWarning(false);
            }
          }
        }
      } catch (error) {
        // axios interceptor ya maneja 401 → auto-refresh o auth:unauthorized
        if (error.response?.status !== 401) {
          console.error('[SessionManager] Error polling session:', error);
        }
      }
    };

    // Poll immediately on mount
    pollSession();

    // Poll every 30 seconds
    const intervalId = setInterval(pollSession, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, showWarning]);

  const handleLogoutClick = async () => {
    console.log('[SessionManager] User initiated logout from warning');

    setLogoutReason(LogoutReason.USER_INITIATED_FROM_WARNING);

    analyticsService.trackEvent('logout_from_warning', {
      timeRemaining: sessionData?.timeRemaining,
      timestamp: Date.now()
    });

    try {
      localStorage.setItem('tns_logout_reason', LogoutReason.USER_INITIATED_FROM_WARNING);
    } catch (err) { /* ignore */ }

    _performLogout(LogoutReason.USER_INITIATED_FROM_WARNING);
  };

  const handleSessionExtended = (result) => {
    // Actualizar tokens en localStorage tras extend-session
    if (result.accessToken) localStorage.setItem('accessToken', result.accessToken);
    if (result.refreshToken) localStorage.setItem('refreshToken', result.refreshToken);

    setSessionData({
      expiresAt: result.expiresAt,
      expiresIn: result.expiresIn,
      timeRemaining: result.expiresIn
    });

    setShowWarning(false);
  };

  return (
    <>
      {children}

      {/* Render warning when threshold is reached */}
      {showWarning && sessionData && (
        <SessionExpiryWarning
          timeRemaining={sessionData.timeRemaining}
          onLogoutClick={handleLogoutClick}
          onExtended={handleSessionExtended}
        />
      )}
    </>
  );
}
