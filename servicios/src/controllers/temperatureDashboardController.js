// src/controllers/temperatureDashboardController.js
const temperatureDashboardService = require("../services/temperatureDashboardService");

/**
 * Controlador optimizado para el Dashboard de Temperatura
 * Maneja el endpoint unificado con datos pre-procesados
 */
class TemperatureDashboardController {
  /**
   * Obtiene el resumen completo del dashboard de temperatura
   * Endpoint: GET /api/dashboard/temperature-summary
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getTemperatureSummary(req, res, next) {
    const startTime = Date.now();

    try {
      console.log(
        "[TemperatureDashboardController] Iniciando obtención de resumen de temperatura..."
      );

      // Obtener datos del servicio
      const result = await temperatureDashboardService.getTemperatureSummary();

      const executionTime = Date.now() - startTime;
      console.log(
        `[TemperatureDashboardController] Resumen obtenido en ${executionTime}ms`
      );

      // Agregar metadata de performance
      const response = {
        ...result,
        metadata: {
          executionTime: `${executionTime}ms`,
          deviceCount: result.data?.length || 0,
          cached: result.cached || false,
          timestamp: result.timestamp,
        },
      };

      // Headers para optimización de cache del browser
      if (result.cached) {
        res.setHeader("Cache-Control", "public, max-age=30"); // 30 segundos
      } else {
        res.setHeader("Cache-Control", "public, max-age=15"); // 15 segundos para datos frescos
      }

      res.setHeader("X-Response-Time", `${executionTime}ms`);
      res.setHeader("X-Device-Count", result.data?.length || 0);
      res.setHeader("X-Cached", result.cached ? "true" : "false");

      res.json(response);
    } catch (error) {
      console.error("[TemperatureDashboardController] Error:", error);

      const executionTime = Date.now() - startTime;

      // En caso de error, intentar devolver una respuesta útil
      const errorResponse = {
        success: false,
        data: [],
        error: {
          message: "Error al obtener datos del dashboard de temperatura",
          details:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Error interno del servidor",
        },
        metadata: {
          executionTime: `${executionTime}ms`,
          deviceCount: 0,
          cached: false,
          timestamp: new Date().toISOString(),
        },
      };

      res.status(500).json(errorResponse);
    }
  }

  /**
   * Obtiene todas las ubicaciones/canales registrados para generar placeholders
   * Endpoint: GET /api/dashboard/temperature-summary/channels
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getAllChannels(req, res) {
    const startTime = Date.now();

    try {
      console.log(
        "[TemperatureDashboardController] Obteniendo lista de canales..."
      );

      const channels = await temperatureDashboardService.getAllChannels();

      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          channels: channels,
          count: channels.length,
        },
        metadata: {
          executionTime: `${executionTime}ms`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "[TemperatureDashboardController] Error obteniendo canales:",
        error
      );

      res.status(500).json({
        success: false,
        data: { channels: [], count: 0 },
        error: {
          message: "Error al obtener lista de canales",
          details:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Error interno del servidor",
        },
      });
    }
  }

  /**
   * Obtiene estadísticas del cache del dashboard de temperatura
   * Endpoint: GET /api/dashboard/temperature-summary/cache-stats
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getCacheStats(req, res) {
    try {
      const stats = temperatureDashboardService.getCacheStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[TemperatureDashboardController] Error obteniendo stats del cache:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Error al obtener estadísticas del cache",
      });
    }
  }

  /**
   * Limpia manualmente el cache del dashboard de temperatura
   * Endpoint: POST /api/dashboard/temperature-summary/clear-cache
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async clearCache(req, res) {
    try {
      const result = temperatureDashboardService.clearCache();

      console.log(
        "[TemperatureDashboardController] Cache limpiado manualmente"
      );

      res.json({
        success: true,
        data: {
          message: "Cache limpiado exitosamente",
          clearedAt: new Date().toISOString(),
          ...result,
        },
      });
    } catch (error) {
      console.error(
        "[TemperatureDashboardController] Error limpiando cache:",
        error
      );

      res.status(500).json({
        success: false,
        error: "Error al limpiar el cache",
      });
    }
  }

  /**
   * Endpoint para forzar actualización de datos sin cache
   * Endpoint: POST /api/dashboard/temperature-summary/refresh
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async forceRefresh(req, res) {
    const startTime = Date.now();

    try {
      console.log(
        "[TemperatureDashboardController] Forzando actualización de datos..."
      );

      // Limpiar cache y obtener datos frescos
      temperatureDashboardService.clearCache();
      const result = await temperatureDashboardService.getTemperatureSummary();

      const executionTime = Date.now() - startTime;

      res.json({
        ...result,
        metadata: {
          executionTime: `${executionTime}ms`,
          deviceCount: result.data?.length || 0,
          cached: false, // Siempre false en refresh forzado
          timestamp: result.timestamp,
          forceRefresh: true,
        },
      });
    } catch (error) {
      console.error(
        "[TemperatureDashboardController] Error en refresh forzado:",
        error
      );

      res.status(500).json({
        success: false,
        data: [],
        error: {
          message: "Error al forzar actualización de datos",
          details:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Error interno del servidor",
        },
      });
    }
  }
}

module.exports = new TemperatureDashboardController();
