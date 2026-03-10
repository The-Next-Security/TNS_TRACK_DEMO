/**
 * Alert Schedule Routes
 *
 * Express routes for alert schedule configuration endpoints.
 *
 * Feature: 002-configurable-alert-schedules
 * Issue: https://github.com/TNSTRACK/servicios/issues/19
 *
 * @module routes/alertScheduleRoutes
 */

const express = require('express');
const router = express.Router();
const alertScheduleController = require('../controllers/alertSchedule_Controller');

// Note: Authentication middleware should be applied in the main routes file
// All routes assume req.user is available from session

/**
 * GET /api/config/alert-schedules
 * Retrieve current alert schedule configuration
 *
 * Authentication: Required (session-based)
 * Authorization: Any authenticated user can read
 */
router.get('/alert-schedules', alertScheduleController.getAlertSchedules);

/**
 * POST /api/config/alert-schedules
 * Update alert schedule configuration
 *
 * Authentication: Required (session-based)
 * Authorization: Admin only (middleware should be added in main routes)
 */
router.post('/alert-schedules', alertScheduleController.updateAlertSchedules);

/**
 * POST /api/config/alert-schedules/validate
 * Validate configuration without persisting
 *
 * Authentication: Required (session-based)
 * Authorization: Any authenticated user can validate
 */
router.post('/alert-schedules/validate', alertScheduleController.validateAlertSchedules);

/**
 * POST /api/config/alert-schedules/reset
 * Reset configuration to defaults
 *
 * Authentication: Required (session-based)
 * Authorization: Admin only (middleware should be added in main routes)
 */
router.post('/alert-schedules/reset', alertScheduleController.resetAlertSchedules);

module.exports = router;
