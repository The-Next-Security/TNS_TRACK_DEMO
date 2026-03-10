// src/services/alertScheduleService.js

/**
 * @file alertScheduleService.js
 * @description Frontend API client for alert schedule configuration management
 * @author Claude
 * @date 2025-10-21
 *
 * Feature: 002-configurable-alert-schedules
 * Issue: https://github.com/TNSTRACK/servicios/issues/19
 *
 * Client-side service for managing global alert schedule configuration.
 * Provides methods to fetch, update, validate, and reset alert schedule parameters.
 */

import axios from 'axios';

const API_BASE_URL = '/api/config';

/**
 * Service for managing alert schedule configuration
 */
export const alertScheduleService = {
  /**
   * Get current alert schedule configuration
   *
   * @returns {Promise<Object>} Configuration object with schedule parameters
   * @throws {Error} If API request fails
   *
   * @example
   * const config = await alertScheduleService.getConfig();
   * console.log(config.weekday_start); // "08:30:00"
   */
  getConfig: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/alert-schedules`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to load configuration');
      }

      return response.data.data;
    } catch (error) {
      console.error('[AlertScheduleService] Error fetching configuration:', error);

      // Re-throw with enhanced error message
      if (error.response?.status === 401) {
        throw new Error('No autenticado. Por favor inicie sesión.');
      } else if (error.response?.status === 403) {
        throw new Error('No tiene permisos para ver esta configuración.');
      } else if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      } else {
        throw new Error('Error al cargar la configuración de horarios');
      }
    }
  },

  /**
   * Update alert schedule configuration
   *
   * Supports partial updates - you can update one or more parameters.
   * Requires admin privileges.
   *
   * @param {Object} updates - Configuration updates
   * @param {string} [updates.weekday_start] - Weekday start time (HH:mm:ss)
   * @param {string} [updates.weekday_end] - Weekday end time (HH:mm:ss)
   * @param {string} [updates.saturday_start] - Saturday start time (HH:mm:ss)
   * @param {string} [updates.saturday_end] - Saturday end time (HH:mm:ss)
   * @param {boolean|string} [updates.respect_holidays] - Respect Chilean holidays
   * @returns {Promise<Object>} Updated configuration
   * @throws {Error} If validation fails or API request fails
   *
   * @example
   * const updated = await alertScheduleService.updateConfig({
   *   weekday_start: "09:00:00",
   *   weekday_end: "17:00:00"
   * });
   */
  updateConfig: async (updates) => {
    try {
      // Client-side validation before sending
      const validation = await alertScheduleService.validateConfig(updates);

      if (!validation.valid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        throw new Error(`Validación falló: ${errorMessage}`);
      }

      const response = await axios.post(`${API_BASE_URL}/alert-schedules`, updates);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to update configuration');
      }

      return response.data.data;
    } catch (error) {
      console.error('[AlertScheduleService] Error updating configuration:', error);

      // Re-throw with enhanced error message
      if (error.response?.status === 401) {
        throw new Error('No autenticado. Por favor inicie sesión.');
      } else if (error.response?.status === 403) {
        throw new Error('No tiene permisos de administrador para modificar esta configuración.');
      } else if (error.response?.status === 400) {
        const serverError = error.response.data.error;
        throw new Error(serverError?.message || 'Datos de configuración inválidos');
      } else if (error.message.startsWith('Validación falló:')) {
        throw error; // Re-throw validation errors as-is
      } else if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      } else {
        throw new Error('Error al actualizar la configuración de horarios');
      }
    }
  },

  /**
   * Validate configuration without persisting changes
   *
   * Performs server-side validation to check if configuration is valid.
   * Useful for real-time validation in forms.
   *
   * @param {Object} config - Configuration to validate
   * @returns {Promise<Object>} Validation result { valid: boolean, errors: Array }
   * @throws {Error} If API request fails
   *
   * @example
   * const result = await alertScheduleService.validateConfig({
   *   weekday_start: "25:00:00" // Invalid
   * });
   * if (!result.valid) {
   *   console.log(result.errors[0].message);
   * }
   */
  validateConfig: async (config) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/alert-schedules/validate`, config);

      if (!response.data.success) {
        throw new Error('Validation request failed');
      }

      return {
        valid: response.data.valid,
        errors: response.data.errors || []
      };
    } catch (error) {
      console.error('[AlertScheduleService] Error validating configuration:', error);

      // For validation endpoint, we still want to return a structure even on error
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('No tiene permisos para validar esta configuración.');
      }

      // Return validation failure for other errors
      return {
        valid: false,
        errors: [{
          field: 'general',
          code: 'VALIDATION_ERROR',
          message: 'Error al validar la configuración'
        }]
      };
    }
  },

  /**
   * Reset configuration to default values
   *
   * Resets all schedule parameters to system defaults:
   * - Weekday hours: 08:30 - 18:30
   * - Saturday hours: 08:30 - 14:30
   * - Respect holidays: true
   *
   * Requires admin privileges.
   *
   * @returns {Promise<Object>} Reset configuration with default values
   * @throws {Error} If API request fails
   *
   * @example
   * const defaults = await alertScheduleService.resetToDefaults();
   */
  resetToDefaults: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/alert-schedules/reset`);

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to reset configuration');
      }

      return response.data.data;
    } catch (error) {
      console.error('[AlertScheduleService] Error resetting configuration:', error);

      // Re-throw with enhanced error message
      if (error.response?.status === 401) {
        throw new Error('No autenticado. Por favor inicie sesión.');
      } else if (error.response?.status === 403) {
        throw new Error('No tiene permisos de administrador para restablecer esta configuración.');
      } else if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      } else {
        throw new Error('Error al restablecer la configuración a valores por defecto');
      }
    }
  },

  /**
   * Get default configuration values (client-side only)
   *
   * Returns the hardcoded default values without making an API call.
   * Useful for form initialization or comparison.
   *
   * @returns {Object} Default configuration
   */
  getDefaults: () => {
    return {
      weekday_start: '08:30:00',  // Horario laboral L-V (NO enviar)
      weekday_end: '18:30:00',
      saturday_start: '08:30:00',  // Horario laboral Sábado (NO enviar)
      saturday_end: '14:30:00',
      sunday_start: '23:59:59',   // start >= end = enviar todo el domingo
      sunday_end: '00:00:00',
      respect_holidays: 'true'
    };
  },

  /**
   * Check if current configuration differs from defaults
   *
   * @param {Object} currentConfig - Current configuration to compare
   * @returns {boolean} True if configuration has been modified from defaults
   */
  isModified: (currentConfig) => {
    const defaults = alertScheduleService.getDefaults();

    return (
      currentConfig.weekday_start !== defaults.weekday_start ||
      currentConfig.weekday_end !== defaults.weekday_end ||
      currentConfig.saturday_start !== defaults.saturday_start ||
      currentConfig.saturday_end !== defaults.saturday_end ||
      currentConfig.sunday_start !== defaults.sunday_start ||
      currentConfig.sunday_end !== defaults.sunday_end ||
      currentConfig.respect_holidays !== defaults.respect_holidays
    );
  },

  /**
   * Format time string for display
   *
   * Converts HH:mm:ss to HH:mm format for user-friendly display.
   *
   * @param {string} timeStr - Time in HH:mm:ss format
   * @returns {string} Time in HH:mm format
   */
  formatTimeForDisplay: (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    return `${parts[0]}:${parts[1]}`;
  },

  /**
   * Format time string for API
   *
   * Converts HH:mm to HH:mm:ss format for API submission.
   *
   * @param {string} timeStr - Time in HH:mm format
   * @returns {string} Time in HH:mm:ss format
   */
  formatTimeForAPI: (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.split(':').length === 3) return timeStr; // Already in HH:mm:ss format
    return `${timeStr}:00`;
  }
};

export default alertScheduleService;
