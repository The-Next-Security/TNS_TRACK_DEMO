// SessionManager.jsx
// Global session management component
// Feature: 003-fix-session-expiry-handling

import React, { useState, useEffect } from 'react';
import { SessionExpiryWarning } from './SessionExpiryWarning';
import { LogoutReason } from '../constants/logoutReason_Constants';
import { setLogoutReason } from '../utils/session_Utils';
import { broadcastLogout } from '../utils/crossTabSync_Utils';
import { useCrossTabLogout } from '../hooks/useCrossTabLogout_Hook';
import analyticsService from '../services/analytics_Service';

// Warning threshold: show warning 5 minutes before expiry
const WARNING_THRESHOLD_SECONDS = 300;

/**
 * SessionManager Component
 * Monitors session expiration and shows warning when threshold is reached
 *
 * @param {Object} props
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 */
export function SessionManager({ isAuthenticated, children }) {
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

    // Poll /api/auth/validate every 30 seconds to get session metadata
    const pollSession = async () => {
      try {
        const response = await fetch('/api/auth/validate', {
          credentials: 'include',
          cache: 'no-store' // Force no-cache from client side too
        });

        if (!response.ok) {
          // If 401, treat as session expired
          if (response.status === 401) {
            // Store logout reason SYNCHRONOUSLY
            try {
              localStorage.setItem('tns_logout_reason', 'session_expired');
            } catch (err) {
              console.error('[SessionManager] Failed to store logout reason:', err);
            }

            // Broadcast to other tabs
            broadcastLogout(LogoutReason.SESSION_EXPIRED);

            // Track in analytics
            analyticsService.trackEvent('session_auto_expired', {
              timestamp: Date.now()
            });

            // Call logout endpoint (fire and forget)
            fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include'
            }).catch((error) => {
              console.error('[SessionManager] Error calling /logout:', error);
            });

            // Redirect immediately (localStorage is already written synchronously)
            window.location.href = '/TNSTrack/';
          }
          return;
        }

        const data = await response.json();

        if (data.session) {
          setSessionData(data.session);

          // AUTO-LOGOUT: If session expired (timeRemaining === 0)
          if (data.session.timeRemaining === 0) {
            // Store logout reason SYNCHRONOUSLY
            try {
              localStorage.setItem('tns_logout_reason', 'session_expired');
            } catch (err) {
              console.error('[SessionManager] Failed to store logout reason:', err);
            }

            // Broadcast to other tabs
            broadcastLogout(LogoutReason.SESSION_EXPIRED);

            // Track in analytics
            analyticsService.trackEvent('session_auto_expired', {
              timestamp: Date.now()
            });

            // Call logout endpoint (fire and forget)
            fetch('/api/auth/logout', {
              method: 'POST',
              credentials: 'include'
            }).catch((error) => {
              console.error('[SessionManager] Error calling /logout:', error);
            });

            // Redirect immediately (localStorage is already written synchronously)
            window.location.href = '/TNSTrack/';
            return;
          }

          // Show warning if timeRemaining <= WARNING_THRESHOLD_SECONDS
          if (data.session.timeRemaining <= WARNING_THRESHOLD_SECONDS && data.session.timeRemaining > 0) {
            if (!showWarning) {
              setShowWarning(true);
            }
          } else {
            // Hide warning if user extended session
            if (showWarning) {
              setShowWarning(false);
            }
          }
        }
      } catch (error) {
        console.error('[SessionManager] Error polling session:', error);
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

    // Store logout reason
    setLogoutReason(LogoutReason.USER_INITIATED_FROM_WARNING);

    // Broadcast to other tabs
    broadcastLogout(LogoutReason.USER_INITIATED_FROM_WARNING);

    // Track in analytics
    analyticsService.trackEvent('logout_from_warning', {
      timeRemaining: sessionData?.timeRemaining,
      timestamp: Date.now()
    });

    // Call logout endpoint
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('[SessionManager] Error calling /logout:', error);
    }

    // Redirect to login
    window.location.href = '/TNSTrack/';
  };

  const handleSessionExtended = (result) => {
    // Update session data
    setSessionData({
      expiresAt: result.expiresAt,
      expiresIn: result.expiresIn,
      timeRemaining: result.expiresIn
    });

    // Hide warning
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
