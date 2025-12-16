const databaseService = require("../services/database-service");
const { DeviceError, NotFoundError } = require("../utils/errors");
const transformUtils = require("../utils/transformUtils");

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

  async getLatestDevicesMeasurements(req, res, next) {
    try {
      // Consultar todas las ubicaciones que existen en catalogo_ubicaciones_reales
      // Esto garantiza que se muestren todas las ubicaciones, tengan o no mediciones
      const queryUbicaciones = `
        SELECT 
            cur.idcatalogo_ubicaciones_reales,
            cur.nombre_ubicacion,
            d.shelly_id
        FROM catalogo_ubicaciones_reales cur
        LEFT JOIN sem_dispositivos d ON cur.idcatalogo_ubicaciones_reales = d.ubicacion AND d.activo = 1
        WHERE cur.nombre_ubicacion LIKE '%Camara%' 
           OR cur.nombre_ubicacion LIKE '%Cámara%'
           OR cur.nombre_ubicacion LIKE '%Reefer%'
        ORDER BY cur.nombre_ubicacion`;

      const [ubicaciones] = await databaseService.pool.query(queryUbicaciones);

      // Consulta para obtener las últimas mediciones
      const queryMeasurements = `
        SELECT 
            m.shelly_id,
            m.potencia_activa,
            m.timestamp_local
        FROM sem_mediciones m
        INNER JOIN (
            SELECT 
                shelly_id,
                MAX(timestamp_local) as max_timestamp
            FROM sem_mediciones
            WHERE fase = 'TOTAL'
            GROUP BY shelly_id
        ) m2 ON m.shelly_id = m2.shelly_id AND m.timestamp_local = m2.max_timestamp
        WHERE m.fase = 'TOTAL'`;

      const [measurements] = await databaseService.pool.query(
        queryMeasurements
      );

      // Crear un mapa de mediciones por shelly_id
      const measurementsMap = {};
      measurements.forEach((m) => {
        measurementsMap[m.shelly_id] = {
          activePower:
            m.potencia_activa !== null ? parseFloat(m.potencia_activa) : 0,
          lastUpdate: m.timestamp_local,
        };
      });

      // Construir el array de dispositivos con sus mediciones (si existen)
      const devices = ubicaciones.map((ubicacion) => {
        // Si la ubicación no tiene un dispositivo asignado, crear un ID único basado en la ubicación
        const deviceId =
          ubicacion.shelly_id ||
          `ubicacion_${ubicacion.idcatalogo_ubicaciones_reales}`;
        const measurement = measurementsMap[deviceId] || {};

        return {
          deviceId: deviceId,
          location: ubicacion.nombre_ubicacion,
          activePower: measurement.activePower || 0,
          lastUpdate: measurement.lastUpdate || null,
        };
      });

      res.json({
        success: true,
        data: devices,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error al obtener mediciones de dispositivos:", error);
      next(error);
    }
  }

  async handleDeviceSearch(req, res) {
    try {
      // Execute a SQL query to select all records from the 'devices' table
      const [results] = await databaseService.pool.query(
        "SELECT * FROM devices"
      );

      // Send the query results as a JSON response
      res.json(results);
    } catch (error) {
      // Log any errors that occur during the query execution
      console.error("Error fetching devices:", error);

      // Send a 500 Internal Server Error response with a message
      res.status(500).send("Server Error");
    }
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
        sd.grupo_id,
        cur.nombre_ubicacion as ubicacion_nombre,
        cur.idcatalogo_ubicaciones_reales as ubicacion_id,
        sg.nombre as grupo_nombre,
        sd.fecha_creacion,
        sd.fecha_actualizacion,
        COALESCE(latest_data.ultima_medicion, 'Sin datos') as ultima_medicion,
        COALESCE(latest_data.estado_conexion, 'Desconocido') as estado_conexion
      FROM 
        sem_dispositivos sd
      JOIN 
        catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
      LEFT JOIN 
        sem_grupos sg ON sd.grupo_id = sg.id
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
        cur.nombre_ubicacion ASC,
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
        ubicacion_nombre: row.ubicacion_nombre,
        ubicacion_id: row.ubicacion_id,
        grupo_id: row.grupo_id,
        grupo_nombre: row.grupo_nombre || "Sin Grupo",
        activo: row.activo,
        estado_conexion: row.estado_conexion,
        ultima_medicion: row.ultima_medicion,
        fecha_creacion: row.fecha_creacion,
        fecha_actualizacion: row.fecha_actualizacion,
        display_name: row.ubicacion_nombre,
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
          sd.grupo_id,
          cur.nombre_ubicacion as ubicacion_nombre,
          cur.idcatalogo_ubicaciones_reales as ubicacion_id,
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
          catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
        LEFT JOIN 
          sem_grupos sg ON sd.grupo_id = sg.id
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
        ubicacion_nombre: device.ubicacion_nombre,
        ubicacion_id: device.ubicacion_id,
        grupo_id: device.grupo_id,
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
        display_name: device.ubicacion_nombre,
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
