// src/controllers/electricDashboardController.js
const electricDashboardService = require("../services/electricDashboard_Service");

/**
 * Controlador optimizado para el Dashboard Eléctrico
 * Maneja el endpoint unificado con datos pre-procesados
 */
class ElectricDashboardController {
  /**
   * Obtiene el resumen completo del dashboard eléctrico
   * Endpoint: GET /api/dashboard/electric-summary
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getElectricSummary(req, res, next) {
    const startTime = Date.now();

    try {
      console.log(
        "[ElectricDashboardController] Iniciando obtención de resumen eléctrico..."
      );

      // Obtener datos del servicio
      const result = await electricDashboardService.getElectricSummary();

      const executionTime = Date.now() - startTime;
      console.log(
        `[ElectricDashboardController] Resumen obtenido en ${executionTime}ms`
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
      console.error("[ElectricDashboardController] Error:", error);

      const executionTime = Date.now() - startTime;

      // En caso de error, intentar devolver una respuesta útil
      const errorResponse = {
        success: false,
        data: [],
        error: {
          message: "Error al obtener datos del dashboard eléctrico",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
          code: "DASHBOARD_ERROR",
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
   * Obtiene estadísticas del cache del dashboard
   * Endpoint: GET /api/dashboard/electric-summary/cache-stats
   * Útil para debugging y monitoreo
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getCacheStats(req, res, next) {
    try {
      const stats = electricDashboardService.getCacheStats();

      res.json({
        success: true,
        data: {
          cache: {
            ...stats,
            cacheAgeSeconds: Math.round(stats.cacheAge / 1000),
            cacheTTLSeconds: Math.round(stats.cacheTTL / 1000),
          },
          server: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || "development",
          },
        },
      });
    } catch (error) {
      console.error(
        "[ElectricDashboardController] Error obteniendo stats:",
        error
      );
      res.status(500).json({
        success: false,
        error: {
          message: "Error al obtener estadísticas del cache",
          code: "CACHE_STATS_ERROR",
        },
      });
    }
  }

  /**
   * Limpia el cache del dashboard manualmente
   * Endpoint: POST /api/dashboard/electric-summary/clear-cache
   * Útil para invalidación manual durante desarrollo
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async clearCache(req, res, next) {
    try {
      electricDashboardService.clearCache();

      res.json({
        success: true,
        message: "Cache del dashboard eléctrico limpiado exitosamente",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[ElectricDashboardController] Error limpiando cache:",
        error
      );
      res.status(500).json({
        success: false,
        error: {
          message: "Error al limpiar cache",
          code: "CACHE_CLEAR_ERROR",
        },
      });
    }
  }

  /**
   * Obtiene todas las ubicaciones registradas para mostrar placeholders
   * Endpoint: GET /api/dashboard/electric-summary/locations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async getAllLocations(req, res, next) {
    try {
      const result = await electricDashboardService.getAllRegisteredLocations();

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[ElectricDashboardController] Error obteniendo ubicaciones:",
        error
      );
      res.status(500).json({
        success: false,
        error: {
          message: "Error al obtener ubicaciones registradas",
          code: "LOCATIONS_ERROR",
        },
      });
    }
  }

  /**
   * Endpoint de diagnóstico para verificar rutas de iconos
   * Endpoint: GET /api/dashboard/electric-summary/icon-test
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async testIcons(req, res, next) {
    try {
      const iconPaths = {
        0: "/assets/images/consumo_electrico/electric_consumption_no_connectivity_blink_only.gif",
        1: "/assets/images/consumo_electrico/electric_consumption_lightning_blink_green.gif",
        2: "/assets/images/consumo_electrico/electric_consumption_lightning_blink_yellow.gif",
        3: "/assets/images/consumo_electrico/electric_consumption_lightning_blink_red.gif",
      };

      const testData = Object.keys(iconPaths).map((category) => ({
        category: parseInt(category),
        categoryName: ["Apagado", "Bajo", "Medio", "Alto"][category],
        iconPath: iconPaths[category],
        fullUrl: `${req.protocol}://${req.get("host")}${iconPaths[category]}`,
      }));

      res.json({
        success: true,
        data: testData,
        message:
          "Test de rutas de iconos - verificar que las URLs respondan correctamente",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        "[ElectricDashboardController] Error en test de iconos:",
        error
      );
      res.status(500).json({
        success: false,
        error: {
          message: "Error en test de iconos",
          code: "ICON_TEST_ERROR",
        },
      });
    }
  }
  /**
   * Health check específico para el dashboard eléctrico
   * Endpoint: GET /api/dashboard/electric-summary/health
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  async healthCheck(req, res, next) {
    const startTime = Date.now();

    try {
      // Intentar obtener un resumen básico para verificar que todo funciona
      const result = await electricDashboardService.getElectricSummary();
      const executionTime = Date.now() - startTime;

      const health = {
        success: true,
        status: "healthy",
        service: "electric-dashboard",
        checks: {
          database: result.success ? "ok" : "error",
          cache: result.cached ? "hit" : "miss",
          responseTime: `${executionTime}ms`,
          deviceCount: result.data?.length || 0,
        },
        timestamp: new Date().toISOString(),
      };

      // Determinar código de estado basado en performance
      const statusCode = executionTime > 5000 ? 503 : 200; // Service Unavailable si toma más de 5s

      res.status(statusCode).json(health);
    } catch (error) {
      console.error(
        "[ElectricDashboardController] Health check failed:",
        error
      );

      const executionTime = Date.now() - startTime;

      res.status(503).json({
        success: false,
        status: "unhealthy",
        service: "electric-dashboard",
        checks: {
          database: "error",
          cache: "unknown",
          responseTime: `${executionTime}ms`,
          deviceCount: 0,
        },
        error: {
          message: "Service health check failed",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
module.exports = new ElectricDashboardController();
