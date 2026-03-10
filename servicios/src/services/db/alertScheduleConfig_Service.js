/**
 * Alert Schedule Config Service
 *
 * Servicio para gestionar la configuración de horario operacional del sistema.
 * Opera sobre dos niveles de configuración:
 *   - gen_horario_operacional: 7 filas (una por día) con hora_inicio, hora_fin, activo
 *   - gen_cofiguracion_valores ids 77-78: parámetros globales del sistema de alertas
 *
 * Feature: 002-configurable-alert-schedules
 * Issue: https://github.com/TNSTRACK/servicios/issues/12
 *
 * @module services/db/alertScheduleConfigService
 */

const databaseService = require('../database_Service');

class AlertScheduleConfigService {
  constructor() {
    this.databaseService = databaseService;
    this.configCache = null; // Cache en memoria para evitar queries frecuentes
  }

  /**
   * Cargar configuración completa desde la base de datos.
   *
   * Lee los 7 registros de gen_horario_operacional y los parámetros globales
   * (respetar_feriados, criticas_ignoran_horario) y retorna una estructura nativa.
   *
   * @returns {Promise<Object>} Configuración con horarios por día y parámetros globales
   * @throws {Error} Si la consulta a la BD falla
   *
   * @example
   * const config = await service.loadAllConfig();
   * // Retorna:
   * // {
   * //   horarios: [
   * //     { dia_semana: 1, nombre_dia: 'Lunes', hora_inicio: '08:30:00', hora_fin: '18:30:00', activo: true },
   * //     ...
   * //     { dia_semana: 7, nombre_dia: 'Domingo', hora_inicio: '00:00:00', hora_fin: '00:00:00', activo: false }
   * //   ],
   * //   respetar_feriados: true,
   * //   criticas_ignoran_horario: true,
   * //   fecha_carga: Date
   * // }
   */
  async loadAllConfig() {
    try {
      if (!this.databaseService.connected) {
        await this.databaseService.initialize();
      }

      // Consulta horarios operacionales (7 días de la semana)
      const [horarios] = await this.databaseService.pool.execute(`
        SELECT dia_semana, nombre_dia, hora_inicio, hora_fin, activo
        FROM gen_horario_operacional
        ORDER BY dia_semana
      `);

      // Consulta parámetros globales del sistema de alertas (ids 77 y 78)
      const [parametros] = await this.databaseService.pool.execute(`
        SELECT p.nombre_parametro, v.valor
        FROM gen_cofiguracion_parametros p
        JOIN gen_cofiguracion_valores v ON v.id_cofiguracion_parametros = p.id_cofiguracion_parametros
        WHERE p.id_cofiguracion_parametros IN (77, 78) AND v.activo = 1
      `);

      // Parsear parámetros globales a un mapa clave→valor
      const params = {};
      parametros.forEach(row => {
        // La clave viene como 'alertSystem.respetar_feriados' → extraer la parte final
        const clave = row.nombre_parametro;
        params[clave] = row.valor;
      });

      // Construir la configuración con tipos correctos
      const config = {
        horarios: horarios.map(row => ({
          dia_semana: row.dia_semana,
          nombre_dia: row.nombre_dia,
          hora_inicio: row.hora_inicio,
          hora_fin: row.hora_fin,
          activo: row.activo === 1
        })),
        respetar_feriados: params.respetar_feriados === 'true',
        criticas_ignoran_horario: params.criticas_ignoran_horario === 'true',
        fecha_carga: new Date()
      };

      // Actualizar cache en memoria
      this.configCache = config;

      console.log(`[AlertScheduleConfigService] Configuración cargada: ${config.horarios.length} días de la semana`);

      return config;
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error al cargar configuración:', error);
      throw new Error(`Error al cargar configuración de horario: ${error.message}`);
    }
  }

  /**
   * Determina si un momento dado está dentro del horario operacional del sistema.
   *
   * Única fuente de verdad (Nivel 1) para la decisión de envío de alertas.
   * Utiliza el cache en memoria si está disponible; si no, lo carga desde BD.
   *
   * Nota: Este método solo evalúa el Nivel 1 (global). El Nivel 2 (DND por usuario)
   * lo gestiona MySQL a través de fun_should_send_notification().
   *
   * Mapeo de días:
   *   moment().day() → 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
   *   gen_horario_operacional → 1=Lun, 2=Mar, ..., 6=Sáb, 7=Dom
   *
   * @param {Object} momentTime - Objeto moment con la fecha/hora a evaluar
   * @returns {Promise<Object>} { enHorario: boolean, motivo: string }
   */
  async isWithinOperationalHours(momentTime) {
    try {
      // Cargar config desde cache o BD
      const config = this.configCache || await this.loadAllConfig();

      // Convertir día de moment (0=Dom..6=Sáb) a formato de BD (1=Lun..7=Dom)
      const diaMoment = momentTime.day(); // 0=Dom, 1=Lun, ..., 6=Sáb
      const diaDB = diaMoment === 0 ? 7 : diaMoment; // Dom→7, el resto igual

      // Buscar el horario para el día actual
      const horarioDia = config.horarios.find(h => h.dia_semana === diaDB);

      if (!horarioDia) {
        return { enHorario: false, motivo: `No hay horario configurado para dia_semana=${diaDB}` };
      }

      // Si el día está inactivo, está fuera del horario operacional
      if (!horarioDia.activo) {
        return { enHorario: false, motivo: `${horarioDia.nombre_dia} no está en horario operacional (activo=false)` };
      }

      // Comparar hora actual con el rango del día
      const horaActual = momentTime.format('HH:mm:ss');
      const enRango = horaActual >= horarioDia.hora_inicio && horaActual <= horarioDia.hora_fin;

      if (enRango) {
        return {
          enHorario: true,
          motivo: `${horarioDia.nombre_dia} en horario operacional (${horarioDia.hora_inicio} - ${horarioDia.hora_fin})`
        };
      } else {
        return {
          enHorario: false,
          motivo: `${horarioDia.nombre_dia} fuera de horario operacional (${horarioDia.hora_inicio} - ${horarioDia.hora_fin})`
        };
      }
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error al evaluar horario operacional:', error);
      // En caso de error, asumir fuera de horario (conservador)
      return { enHorario: false, motivo: `Error al evaluar horario: ${error.message}` };
    }
  }

  /**
   * Actualizar el horario operacional de un día de la semana.
   *
   * @param {number} dia_semana - Día a actualizar (1=Lunes .. 7=Domingo)
   * @param {Object} datos - Datos a actualizar
   * @param {string} datos.hora_inicio - Hora de inicio (HH:mm:ss)
   * @param {string} datos.hora_fin - Hora de fin (HH:mm:ss)
   * @param {boolean} datos.activo - Si el día está activo en el horario operacional
   * @param {string} updatedBy - Usuario que realiza el cambio
   * @returns {Promise<Object>} Resultado con affectedRows
   * @throws {Error} Si la actualización falla
   */
  async updateHorario(dia_semana, { hora_inicio, hora_fin, activo }, updatedBy) {
    try {
      if (!this.databaseService.connected) {
        await this.databaseService.initialize();
      }

      const [result] = await this.databaseService.pool.execute(`
        UPDATE gen_horario_operacional
        SET hora_inicio = ?, hora_fin = ?, activo = ?
        WHERE dia_semana = ?
      `, [hora_inicio, hora_fin, activo ? 1 : 0, dia_semana]);

      // Invalidar cache para forzar recarga en próxima consulta
      this.configCache = null;

      console.log(`[AlertScheduleConfigService] Horario dia=${dia_semana} actualizado por ${updatedBy}`);

      return {
        success: true,
        affectedRows: result.affectedRows,
        dia_semana,
        hora_inicio,
        hora_fin,
        activo,
        updatedBy
      };
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error al actualizar horario:', error);
      throw new Error(`Error al actualizar horario: ${error.message}`);
    }
  }

  /**
   * Actualizar un parámetro global del sistema de alertas.
   *
   * Usado para modificar respetar_feriados y criticas_ignoran_horario.
   *
   * @param {string} clave - Clave del parámetro (ej: 'alertSystem.respetar_feriados')
   * @param {string} valor - Nuevo valor ('true' o 'false')
   * @returns {Promise<Object>} Resultado con affectedRows
   * @throws {Error} Si la actualización falla
   */
  async updateParametro(clave, valor) {
    try {
      if (!this.databaseService.connected) {
        await this.databaseService.initialize();
      }

      const [result] = await this.databaseService.pool.execute(`
        UPDATE gen_cofiguracion_valores v
        JOIN gen_cofiguracion_parametros p ON v.id_cofiguracion_parametros = p.id_cofiguracion_parametros
        SET v.valor = ?
        WHERE p.ruta_completa = ? AND v.activo = 1
      `, [valor, clave]);

      // Invalidar cache
      this.configCache = null;

      console.log(`[AlertScheduleConfigService] Parámetro '${clave}' actualizado a '${valor}'`);

      return {
        success: true,
        affectedRows: result.affectedRows,
        clave,
        valor
      };
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error al actualizar parámetro:', error);
      throw new Error(`Error al actualizar parámetro: ${error.message}`);
    }
  }

  /**
   * Restablecer configuración de horarios a valores por defecto.
   *
   * @param {string} updatedBy - Usuario que realiza el restablecimiento
   * @returns {Promise<Object>} Resultado con número de registros actualizados
   */
  async resetToDefaults(updatedBy) {
    const defaults = [
      { dia_semana: 1, hora_inicio: '08:30:00', hora_fin: '18:30:00', activo: true },  // Lunes
      { dia_semana: 2, hora_inicio: '08:30:00', hora_fin: '18:30:00', activo: true },  // Martes
      { dia_semana: 3, hora_inicio: '08:30:00', hora_fin: '18:30:00', activo: true },  // Miércoles
      { dia_semana: 4, hora_inicio: '08:30:00', hora_fin: '18:30:00', activo: true },  // Jueves
      { dia_semana: 5, hora_inicio: '08:30:00', hora_fin: '18:30:00', activo: true },  // Viernes
      { dia_semana: 6, hora_inicio: '08:30:00', hora_fin: '14:30:00', activo: true },  // Sábado
      { dia_semana: 7, hora_inicio: '00:00:00', hora_fin: '00:00:00', activo: false }  // Domingo (inactivo)
    ];

    const resultados = [];
    for (const dia of defaults) {
      const res = await this.updateHorario(dia.dia_semana, dia, updatedBy);
      resultados.push(res);
    }

    // Restablecer parámetros globales
    await this.updateParametro('alertSystem.respetar_feriados', 'true');
    await this.updateParametro('alertSystem.criticas_ignoran_horario', 'true');

    return {
      success: true,
      updatedCount: resultados.length + 2,
      updatedBy
    };
  }

  /**
   * Validar formato de hora (HH:mm:ss)
   *
   * @param {string} value - Hora a validar
   * @returns {boolean} true si el formato es válido
   */
  validateTimeFormat(value) {
    const timeRegex = /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    return timeRegex.test(value);
  }

  /**
   * Validar que hora de inicio sea anterior a hora de fin
   *
   * @param {string} start - Hora de inicio (HH:mm:ss)
   * @param {string} end - Hora de fin (HH:mm:ss)
   * @returns {boolean} true si start < end
   */
  validateTimeRange(start, end) {
    if (!this.validateTimeFormat(start) || !this.validateTimeFormat(end)) {
      return false;
    }
    return start < end;
  }

  /**
   * Validar un objeto de configuración de horarios
   *
   * @param {Object} config - Configuración a validar
   * @returns {Object} { success: boolean, errors: Array }
   */
  validateConfig(config) {
    const errors = [];

    if (config.hora_inicio && !this.validateTimeFormat(config.hora_inicio)) {
      errors.push({ field: 'hora_inicio', code: 'INVALID_FORMAT', message: 'Formato inválido. Use HH:mm:ss' });
    }

    if (config.hora_fin && !this.validateTimeFormat(config.hora_fin)) {
      errors.push({ field: 'hora_fin', code: 'INVALID_FORMAT', message: 'Formato inválido. Use HH:mm:ss' });
    }

    if (config.hora_inicio && config.hora_fin && config.activo) {
      if (!this.validateTimeRange(config.hora_inicio, config.hora_fin)) {
        errors.push({ field: 'hora_inicio', code: 'INVALID_RANGE', message: 'Hora inicio debe ser anterior a hora fin' });
      }
    }

    return { success: errors.length === 0, errors };
  }
}

// Exportar instancia singleton
module.exports = new AlertScheduleConfigService();
