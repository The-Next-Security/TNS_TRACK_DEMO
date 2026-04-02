// src/routes/temperatura_Routes.js
// Dominio: Temperatura — Reorganización Issue #11
// Montado en: /api/temperatura

const express = require('express');
const router = express.Router();

const ubibotController = require('../controllers/ubibot_Controller');
const presetsController = require('../controllers/presets_Controller');

// --- Dashboard y vistas ---
router.get('/dashboard', ubibotController.getTemperatureDashboardData.bind(ubibotController));
router.get('/camaras', ubibotController.getTemperatureCamarasData.bind(ubibotController));
router.get('/rango', ubibotController.getTemperatureRangeData.bind(ubibotController));
router.get('/rango-dispositivo', ubibotController.getTemperatureRangeByDeviceData.bind(ubibotController));
router.get('/dispositivos', ubibotController.getTemperatureDevices.bind(ubibotController));

// --- Canales ---
// Literales ANTES de paramétricos
router.get('/canales/umbrales', ubibotController.getAllChannelsThresholds.bind(ubibotController));
router.put('/canales/umbrales/bulk', ubibotController.bulkUpdateChannelThresholds.bind(ubibotController));
router.get('/canales/:id/umbrales', ubibotController.getChannelThresholds.bind(ubibotController));
router.put('/canales/:id/umbrales', ubibotController.updateChannelThresholds.bind(ubibotController));
router.put('/canales/:id/operativa', ubibotController.updateChannelOperativa.bind(ubibotController));

// --- Grupos (Presets) ---
// Literales ANTES de paramétricos
router.get('/grupos', presetsController.getAllPresets.bind(presetsController));
router.get('/grupos/uso', presetsController.getPresetUsage.bind(presetsController));
router.post('/grupos/restaurar-defaults', presetsController.restoreDefaults.bind(presetsController));
router.get('/grupos/:id', presetsController.getPresetById.bind(presetsController));
router.post('/grupos', presetsController.createPreset.bind(presetsController));
router.put('/grupos/:id', presetsController.updatePreset.bind(presetsController));
router.delete('/grupos/:id', presetsController.deletePreset.bind(presetsController));
router.post('/grupos/:id/aplicar-camaras', presetsController.applyPresetToCameras.bind(presetsController));

module.exports = router;
