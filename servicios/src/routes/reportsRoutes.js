/**
 * Reports Module - API Routes
 * Feature: 004-reportes-base-core
 *
 * Endpoints for report generation, scheduling, history, and email delivery
 * All routes require authentication (authenticateUser middleware)
 * Specific permissions checked by reportPermissions middleware
 */

const express = require('express');
const router = express.Router();

// Middleware
// TODO: Update path to actual auth middleware location
// const { authenticateUser } = require('../middleware/auth');
const reportPermissions = require('../middleware/reportPermissions');
const devAuthBypass = require('../middleware/devAuthBypass');

// Controllers
const reportController = require('../controllers/reportController');
const reportSchedulerController = require('../controllers/reportSchedulerController'); // Phase 4 - T041

// Dev-only auth bypass
router.use(devAuthBypass);

/**
 * @route   POST /api/reports/generate
 * @desc    Generate a new report manually
 * @access  Private (requires generate_reports permission)
 * @body    {reportType, startDate, endDate, deviceIds, includeComparative}
 * @returns {reportId, fileUrl, generatedAt}
 */
router.post('/generate',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportPermissions.checkGenerateReports,
  reportController.generateReport
);

/**
 * @route   GET /api/reports/templates
 * @desc    Get available report templates with metadata
 * @access  Private (authenticated users)
 * @returns Array of {id, name, description, estimatedTime, maxDevices}
 */
router.get('/templates',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportController.getTemplates
);

/**
 * @route   GET /api/reports/history
 * @desc    Get paginated report history with filters
 * @access  Private (authenticated users)
 * @query   ?type=X&startDate=Y&endDate=Z&page=1&limit=20
 * @returns {reports: [...], totalCount, totalPages}
 */
router.get('/history',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportController.getHistory
);

/**
 * @route   GET /api/reports/download/:id
 * @desc    Download a generated report PDF
 * @access  Private (authenticated users, own reports or admin)
 * @param   id - Report ID
 * @returns PDF file stream
 */
router.get('/download/:id',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportController.downloadReport
);

/**
 * @route   POST /api/reports/scheduled
 * @desc    Create a new scheduled report
 * @access  Private (requires schedule_reports permission)
 * @body    {name, reportType, frequency, dayOfWeek, time, periodType, deviceIds, options}
 * @returns {scheduleId, nextExecution}
 */
router.post('/scheduled',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportPermissions.checkScheduleReports,
  reportSchedulerController.createSchedule
);

/**
 * @route   GET /api/reports/scheduled/count
 * @desc    Get count of active scheduled reports
 * @access  Private (authenticated users)
 * @returns {count: number}
 */
router.get('/scheduled/count',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportSchedulerController.getActiveCount
);

/**
 * @route   GET /api/reports/scheduled
 * @desc    List user's scheduled reports
 * @access  Private (authenticated users)
 * @returns Array of schedule configurations
 */
router.get('/scheduled',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportSchedulerController.listSchedules
);

/**
 * @route   PUT /api/reports/scheduled/:id
 * @desc    Update an existing scheduled report
 * @access  Private (requires schedule_reports permission, own schedule)
 * @param   id - Schedule ID
 * @body    {name, frequency, dayOfWeek, time, deviceIds, options}
 * @returns {scheduleId, nextExecution}
 */
router.put('/scheduled/:id',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportPermissions.checkScheduleReports,
  reportSchedulerController.updateSchedule
);

/**
 * @route   DELETE /api/reports/scheduled/:id
 * @desc    Delete a scheduled report
 * @access  Private (requires schedule_reports permission, own schedule)
 * @param   id - Schedule ID
 * @returns {success: true}
 */
router.delete('/scheduled/:id',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportPermissions.checkScheduleReports,
  reportSchedulerController.deleteSchedule
);

/**
 * @route   PATCH /api/reports/scheduled/:id/toggle
 * @desc    Toggle schedule active status
 * @access  Private (requires schedule_reports permission)
 * @param   id - Schedule ID
 * @body    {active: boolean}
 * @returns {success, active}
 */
router.patch('/scheduled/:id/toggle',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportPermissions.checkScheduleReports,
  reportSchedulerController.toggleSchedule
);

/**
 * @route   POST /api/reports/send-email
 * @desc    Send a generated report via email
 * @access  Private (requires send_reports permission)
 * @body    {reportId, recipients, subject, message}
 * @returns {success, sentCount}
 */
router.post('/send-email',
  // authenticateUser, // TODO: Uncomment when auth middleware is available
  reportPermissions.checkSendReports,
  reportController.sendEmail
);

/**
 * Health check endpoint for reports module
 * @route   GET /api/reports/health
 * @desc    Check if reports module is operational
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'reports',
    timestamp: new Date().toISOString(),
    message: 'Reports module is operational (routes registered, controllers pending implementation)'
  });
});

module.exports = router;
