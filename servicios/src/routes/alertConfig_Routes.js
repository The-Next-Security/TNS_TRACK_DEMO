// src/routes/alertConfig_Routes.js
// Dominio: Configuración de Alertas — Reorganización Issue #11
// Montado en: /api/config

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares');

const alertScheduleController = require('../controllers/alertSchedule_Controller');

// Literales ANTES del POST genérico
router.get('/alert-schedules', authMiddleware.authenticate.bind(authMiddleware), alertScheduleController.getAlertSchedules.bind(alertScheduleController));
router.post('/alert-schedules/validate', authMiddleware.authenticate.bind(authMiddleware), alertScheduleController.validateAlertSchedules.bind(alertScheduleController));
router.post('/alert-schedules/reset', authMiddleware.authenticate.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), alertScheduleController.resetAlertSchedules.bind(alertScheduleController));
router.post('/alert-schedules', authMiddleware.authenticate.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), alertScheduleController.updateAlertSchedules.bind(alertScheduleController));

module.exports = router;
