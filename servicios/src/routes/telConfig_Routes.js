// src/routes/telConfig_Routes.js
// Dominio: Configuración Teltonika — Reorganización Issue #11
// Montado en: /api/config

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares');

const tel_configController = require('../controllers/telConfig_Controller');

router.get('/teltonica/parametros', authMiddleware.authenticate.bind(authMiddleware), tel_configController.getSystemParameters.bind(tel_configController));
router.post('/teltonica/parametros', authMiddleware.authenticate.bind(authMiddleware), tel_configController.updateSystemParameters.bind(tel_configController));
router.get('/teltonica/configuracion_beacon/:beacon_id', authMiddleware.authenticate.bind(authMiddleware), tel_configController.configurarBeacon.bind(tel_configController));
router.get('/teltonica/temperatura-umbrales',
  (req, res, next) => { console.log('[TelConfig] Ruta temperatura-umbrales accedida'); next(); },
  tel_configController.getConfigTemperaturaUmbral.bind(tel_configController)
);
router.post('/teltonica/temperatura-umbrales', authMiddleware.authenticate.bind(authMiddleware), tel_configController.setConfigTemperaturaUmbral.bind(tel_configController));
router.get('/teltonica/umbrales', authMiddleware.authenticate.bind(authMiddleware), tel_configController.getConfigUmbrales.bind(tel_configController));
router.post('/teltonica/umbrales', authMiddleware.authenticate.bind(authMiddleware), tel_configController.setConfigUmbrales.bind(tel_configController));

module.exports = router;
