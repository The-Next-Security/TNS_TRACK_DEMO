// src/routes/contadorCiclosRoutes.js
const express = require("express");
const router = express.Router();
const contadorCiclosController = require("../controllers/contadorCiclos_Controller");

/**
 * Rutas para la gestión de ciclos de descongelamiento
 * Endpoints para consultar datos de ciclos de temperatura por ubicación y período
 */

/**
 * @route GET /api/contador-ciclos/descongelamiento
 * @description Obtiene datos de ciclos de descongelamiento filtrados por meses y ubicación
 * @access Público (sin autenticación por especificación)
 * @query {string|string[]} meses - Meses a consultar en formato YYYY-MM (máximo 3)
 * @query {number} [ubicacion] - Channel ID de la ubicación (opcional)
 * @returns {Object} Datos de ciclos con estadísticas procesadas
 * 
 * @example
 * GET /api/contador-ciclos/descongelamiento?meses=2025-05&ubicacion=92498
 * GET /api/contador-ciclos/descongelamiento?meses[]=2025-04&meses[]=2025-05&meses[]=2025-06
 */
router.get(
  "/descongelamiento",
  contadorCiclosController.obtenerDatosDescongelamiento.bind(contadorCiclosController)
);

/**
 * @route GET /api/contador-ciclos/ubicaciones
 * @description Obtiene lista de ubicaciones disponibles para filtrado
 * @access Público (sin autenticación por especificación)
 * @returns {Array} Lista de ubicaciones con channel_id, name y nombre_ubicacion
 * 
 * @example
 * GET /api/contador-ciclos/ubicaciones
 * Response: [
 *   {
 *     "channel_id": 92498,
 *     "name": "Camara 1", 
 *     "nombre_ubicacion": "Camara 1"
 *   }
 * ]
 */
router.get(
  "/ubicaciones",
  contadorCiclosController.obtenerUbicaciones.bind(contadorCiclosController)
);

module.exports = router;