// src/routes/consumoCategoriaRoutes.js
const express = require('express');
const router = express.Router();
const consumoCategoriaController = require('../controllers/consumoCategoriaController');

// Endpoint para obtener la categoría de consumo
router.get('/categoria',
    consumoCategoriaController.getCategoriaConsumo.bind(consumoCategoriaController)
);

// Endpoint para obtener todos los umbrales (útil para debugging)
router.get('/umbrales',
    consumoCategoriaController.getUmbralesConsumo.bind(consumoCategoriaController)
);

module.exports = router;