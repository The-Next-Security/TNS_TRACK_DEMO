// sessionUtils.js
// Utilities for managing logout reason
// Feature: 003-fix-session-expiry-handling
// NOTE: Using localStorage instead of sessionStorage to persist across page reloads

const LOGOUT_REASON_KEY = 'tns_logout_reason';

/**
 * Store logout reason in localStorage (persists across page reloads)
 * @param {string} reason - One of LogoutReason enum values
 */
export function setLogoutReason(reason) {
  try {
    localStorage.setItem(LOGOUT_REASON_KEY, reason);
    console.log('[SessionUtils] Logout reason stored:', reason);
  } catch (error) {
    console.error('[SessionUtils] Error storing logout reason:', error);
  }
}

/**
 * Retrieve logout reason from localStorage
 * @returns {string|null} - Logout reason or null if not found
 */
export function getLogoutReason() {
  try {
    return localStorage.getItem(LOGOUT_REASON_KEY);
  } catch (error) {
    console.error('[SessionUtils] Error retrieving logout reason:', error);
    return null;
  }
}

/**
 * Clear logout reason from localStorage
 */
export function clearLogoutReason() {
  try {
    localStorage.removeItem(LOGOUT_REASON_KEY);
    console.log('[SessionUtils] Logout reason cleared');
  } catch (error) {
    console.error('[SessionUtils] Error clearing logout reason:', error);
  }
}

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
export function isSessionStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}
