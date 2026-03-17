// src/routes/tariffConfig_Routes.js
// Dominio: Configuración de Tarifas — Reorganización Issue #11
// Montado en: /api/config

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares');

const tariffConfigController = require('../controllers/tariffConfig_Controller');

// Mapbox — público, sin auth
router.get('/mapbox', tariffConfigController.getMapboxConfig.bind(tariffConfigController));

// Tarifas — literales ANTES de paramétricos
router.get('/tariffs', authMiddleware.authenticate.bind(authMiddleware), tariffConfigController.getTariffConfig.bind(tariffConfigController));
router.post('/tariffs/validate', authMiddleware.authenticate.bind(authMiddleware), tariffConfigController.validateTariffConfig.bind(tariffConfigController));
router.post('/tariffs/reset', authMiddleware.authenticate.bind(authMiddleware), authMiddleware.requireAdmin.bind(authMiddleware), tariffConfigController.resetTariffConfig.bind(tariffConfigController));
router.put('/tariffs', authMiddleware.authenticate.bind(authMiddleware), tariffConfigController.updateTariffConfig.bind(tariffConfigController));

module.exports = router;
