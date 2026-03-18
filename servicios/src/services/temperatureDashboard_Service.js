// src/services/temperatureDashboardService.js
const databaseService = require("./database_Service");
const { DateTime } = require("luxon");

/**
 * Servicio optimizado para el Dashboard de Temperatura
 * Maneja consultas unificadas y cache para máximo rendimiento
 */
class TemperatureDashboardService {
  constructor() {
    // Cache en memoria con TTL de 30 segundos para máxima velocidad
    this.cache = new Map();
    this.CACHE_TTL = 30000; // 30 segundos
    this.CACHE_KEY = "temperature_dashboard_summary";
    this.DEVICE_MAPPING_CACHE_KEY = "device_name_mappings";

    // Cache de mapeos de nombres de dispositivos (se carga dinámicamente)
    this.deviceNameMappingsCache = null;
    this.mappingCacheTimestamp = 0;
    this.MAPPING_CACHE_TTL = 300000; // 5 minutos para el mapeo
  }

  /**
   * Obtiene el resumen completo del dashboard de temperatura
   * @returns {Object} Datos procesados para el frontend
   */
  async getTemperatureSummary() {
    try {
      // Verificar cache inteligente primero
      const cached = await this.getCachedData();
      if (cached) {
        console.log("[TemperatureDashboardService] Usando datos del cache");
        return {
          success: true,
          data: cached.data,
          timestamp: new Date().toISOString(),
          cached: true,
        };
      }

      console.log("[TemperatureDashboardService] Obteniendo datos frescos...");

      // Obtener datos de temperatura más recientes
      const temperatureDevices = await this.getLatestTemperatureData();

      if (!temperatureDevices || temperatureDevices.length === 0) {
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
          cached: false,
          message: "No hay dispositivos de temperatura disponibles",
        };
      }

      // Obtener categorías de consumo eléctrico en lote
      const devicesWithCategories = await this.enrichWithElectricCategories(
        temperatureDevices
      );

      // Procesar y formatear todos los datos
      const processedDevices = devicesWithCategories.map((device) =>
        this.processDeviceData(device)
      );

      // Guardar en cache
      this.setCachedData(processedDevices);

      console.log(
        `[TemperatureDashboardService] Procesados ${processedDevices.length} dispositivos`
      );

      return {
        success: true,
        data: processedDevices,
        timestamp: new Date().toISOString(),
        cached: false,
      };
    } catch (error) {
      console.error("[TemperatureDashboardService] Error general:", error);
      throw new Error(`Error en servicio de temperatura: ${error.message}`);
    }
  }

  /**
   * Obtiene los datos de temperatura más recientes de la base de datos
   * Usa la misma consulta que el controlador actual pero optimizada para las tablas correctas
   * @returns {Array} Array de dispositivos con sus últimas lecturas
   */
  async getLatestTemperatureData() {
    try {
      // Migrado: channels_ubibot → ubi_canal; sensor_readings_ubibot → ubi_lecturas_sensor
      // Aliases para compatibilidad con JS downstream (channel_id, name, external_temperature, etc.)
      const query = `
        SELECT
          c.canal_id AS channel_id,
          c.nombre AS name,
          s.temperatura_externa AS external_temperature,
          s.fecha_lectura_externa AS external_temperature_timestamp,
          (c.fuera_linea_desde IS NOT NULL) AS is_currently_out_of_range,
          c.activo AS esOperativa
        FROM ubi_canal c
        JOIN (
          SELECT id_canal, temperatura_externa, fecha_lectura_externa,
                 ROW_NUMBER() OVER (PARTITION BY id_canal ORDER BY fecha_lectura_externa DESC) AS rn
          FROM ubi_lecturas_sensor
          WHERE temperatura_externa IS NOT NULL
        ) s ON c.id_canal = s.id_canal
        WHERE s.rn = 1 AND c.activo = 1
        ORDER BY c.nombre
      `;

      const results = await databaseService.query(query);

      console.log(
        `[TemperatureDashboardService] Obtenidos ${results.length} dispositivos de temperatura`
      );

      return results;
    } catch (error) {
      console.error(
        "[TemperatureDashboardService] Error obteniendo datos de temperatura:",
        error
      );
      throw error;
    }
  }

  /**
   * Enriquece los datos de temperatura con categorías de consumo eléctrico
   * @param {Array} temperatureDevices - Dispositivos de temperatura
   * @returns {Array} Dispositivos enriquecidos con categorías
   */
  async enrichWithElectricCategories(temperatureDevices) {
    try {
      // Obtener mapeos de nombres dinámicamente
      const nameMappings = await this.getDeviceNameMappings();

      // Obtener datos eléctricos de una sola vez
      const electricData = await this.getElectricData();

      // Crear mapa de dispositivos eléctricos por nombre normalizado
      const electricMap = new Map();
      electricData.forEach((device) => {
        const normalizedName = this.normalizeForMatching(device.location);
        electricMap.set(normalizedName, device);
      });

      // Enriquecer cada dispositivo de temperatura
      const enrichedDevices = await Promise.all(
        temperatureDevices.map(async (tempDevice) => {
          const tempName = tempDevice.name?.toLowerCase().trim() || "";

          // Buscar mapeo específico primero
          let electricName = nameMappings[tempName];

          // Si no hay mapeo específico, usar normalización directa
          if (!electricName) {
            electricName = this.normalizeForMatching(tempName);
          }

          const electricDevice = electricMap.get(electricName);

          let category = 0; // Default: apagado

          if (electricDevice?.activePower) {
            try {
              category = await this.getElectricCategory(
                electricDevice.activePower,
                electricDevice.deviceId
              );
            } catch (error) {
              console.error(
                `Error obteniendo categoría para ${tempDevice.name}:`,
                error
              );
            }
          }

          return {
            ...tempDevice,
            category,
            electricPower: electricDevice?.activePower || 0,
            electricDeviceId: electricDevice?.deviceId || null,
            // Información de debug para desarrollo
            ...(process.env.NODE_ENV === "development" && {
              _debug: {
                tempName,
                mappedElectricName: electricName,
                foundElectricDevice: !!electricDevice,
              },
            }),
          };
        })
      );

      return enrichedDevices;
    } catch (error) {
      console.error(
        "[TemperatureDashboardService] Error enriqueciendo con categorías:",
        error
      );
      // Retornar datos sin categorías en caso de error
      return temperatureDevices.map((device) => ({ ...device, category: 0 }));
    }
  }

  /**
   * Obtiene datos eléctricos más recientes
   * Usa la API existente en lugar de consultar directamente la BD
   * @returns {Array} Datos eléctricos
   */
  async getElectricData() {
    try {
      // Usar la API existente /api/devices/latest-measurements
      const axios = require("axios");
      const response = await axios.get(
        `${
          process.env.API_BASE_URL || "http://localhost:3000"
        }/api/devices/latest-measurements`,
        {
          timeout: 10000,
        }
      );

      if (response.data?.success && Array.isArray(response.data.data)) {
        console.log(
          `[TemperatureDashboardService] Obtenidos ${response.data.data.length} dispositivos eléctricos via API`
        );

        // La API devuelve: { deviceId, location, activePower, lastUpdate }
        return response.data.data;
      }

      console.log(
        "[TemperatureDashboardService] No se obtuvieron datos eléctricos válidos"
      );
      return [];
    } catch (error) {
      console.error(
        "[TemperatureDashboardService] Error obteniendo datos eléctricos:",
        error
      );
      return []; // Retornar array vacío en caso de error
    }
  }

  /**
   * Obtiene la categoría de consumo eléctrico para un dispositivo
   * Usa las mismas rutas que ya existen: /api/devices/latest-measurements y /api/consumo/categoria
   * @param {number} activePower - Potencia activa en vatios
   * @param {string} deviceId - ID del dispositivo
   * @returns {number} Categoría (0=apagado, 1=bajo, 2=medio, 3=alto)
   */
  async getElectricCategory(activePower, deviceId) {
    try {
      // Hacer petición a la API existente de categorías
      const axios = require("axios");
      const response = await axios.get(
        `${
          process.env.API_BASE_URL || "http://localhost:3000"
        }/api/consumo/categoria`,
        {
          params: {
            valor: activePower,
            deviceId: deviceId,
          },
          timeout: 5000,
        }
      );

      if (
        response.data?.success &&
        response.data.data?.categoria !== undefined
      ) {
        return parseInt(response.data.data.categoria) || 0;
      }

      // Fallback: categorización genérica si no hay configuración específica
      return this.getCategoryByPowerRange(activePower);
    } catch (error) {
      console.error(
        `[TemperatureDashboardService] Error obteniendo categoría para deviceId ${deviceId}:`,
        error
      );
      return this.getCategoryByPowerRange(activePower);
    }
  }

  /**
   * Categorización genérica basada en rangos de potencia
   * @param {number} power - Potencia en vatios
   * @returns {number} Categoría
   */
  getCategoryByPowerRange(power) {
    if (power <= 500) return 0; // Apagado
    if (power <= 4125) return 1; // Bajo
    if (power <= 4607) return 2; // Medio
    return 3; // Alto
  }

  /**
   * Procesa y formatea los datos de un dispositivo individual
   * @param {Object} device - Datos del dispositivo
   * @returns {Object} Dispositivo procesado y formateado
   */
  processDeviceData(device) {
    const temperature = parseFloat(device.external_temperature) || 0;
    const timestamp = DateTime.fromISO(String(device.external_temperature_timestamp));
    const isOutOfRange = parseInt(device.is_currently_out_of_range) === 1;

    return {
      channelId: device.channel_id,
      name: device.name || "Sensor sin nombre",
      temperature: {
        value: temperature,
        formatted: this.formatTemperature(temperature),
        timestamp: device.external_temperature_timestamp,
        isOutOfRange: isOutOfRange,
      },
      category: device.category || 0,
      connectivity: {
        status: this.getConnectivityStatus(timestamp),
        lastSeen: timestamp.toISO(),
      },
      display: {
        lastUpdate: timestamp.toFormat("dd/MM/yyyy HH:mm"),
        lastUpdateMobile: timestamp.toFormat("dd/MM HH:mm"),
        temperatureColor: isOutOfRange ? "#ff0000" : "#00ff00",
      },
      metadata: {
        isOperational: parseInt(device.esOperativa) === 1,
        electricPower: device.electricPower || 0,
        electricDeviceId: device.electricDeviceId,
      },
    };
  }

  /**
   * Formatea la temperatura para el display de 7 segmentos
   * @param {number} temperature - Temperatura en grados
   * @returns {string} Temperatura formateada para display
   */
  formatTemperature(temperature) {
    const temp = Number(temperature);
    if (!Number.isFinite(temp)) return "  0.0";

    // Formatear con un decimal y rellenar con espacios para alineación
    const formatted = Math.abs(temp).toFixed(1);
    const sign = temp < 0 ? "-" : " ";

    return `${sign}${formatted.padStart(4, " ")}`;
  }

  /**
   * Determina el estado de conectividad basado en la última actualización
   * @param {DateTime} lastUpdate - DateTime de la última actualización
   * @returns {string} Estado de conectividad
   */
  getConnectivityStatus(lastUpdate) {
    const minutesAgo = DateTime.now().diff(lastUpdate, "minutes").minutes;

    if (minutesAgo <= 5) return "connected";
    if (minutesAgo <= 15) return "warning";
    return "disconnected";
  }

  /**
   * Obtiene los mapeos de nombres de dispositivos de la base de datos
   * Corregido para usar las tablas reales de temperatura vs electricidad
   * @returns {Object} Objeto con mapeos de nombres
   */
  async getDeviceNameMappings() {
    // Verificar si el cache es válido
    if (
      this.deviceNameMappingsCache &&
      Date.now() - this.mappingCacheTimestamp < this.MAPPING_CACHE_TTL
    ) {
      return this.deviceNameMappingsCache;
    }

    try {
      console.log(
        "[TemperatureDashboardService] Cargando mapeos de nombres desde BD..."
      );

      // Migrado: channels_ubibot → ubi_canal; catalogo_ubicaciones_reales → gen_ubicaciones_reales
      // (columna nombre en lugar de nombre_ubicacion; FK id_ubicacion_real en lugar de ubicacion_real)
      const tempNamesQuery = `
        SELECT DISTINCT
          LOWER(TRIM(c.nombre)) AS temp_name,
          LOWER(TRIM(cur.nombre)) AS temp_ubicacion_nombre
        FROM ubi_canal c
        INNER JOIN gen_ubicaciones_reales cur ON c.id_ubicacion_real = cur.id_ubicacion_real
        WHERE c.nombre IS NOT NULL
        AND c.nombre != ''
        AND c.activo = 1
      `;

      // Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales;
      // sem_dispositivos.ubicacion → sem_dispositivos.id_ubicacion_real
      const electricNamesQuery = `
        SELECT DISTINCT
          LOWER(TRIM(cur.nombre)) AS electric_name
        FROM gen_ubicaciones_reales cur
        INNER JOIN sem_dispositivos sd ON cur.id_ubicacion_real = sd.id_ubicacion_real
        INNER JOIN sem_mediciones sm ON sd.shelly_id = sm.shelly_id
        WHERE cur.nombre IS NOT NULL
        AND cur.nombre != ''
        AND sd.activo = 1
        AND sm.timestamp_local > DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND sm.fase = 'TOTAL'
        GROUP BY cur.nombre
      `;

      const [tempNames, electricNames] = await Promise.all([
        databaseService.query(tempNamesQuery),
        databaseService.query(electricNamesQuery),
      ]);

      // Crear mapeo automático basado en similitud de nombres
      const mappings = {};

      tempNames.forEach((tempRow) => {
        const tempName = tempRow.temp_name;
        const tempUbicacion = tempRow.temp_ubicacion_nombre;

        // Primero intentar mapear por ubicación real (más confiable)
        const exactLocationMatch = electricNames.find(
          (elecRow) => elecRow.electric_name === tempUbicacion
        );

        if (exactLocationMatch) {
          mappings[tempName] = exactLocationMatch.electric_name;
          return;
        }

        // Si no hay coincidencia por ubicación, buscar por nombre del dispositivo
        const exactNameMatch = electricNames.find(
          (elecRow) => elecRow.electric_name === tempName
        );

        if (exactNameMatch) {
          mappings[tempName] = exactNameMatch.electric_name;
          return;
        }

        // Buscar coincidencia por similitud (nombres normalizados)
        const normalizedTempName = this.normalizeForMatching(tempName);
        const normalizedTempUbicacion =
          this.normalizeForMatching(tempUbicacion);

        const similarMatch = electricNames.find((elecRow) => {
          const normalizedElecName = this.normalizeForMatching(
            elecRow.electric_name
          );

          // Verificar similitud con el nombre del dispositivo o con la ubicación
          return (
            this.areNamesSimilar(normalizedTempName, normalizedElecName) ||
            this.areNamesSimilar(normalizedTempUbicacion, normalizedElecName)
          );
        });

        if (similarMatch) {
          mappings[tempName] = similarMatch.electric_name;
        } else {
          // Si no hay coincidencia, mapear a la ubicación normalizada
          mappings[tempName] = normalizedTempUbicacion;
        }
      });

      // Guardar en cache
      this.deviceNameMappingsCache = mappings;
      this.mappingCacheTimestamp = Date.now();

      console.log(
        `[TemperatureDashboardService] Creados ${
          Object.keys(mappings).length
        } mapeos de nombres`
      );

      if (process.env.NODE_ENV === "development") {
        console.log("[TemperatureDashboardService] Mapeos creados:", mappings);
      }

      return mappings;
    } catch (error) {
      console.error(
        "[TemperatureDashboardService] Error cargando mapeos:",
        error
      );

      // Fallback: retornar cache anterior si existe
      if (this.deviceNameMappingsCache) {
        console.log(
          "[TemperatureDashboardService] Usando cache anterior por error"
        );
        return this.deviceNameMappingsCache;
      }

      // Último fallback: mapeo vacío
      return {};
    }
  }

  /**
   * Normaliza nombres para matching más flexible
   * @param {string} name - Nombre a normalizar
   * @returns {string} Nombre normalizado
   */
  normalizeForMatching(name) {
    if (!name) return "";

    return (
      name
        .toLowerCase()
        .trim()
        // Remover acentos y caracteres especiales
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // Reemplazar espacios y guiones por caracteres consistentes
        .replace(/[-_\s]+/g, " ")
        // Normalizar palabras comunes
        .replace(/camara/g, "camara")
        .replace(/fria/g, "fria")
        .replace(/congelador/g, "reefer")
        .replace(/principal/g, "a")
        .replace(/zona/g, "")
        .replace(/preparacion/g, "b")
        // Remover palabras no significativas
        .replace(/\b(de|del|la|el|y|)\b/g, " ")
        // Limpiar espacios múltiples
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Determina si dos nombres normalizados son similares
   * @param {string} name1 - Primer nombre normalizado
   * @param {string} name2 - Segundo nombre normalizado
   * @returns {boolean} Si son similares
   */
  areNamesSimilar(name1, name2) {
    if (!name1 || !name2) return false;

    // Coincidencia exacta
    if (name1 === name2) return true;

    // Verificar si uno contiene al otro (para casos como "camara 1" vs "camara fria 1")
    if (name1.includes(name2) || name2.includes(name1)) return true;

    // Extraer números de ambos nombres
    const numbers1 = name1.match(/\d+/g) || [];
    const numbers2 = name2.match(/\d+/g) || [];

    // Si ambos tienen el mismo número, probablemente están relacionados
    if (numbers1.length > 0 && numbers2.length > 0) {
      const hasCommonNumber = numbers1.some((num) => numbers2.includes(num));
      if (hasCommonNumber) {
        // Verificar que también tengan palabras clave similares
        const words1 = name1
          .replace(/\d+/g, "")
          .split(" ")
          .filter((w) => w.length > 2);
        const words2 = name2
          .replace(/\d+/g, "")
          .split(" ")
          .filter((w) => w.length > 2);

        const hasCommonWords = words1.some((word) =>
          words2.some((w2) => word.includes(w2) || w2.includes(word))
        );

        return hasCommonWords;
      }
    }

    return false;
  }

  /**
   * Obtiene todos los canales registrados para placeholders
   * @returns {Array} Lista de canales
   */
  async getAllChannels() {
    try {
      // Migrado: channels_ubibot → ubi_canal; aliases para compatibilidad JS
      const query = `
        SELECT canal_id AS channel_id, nombre AS name, activo AS esOperativa
        FROM ubi_canal
        ORDER BY nombre
      `;

      const results = await databaseService.query(query);

      return results.map((channel) => ({
        channelId: channel.channel_id,
        name: channel.name,
        isOperational: parseInt(channel.esOperativa) === 1,
      }));
    } catch (error) {
      console.error(
        "[TemperatureDashboardService] Error obteniendo canales:",
        error
      );
      throw error;
    }
  }

  /**
   * Verifica si los datos en cache son válidos
   * @returns {Object|null} Datos del cache o null si no son válidos
   */
  getCachedData() {
    const cached = this.cache.get(this.CACHE_KEY);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }

    return null;
  }

  /**
   * Guarda datos en el cache
   * @param {Array} data - Datos a cachear
   */
  setCachedData(data) {
    this.cache.set(this.CACHE_KEY, {
      data: data,
      timestamp: Date.now(),
    });
  }

  /**
   * Obtiene estadísticas del cache (incluye cache de mapeos)
   * @returns {Object} Estadísticas del cache
   */
  getCacheStats() {
    const cached = this.cache.get(this.CACHE_KEY);

    return {
      hasCachedData: !!cached,
      cacheAge: cached ? Date.now() - cached.timestamp : 0,
      cacheTTL: this.CACHE_TTL,
      cacheSize: this.cache.size,
      isValid: !!this.getCachedData(),
      // Estadísticas del cache de mapeos
      mappings: {
        hasCachedMappings: !!this.deviceNameMappingsCache,
        mappingsAge: this.deviceNameMappingsCache
          ? Date.now() - this.mappingCacheTimestamp
          : 0,
        mappingsTTL: this.MAPPING_CACHE_TTL,
        mappingsCount: this.deviceNameMappingsCache
          ? Object.keys(this.deviceNameMappingsCache).length
          : 0,
        mappingsValid:
          this.deviceNameMappingsCache &&
          Date.now() - this.mappingCacheTimestamp < this.MAPPING_CACHE_TTL,
      },
    };
  }

  /**
   * Limpia el cache manualmente (incluye cache de mapeos)
   * @returns {Object} Resultado de la limpieza
   */
  clearCache() {
    const hadData = this.cache.has(this.CACHE_KEY);
    const hadMappings = !!this.deviceNameMappingsCache;

    this.cache.clear();
    this.deviceNameMappingsCache = null;
    this.mappingCacheTimestamp = 0;

    return {
      cleared: hadData,
      mappingsCleared: hadMappings,
      cacheSize: this.cache.size,
    };
  }
}

module.exports = new TemperatureDashboardService();
