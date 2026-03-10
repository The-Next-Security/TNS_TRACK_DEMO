// crossTabSync.js
// Cross-tab synchronization utilities for logout events
// Feature: 003-fix-session-expiry-handling

const LOGOUT_BROADCAST_KEY = 'tns_logout_broadcast';

/**
 * Broadcast logout event to all tabs via localStorage
 * Uses timestamp trick to trigger storage events in all tabs
 *
 * @param {string} reason - LogoutReason enum value
 */
export function broadcastLogout(reason) {
  try {
    const logoutEvent = {
      reason,
      timestamp: Date.now()
    };

    // Set value to trigger storage event
    localStorage.setItem(LOGOUT_BROADCAST_KEY, JSON.stringify(logoutEvent));

    // Immediately remove to allow future broadcasts
    localStorage.removeItem(LOGOUT_BROADCAST_KEY);

    console.log('[CrossTabSync] Logout broadcast sent:', reason);
  } catch (error) {
    console.error('[CrossTabSync] Error broadcasting logout:', error);
  }
}

/**
 * Clear logout broadcast key (cleanup)
 */
export function clearLogoutBroadcast() {
  try {
    localStorage.removeItem(LOGOUT_BROADCAST_KEY);
  } catch (error) {
    console.error('[CrossTabSync] Error clearing broadcast:', error);
  }
}

/**
 * Parse logout broadcast event from localStorage
 * @param {StorageEvent} event - Storage event
 * @returns {Object|null} - { reason, timestamp } or null
 */
export function parseLogoutBroadcast(event) {
  if (event.key !== LOGOUT_BROADCAST_KEY || !event.newValue) {
    return null;
  }

  try {
    return JSON.parse(event.newValue);
  } catch (error) {
    console.error('[CrossTabSync] Error parsing logout broadcast:', error);
    return null;
  }
}
