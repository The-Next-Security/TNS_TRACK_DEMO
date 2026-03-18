// logoutReason_Constants.js
// Constants for logout reasons and their user-facing messages
// Feature: 003-fix-session-expiry-handling

/**
 * Enum of possible logout reasons
 */
export const LogoutReason = {
  MANUAL: 'manual',
  SESSION_EXPIRED: 'session_expired',
  USER_INITIATED_FROM_WARNING: 'user_initiated_from_warning',
  TOKEN_EXPIRED: 'token_expired',
  CROSS_TAB_SYNC: 'cross_tab_sync',
  NETWORK_ERROR: 'network_error',
  FORCED: 'forced'
};

/**
 * User-facing messages for each logout reason
 * Displayed on login page after logout
 */
export const LOGOUT_MESSAGES = {
  [LogoutReason.MANUAL]: "You have been logged out.",
  [LogoutReason.SESSION_EXPIRED]: "Your session expired after 2 hours of inactivity. Please log in again.",
  [LogoutReason.USER_INITIATED_FROM_WARNING]: "You logged out. Please log in again to continue.",
  [LogoutReason.TOKEN_EXPIRED]: "Your session expired. Please log in again.",
  [LogoutReason.CROSS_TAB_SYNC]: "You logged out in another tab.",
  [LogoutReason.NETWORK_ERROR]: "A network error occurred. Please log in again.",
  [LogoutReason.FORCED]: "Your session was ended. Please log in again."
};

/**
 * Get user-facing message for a logout reason
 * @param {string} reason - LogoutReason enum value
 * @returns {string} - User-facing message
 */
export function getLogoutMessage(reason) {
  return LOGOUT_MESSAGES[reason] || LOGOUT_MESSAGES[LogoutReason.FORCED];
}
