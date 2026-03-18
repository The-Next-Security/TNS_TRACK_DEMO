// src/routes/reportes_Routes.js
// Dominio: Reportes — Reorganización Issue #11
// Montado en: /api/reportes

const express = require('express');
const router = express.Router();

const reportController = require('../controllers/report_Controller');
const reportSchedulerController = require('../controllers/reportScheduler_Controller');
const ubibotController = require('../controllers/ubibot_Controller');
const reportPermissions = require('../middlewares/reportPermissions_Middleware');

// --- Descongelamiento ---
router.get('/descongelamiento/analisis', ubibotController.getDefrostAnalysisData.bind(ubibotController));
router.get('/descongelamiento/analisis-semanal', ubibotController.getWeeklyDefrostAnalysisData.bind(ubibotController));
router.post('/descongelamiento/generar', ubibotController.handleGenerateDefrostReport.bind(ubibotController));
router.post('/descongelamiento/generar-semanal', ubibotController.handleGenerateWeeklyDefrostReport.bind(ubibotController));

// --- Reportes generales ---
router.post('/generar', reportPermissions.checkGenerateReports, reportController.generateReport.bind(reportController));
router.get('/plantillas', reportController.getTemplates.bind(reportController));
router.get('/historial', reportController.getHistory.bind(reportController));
router.get('/descargar/:id', reportController.downloadReport.bind(reportController));

// --- Reportes programados ---
// Literales ANTES de paramétricos
router.get('/programados/conteo', reportSchedulerController.getActiveCount.bind(reportSchedulerController));
router.get('/programados', reportSchedulerController.listSchedules.bind(reportSchedulerController));
router.post('/programados', reportPermissions.checkScheduleReports, reportSchedulerController.createSchedule.bind(reportSchedulerController));
router.put('/programados/:id', reportPermissions.checkScheduleReports, reportSchedulerController.updateSchedule.bind(reportSchedulerController));
router.delete('/programados/:id', reportPermissions.checkScheduleReports, reportSchedulerController.deleteSchedule.bind(reportSchedulerController));
router.patch('/programados/:id/toggle', reportPermissions.checkScheduleReports, reportSchedulerController.toggleSchedule.bind(reportSchedulerController));

// --- Email ---
router.post('/enviar-email', reportPermissions.checkSendReports, reportController.sendEmail.bind(reportController));

module.exports = router;
