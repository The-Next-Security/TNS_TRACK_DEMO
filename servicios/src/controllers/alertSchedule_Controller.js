/**
 * Alert Schedule Controller
 *
 * Controller for managing global alert schedule configuration.
 * Handles GET and POST requests for alert schedule parameters.
 *
 * Feature: 002-configurable-alert-schedules
 * Issue: https://github.com/TNSTRACK/servicios/issues/19
 *
 * @module controllers/alertScheduleController
 */

const alertScheduleConfigService = require('../services/db/alertScheduleConfig_Service');

/**
 * GET /api/config/alert-schedules
 *
 * Retrieve current alert schedule configuration
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with configuration data
 *
 * @example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "weekday_start": "08:30:00",
 *     "weekday_end": "18:30:00",
 *     "saturday_start": "08:30:00",
 *     "saturday_end": "14:30:00",
 *     "respect_holidays": "true",
 *     "updated_at": "2025-10-21T10:15:43Z",
 *     "updated_by": "admin@storage.cl"
 *   }
 * }
 */
async function getAlertSchedules(req, res) {
  try {
    console.log('[AlertScheduleController] GET /api/config/alert-schedules - User:', req.user?.email || 'unknown');

    const config = await alertScheduleConfigService.loadAllConfig();

    res.status(200).json({
      success: true,
      data: config
    });

    console.log('[AlertScheduleController] ✅ Configuration retrieved successfully');
  } catch (error) {
    console.error('[AlertScheduleController] ❌ Error retrieving configuration:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al cargar la configuración',
        details: error.message
      }
    });
  }
}

/**
 * POST /api/config/alert-schedules
 *
 * Update alert schedule configuration (partial or full update)
 *
 * Authentication: Required (session-based)
 * Authorization: Admin role required (T024)
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Configuration updates
 * @param {string} [req.body.weekday_start] - Weekday start time (HH:mm:ss)
 * @param {string} [req.body.weekday_end] - Weekday end time (HH:mm:ss)
 * @param {string} [req.body.saturday_start] - Saturday start time (HH:mm:ss)
 * @param {string} [req.body.saturday_end] - Saturday end time (HH:mm:ss)
 * @param {boolean|string} [req.body.respect_holidays] - Respect Chilean holidays
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated configuration
 *
 * @example Request Body:
 * {
 *   "weekday_start": "09:00:00",
 *   "weekday_end": "17:00:00"
 * }
 *
 * @example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "weekday_start": "09:00:00",
 *     "weekday_end": "17:00:00",
 *     "saturday_start": "08:30:00",
 *     "saturday_end": "14:30:00",
 *     "respect_holidays": "true",
 *     "updated_at": "2025-10-21T13:45:22Z",
 *     "updated_by": "admin@storage.cl"
 *   },
 *   "message": "Configuración actualizada correctamente"
 * }
 *
 * @example Response (400 Bad Request):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "INVALID_FORMAT",
 *     "message": "Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)",
 *     "field": "weekday_start"
 *   }
 * }
 */
async function updateAlertSchedules(req, res) {
  try {
    const updates = req.body;
    const updatedBy = req.user?.email || req.user?.username || 'unknown';

    console.log('[AlertScheduleController] POST /api/config/alert-schedules - User:', updatedBy);
    console.log('[AlertScheduleController] Updates:', JSON.stringify(updates, null, 2));

    // Validate request body is not empty
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_REQUEST',
          message: 'No se proporcionaron valores para actualizar'
        }
      });
    }

    // Convert boolean to string if needed (for respect_holidays)
    if (updates.respect_holidays !== undefined) {
      updates.respect_holidays = String(updates.respect_holidays);
    }

    // Server-side validation
    const validation = alertScheduleConfigService.validateConfig(updates);

    if (!validation.success) {
      console.warn('[AlertScheduleController] ⚠️  Validation failed:', validation.errors);

      return res.status(400).json({
        success: false,
        error: validation.errors[0] // Return first error
      });
    }

    // Update configuration in database
    const result = await alertScheduleConfigService.updateMultipleConfigs(updates, updatedBy);

    // Load updated configuration
    const updatedConfig = await alertScheduleConfigService.loadAllConfig();

    // Log the change for audit trail
    console.log('[AlertScheduleController] ✅ Configuration updated successfully');
    console.log('[AlertScheduleController] Updated fields:', Object.keys(updates).join(', '));
    console.log('[AlertScheduleController] Updated by:', updatedBy);

    // TODO: Emit PostHog event for analytics (T083)
    // posthog.capture({
    //   distinctId: updatedBy,
    //   event: 'alert_schedule_config_updated',
    //   properties: {
    //     config_keys: Object.keys(updates),
    //     updated_count: result.updatedCount
    //   }
    // });

    res.status(200).json({
      success: true,
      data: updatedConfig,
      message: 'Configuración actualizada correctamente'
    });
  } catch (error) {
    console.error('[AlertScheduleController] ❌ Error updating configuration:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al actualizar la configuración',
        details: error.message
      }
    });
  }
}

/**
 * POST /api/config/alert-schedules/validate
 *
 * Validate configuration without persisting to database
 *
 * @param {Object} req - Express request object
 * @param {Object} req.body - Configuration to validate
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with validation result
 *
 * @example Request Body:
 * {
 *   "weekday_start": "19:00:00",
 *   "weekday_end": "08:00:00"
 * }
 *
 * @example Response (200 OK - Valid):
 * {
 *   "success": true,
 *   "valid": true,
 *   "message": "Configuración válida"
 * }
 *
 * @example Response (200 OK - Invalid):
 * {
 *   "success": true,
 *   "valid": false,
 *   "errors": [{
 *     "field": "weekday_start",
 *     "code": "INVALID_RANGE",
 *     "message": "Hora inicio debe ser anterior a hora fin"
 *   }]
 * }
 */
async function validateAlertSchedules(req, res) {
  try {
    const config = req.body;

    console.log('[AlertScheduleController] POST /api/config/alert-schedules/validate');
    console.log('[AlertScheduleController] Validating:', JSON.stringify(config, null, 2));

    // Convert boolean to string if needed
    if (config.respect_holidays !== undefined) {
      config.respect_holidays = String(config.respect_holidays);
    }

    const validation = alertScheduleConfigService.validateConfig(config);

    if (validation.success) {
      console.log('[AlertScheduleController] ✅ Validation passed');

      res.status(200).json({
        success: true,
        valid: true,
        message: 'Configuración válida'
      });
    } else {
      console.log('[AlertScheduleController] ⚠️  Validation failed:', validation.errors);

      res.status(200).json({
        success: true,
        valid: false,
        errors: validation.errors
      });
    }
  } catch (error) {
    console.error('[AlertScheduleController] ❌ Error validating configuration:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al validar la configuración',
        details: error.message
      }
    });
  }
}

/**
 * POST /api/config/alert-schedules/reset
 *
 * Reset configuration to default values
 *
 * Authentication: Required (session-based)
 * Authorization: Admin role required (T024)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with reset configuration
 *
 * @example Response (200 OK):
 * {
 *   "success": true,
 *   "data": {
 *     "weekday_start": "08:30:00",
 *     "weekday_end": "18:30:00",
 *     "saturday_start": "08:30:00",
 *     "saturday_end": "14:30:00",
 *     "respect_holidays": "true",
 *     "updated_at": "2025-10-21T14:00:00Z",
 *     "updated_by": "admin@storage.cl"
 *   },
 *   "message": "Configuración restaurada a valores por defecto"
 * }
 */
async function resetAlertSchedules(req, res) {
  try {
    const updatedBy = req.user?.email || req.user?.username || 'unknown';

    console.log('[AlertScheduleController] POST /api/config/alert-schedules/reset - User:', updatedBy);

    // Reset to defaults
    await alertScheduleConfigService.resetToDefaults(updatedBy);

    // Load reset configuration
    const config = await alertScheduleConfigService.loadAllConfig();

    console.log('[AlertScheduleController] ✅ Configuration reset to defaults');

    res.status(200).json({
      success: true,
      data: config,
      message: 'Configuración restaurada a valores por defecto'
    });
  } catch (error) {
    console.error('[AlertScheduleController] ❌ Error resetting configuration:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error al restaurar la configuración',
        details: error.message
      }
    });
  }
}

module.exports = {
  getAlertSchedules,
  updateAlertSchedules,
  validateAlertSchedules,
  resetAlertSchedules
};
