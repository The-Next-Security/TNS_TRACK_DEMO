/**
 * Dev Auth Bypass Middleware
 *
 * In development, inject a mock admin user when no req.user is present.
 * Controlled by NODE_ENV !== 'production'.
 */

module.exports = function devAuthBypass(req, res, next) {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && !req.user) {
      console.warn('[DevAuthBypass] No user in request - injecting mock admin (development only)');
      req.user = { 
        id: 1, 
        role: 'admin', 
        permissions: ['generate_reports', 'send_reports', 'schedule_reports', 'download_reports'],
        ai_analysis: true  // Enable AI Analysis in development
      };
    }
    next();
  } catch (error) {
    console.error('[DevAuthBypass] Error injecting mock user:', error.message);
    next();
  }
};


