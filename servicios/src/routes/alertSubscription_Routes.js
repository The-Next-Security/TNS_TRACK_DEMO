/**
 * Rutas para gestión de suscripciones de alerta por canal push.
 * Base: /api/alerts/subscriptions
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const controller = require('../controllers/alertSubscription_Controller');

const auth = authMiddleware.authenticate.bind(authMiddleware);

// GET /api/alerts/subscriptions/lookups — tipos de alerta y orígenes para la UI
router.get('/lookups', auth, controller.getLookups);

// GET /api/alerts/subscriptions — suscripciones push del usuario autenticado
router.get('/', auth, controller.getMisSuscripciones);

// POST /api/alerts/subscriptions/toggle — activar/desactivar una suscripción
router.post('/toggle', auth, controller.toggleSuscripcion);

// POST /api/alerts/subscriptions/batch — guardar toda la matriz de suscripciones
router.post('/batch', auth, controller.batchSuscripciones);

module.exports = router;
