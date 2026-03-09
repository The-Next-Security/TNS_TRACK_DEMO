// src/routes/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const electricDashboardController = require("../controllers/electricDashboardController");
const temperatureDashboardController = require("../controllers/temperatureDashboardController");

/**
 * Rutas para los dashboards optimizados
 * Estas rutas proporcionan datos pre-procesados para carga rápida en el frontend
 */

// =================== DASHBOARD ELÉCTRICO ===================

/**
 * @route GET /api/dashboard/electric-summary
 * @description Obtiene el resumen completo del dashboard eléctrico con datos pre-procesados
 * @access Privado (requiere autenticación)
 * @returns {Object} Datos de dispositivos con categorías, iconos y formateo completo
 *
 * Respuesta esperada:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "deviceId": "SHELLY_123",
 *       "deviceName": "Monitor Cámara 1",
 *       "location": "Cámara 1",
 *       "groupId": 1,
 *       "groupName": "Cámaras Frigoríficas",
 *       "powerKw": "4.3",
 *       "powerFormatted": " 4.3",
 *       "category": 2,
 *       "categoryIcon": "/assets/images/...",
 *       "lastUpdate": "21/06/2025 14:40",
 *       "lastUpdateMobile": "21/06 14:40",
 *       "status": "connected"
 *     }
 *   ],
 *   "metadata": {
 *     "executionTime": "245ms",
 *     "deviceCount": 10,
 *     "cached": false,
 *     "timestamp": "2025-06-21T14:40:00Z"
 *   }
 * }
 */
router.get(
  "/electric-summary",
  electricDashboardController.getElectricSummary.bind(
    electricDashboardController
  )
);

/**
 * @route GET /api/dashboard/electric-summary/locations
 * @description Obtiene todas las ubicaciones registradas para generar placeholders
 * @access Privado
 * @returns {Object} Lista de ubicaciones con información de dispositivos
 */
router.get(
  "/electric-summary/locations",
  electricDashboardController.getAllLocations.bind(electricDashboardController)
);

/**
 * @route GET /api/dashboard/electric-summary/cache-stats
 * @description Obtiene estadísticas del cache del dashboard eléctrico
 * @access Privado (útil para debugging y monitoreo)
 * @returns {Object} Información sobre el estado del cache
 */
router.get(
  "/electric-summary/cache-stats",
  electricDashboardController.getCacheStats.bind(electricDashboardController)
);

/**
 * @route POST /api/dashboard/electric-summary/clear-cache
 * @description Limpia manualmente el cache del dashboard eléctrico
 * @access Privado (útil durante desarrollo)
 * @returns {Object} Confirmación de limpieza del cache
 */
router.post(
  "/electric-summary/clear-cache",
  electricDashboardController.clearCache.bind(electricDashboardController)
);

/**
 * @route GET /api/dashboard/electric-summary/icon-test
 * @description Test de rutas de iconos para verificar disponibilidad
 * @access Privado (útil para debugging)
 * @returns {Object} URLs de iconos para verificar
 */
router.get(
  "/electric-summary/icon-test",
  electricDashboardController.testIcons.bind(electricDashboardController)
);

/**
 * @route GET /api/dashboard/electric-summary/health
 * @description Health check específico para el dashboard eléctrico
 * @access Privado
 * @returns {Object} Estado de salud del servicio
 */
router.get(
  "/electric-summary/health",
  electricDashboardController.healthCheck.bind(electricDashboardController)
);

// =================== PREPARACIÓN PARA DASHBOARD TEMPERATURA ===================
// Las siguientes rutas están preparadas para implementación futura

/**
 * @route GET /api/dashboard/temperature-summary
 * @description Obtiene el resumen del dashboard de temperatura (implementación futura)
 * @access Privado
 * @returns {Object} Datos de sensores de temperatura pre-procesados
 */
// router.get('/temperature-summary',
//   temperatureDashboardController.getTemperatureSummary.bind(temperatureDashboardController)
// );

// =================== DASHBOARD DE TEMPERATURA ===================
// Descomenta las rutas comentadas en dashboardRoutes.js y agrega:

/**
 * @route GET /api/dashboard/temperature-summary
 * @description Obtiene el resumen completo del dashboard de temperatura con datos pre-procesados
 * @access Privado (requiere autenticación)
 */
router.get(
  "/temperature-summary",
  temperatureDashboardController.getTemperatureSummary.bind(
    temperatureDashboardController
  )
);

/**
 * @route GET /api/dashboard/temperature-summary/channels
 * @description Obtiene todos los canales registrados para generar placeholders
 * @access Privado
 */
router.get(
  "/temperature-summary/channels",
  temperatureDashboardController.getAllChannels.bind(
    temperatureDashboardController
  )
);

/**
 * @route GET /api/dashboard/temperature-summary/cache-stats
 * @description Obtiene estadísticas del cache del dashboard de temperatura
 * @access Privado (útil para debugging y monitoreo)
 */
router.get(
  "/temperature-summary/cache-stats",
  temperatureDashboardController.getCacheStats.bind(
    temperatureDashboardController
  )
);

/**
 * @route POST /api/dashboard/temperature-summary/clear-cache
 * @description Limpia manualmente el cache del dashboard de temperatura
 * @access Privado (útil durante desarrollo y troubleshooting)
 */
router.post(
  "/temperature-summary/clear-cache",
  temperatureDashboardController.clearCache.bind(temperatureDashboardController)
);

/**
 * @route POST /api/dashboard/temperature-summary/refresh
 * @description Fuerza una actualización de datos sin usar cache
 * @access Privado
 */
router.post(
  "/temperature-summary/refresh",
  temperatureDashboardController.forceRefresh.bind(
    temperatureDashboardController
  )
);
// =================== DASHBOARD COMBINADO (FUTURO) ===================

/**
 * @route GET /api/dashboard/combined-summary
 * @description Obtiene datos combinados de todos los dashboards (implementación futura)
 * @access Privado
 * @returns {Object} Resumen consolidado de todos los sistemas
 */
// router.get('/combined-summary',
//   combinedDashboardController.getCombinedSummary.bind(combinedDashboardController)
// );

module.exports = router;
