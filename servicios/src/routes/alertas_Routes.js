// src/routes/alertas_Routes.js
// Dominio: Alertas — Reorganización Issue #11
// Montado en: /api/alertas

const express = require('express');
const router = express.Router();

const alertTrackingController = require('../controllers/alertTracking_Controller');

// Acciones sobre alertas
router.post('/reconocer', alertTrackingController.acknowledgeAlert.bind(alertTrackingController));
router.post('/observacion', alertTrackingController.addObservation.bind(alertTrackingController));
router.post('/resolver', alertTrackingController.resolveAlert.bind(alertTrackingController));
router.post('/falsa-alarma', alertTrackingController.markAsFalseAlarm.bind(alertTrackingController));

// Literales ANTES de paramétricos
router.get('/lista', alertTrackingController.getAlertsList.bind(alertTrackingController));
router.get('/metricas/resumen', alertTrackingController.getMetricsSummary.bind(alertTrackingController));
router.get('/metricas/grafico', alertTrackingController.getChartData.bind(alertTrackingController));
router.get('/:alertId', alertTrackingController.getAlertDetails.bind(alertTrackingController));

module.exports = router;
