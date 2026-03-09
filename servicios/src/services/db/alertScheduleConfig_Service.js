/**
 * Alert Schedule Config Service
 *
 * Service for managing global alert schedule configuration.
 * Provides methods to load, update, and validate alert schedule parameters.
 *
 * Feature: 002-configurable-alert-schedules
 * Issue: https://github.com/TNSTRACK/servicios/issues/19
 *
 * @module services/db/alertScheduleConfigService
 */

const databaseService = require('../database_Service');

class AlertScheduleConfigService {
  constructor() {
    this.databaseService = databaseService;
  }

  /**
   * Load all configuration records from database
   *
   * Reads all 5 config records (weekday_start, weekday_end, saturday_start,
   * saturday_end, respect_holidays) and returns them as a structured object.
   *
   * @returns {Promise<Object>} Configuration object with all parameters
   * @throws {Error} If database query fails
   *
   * @example
   * const config = await service.loadAllConfig();
   * // Returns:
   * // {
   * //   weekday_start: '08:30:00',
   * //   weekday_end: '18:30:00',
   * //   saturday_start: '08:30:00',
   * //   saturday_end: '14:30:00',
   * //   respect_holidays: 'true',
   * //   updated_at: '2025-10-21T10:15:43Z',
   * //   updated_by: 'admin@storage.cl'
   * // }
   */
  async loadAllConfig() {
    try {
      // Initialize database connection if needed
      if (!this.databaseService.connected) {
        await this.databaseService.initialize();
      }

      const query = `
        SELECT
          config_key,
          config_value,
          updated_at,
          updated_by
        FROM alert_schedule_config
        ORDER BY config_id
      `;

      const [rows] = await this.databaseService.pool.execute(query);

      // Transform array of rows into object
      const config = {};
      let latestUpdate = null;
      let latestUpdatedBy = null;

      rows.forEach(row => {
        config[row.config_key] = row.config_value;

        // Track latest update time across all records
        if (!latestUpdate || row.updated_at > latestUpdate) {
          latestUpdate = row.updated_at;
          latestUpdatedBy = row.updated_by;
        }
      });

      // Add metadata
      config.updated_at = latestUpdate;
      config.updated_by = latestUpdatedBy;

      console.log(`[AlertScheduleConfigService] Loaded ${rows.length} configuration records`);

      return config;
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error loading config:', error);
      throw new Error(`Failed to load alert schedule configuration: ${error.message}`);
    }
  }

  /**
   * Update a single configuration parameter
   *
   * Updates one config parameter in the database using parameterized query
   * to prevent SQL injection.
   *
   * @param {string} key - Configuration key (weekday_start|weekday_end|saturday_start|saturday_end|respect_holidays)
   * @param {string} value - New value for the parameter
   * @param {string} updatedBy - Email or username of user making the change
   * @returns {Promise<Object>} Result with affectedRows count
   * @throws {Error} If database update fails or key is invalid
   *
   * @example
   * await service.updateConfig('weekday_start', '09:00:00', 'admin@storage.cl');
   */
  async updateConfig(key, value, updatedBy) {
    try {
      // Validate key is one of the allowed config keys
      const validKeys = ['weekday_start', 'weekday_end', 'saturday_start', 'saturday_end', 'respect_holidays'];
      if (!validKeys.includes(key)) {
        throw new Error(`Invalid config key: ${key}. Must be one of: ${validKeys.join(', ')}`);
      }

      // Initialize database connection if needed
      if (!this.databaseService.connected) {
        await this.databaseService.initialize();
      }

      const query = `
        UPDATE alert_schedule_config
        SET
          config_value = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
      `;

      const [result] = await this.databaseService.pool.execute(query, [value, updatedBy, key]);

      console.log(`[AlertScheduleConfigService] Updated ${key} = ${value} (by ${updatedBy})`);

      return {
        success: true,
        affectedRows: result.affectedRows,
        key,
        value,
        updatedBy
      };
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error updating config:', error);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }
  }

  /**
   * Update multiple configuration parameters at once
   *
   * Updates multiple config parameters in a single transaction.
   *
   * @param {Object} updates - Object with key-value pairs to update
   * @param {string} updatedBy - Email or username of user making the changes
   * @returns {Promise<Object>} Result with count of updated records
   * @throws {Error} If database update fails
   *
   * @example
   * await service.updateMultipleConfigs({
   *   weekday_start: '09:00:00',
   *   weekday_end: '17:00:00',
   *   respect_holidays: 'false'
   * }, 'admin@storage.cl');
   */
  async updateMultipleConfigs(updates, updatedBy) {
    try {
      // Initialize database connection if needed
      if (!this.databaseService.connected) {
        await this.databaseService.initialize();
      }

      const connection = await this.databaseService.pool.getConnection();

      try {
        await connection.beginTransaction();

        const results = [];

        for (const [key, value] of Object.entries(updates)) {
          const query = `
            UPDATE alert_schedule_config
            SET
              config_value = ?,
              updated_by = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE config_key = ?
          `;

          const [result] = await connection.execute(query, [value, updatedBy, key]);
          results.push({ key, value, affectedRows: result.affectedRows });
        }

        await connection.commit();

        console.log(`[AlertScheduleConfigService] Updated ${results.length} configuration records (by ${updatedBy})`);

        return {
          success: true,
          updatedCount: results.length,
          updates: results,
          updatedBy
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('[AlertScheduleConfigService] Error updating multiple configs:', error);
      throw new Error(`Failed to update multiple configurations: ${error.message}`);
    }
  }

  /**
   * Validate time format (HH:mm:ss)
   *
   * Validates that a time string matches the expected HH:mm:ss format
   * with valid hour (00-23), minute (00-59), and second (00-59) values.
   *
   * @param {string} value - Time string to validate
   * @returns {boolean} True if valid, false otherwise
   *
   * @example
   * validateTimeFormat('09:00:00') // true
   * validateTimeFormat('25:00:00') // false (invalid hour)
   * validateTimeFormat('09:00')    // false (missing seconds)
   */
  validateTimeFormat(value) {
    // Regex: HH:mm:ss with valid ranges
    const timeRegex = /^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    return timeRegex.test(value);
  }

  /**
   * Validate time range (start < end)
   *
   * Validates that a start time is before an end time.
   * Both times must be in HH:mm:ss format.
   *
   * @param {string} start - Start time (HH:mm:ss)
   * @param {string} end - End time (HH:mm:ss)
   * @returns {boolean} True if start < end, false otherwise
   *
   * @example
   * validateTimeRange('09:00:00', '17:00:00') // true
   * validateTimeRange('17:00:00', '09:00:00') // false
   */
  validateTimeRange(start, end) {
    // Validate format first
    if (!this.validateTimeFormat(start) || !this.validateTimeFormat(end)) {
      return false;
    }

    // Compare as strings (HH:mm:ss format allows direct string comparison)
    return start < end;
  }

  /**
   * Validate configuration object
   *
   * Validates an entire configuration object including:
   * - Time format validation for all time fields
   * - Range validation (start < end) for weekday and Saturday
   * - Boolean value validation for respect_holidays
   *
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validation result with success flag and errors array
   *
   * @example
   * const result = service.validateConfig({
   *   weekday_start: '09:00:00',
   *   weekday_end: '17:00:00',
   *   saturday_start: '09:00:00',
   *   saturday_end: '13:00:00',
   *   respect_holidays: 'true'
   * });
   * // Returns: { success: true, errors: [] }
   */
  validateConfig(config) {
    const errors = [];

    // Validate weekday times
    if (config.weekday_start && !this.validateTimeFormat(config.weekday_start)) {
      errors.push({
        field: 'weekday_start',
        code: 'INVALID_FORMAT',
        message: 'Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)'
      });
    }

    if (config.weekday_end && !this.validateTimeFormat(config.weekday_end)) {
      errors.push({
        field: 'weekday_end',
        code: 'INVALID_FORMAT',
        message: 'Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)'
      });
    }

    // Validate Saturday times
    if (config.saturday_start && !this.validateTimeFormat(config.saturday_start)) {
      errors.push({
        field: 'saturday_start',
        code: 'INVALID_FORMAT',
        message: 'Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)'
      });
    }

    if (config.saturday_end && !this.validateTimeFormat(config.saturday_end)) {
      errors.push({
        field: 'saturday_end',
        code: 'INVALID_FORMAT',
        message: 'Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)'
      });
    }

    // Validate Sunday times
    if (config.sunday_start && !this.validateTimeFormat(config.sunday_start)) {
      errors.push({
        field: 'sunday_start',
        code: 'INVALID_FORMAT',
        message: 'Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)'
      });
    }

    if (config.sunday_end && !this.validateTimeFormat(config.sunday_end)) {
      errors.push({
        field: 'sunday_end',
        code: 'INVALID_FORMAT',
        message: 'Formato inválido. Use HH:mm:ss (00:00:00 - 23:59:59)'
      });
    }

    // Validate time ranges
    if (config.weekday_start && config.weekday_end) {
      if (!this.validateTimeRange(config.weekday_start, config.weekday_end)) {
        errors.push({
          field: 'weekday_start',
          code: 'INVALID_RANGE',
          message: 'Hora inicio debe ser anterior a hora fin'
        });
      }
    }

    if (config.saturday_start && config.saturday_end) {
      if (!this.validateTimeRange(config.saturday_start, config.saturday_end)) {
        errors.push({
          field: 'saturday_start',
          code: 'INVALID_RANGE',
          message: 'Hora inicio debe ser anterior a hora fin'
        });
      }
    }

    if (config.sunday_start && config.sunday_end) {
      if (!this.validateTimeRange(config.sunday_start, config.sunday_end)) {
        errors.push({
          field: 'sunday_start',
          code: 'INVALID_RANGE',
          message: 'Hora inicio debe ser anterior a hora fin'
        });
      }
    }

    // Validate respect_holidays (must be 'true' or 'false' string)
    if (config.respect_holidays !== undefined) {
      if (config.respect_holidays !== 'true' && config.respect_holidays !== 'false') {
        errors.push({
          field: 'respect_holidays',
          code: 'INVALID_VALUE',
          message: 'Valor debe ser "true" o "false"'
        });
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Reset configuration to default values
   *
   * Resets all configuration parameters to their default values.
   *
   * @param {string} updatedBy - Email or username of user performing the reset
   * @returns {Promise<Object>} Result with count of reset records
   *
   * @example
   * await service.resetToDefaults('admin@storage.cl');
   */
  async resetToDefaults(updatedBy) {
    const defaults = {
      weekday_start: '08:30:00',  // Horario laboral L-V: 08:30-18:30 (NO enviar en este rango)
      weekday_end: '18:30:00',
      saturday_start: '08:30:00',  // Horario laboral Sábado: 08:30-14:30 (NO enviar en este rango)
      saturday_end: '14:30:00',
      sunday_start: '23:59:59',   // start >= end = enviar todo el domingo (nunca en horario laboral)
      sunday_end: '00:00:00',
      respect_holidays: 'true'    // true = enviar en feriados (todo el día)
    };

    return await this.updateMultipleConfigs(defaults, updatedBy);
  }
}

// Export singleton instance
module.exports = new AlertScheduleConfigService();
