// src/routes/analisis_Routes.js
// Dominio: Análisis — Reorganización Issue #11
// Montado en: /api/analisis

const express = require('express');
const router = express.Router();

const { validationMiddleware } = require('../middlewares');

const powerAnalysisController = require('../controllers/powerAnalysis_Controller');

// Literal ANTES de paramétrico
router.get('/temperatura-potencia/ubicaciones', powerAnalysisController.handleTemperaturePowerLocations.bind(powerAnalysisController));
router.get('/temperatura-potencia/:date', validationMiddleware.validateDateParams.bind(validationMiddleware), powerAnalysisController.handleTemperaturePowerAnalysis.bind(powerAnalysisController));

module.exports = router;
