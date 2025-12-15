// src/services/presetService.js

/**
 * @file presetService.js
 * @description Servicio frontend para gestión de presets de temperatura
 * @author Backend Architect Expert
 * @date 2025-10-19
 *
 * Cliente API para comunicarse con el backend de presets de temperatura.
 * Reemplaza el sistema de localStorage con llamadas REST a la base de datos.
 */

import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Servicio para gestionar presets de temperatura
 */
export const presetService = {
  /**
   * Obtiene todos los presets activos
   * @returns {Promise<Array>} Lista de presets
   */
  getAllPresets: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/presets`);
      return response.data.presets || [];
    } catch (error) {
      console.error('Error obteniendo presets:', error);
      throw error;
    }
  },

  /**
   * Obtiene un preset específico por ID
   * @param {number} id - ID del preset
   * @returns {Promise<Object>} Preset
   */
  getPresetById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/presets/${id}`);
      return response.data.preset;
    } catch (error) {
      console.error(`Error obteniendo preset ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crea un nuevo preset
   * @param {Object} presetData - Datos del preset
   * @param {string} presetData.name - Nombre
   * @param {number} presetData.min - Temperatura mínima
   * @param {number} presetData.max - Temperatura máxima
   * @param {string} presetData.color - Color gradiente
   * @param {string} presetData.icon - Ícono
   * @param {string} presetData.description - Descripción
   * @returns {Promise<Object>} Preset creado
   */
  createPreset: async (presetData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/presets`, {
        ...presetData,
        createdBy: 'WEB_APP' // Identificador de la aplicación web
      });
      return response.data.preset;
    } catch (error) {
      console.error('Error creando preset:', error);
      // Extraer mensaje de error del backend si está disponible
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  },

  /**
   * Actualiza un preset existente
   * @param {number} id - ID del preset
   * @param {Object} presetData - Datos a actualizar
   * @returns {Promise<Object>} Preset actualizado
   */
  updatePreset: async (id, presetData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/presets/${id}`, {
        ...presetData,
        updatedBy: 'WEB_APP'
      });
      return response.data.preset;
    } catch (error) {
      console.error(`Error actualizando preset ${id}:`, error);
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  },

  /**
   * Elimina un preset
   * @param {number} id - ID del preset
   * @returns {Promise<void>}
   */
  deletePreset: async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/presets/${id}`);
    } catch (error) {
      console.error(`Error eliminando preset ${id}:`, error);
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  },

  /**
   * Restaura los presets a valores por defecto
   * @returns {Promise<Object>} Resultado de la operación
   */
  restoreDefaults: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/presets/restore-defaults`, {
        restoredBy: 'WEB_APP'
      });
      return response.data;
    } catch (error) {
      console.error('Error restaurando presets por defecto:', error);
      throw error;
    }
  },

  /**
   * Aplica un preset a múltiples cámaras
   * @param {number} presetId - ID del preset
   * @param {Array<string>} cameraIds - Array de IDs de cámaras
   * @returns {Promise<Object>} Resultado de la operación
   */
  applyToMultipleCameras: async (presetId, cameraIds) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/presets/${presetId}/apply-to-cameras`,
        {
          cameraIds,
          appliedBy: 'WEB_APP'
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error aplicando preset ${presetId} a cámaras:`, error);
      const errorMessage = error.response?.data?.error || error.message;
      throw new Error(errorMessage);
    }
  },

  /**
   * Obtiene estadísticas de uso de presets
   * @returns {Promise<Array>} Estadísticas de uso
   */
  getPresetUsage: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/presets/usage`);
      return response.data.usage || [];
    } catch (error) {
      console.error('Error obteniendo uso de presets:', error);
      throw error;
    }
  },

  /**
   * Migra presets desde localStorage a la base de datos
   * Solo se ejecuta una vez durante la transición
   * @returns {Promise<number>} Cantidad de presets migrados
   */
  migrateFromLocalStorage: async () => {
    try {
      const localPresets = localStorage.getItem('temperaturePresets');

      if (!localPresets) {
        console.log('No hay presets en localStorage para migrar');
        return 0;
      }

      const parsedPresets = JSON.parse(localPresets);
      let migrated = 0;

      for (const preset of parsedPresets) {
        // Solo migrar presets personalizados (no los defaults)
        if (preset.id && !preset.id.startsWith('group')) {
          try {
            await presetService.createPreset({
              name: preset.name,
              min: preset.min,
              max: preset.max,
              color: preset.color,
              icon: preset.icon,
              description: preset.description
            });
            migrated++;
          } catch (error) {
            // Si ya existe, continuar con el siguiente
            console.warn(`Preset "${preset.name}" ya existe o error al migrar:`, error.message);
          }
        }
      }

      // Limpiar localStorage después de migración exitosa
      if (migrated > 0) {
        localStorage.removeItem('temperaturePresets');
        console.log(`Migración completada: ${migrated} preset(s) migrado(s) a la base de datos`);
      }

      return migrated;
    } catch (error) {
      console.error('Error durante la migración desde localStorage:', error);
      throw error;
    }
  }
};

export default presetService;
