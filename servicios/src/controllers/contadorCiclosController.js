// src/controllers/contadorCiclosController.js
const databaseService = require("../services/database-service");
const contadorCiclosUtils = require("../utils/contadorCiclos_Utils");

/**
 * Controlador para el manejo de ciclos de descongelamiento
 * Proporciona endpoints para consultar datos de ciclos de temperatura por ubicación y mes
 */
class ContadorCiclosController {
  /**
   * Obtiene datos de ciclos de descongelamiento por ubicación y mes
   * GET /api/contador-ciclos/descongelamiento
   *
   * @param {Object} req - Objeto de solicitud HTTP
   * @param {Object} req.query - Parámetros de consulta
   * @param {string} req.query.meses - Mes en formato YYYY-MM (también acepta array para compatibilidad)
   * @param {number} [req.query.ubicacion] - Channel ID de la ubicación (opcional)
   * @param {Object} res - Objeto de respuesta HTTP
   */
  async obtenerDatosDescongelamiento(req, res) {
    try {
      const { meses, ubicacion } = req.query;

      // Validar parámetros - Simplificado para un mes
      const validationResult = this.validarParametros(meses, ubicacion);
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: "Parámetros inválidos",
          message: validationResult.message,
          details: validationResult.details,
        });
      }

      // Normalizar a array (compatibilidad con frontend anterior)
      const mesesArray = Array.isArray(meses) ? meses : [meses];
      const channelId = ubicacion ? parseInt(ubicacion) : null;

      // Construir consulta SQL
      const sqlQuery = this.construirConsultaSQL(mesesArray, channelId);

      // Ejecutar consulta
      console.log(
        `[ContadorCiclos] Ejecutando consulta para ${
          mesesArray.length
        } mes(es)${channelId ? ` y channel_id ${channelId}` : ""}`
      );
      const resultados = await databaseService.query(
        sqlQuery.query,
        sqlQuery.params
      );

      // Procesar resultados
      const datosProcessados = contadorCiclosUtils.procesarDatosCiclos(
        resultados,
        mesesArray
      );

      // Generar estadísticas
      const estadisticas = contadorCiclosUtils.calcularEstadisticas(
        datosProcessados,
        mesesArray
      );

      console.log(
        `[ContadorCiclos] Consulta exitosa: ${resultados.length} registros encontrados`
      );

      res.json({
        success: true,
        data: {
          ciclos: datosProcessados,
          estadisticas: estadisticas,
          metadata: {
            meses: mesesArray,
            ubicacion: channelId,
            totalRegistros: resultados.length,
            fechaConsulta: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error(
        "[ContadorCiclos] Error en obtenerDatosDescongelamiento:",
        error
      );
      res.status(500).json({
        error: "Error interno del servidor",
        message: "Error al obtener datos de ciclos de descongelamiento",
      });
    }
  }

  /**
   * Obtiene lista de ubicaciones disponibles para filtrado
   * GET /api/contador-ciclos/ubicaciones
   */
  async obtenerUbicaciones(req, res) {
    try {
      const query = `
        SELECT DISTINCT 
          ubi.channel_id,
          ubi.name,
          ubica.nombre_ubicacion
        FROM channels_ubibot as ubi
        JOIN catalogo_ubicaciones_reales as ubica 
          ON ubica.idcatalogo_ubicaciones_reales = ubi.ubicacion_real
        WHERE ubi.esOperativa = 1 
          AND ubi.id_parametrizacion <> 8
        ORDER BY ubi.name ASC
      `;

      const ubicaciones = await databaseService.query(query);

      res.json({
        success: true,
        data: ubicaciones,
      });
    } catch (error) {
      console.error("[ContadorCiclos] Error en obtenerUbicaciones:", error);
      res.status(500).json({
        error: "Error interno del servidor",
        message: "Error al obtener ubicaciones disponibles",
      });
    }
  }

  /**
   * Valida los parámetros de entrada para la consulta - Simplificado para un mes
   * @param {string|string[]} meses - Mes o meses a consultar
   * @param {string} ubicacion - Channel ID de ubicación
   * @returns {Object} Resultado de validación
   */
  validarParametros(meses, ubicacion) {
    const errors = [];

    // Validar meses
    if (!meses) {
      errors.push("El parámetro 'meses' es requerido");
    } else {
      const mesesArray = Array.isArray(meses) ? meses : [meses];

      // Simplificado: recomendamos un mes pero mantenemos compatibilidad con hasta 3
      if (mesesArray.length > 3) {
        errors.push("Máximo 3 meses permitidos");
      }

      // Validar formato de cada mes
      const formatoMesRegex = /^\d{4}-\d{2}$/;
      const mesesInvalidos = mesesArray.filter(
        (mes) => !formatoMesRegex.test(mes)
      );
      if (mesesInvalidos.length > 0) {
        errors.push(
          `Formato de mes inválido: ${mesesInvalidos.join(
            ", "
          )}. Use formato YYYY-MM`
        );
      }

      // Validar que no sean meses futuros
      const fechaActual = new Date();
      const mesActual = `${fechaActual.getFullYear()}-${String(
        fechaActual.getMonth() + 1
      ).padStart(2, "0")}`;

      const mesesFuturos = mesesArray.filter((mes) => mes > mesActual);
      if (mesesFuturos.length > 0) {
        errors.push(`No se permiten meses futuros: ${mesesFuturos.join(", ")}`);
      }
    }

    // Validar ubicación (opcional)
    if (ubicacion && (isNaN(parseInt(ubicacion)) || parseInt(ubicacion) <= 0)) {
      errors.push(
        "El parámetro 'ubicacion' debe ser un número entero positivo"
      );
    }

    return {
      isValid: errors.length === 0,
      message:
        errors.length > 0
          ? "Errores de validación encontrados"
          : "Parámetros válidos",
      details: errors,
    };
  }

  /**
   * Construye la consulta SQL para obtener datos de ciclos
   * @param {string[]} mesesArray - Array de meses en formato YYYY-MM
   * @param {number|null} channelId - ID del canal (opcional)
   * @returns {Object} Objeto con query y parámetros
   */
  construirConsultaSQL(mesesArray, channelId) {
    const condicionesMeses = mesesArray.map((mes, index) => {
      const [year, month] = mes.split("-");
      const fechaInicio = `${year}-${month}-01 00:00:00`;
      const fechaFin = new Date(year, month, 0); // Último día del mes
      const fechaFinStr = `${year}-${month}-${String(
        fechaFin.getDate()
      ).padStart(2, "0")} 23:59:59`;

      return `(cc.fecha_ciclos >= ? AND cc.fecha_ciclos <= ?)`;
    });

    let query = `
      SELECT 
        cc.fecha_ciclos,
        cc.channel_id,
        ubi.name,
        ubica.nombre_ubicacion,
        cc.numero_ciclos,
        cc.tiempo_en_positivo,
        cc.porcentaje_tiempo,
        DATE_FORMAT(cc.fecha_ciclos, '%Y-%m') as mes,
        DATE_FORMAT(cc.fecha_ciclos, '%d') as dia
      FROM contador_ciclos as cc 
      JOIN channels_ubibot as ubi ON cc.channel_id = ubi.channel_id
      JOIN catalogo_ubicaciones_reales as ubica 
        ON ubica.idcatalogo_ubicaciones_reales = ubi.ubicacion_real
      WHERE (${condicionesMeses.join(" OR ")})
        AND ubi.esOperativa = 1
        AND ubi.id_parametrizacion <> 8
    `;

    const params = [];

    // Agregar parámetros de fechas
    mesesArray.forEach((mes) => {
      const [year, month] = mes.split("-");
      const fechaInicio = `${year}-${month}-01 00:00:00`;
      const fechaFin = new Date(year, month, 0);
      const fechaFinStr = `${year}-${month}-${String(
        fechaFin.getDate()
      ).padStart(2, "0")} 23:59:59`;

      params.push(fechaInicio, fechaFinStr);
    });

    // Agregar filtro de ubicación si se especifica
    if (channelId) {
      query += ` AND cc.channel_id = ?`;
      params.push(channelId);
    }

    query += ` ORDER BY ubi.name ASC, cc.fecha_ciclos ASC`;

    return { query, params };
  }
}

module.exports = new ContadorCiclosController();
