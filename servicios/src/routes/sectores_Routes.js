// src/routes/sectores_Routes.js
// MÓDULO FUTURO - Teltonika Sectores (stub 501)
// Dominio: Sectores — Reorganización Issue #11
// Montado en: /api/sectores

const express = require('express');
const router = express.Router();

const sectoresController = require('../controllers/sectores_Controller');

router.get('/', sectoresController.getAllSectores.bind(sectoresController));
router.get('/mapa-cuadrantes', sectoresController.getMapWithQuadrantsInformation.bind(sectoresController));

module.exports = router;
