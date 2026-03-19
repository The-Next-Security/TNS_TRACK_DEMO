// src/routes/notifConfig_Routes.js
// Dominio: Configuración de Notificaciones — Reorganización Issue #11
// Montado en: /api/config

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares');

const notificationHorariosController = require('../controllers/notificationHorarios_Controller');

// --- Horarios base ---
router.get('/notification-schedule-base', authMiddleware.authenticate.bind(authMiddleware), notificationHorariosController.getHorariosBase.bind(notificationHorariosController));
router.post('/notification-schedule-base', authMiddleware.authenticate.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), notificationHorariosController.postHorariosBase.bind(notificationHorariosController));
router.put('/notification-schedule-base/:id', authMiddleware.authenticate.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), notificationHorariosController.putHorariosBase.bind(notificationHorariosController));
router.delete('/notification-schedule-base/:id', authMiddleware.authenticate.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), notificationHorariosController.deleteHorariosBase.bind(notificationHorariosController));

// --- Horarios del usuario ---
router.get('/my-notification-schedules', authMiddleware.authenticate.bind(authMiddleware), notificationHorariosController.getMisHorarios.bind(notificationHorariosController));
router.post('/my-notification-schedules', authMiddleware.authenticate.bind(authMiddleware), notificationHorariosController.postMisHorarios.bind(notificationHorariosController));
router.delete('/my-notification-schedules/:id', authMiddleware.authenticate.bind(authMiddleware), notificationHorariosController.deleteMisHorarios.bind(notificationHorariosController));

module.exports = router;
