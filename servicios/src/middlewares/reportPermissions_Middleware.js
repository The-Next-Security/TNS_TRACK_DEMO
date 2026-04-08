/**
 * Report Permissions Middleware
 *
 * Verifies user permissions for report-related operations:
 * - generate_reports: Generate manual reports
 * - schedule_reports: Create/edit/delete scheduled reports
 * - send_reports: Send reports via email
 *
 * Integrates with existing authentication system
 */

/**
 * Check if user has 'generate_reports' permission
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
const checkGenerateReports = async (req, res, next) => {
  try {
    // Verify user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado. Por favor inicia sesión.'
      });
    }

    // req.user.permissions es un string de GROUP_CONCAT (ej: "view_dashboard,manage_reports")
    const hasPermission = req.user.permissions?.includes('manage_reports');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para generar reportes.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking generate_reports permission:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Check if user has 'schedule_reports' permission
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
const checkScheduleReports = async (req, res, next) => {
  try {
    // Verify user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado. Por favor inicia sesión.'
      });
    }

    // req.user.permissions es un string de GROUP_CONCAT (ej: "view_dashboard,manage_reports")
    const hasPermission = req.user.permissions?.includes('manage_reports');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para programar reportes.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking schedule_reports permission:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

/**
 * Check if user has 'send_reports' permission
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 */
const checkSendReports = async (req, res, next) => {
  try {
    // Verify user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado. Por favor inicia sesión.'
      });
    }

    // req.user.permissions es un string de GROUP_CONCAT (ej: "view_dashboard,manage_reports")
    const hasPermission = req.user.permissions?.includes('manage_reports');

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para enviar reportes por email.'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking send_reports permission:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al verificar permisos'
    });
  }
};

module.exports = {
  checkGenerateReports,
  checkScheduleReports,
  checkSendReports
};
