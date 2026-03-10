// useCrossTabLogout.js
// Custom hook for listening to logout events from other tabs
// Feature: 003-fix-session-expiry-handling

import { useEffect } from 'react';
import { parseLogoutBroadcast } from '../utils/crossTabSync_Utils';
import { setLogoutReason } from '../utils/session_Utils';
import { LogoutReason } from '../constants/logoutReason_Constants';
import analyticsService from '../services/analytics_Service';

/**
 * Cross-tab logout synchronization hook
 * Listens for logout events from other tabs and triggers logout in current tab
 *
 * @param {function} onLogout - Callback when logout event is received
 *
 * @example
 * useCrossTabLogout(() => {
 *   window.location.href = '/storage/';
 * });
 */
export function useCrossTabLogout(onLogout) {
  useEffect(() => {
    const handleStorageChange = (event) => {
      const logoutData = parseLogoutBroadcast(event);

      if (!logoutData) {
        return;
      }

      console.log('[useCrossTabLogout] Logout broadcast received:', logoutData);

      // Store cross-tab logout reason
      setLogoutReason(LogoutReason.CROSS_TAB_SYNC);

      // Track cross-tab logout in analytics
      analyticsService.trackEvent('cross_tab_logout', {
        originalReason: logoutData.reason,
        timestamp: logoutData.timestamp
      });

      // Call logout endpoint to clear cookies
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).catch((error) => {
        console.error('[useCrossTabLogout] Error calling /logout:', error);
      });

      // Trigger callback (typically redirect to login)
      if (onLogout) {
        onLogout();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [onLogout]);
}
