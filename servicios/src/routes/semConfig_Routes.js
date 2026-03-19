// src/routes/semConfig_Routes.js
// Dominio: Configuración SEM — Reorganización Issue #11
// Montado en: /api/config

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares');

const sem_configController = require('../controllers/semConfig_Controller');

router.get('/sem/parametros', authMiddleware.authenticate.bind(authMiddleware), sem_configController.getSystemParameters.bind(sem_configController));
router.post('/sem/parametros', authMiddleware.authenticate.bind(authMiddleware), sem_configController.updateSystemParameters.bind(sem_configController));

module.exports = router;
