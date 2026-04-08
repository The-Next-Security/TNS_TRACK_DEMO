// src/routes/reportes_Routes.js
// Dominio: Reportes — Reorganización Issue #11
// Montado en: /api/reportes

const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report_Controller');
const reportSchedulerController = require('../controllers/reportScheduler_Controller');
const ubibotController = require('../controllers/ubibot_Controller');
const reportPermissions = require('../middlewares/reportPermissions_Middleware');
const { authMiddleware } = require('../middlewares');
const authenticate = authMiddleware.authenticate.bind(authMiddleware);

// --- Descongelamiento ---
router.get('/descongelamiento/analisis', ubibotController.getDefrostAnalysisData.bind(ubibotController));
router.get('/descongelamiento/analisis-semanal', ubibotController.getWeeklyDefrostAnalysisData.bind(ubibotController));
router.post('/descongelamiento/generar', ubibotController.handleGenerateDefrostReport.bind(ubibotController));
router.post('/descongelamiento/generar-semanal', ubibotController.handleGenerateWeeklyDefrostReport.bind(ubibotController));

// --- Reportes generales ---
router.post('/generar', authenticate, reportPermissions.checkGenerateReports, reportController.generateReport.bind(reportController));
router.get('/plantillas', reportController.getTemplates.bind(reportController)); // público — datos de catálogo
router.get('/historial', authenticate, reportController.getHistory.bind(reportController));
router.get('/descargar/:id', authenticate, reportController.downloadReport.bind(reportController));

// --- Reportes programados ---
// Literales ANTES de paramétricos
router.get('/programados/conteo', reportSchedulerController.getActiveCount.bind(reportSchedulerController)); // público — contador
router.get('/programados', authenticate, reportSchedulerController.listSchedules.bind(reportSchedulerController));
router.post('/programados', authenticate, reportPermissions.checkScheduleReports, reportSchedulerController.createSchedule.bind(reportSchedulerController));
router.put('/programados/:id', authenticate, reportPermissions.checkScheduleReports, reportSchedulerController.updateSchedule.bind(reportSchedulerController));
router.delete('/programados/:id', authenticate, reportPermissions.checkScheduleReports, reportSchedulerController.deleteSchedule.bind(reportSchedulerController));
router.patch('/programados/:id/toggle', authenticate, reportPermissions.checkScheduleReports, reportSchedulerController.toggleSchedule.bind(reportSchedulerController));

// --- Email ---
router.post('/enviar-email', authenticate, reportPermissions.checkSendReports, reportController.sendEmail.bind(reportController));

module.exports = router;
