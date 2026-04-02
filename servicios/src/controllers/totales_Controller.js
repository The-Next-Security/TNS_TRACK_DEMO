// controllers/totalesController.js - Versión Refactorizada
const databaseService = require("../services/database_Service");
const transformUtils = require("../utils/transform_Utils");
const {
  calculateCategoryData,
  createEmptyCategoryStructure,
} = require("../utils/consumption/category_Utils");
const { DateTime } = require("luxon");

class TotalesController {
  /**
   * Obtiene los totales diarios por dispositivo específico
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async getDailyTotalsByDevice(req, res, next) {
    try {
      const { date } = req.validatedDates;
      const { deviceId } = req.query;

      // Validar que se proporcione deviceId
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Parámetro deviceId es requerido",
        });
      }

      // Validar que el dispositivo existe y está activo
      const deviceValidation = await this._validateDevice(deviceId);
      if (!deviceValidation.isValid) {
        return res.status(404).json({
          success: false,
          message: deviceValidation.message,
        });
      }

      const query = `
                SELECT 
                    dispo.nombre as dispositivo_nombre,
                    cur.nombre,
                    dispo.id_grupo AS grupo_id,
                    sg.nombre as grupo_nombre,
                    tot.shelly_id,
                    tot.hora_local,
                    tot.fecha_actualizacion,
                    tot.energia_activa_total,
                    tot.costo_total,
                    tot.lecturas_limite_apagado,
                    tot.lecturas_consumo_bajo,
                    tot.lecturas_consumo_medio,
                    tot.lecturas_consumo_alto,
                    tot.cantidad_datos,
                    tot.calidad_datos,
                    -- Costo acumulado durante el día
                    SUM(tot.costo_total) OVER (
                        PARTITION BY tot.shelly_id
                        ORDER BY tot.hora_local
                        ROWS UNBOUNDED PRECEDING
                    ) AS costo_acumulado

                FROM 
                    sem_totales_hora AS tot
                JOIN
                    sem_dispositivos AS dispo ON tot.shelly_id = dispo.shelly_id
                JOIN 
                    gen_ubicaciones_reales AS cur ON dispo.id_ubicacion_real = cur.id_ubicacion_real -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
                LEFT JOIN 
                    sem_grupos AS sg ON dispo.id_grupo = sg.id_grupo
                WHERE 
                    DATE(tot.hora_local) = ?
                    AND tot.shelly_id = ?
                    AND dispo.activo = 1
                ORDER BY 
                    tot.hora_local ASC;
            `;

      const [rows] = await databaseService.pool.query(query, [date, deviceId]);

      // Si no hay datos, crear estructura base con ceros
      if (!rows || rows.length === 0) {
        const emptyData = await this._createEmptyDailyData(date, deviceId);
        return res.json(
          transformUtils.transformApiResponse(emptyData, {
            includeMetadata: true,
            message: "No hay datos disponibles para la fecha seleccionada",
          })
        );
      }

      // Procesar los datos para incluir información de categorización
      const processedData = await this._processDailyData(rows);

      res.json(
        transformUtils.transformApiResponse(processedData, {
          includeMetadata: true,
          message: `Datos diarios procesados para ${rows[0].nombre}`,
        })
      );
    } catch (error) {
      console.error("Error en getDailyTotalsByDevice:", error);
      next(error);
    }
  }

  /**
   * Obtiene los totales mensuales por dispositivo específico
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async getMonthlyTotalsByDevice(req, res, next) {
    try {
      const { date } = req.validatedDates;
      const { deviceId } = req.query;

      // Validar que se proporcione deviceId
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Parámetro deviceId es requerido",
        });
      }

      // Validar que el dispositivo existe y está activo
      const deviceValidation = await this._validateDevice(deviceId);
      if (!deviceValidation.isValid) {
        return res.status(404).json({
          success: false,
          message: deviceValidation.message,
        });
      }

      const query = `
      WITH LatestUpdate AS (
        SELECT MAX(fecha_actualizacion) as ultima_actualizacion
        FROM sem_totales_dia std
        WHERE YEAR(std.fecha_local) = YEAR(?) 
        AND MONTH(std.fecha_local) = MONTH(?)
        AND std.shelly_id = ?
      )
      SELECT 
        std.fecha_local,
        std.shelly_id,
        std.energia_activa_total,
        std.costo_total,
        std.precio_kwh_promedio,
        std.horas_con_datos,
        cur.nombre,
        sd.nombre as dispositivo_nombre,
        sd.id_grupo AS grupo_id,
        sg.nombre as grupo_nombre,
        lu.ultima_actualizacion as fecha_actualizacion,
        std.lecturas_limite_apagado,
        std.lecturas_consumo_bajo,
        std.lecturas_consumo_medio,
        std.lecturas_consumo_alto,
        std.cantidad_datos
      FROM sem_totales_dia std
      JOIN sem_dispositivos sd ON std.shelly_id = sd.shelly_id
      JOIN gen_ubicaciones_reales cur ON sd.id_ubicacion_real = cur.id_ubicacion_real -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
      LEFT JOIN sem_grupos sg ON sd.id_grupo = sg.id_grupo
      CROSS JOIN LatestUpdate lu
      WHERE
        YEAR(std.fecha_local) = YEAR(?) 
        AND MONTH(std.fecha_local) = MONTH(?)
        AND std.shelly_id = ?
        AND sd.activo = 1
      ORDER BY
        std.fecha_local ASC
    `;

      // ✅ Corregir el orden de los parámetros
      const [rows] = await databaseService.pool.query(query, [
        date, // Para YEAR() y MONTH() en LatestUpdate
        date, // Para YEAR() y MONTH() en LatestUpdate
        deviceId, // Para shelly_id en LatestUpdate
        date, // Para YEAR() en WHERE principal
        date, // Para MONTH() en WHERE principal
        deviceId, // Para shelly_id en WHERE principal
      ]);

      // Si no hay datos, crear estructura base con ceros
      if (!rows || rows.length === 0) {
        const emptyData = await this._createEmptyMonthlyData(date, deviceId);
        return res.json(
          transformUtils.transformApiResponse(emptyData, {
            includeMetadata: true,
            message: "No hay datos disponibles para el mes seleccionado",
          })
        );
      }

      // Procesar los datos para incluir información de categorización
      const processedData = await this._processMonthlyData(rows);

      res.json(
        transformUtils.transformApiResponse(processedData, {
          includeMetadata: true,
          message: `Datos mensuales procesados para ${rows[0].nombre}`,
        })
      );
    } catch (error) {
      console.error("Error en getMonthlyTotalsByDevice:", error);
      next(error);
    }
  }

  /**
   * Obtiene los totales anuales por dispositivo específico
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async getYearlyTotalsByDevice(req, res, next) {
    try {
      const { year } = req.validatedDates;
      const { deviceId } = req.query;

      // Validar que se proporcione deviceId
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Parámetro deviceId es requerido",
        });
      }

      // Validar que el dispositivo existe y está activo
      const deviceValidation = await this._validateDevice(deviceId);
      if (!deviceValidation.isValid) {
        return res.status(404).json({
          success: false,
          message: deviceValidation.message,
        });
      }

      const query = `
                SELECT 
                    stm.shelly_id,
                    stm.año as anio,
                    stm.mes,
                    stm.energia_activa_total,
                    stm.energia_reactiva_total,
                    stm.potencia_maxima,
                    stm.potencia_minima,
                    stm.precio_kwh_promedio,
                    stm.costo_total,
                    stm.dias_con_datos,
                    stm.horas_con_datos,
                    stm.fecha_creacion,
                    stm.fecha_actualizacion,
                    cur.nombre,
                    sd.nombre as dispositivo_nombre,
                    sd.id_grupo AS grupo_id,
                    sg.nombre as grupo_nombre,
                    stm.lecturas_limite_apagado,
                    stm.lecturas_consumo_bajo,
                    stm.lecturas_consumo_medio,
                    stm.lecturas_consumo_alto,
                    stm.cantidad_datos
                FROM 
                    sem_totales_mes stm
                JOIN 
                    sem_dispositivos sd ON stm.shelly_id = sd.shelly_id
                JOIN
                    gen_ubicaciones_reales cur ON sd.id_ubicacion_real = cur.id_ubicacion_real -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
                LEFT JOIN
                    sem_grupos sg ON sd.id_grupo = sg.id_grupo
                WHERE
                    stm.año = ?
                    AND stm.shelly_id = ?
                    AND sd.activo = 1
                ORDER BY 
                    stm.mes ASC
            `;

      const [rows] = await databaseService.pool.query(query, [
        parseInt(year),
        deviceId,
      ]);

      // Si no hay datos, crear estructura base con ceros para los 12 meses
      if (!rows || rows.length === 0) {
        const emptyData = await this._createEmptyYearlyData(year, deviceId);
        return res.json(
          transformUtils.transformApiResponse(emptyData, {
            includeMetadata: true,
            message: "No hay datos disponibles para el año seleccionado",
          })
        );
      }

      // Procesar los datos para incluir información de categorización
      const processedData = await this._processYearlyData(rows, year);

      res.json(
        transformUtils.transformApiResponse(processedData, {
          includeMetadata: true,
          message: `Datos anuales procesados para ${rows[0].nombre}`,
        })
      );
    } catch (error) {
      console.error("Error en getYearlyTotalsByDevice:", error);
      next(error);
    }
  }

  // =================== MÉTODOS PRIVADOS DE VALIDACIÓN Y PROCESAMIENTO ===================

  /**
   * Valida que un dispositivo existe y está activo
   * @param {string} deviceId - ID del dispositivo a validar
   * @returns {Promise<Object>} Resultado de validación
   */
  async _validateDevice(deviceId) {
    try {
      const query = `
                SELECT 
                    sd.shelly_id,
                    sd.activo,
                    cur.nombre -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
                FROM sem_dispositivos sd
                JOIN gen_ubicaciones_reales cur ON sd.id_ubicacion_real = cur.id_ubicacion_real
                WHERE sd.shelly_id = ?
                LIMIT 1
            `;

      const [rows] = await databaseService.pool.query(query, [deviceId]);

      if (!rows || rows.length === 0) {
        return {
          isValid: false,
          message: `Dispositivo ${deviceId} no encontrado`,
        };
      }

      if (rows[0].activo !== 1) {
        return {
          isValid: false,
          message: `Dispositivo ${deviceId} no está activo`,
        };
      }

      return {
        isValid: true,
        device: rows[0],
      };
    } catch (error) {
      console.error("Error validando dispositivo:", error);
      return {
        isValid: false,
        message: "Error interno validando dispositivo",
      };
    }
  }

  /**
   * Procesa datos diarios agregando información de categorización
   * @param {Array} rows - Filas de datos desde la base de datos
   * @returns {Array} Datos procesados con categorización
   */
  async _processDailyData(rows) {
    return rows.map((row) => {
      try {
        const categorias = calculateCategoryData(row);

        return {
          periodo: row.hora_local,
          periodo_tipo: "daily",
          shelly_id: row.shelly_id,
          nombre: row.nombre,
          dispositivo_nombre: row.dispositivo_nombre,
          grupo_id: row.grupo_id,
          grupo_nombre: row.grupo_nombre || "Sin Grupo",
          // ✅ Asegurar que el costo se calcule correctamente
          costo_total: parseFloat(row.costo_total || 0),
          costo_acumulado: parseFloat(row.costo_acumulado || 0),
          energia_activa_total: parseFloat(row.energia_activa_total || 0),
          categorias: categorias,
          metadata: {
            cantidad_datos: parseInt(row.cantidad_datos || 0),
            calidad_datos: parseFloat(row.calidad_datos || 0),
            fecha_actualizacion: row.fecha_actualizacion,
          },
        };
      } catch (error) {
        console.error(
          `Error procesando fila diaria para ${row.shelly_id}:`,
          error
        );
        return {
          ...row,
          categorias: createEmptyCategoryStructure(),
          error: "Error procesando categorización",
        };
      }
    });
  }

  /**
   * Procesa datos mensuales agregando información de categorización
   * @param {Array} rows - Filas de datos desde la base de datos
   * @returns {Array} Datos procesados con categorización
   */
  async _processMonthlyData(rows) {
    return rows.map((row) => {
      try {
        const categorias = calculateCategoryData(row);

        return {
          periodo: row.fecha_local,
          periodo_tipo: "monthly",
          shelly_id: row.shelly_id,
          nombre: row.nombre,
          dispositivo_nombre: row.dispositivo_nombre,
          grupo_id: row.grupo_id,
          grupo_nombre: row.grupo_nombre || "Sin Grupo",
          costo_total: parseFloat(row.costo_total || 0),
          energia_activa_total: parseFloat(row.energia_activa_total || 0),
          precio_kwh_promedio: parseFloat(row.precio_kwh_promedio || 0),
          categorias: categorias,
          metadata: {
            cantidad_datos: parseInt(row.cantidad_datos || 0),
            horas_con_datos: parseInt(row.horas_con_datos || 0),
            fecha_actualizacion: row.fecha_actualizacion,
          },
        };
      } catch (error) {
        console.error(
          `Error procesando fila mensual para ${row.shelly_id}:`,
          error
        );
        return {
          ...row,
          categorias: createEmptyCategoryStructure(),
          error: "Error procesando categorización",
        };
      }
    });
  }

  /**
   * Procesa datos anuales agregando información de categorización
   * @param {Array} rows - Filas de datos desde la base de datos
   * @param {string} year - Año de los datos
   * @returns {Array} Datos procesados con categorización rellenando meses faltantes
   */
  async _processYearlyData(rows, year) {
    const processedData = [];
    const dataByMonth = {};

    // Indexar datos existentes por mes
    rows.forEach((row) => {
      dataByMonth[row.mes] = row;
    });

    // Procesar todos los 12 meses, rellenando faltantes con ceros
    for (let mes = 1; mes <= 12; mes++) {
      const row = dataByMonth[mes];

      if (row) {
        // Mes con datos reales
        try {
          const categorias = calculateCategoryData(row);

          processedData.push({
            periodo: `${year}-${mes.toString().padStart(2, "0")}`,
            periodo_tipo: "yearly",
            mes: mes,
            anio: parseInt(year),
            shelly_id: row.shelly_id,
            nombre: row.nombre,
            dispositivo_nombre: row.dispositivo_nombre,
            grupo_id: row.grupo_id,
            grupo_nombre: row.grupo_nombre || "Sin Grupo",
            costo_total: parseFloat(row.costo_total || 0),
            energia_activa_total: parseFloat(row.energia_activa_total || 0),
            precio_kwh_promedio: parseFloat(row.precio_kwh_promedio || 0),
            categorias: categorias,
            metadata: {
              cantidad_datos: parseInt(row.cantidad_datos || 0),
              dias_con_datos: parseInt(row.dias_con_datos || 0),
              horas_con_datos: parseInt(row.horas_con_datos || 0),
              fecha_actualizacion: row.fecha_actualizacion,
            },
          });
        } catch (error) {
          console.error(
            `Error procesando mes ${mes} para ${row.shelly_id}:`,
            error
          );
          processedData.push({
            periodo: `${year}-${mes.toString().padStart(2, "0")}`,
            mes: mes,
            anio: parseInt(year),
            categorias: createEmptyCategoryStructure(),
            error: "Error procesando categorización",
          });
        }
      } else {
        // Mes sin datos - crear entrada vacía
        processedData.push(await this._createEmptyMonthData(year, mes));
      }
    }

    return processedData;
  }

  /**
   * Crea datos diarios vacíos para cuando no hay información
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @param {string} deviceId - ID del dispositivo
   * @returns {Array} Array con 24 horas de datos vacíos
   */
  async _createEmptyDailyData(date, deviceId) {
    const deviceInfo = await this._getDeviceInfo(deviceId);
    const emptyData = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourString = hour.toString().padStart(2, "0");
      emptyData.push({
        periodo: `${date} ${hourString}:00:00`,
        periodo_tipo: "daily",
        shelly_id: deviceId,
        nombre: deviceInfo.nombre || "Desconocido",
        dispositivo_nombre: deviceInfo.dispositivo_nombre || "Desconocido",
        grupo_id: deviceInfo.grupo_id || 1,
        grupo_nombre: deviceInfo.grupo_nombre || "Sin Grupo",
        costo_total: 0,
        costo_acumulado: 0,
        energia_activa_total: 0,
        categorias: createEmptyCategoryStructure(),
        metadata: {
          cantidad_datos: 0,
          calidad_datos: 0,
          fecha_actualizacion: null,
        },
      });
    }

    return emptyData;
  }

  /**
   * Crea datos mensuales vacíos
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @param {string} deviceId - ID del dispositivo
   * @returns {Array} Array con días del mes con datos vacíos
   */
  async _createEmptyMonthlyData(date, deviceId) {
    const deviceInfo = await this._getDeviceInfo(deviceId);
    const dateObj = DateTime.fromFormat(date, "yyyy-MM-dd");
    const daysInMonth = dateObj.daysInMonth;
    const emptyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayString = day.toString().padStart(2, "0");
      emptyData.push({
        periodo: `${dateObj.year}-${dateObj.month
          .toString()
          .padStart(2, "0")}-${dayString}`,
        periodo_tipo: "monthly",
        shelly_id: deviceId,
        nombre: deviceInfo.nombre || "Desconocido",
        dispositivo_nombre: deviceInfo.dispositivo_nombre || "Desconocido",
        grupo_id: deviceInfo.grupo_id || 1,
        grupo_nombre: deviceInfo.grupo_nombre || "Sin Grupo",
        costo_total: 0,
        energia_activa_total: 0,
        precio_kwh_promedio: 0,
        categorias: createEmptyCategoryStructure(),
        metadata: {
          cantidad_datos: 0,
          horas_con_datos: 0,
          fecha_actualizacion: null,
        },
      });
    }

    return emptyData;
  }

  /**
   * Crea datos anuales vacíos para los 12 meses
   * @param {string} year - Año
   * @param {string} deviceId - ID del dispositivo
   * @returns {Array} Array con 12 meses de datos vacíos
   */
  async _createEmptyYearlyData(year, deviceId) {
    const deviceInfo = await this._getDeviceInfo(deviceId);
    const emptyData = [];

    for (let mes = 1; mes <= 12; mes++) {
      emptyData.push(await this._createEmptyMonthData(year, mes, deviceInfo));
    }

    return emptyData;
  }

  /**
   * Crea datos vacíos para un mes específico
   * @param {string} year - Año
   * @param {number} mes - Mes (1-12)
   * @param {Object} deviceInfo - Información del dispositivo (opcional)
   * @returns {Object} Datos vacíos para el mes
   */
  async _createEmptyMonthData(year, mes, deviceInfo = null) {
    if (!deviceInfo) {
      deviceInfo = {
        nombre: "Desconocido",
        dispositivo_nombre: "Desconocido",
      };
    }

    return {
      periodo: `${year}-${mes.toString().padStart(2, "0")}`,
      periodo_tipo: "yearly",
      mes: mes,
      anio: parseInt(year),
      shelly_id: deviceInfo.shelly_id || "unknown",
      nombre: deviceInfo.nombre || "Desconocido",
      dispositivo_nombre: deviceInfo.dispositivo_nombre || "Desconocido",
      grupo_id: deviceInfo.grupo_id || 1,
      grupo_nombre: deviceInfo.grupo_nombre || "Sin Grupo",
      costo_total: 0,
      energia_activa_total: 0,
      precio_kwh_promedio: 0,
      categorias: createEmptyCategoryStructure(),
      metadata: {
        cantidad_datos: 0,
        dias_con_datos: 0,
        horas_con_datos: 0,
        fecha_actualizacion: null,
      },
    };
  }

  /**
   * Obtiene información básica de un dispositivo
   * @param {string} deviceId - ID del dispositivo
   * @returns {Object} Información del dispositivo
   */
  async _getDeviceInfo(deviceId) {
    try {
      const query = `
                SELECT 
                    sd.shelly_id,
                    sd.nombre as dispositivo_nombre,
                    sd.id_grupo AS grupo_id,
                    cur.nombre, -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
                    sg.nombre as grupo_nombre
                FROM sem_dispositivos sd
                JOIN gen_ubicaciones_reales cur ON sd.id_ubicacion_real = cur.id_ubicacion_real
                LEFT JOIN sem_grupos sg ON sd.id_grupo = sg.id_grupo
                WHERE sd.shelly_id = ?
                LIMIT 1
            `;

      const [rows] = await databaseService.pool.query(query, [deviceId]);

      if (rows && rows.length > 0) {
        return {
          shelly_id: rows[0].shelly_id,
          dispositivo_nombre: rows[0].dispositivo_nombre,
          nombre: rows[0].nombre,
          grupo_id: rows[0].grupo_id,
          grupo_nombre: rows[0].grupo_nombre,
        };
      }

      return {
        shelly_id: deviceId,
        dispositivo_nombre: "Desconocido",
        nombre: "Desconocido",
        grupo_id: 1,
        grupo_nombre: "Sin Grupo",
      };
    } catch (error) {
      console.error("Error obteniendo información del dispositivo:", error);
      return {
        shelly_id: deviceId,
        dispositivo_nombre: "Desconocido",
        nombre: "Desconocido",
        grupo_id: 1,
        grupo_nombre: "Sin Grupo",
      };
    }
  }
}

module.exports = new TotalesController();
