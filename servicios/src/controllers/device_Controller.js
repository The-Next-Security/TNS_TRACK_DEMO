const databaseService = require("../services/database_Service");
const consumoCategoriaService = require("../services/consumoCategoria_Service");
const { DeviceError, NotFoundError } = require("../utils/errors_Utils");
const transformUtils = require("../utils/transform_Utils");

class DeviceController {
  // =================== MÉTODOS EXISTENTES ===================
  async getLatestStatus(req, res, next) {
    try {
      const status = await databaseService.getLatestStatus();
      if (!status) {
        throw new NotFoundError("No se encontró estado del dispositivo");
      }
      res.json(transformUtils.transformApiResponse(status));
    } catch (error) {
      next(error);
    }
  }

  async getStatusHistory(req, res, next) {
    try {
      const { hours = 24 } = req.query;
      const history = await databaseService.getHistory(parseInt(hours));
      res.json(transformUtils.transformApiResponse(history));
    } catch (error) {
      next(error);
    }
  }

  async insertDeviceStatus(req, res, next) {
    try {
      const result = await databaseService.insertDeviceStatus(
        req.validatedMeasurement
      );
      res.status(201).json(transformUtils.transformApiResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async getDeviceConfig(req, res, next) {
    try {
      const { deviceId } = req.params;
      const config = await databaseService.getDeviceConfig(deviceId);
      if (!config) {
        throw new NotFoundError("Configuración no encontrada", deviceId);
      }
      res.json(transformUtils.transformApiResponse(config));
    } catch (error) {
      next(error);
    }
  }

  async updateDeviceConfig(req, res, next) {
    try {
      const { deviceId } = req.params;
      const result = await databaseService.updateDeviceConfig(
        deviceId,
        req.body
      );
      res.json(transformUtils.transformApiResponse(result));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene las últimas mediciones de todos los dispositivos eléctricos (Cámaras/Reefers)
   * Optimizado para MySQL 8.4+ usando LATERAL JOIN y unificación de categorías en backend.
   */
  async getLatestDevicesMeasurements(req, res, next) {
    try {
      // Query optimizada: busca directamente el último registro cronológico por dispositivo
      // filtrando por los últimos 7 días para evitar escaneos pesados de tabla.
      const query = `
        SELECT 
            cur.id_ubicacion_real AS idcatalogo_ubicaciones_reales,
            cur.nombre,
            d.shelly_id,
            d.id_grupo,
            m.potencia_activa,
            m.timestamp_local
        FROM gen_ubicaciones_reales cur
        LEFT JOIN sem_dispositivos d ON cur.id_ubicacion_real = d.id_ubicacion_real AND d.activo = 1
        LEFT JOIN LATERAL (
            SELECT potencia_activa, timestamp_local
            FROM sem_mediciones
            WHERE shelly_id = d.shelly_id 
              AND fase = 'TOTAL'
              AND timestamp_local > DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY timestamp_local DESC
            LIMIT 1
        ) m ON TRUE
        WHERE cur.nombre LIKE '%Camara%' 
           OR cur.nombre LIKE '%Cámara%' 
           OR cur.nombre LIKE '%Reefer%'
        ORDER BY cur.nombre`;

      const [rows] = await databaseService.pool.query(query);

      // Mapeo y categorización instantánea en backend para reducir tráfico de red
      const devices = await Promise.all(rows.map(async (row) => {
        const deviceId = row.shelly_id || `ubicacion_${row.idcatalogo_ubicaciones_reales}`;
        const activePower = row.potencia_activa !== null ? parseFloat(row.potencia_activa) : 0;
        
        // Determinar categoría de consumo usando el servicio (usa caché interna de 30 min)
        // Si no hay grupo asignado, se utiliza grupo 1 (General) por defecto.
        const category = await consumoCategoriaService.categorizarConsumo(activePower, row.id_grupo || 1);

        return {
          deviceId: deviceId,
          location: row.nombre,
          activePower: activePower,
          lastUpdate: row.timestamp_local,
          category: category // Dato unificado para el frontend
        };
      }));

      res.json({
        success: true,
        data: devices,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error al obtener mediciones unificadas de dispositivos:", error);
      next(error);
    }
  }

  // MÓDULO FUTURO - Teltonika legacy devices
  // Tabla 'devices' no existe en schema actual tns_cool_track
  async handleDeviceSearch(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo dispositivos legacy (Teltonika) no disponible en esta versión.',
      module: 'devices-legacy',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  // =================== NUEVOS MÉTODOS PARA SELECCIÓN DE DISPOSITIVOS ===================

  /**
   * Obtiene todos los dispositivos activos para selección en dropdown
   * Nuevo método para sistema de consumo eléctrico
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  // En deviceController.js - método getActiveDevices
  async getActiveDevices(req, res, next) {
    console.log("🔍 [DeviceController] getActiveDevices iniciado");

    try {
      console.log("🔍 [DeviceController] Ejecutando consulta SQL...");

      const query = `
      SELECT 
        sd.shelly_id,
        sd.nombre as dispositivo_nombre,
        sd.activo,
        sd.id_grupo,
        cur.nombre, -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
        cur.id_ubicacion_real AS ubicacion_id,
        sg.nombre as grupo_nombre,
        sd.fecha_creacion,
        sd.fecha_actualizacion,
        COALESCE(latest_data.ultima_medicion, 'Sin datos') as ultima_medicion,
        COALESCE(latest_data.estado_conexion, 'Desconocido') as estado_conexion
      FROM
        sem_dispositivos sd
      JOIN
        gen_ubicaciones_reales cur ON sd.id_ubicacion_real = cur.id_ubicacion_real
      LEFT JOIN 
        sem_grupos sg ON sd.id_grupo = sg.id_grupo
      LEFT JOIN (
        SELECT 
          shelly_id,
          MAX(timestamp_local) as ultima_medicion,
          CASE 
            WHEN MAX(timestamp_local) > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'Conectado'
            WHEN MAX(timestamp_local) > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'Intermitente'
            ELSE 'Desconectado'
          END as estado_conexion
        FROM sem_mediciones 
        WHERE timestamp_local > DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY shelly_id
      ) latest_data ON sd.shelly_id = latest_data.shelly_id
      WHERE 
        sd.activo = 1
      ORDER BY 
        cur.nombre ASC,
        sd.nombre ASC
    `;

      const [rows] = await databaseService.pool.query(query);
      console.log("🔍 [DeviceController] Filas obtenidas:", rows?.length || 0);
      console.log("🔍 [DeviceController] Primera fila:", rows?.[0]);

      if (!rows || rows.length === 0) {
        console.log(
          "🔍 [DeviceController] No hay dispositivos, enviando array vacío"
        );
        return res.json({
          success: true,
          data: [],
          message: "No se encontraron dispositivos activos",
        });
      }

      // Transformar datos para el frontend
      const devices = rows.map((row) => ({
        shelly_id: row.shelly_id,
        dispositivo_nombre: row.dispositivo_nombre,
        nombre: row.nombre,
        ubicacion_id: row.ubicacion_id,
        grupo_id: row.id_grupo,
        grupo_nombre: row.grupo_nombre || "Sin Grupo",
        activo: row.activo,
        estado_conexion: row.estado_conexion,
        ultima_medicion: row.ultima_medicion,
        fecha_creacion: row.fecha_creacion,
        fecha_actualizacion: row.fecha_actualizacion,
        display_name: row.nombre,
        display_subtitle: row.dispositivo_nombre,
      }));

      console.log(
        "🔍 [DeviceController] Dispositivos procesados:",
        devices.length
      );
      console.log("🔍 [DeviceController] Primer dispositivo:", devices[0]);

      const response = {
        success: true,
        data: devices,
        message: `${devices.length} dispositivo(s) activo(s) encontrado(s)`,
      };

      console.log(
        "🔍 [DeviceController] Enviando respuesta:",
        JSON.stringify(response, null, 2)
      );

      res.json(response);
    } catch (error) {
      console.error("❌ [DeviceController] Error en getActiveDevices:", error);
      console.error("❌ [DeviceController] Stack trace:", error.stack);
      next(error);
    }
  }

  /**
   * Obtiene un dispositivo específico por su ID para el sistema de consumo
   * Nuevo método para validación de dispositivos seleccionados
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async getDeviceById(req, res, next) {
    try {
      const { deviceId } = req.params;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "ID de dispositivo requerido",
        });
      }

      const query = `
        SELECT 
          sd.shelly_id,
          sd.nombre as dispositivo_nombre,
          sd.activo,
          sd.id_grupo,
          cur.nombre, -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
          cur.id_ubicacion_real AS ubicacion_id,
          sg.nombre as grupo_nombre,
          sd.fecha_creacion,
          sd.fecha_actualizacion,
          -- Estadísticas adicionales del dispositivo
          COALESCE(stats.total_mediciones, 0) as total_mediciones,
          COALESCE(stats.primera_medicion, 'Sin datos') as primera_medicion,
          COALESCE(stats.ultima_medicion, 'Sin datos') as ultima_medicion,
          CASE
            WHEN stats.ultima_medicion > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'Conectado'
            WHEN stats.ultima_medicion > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'Intermitente'
            ELSE 'Desconectado'
          END as estado_conexion
        FROM
          sem_dispositivos sd
        JOIN
          gen_ubicaciones_reales cur ON sd.id_ubicacion_real = cur.id_ubicacion_real
        LEFT JOIN 
          sem_grupos sg ON sd.id_grupo = sg.id_grupo
        LEFT JOIN (
          -- Estadísticas del dispositivo
          SELECT 
            shelly_id,
            COUNT(*) as total_mediciones,
            MIN(timestamp_local) as primera_medicion,
            MAX(timestamp_local) as ultima_medicion
          FROM sem_mediciones 
          WHERE shelly_id = ?
          GROUP BY shelly_id
        ) stats ON sd.shelly_id = stats.shelly_id
        WHERE 
          sd.shelly_id = ?
          AND sd.activo = 1
        LIMIT 1
      `;

      const [rows] = await databaseService.pool.query(query, [
        deviceId,
        deviceId,
      ]);

      if (!rows || rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Dispositivo ${deviceId} no encontrado o inactivo`,
        });
      }

      const device = rows[0];

      // Transformar datos para respuesta
      const deviceData = {
        shelly_id: device.shelly_id,
        dispositivo_nombre: device.dispositivo_nombre,
        nombre: device.nombre,
        ubicacion_id: device.ubicacion_id,
        grupo_id: device.id_grupo,
        grupo_nombre: device.grupo_nombre || "Sin Grupo",
        activo: device.activo,
        estado_conexion: device.estado_conexion,
        estadisticas: {
          total_mediciones: device.total_mediciones,
          primera_medicion: device.primera_medicion,
          ultima_medicion: device.ultima_medicion,
        },
        fecha_creacion: device.fecha_creacion,
        fecha_actualizacion: device.fecha_actualizacion,
        display_name: device.nombre,
        display_subtitle: device.dispositivo_nombre,
      };

      res.json(
        transformUtils.transformApiResponse(deviceData, {
          includeMetadata: true,
        })
      );
    } catch (error) {
      console.error("Error obteniendo dispositivo por ID:", error);
      next(error);
    }
  }
}

module.exports = new DeviceController();
