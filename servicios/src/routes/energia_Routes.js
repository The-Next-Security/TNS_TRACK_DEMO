// src/routes/energia_Routes.js
// Dominio: Energía — Reorganización Issue #11
// Montado en: /api/energia

const express = require('express');
const router = express.Router();

const { validationMiddleware } = require('../middlewares');

const deviceController = require('../controllers/device_Controller');
const energyController = require('../controllers/energy_Controller');
const totalesController = require('../controllers/totales_Controller');
const consumoCategoriaController = require('../controllers/consumoCategoria_Controller');

// --- Dispositivos ---
// Literales ANTES de paramétricos
router.get('/dispositivos/ultimas-mediciones', deviceController.getLatestDevicesMeasurements.bind(deviceController));
router.get('/dispositivos/activos', deviceController.getActiveDevices.bind(deviceController));
router.get('/dispositivos/legacy', (req, res) => res.status(501).json({
  success: false, message: 'Módulo dispositivos legacy (Teltonika) no disponible en esta versión.',
  module: 'devices-legacy', futureIssue: 'Pendiente de desarrollo en releases posteriores'
}));
router.get('/dispositivos/:id', deviceController.getDeviceById.bind(deviceController));

// --- Consumo ---
// Literales ANTES de paramétricos
router.get('/consumo/categorias', consumoCategoriaController.getCategoriaConsumo.bind(consumoCategoriaController));
router.get('/consumo/umbrales', consumoCategoriaController.getUmbralesConsumo.bind(consumoCategoriaController));
router.get('/consumo/descarga/:shellyId/:date', validationMiddleware.validateDateParams.bind(validationMiddleware), energyController.downloadDeviceData.bind(energyController));
router.get('/consumo/:date', validationMiddleware.validateDateParams.bind(validationMiddleware), energyController.getDailyConsumption.bind(energyController));

// --- Totales ---
router.get('/totales/diario/:date', validationMiddleware.validateDateParams.bind(validationMiddleware), totalesController.getDailyTotalsByDevice.bind(totalesController));
router.get('/totales/mensual/:month', validationMiddleware.validateMonthParams.bind(validationMiddleware), totalesController.getMonthlyTotalsByDevice.bind(totalesController));
router.get('/totales/anual/:year', validationMiddleware.validateYearParams.bind(validationMiddleware), totalesController.getYearlyTotalsByDevice.bind(totalesController));

module.exports = router;
