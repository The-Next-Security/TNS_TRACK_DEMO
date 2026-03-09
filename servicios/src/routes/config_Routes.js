// src/routes/configRoutes.js
const express = require("express");
const router = express.Router();
const sem_configController = require("../controllers/sem_configController");
const tel_configController = require("../controllers/tel_configController");
const alertScheduleController = require("../controllers/alertScheduleController");
const tariffConfigController = require("../controllers/tariffConfigController");
const { authMiddleware } = require("../middlewares");

// Get current system parameters
router.get(
  "/sem/parametros",
  authMiddleware.authenticate.bind(authMiddleware),
  sem_configController.getSystemParameters.bind(sem_configController)
);

// Update system parameters
router.post(
  "/sem/parametros",
  authMiddleware.authenticate.bind(authMiddleware),
  sem_configController.updateSystemParameters.bind(sem_configController)
);

router.get(
  "/teltonica/parametros",
  authMiddleware.authenticate.bind(authMiddleware),
  tel_configController.getSystemParameters.bind(tel_configController)
);

router.post(
  "/teltonica/parametros",
  authMiddleware.authenticate.bind(authMiddleware),
  tel_configController.updateSystemParameters.bind(tel_configController)
);

router.get(
  "/teltonica/configuracion_beacon/:beacon_id",
  authMiddleware.authenticate.bind(authMiddleware),
  tel_configController.configurarBeacon.bind(tel_configController)
);

router.get(
  "/teltonica/temperatura-umbrales",
  (req, res, next) => {
    console.log("Ruta temperatura-umbrales accedida"); // Log para debug
    next();
  },
  tel_configController.getConfigTemperaturaUmbral.bind(tel_configController)
);

router.post(
  "/teltonica/temperatura-umbrales",
  authMiddleware.authenticate.bind(authMiddleware),
  tel_configController.setConfigTemperaturaUmbral.bind(tel_configController)
);

router.get(
  "/teltonica/umbrales",
  authMiddleware.authenticate.bind(authMiddleware),
  tel_configController.getConfigUmbrales.bind(tel_configController)
);

router.post(
  "/teltonica/umbrales",
  authMiddleware.authenticate.bind(authMiddleware),
  tel_configController.setConfigUmbrales.bind(tel_configController)
);

// GET /api/config/mapbox - Configuración Mapbox para el cliente (token y estilo desde BD). Sin auth.
router.get("/mapbox", tariffConfigController.getMapboxConfig);

// ============================================================================
// Alert Schedule Configuration Routes (Feature: 002-configurable-alert-schedules)
// Issue: https://github.com/TNSTRACK/servicios/issues/19
// ============================================================================

// GET /api/config/alert-schedules - Retrieve current alert schedule configuration
router.get(
  "/alert-schedules",
  authMiddleware.authenticate.bind(authMiddleware),
  alertScheduleController.getAlertSchedules
);

// POST /api/config/alert-schedules - Update alert schedule configuration
// Note: Requires admin privileges (T024)
router.post(
  "/alert-schedules",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireAdmin.bind(authMiddleware),
  alertScheduleController.updateAlertSchedules
);

// POST /api/config/alert-schedules/validate - Validate configuration without persisting
router.post(
  "/alert-schedules/validate",
  authMiddleware.authenticate.bind(authMiddleware),
  alertScheduleController.validateAlertSchedules
);

// POST /api/config/alert-schedules/reset - Reset configuration to defaults
// Note: Requires admin privileges (T024)
router.post(
  "/alert-schedules/reset",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireAdmin.bind(authMiddleware),
  alertScheduleController.resetAlertSchedules
);

// ============================================================================
// Tariff Configuration Routes (Feature: 004-reportes-base-core Phase 9 - T104)
// ============================================================================

// GET /api/config/tariffs - Get current tariff configuration
router.get(
  "/tariffs",
  authMiddleware.authenticate.bind(authMiddleware),
  tariffConfigController.getTariffConfig
);

// PUT /api/config/tariffs - Update tariff configuration
// Note: Requires edit_config permission
router.put(
  "/tariffs",
  authMiddleware.authenticate.bind(authMiddleware),
  tariffConfigController.updateTariffConfig
);

// POST /api/config/tariffs/validate - Validate tariff values without saving
router.post(
  "/tariffs/validate",
  authMiddleware.authenticate.bind(authMiddleware),
  tariffConfigController.validateTariffConfig
);

// POST /api/config/tariffs/reset - Reset tariffs to defaults
// Note: Requires admin privileges
router.post(
  "/tariffs/reset",
  authMiddleware.authenticate.bind(authMiddleware),
  authMiddleware.requireAdmin.bind(authMiddleware),
  tariffConfigController.resetTariffConfig
);

module.exports = router;