/**
 * alertTrackingRoutes.js
 * Rutas para el sistema de gestión y tracking de alertas
 * Base path: /api/alerts
 */

const express = require('express');
const router = express.Router();
const alertTrackingController = require('../controllers/alertTracking_Controller');

/**
 * ======================
 * OPERACIONES SOBRE ALERTAS
 * ======================
 */

/**
 * POST /api/alerts/acknowledge
 * Reconoce/atiende una alerta
 * Body: {
 *   alertId: number,
 *   userId: string,
 *   deviceInfo?: object
 * }
 */
router.post('/acknowledge', alertTrackingController.acknowledgeAlert.bind(alertTrackingController));

/**
 * POST /api/alerts/observation
 * Agrega una observación a una alerta
 * Body: {
 *   alertId: number,
 *   observation: string,
 *   userId: string
 * }
 */
router.post('/observation', alertTrackingController.addObservation.bind(alertTrackingController));

/**
 * POST /api/alerts/resolve
 * Resuelve/cierra una alerta
 * Body: {
 *   alertId: number,
 *   resolutionNotes?: string,
 *   userId: string
 * }
 */
router.post('/resolve', alertTrackingController.resolveAlert.bind(alertTrackingController));

/**
 * POST /api/alerts/false-alarm
 * Marca una alerta como falsa alarma
 * Body: {
 *   alertId: number,
 *   userId: string,
 *   reason?: string
 * }
 */
router.post('/false-alarm', alertTrackingController.markAsFalseAlarm.bind(alertTrackingController));

/**
 * ======================
 * CONSULTAS DE ALERTAS
 * ======================
 */

/**
 * GET /api/alerts/list
 * Obtiene lista de alertas con filtros opcionales
 * Query params:
 *   - startDate?: string (formato ISO 8601)
 *   - endDate?: string (formato ISO 8601)
 *   - status?: string (comma-separated: pending,acknowledged,resolved,false_alarm)
 *   - alertType?: string (temperature|disconnection)
 *   - channelId?: string
 *   - limit?: number (1-1000, default: 50)
 *   - offset?: number (default: 0)
 */
router.get('/list', alertTrackingController.getAlertsList.bind(alertTrackingController));

/**
 * GET /api/alerts/:alertId
 * Obtiene los detalles completos de una alerta específica
 * Params:
 *   - alertId: number
 */
router.get('/:alertId', alertTrackingController.getAlertDetails.bind(alertTrackingController));

/**
 * ======================
 * MÉTRICAS Y ESTADÍSTICAS
 * ======================
 */

/**
 * GET /api/alerts/metrics/summary
 * Obtiene métricas resumidas de alertas
 * Query params:
 *   - startDate?: string (formato ISO 8601, default: últimos 30 días)
 *   - endDate?: string (formato ISO 8601, default: fecha actual)
 */
router.get('/metrics/summary', alertTrackingController.getMetricsSummary.bind(alertTrackingController));

/**
 * GET /api/alerts/metrics/chart-data
 * Obtiene datos para gráficos del dashboard
 * Query params:
 *   - type: string (required: hourly|daily|by_channel|by_type)
 *   - startDate?: string (formato ISO 8601, default según tipo)
 *   - endDate?: string (formato ISO 8601, default: fecha actual)
 */
router.get('/metrics/chart-data', alertTrackingController.getChartData.bind(alertTrackingController));

// Log de rutas registradas
console.log('[AlertTrackingRoutes] Rutas de gestión de alertas registradas:');
console.log('  - POST /api/alerts/acknowledge');
console.log('  - POST /api/alerts/observation');
console.log('  - POST /api/alerts/resolve');
console.log('  - POST /api/alerts/false-alarm');
console.log('  - GET  /api/alerts/list');
console.log('  - GET  /api/alerts/:alertId');
console.log('  - GET  /api/alerts/metrics/summary');
console.log('  - GET  /api/alerts/metrics/chart-data');

module.exports = router;