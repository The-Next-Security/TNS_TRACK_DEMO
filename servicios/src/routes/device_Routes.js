const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/device_Controller");
const energyController = require("../controllers/energy_Controller");
const { validationMiddleware } = require("../middlewares");

// =================== RUTAS EXISTENTES ===================

// Ruta existente para mediciones en tiempo real
router.get(
  "/latest-measurements",
  deviceController.getLatestDevicesMeasurements.bind(deviceController)
);

// Rutas existentes para consumo eléctrico
router.get(
  "/consumption/:date",
  validationMiddleware.validateDateParams.bind(validationMiddleware),
  energyController.getDailyConsumption.bind(energyController)
);

router.get(
  "/download/:shellyId/:date",
  validationMiddleware.validateDateParams.bind(validationMiddleware),
  energyController.downloadDeviceData.bind(energyController)
);

// Ruta existente para búsqueda de dispositivos
router.get(
  "/devices",
  deviceController.handleDeviceSearch.bind(deviceController)
);

// =================== NUEVAS RUTAS PARA SELECCIÓN DE DISPOSITIVOS ===================

/**
 * Endpoint para obtener todos los dispositivos activos para dropdown
 * GET /api/devices/active
 * Usado por el sistema de consumo eléctrico para selección de dispositivos
 */
router.get("/active", deviceController.getActiveDevices.bind(deviceController));

/**
 * Endpoint para obtener un dispositivo específico por ID
 * GET /api/devices/device/:deviceId
 * Usado para validar dispositivos seleccionados en localStorage
 */
router.get(
  "/device/:deviceId",
  deviceController.getDeviceById.bind(deviceController)
);

module.exports = router;
