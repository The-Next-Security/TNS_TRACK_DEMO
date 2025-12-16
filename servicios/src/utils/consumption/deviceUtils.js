// src/utils/consumption/deviceUtils.js - Ajustado para Rutas Integradas
import axios from "axios";
import { toast } from "react-toastify";

// Constantes para localStorage
const STORAGE_KEY = "selectedDeviceId";
const STORAGE_EXPIRY_KEY = "selectedDeviceId_expiry";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milliseconds

// Cache para dispositivos activos
let devicesCache = null;
let devicesCacheExpiry = null;

/**
 * Clase principal para gestión de dispositivos
 */
class DeviceUtils {
  /**
   * Obtiene todos los dispositivos activos desde la API
   * @returns {Promise<Array>} Array de dispositivos activos
   */
  static async getActiveDevices() {
    try {
      // Verificar cache válido
      if (
        devicesCache &&
        devicesCacheExpiry &&
        Date.now() < devicesCacheExpiry
      ) {
        return devicesCache;
      }

      const response = await axios.get("/api/devices/active");

      if (!response.data || !response.data.success) {
        throw new Error("Respuesta inválida del servidor");
      }

      const devices = response.data.data || [];

      // Validar estructura de dispositivos
      const validDevices = devices.filter(
        (device) =>
          device.shelly_id && device.ubicacion_nombre && device.activo === 1
      );

      if (validDevices.length === 0) {
        throw new Error("No hay dispositivos activos disponibles");
      }

      // Actualizar cache
      devicesCache = validDevices;
      devicesCacheExpiry = Date.now() + CACHE_DURATION;

      return validDevices;
    } catch (error) {
      console.error("Error obteniendo dispositivos activos:", error);

      // Si hay cache disponible aunque esté expirado, usarlo como fallback
      if (devicesCache && devicesCache.length > 0) {
        console.warn("Usando cache expirado como fallback");
        toast.warning("Datos de dispositivos desde cache. Verifique conexión.");
        return devicesCache;
      }

      throw new Error(`Error al cargar dispositivos: ${error.message}`);
    }
  }

  /**
   * Obtiene un dispositivo específico por ID
   * @param {string} deviceId - ID del dispositivo
   * @returns {Promise<Object|null>} Datos del dispositivo o null si no existe
   */
  static async getDeviceById(deviceId) {
    if (!deviceId) {
      return null;
    }

    try {
      const devices = await this.getActiveDevices();
      return devices.find((device) => device.shelly_id === deviceId) || null;
    } catch (error) {
      console.error("Error obteniendo dispositivo por ID:", error);
      return null;
    }
  }

  /**
   * Guarda el ID del dispositivo seleccionado en localStorage
   * @param {string} deviceId - ID del dispositivo a guardar
   */
  static saveSelectedDevice(deviceId) {
    if (!deviceId) {
      console.warn("deviceId vacío, no se puede guardar");
      return;
    }

    try {
      const expiryTime = Date.now() + CACHE_DURATION;

      localStorage.setItem(STORAGE_KEY, deviceId);
      localStorage.setItem(STORAGE_EXPIRY_KEY, expiryTime.toString());

      console.log(`Dispositivo ${deviceId} guardado en localStorage`);
    } catch (error) {
      console.error("Error guardando dispositivo en localStorage:", error);
      // No lanzar error, el sistema puede funcionar sin persistencia
    }
  }

  /**
   * Obtiene el ID del dispositivo seleccionado desde localStorage
   * @returns {string|null} ID del dispositivo o null si no hay/expiró
   */
  static getSavedDevice() {
    try {
      const savedDeviceId = localStorage.getItem(STORAGE_KEY);
      const expiryTime = localStorage.getItem(STORAGE_EXPIRY_KEY);

      if (!savedDeviceId || !expiryTime) {
        return null;
      }

      // Verificar si no ha expirado
      if (Date.now() > parseInt(expiryTime)) {
        console.log("Dispositivo guardado expirado, limpiando localStorage");
        this.clearSavedDevice();
        return null;
      }

      return savedDeviceId;
    } catch (error) {
      console.error("Error obteniendo dispositivo desde localStorage:", error);
      return null;
    }
  }

  /**
   * Limpia el dispositivo guardado del localStorage
   */
  static clearSavedDevice() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_EXPIRY_KEY);
      console.log("Dispositivo guardado limpiado del localStorage");
    } catch (error) {
      console.error("Error limpiando localStorage:", error);
    }
  }

  /**
   * Obtiene el dispositivo a usar (guardado o primer disponible)
   * @returns {Promise<Object>} Dispositivo seleccionado
   */
  static async getCurrentDevice() {
    try {
      const devices = await this.getActiveDevices();

      if (devices.length === 0) {
        throw new Error("No hay dispositivos activos disponibles");
      }

      // Intentar usar dispositivo guardado
      const savedDeviceId = this.getSavedDevice();

      if (savedDeviceId) {
        const savedDevice = devices.find(
          (device) => device.shelly_id === savedDeviceId
        );

        if (savedDevice) {
          return savedDevice;
        } else {
          // Dispositivo guardado no existe más
          console.warn(
            `Dispositivo guardado ${savedDeviceId} ya no está activo`
          );
          this.clearSavedDevice();

          toast.info(
            `El dispositivo seleccionado anteriormente ya no está disponible. Seleccionado: ${devices[0].ubicacion_nombre}`,
            { autoClose: 5000 }
          );
        }
      }

      // Usar primer dispositivo disponible
      const firstDevice = devices[0];
      this.saveSelectedDevice(firstDevice.shelly_id);

      return firstDevice;
    } catch (error) {
      console.error("Error obteniendo dispositivo actual:", error);
      throw error;
    }
  }

  /**
   * Valida si un dispositivo ID es válido y activo
   * @param {string} deviceId - ID del dispositivo a validar
   * @returns {Promise<boolean>} true si es válido y activo
   */
  static async validateDevice(deviceId) {
    if (!deviceId) {
      return false;
    }

    try {
      const device = await this.getDeviceById(deviceId);
      return device !== null;
    } catch (error) {
      console.error("Error validando dispositivo:", error);
      return false;
    }
  }

  /**
   * Cambia el dispositivo seleccionado
   * @param {string} newDeviceId - ID del nuevo dispositivo
   * @returns {Promise<Object>} Datos del nuevo dispositivo seleccionado
   */
  static async changeSelectedDevice(newDeviceId) {
    if (!newDeviceId) {
      throw new Error("ID de dispositivo requerido");
    }

    try {
      const device = await this.getDeviceById(newDeviceId);

      if (!device) {
        throw new Error(`Dispositivo ${newDeviceId} no encontrado o inactivo`);
      }

      this.saveSelectedDevice(newDeviceId);

      console.log(
        `Dispositivo cambiado a: ${device.ubicacion_nombre} (${newDeviceId})`
      );

      return device;
    } catch (error) {
      console.error("Error cambiando dispositivo:", error);
      throw error;
    }
  }

  /**
   * Fuerza la recarga del cache de dispositivos
   * @returns {Promise<Array>} Dispositivos activos actualizados
   */
  static async refreshDevicesCache() {
    devicesCache = null;
    devicesCacheExpiry = null;

    console.log("Cache de dispositivos limpiado, recargando...");

    return await this.getActiveDevices();
  }

  /**
   * Obtiene estadísticas del sistema de dispositivos
   * @returns {Object} Estadísticas del cache y localStorage
   */
  static getSystemStats() {
    return {
      cache: {
        hasCache: devicesCache !== null,
        deviceCount: devicesCache ? devicesCache.length : 0,
        isExpired: devicesCacheExpiry ? Date.now() > devicesCacheExpiry : true,
        expiryTime: devicesCacheExpiry
          ? new Date(devicesCacheExpiry).toISOString()
          : null,
      },
      localStorage: {
        hasSavedDevice: this.getSavedDevice() !== null,
        savedDeviceId: this.getSavedDevice(),
        isStorageAvailable: typeof Storage !== "undefined",
      },
    };
  }
}

export default DeviceUtils;
