// src/services/electricDashboardService.js
const databaseService = require("./database_Service");

/**
 * Servicio optimizado para el Dashboard Eléctrico
 * Maneja consultas unificadas y cache para máximo rendimiento
 */
class ElectricDashboardService {
  constructor() {
    // Cache en memoria con TTL de 30 segundos para máxima velocidad
    this.cache = new Map();
    this.CACHE_TTL = 30000; // 30 segundos
    this.CACHE_KEY = "electric_dashboard_summary";
    this.CONFIG_CACHE_KEY = "config_last_update";

    // Umbrales predeterminados para categorización (fallback basados en los datos reales)
    this.defaultThresholds = {
      limiteApagado: 500, // Basado en LIMITE APAGADO
      cuartilBajo: 4125.84, // Basado en CONSUMO BAJO del grupo General
      cuartilMedio: 4607.51, // Basado en CONSUMO MEDIO del grupo General
      cuartilAlto: 4972.31, // Basado en CONSUMO ALTO del grupo General
    };

    // Solo enviar el número de categoría, no la ruta del icono
    // El frontend manejará los imports de las imágenes
    this.iconPaths = null; // No necesitamos rutas en el backend
  }

  /**
   * Obtiene el resumen completo del dashboard eléctrico
   * @returns {Object} Datos procesados para el frontend
   */
  async getElectricSummary() {
    try {
      // Verificar cache inteligente primero
      const cached = await this.getCachedData();
      if (cached) {
        console.log("[ElectricDashboardService] Usando datos del cache");
        return {
          success: true,
          data: cached.data,
          timestamp: new Date().toISOString(),
          cached: true,
        };
      }

      console.log("[ElectricDashboardService] Obteniendo datos frescos...");

      // Obtener datos de dispositivos con mediciones más recientes
      const devices = await this.getDevicesWithLatestMeasurements();

      if (!devices || devices.length === 0) {
        return {
          success: true,
          data: [],
          timestamp: new Date().toISOString(),
          cached: false,
          message: "No hay dispositivos disponibles",
        };
      }

      // Obtener umbrales de categorización
      const thresholds = await this.getThresholds();

      // Procesar datos para el frontend
      const processedData = await Promise.all(
        devices.map((device) => this.processDevice(device, thresholds))
      );

      // Cachear resultado con cache inteligente
      await this.setCachedData(processedData);

      return {
        success: true,
        data: processedData,
        timestamp: new Date().toISOString(),
        cached: false,
      };
    } catch (error) {
      console.error("[ElectricDashboardService] Error:", error);
      throw error;
    }
  }

  /**
   * Obtiene dispositivos con sus mediciones más recientes en una sola consulta optimizada
   * Incluye el grupo_id para categorización directa
   */
  async getDevicesWithLatestMeasurements() {
    const query = `
      SELECT 
        d.shelly_id as deviceId,
        d.nombre as deviceName,
        cur.nombre_ubicacion as location,
        d.grupo_id,
        sg.nombre as groupName,
        COALESCE(latest.potencia_activa, 0) as activePower,
        latest.timestamp_local as lastUpdate,
        d.activo,
        CASE 
          WHEN latest.timestamp_local IS NULL THEN 'disconnected'
          WHEN latest.timestamp_local > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'connected'
          WHEN latest.timestamp_local > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'intermittent'
          ELSE 'disconnected'
        END as status
      FROM sem_dispositivos d
      JOIN gen_ubicaciones_reales cur ON d.id_ubicacion_real = cur.id_ubicacion_real -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales
      LEFT JOIN sem_grupos sg ON d.grupo_id = sg.id
      LEFT JOIN (
        SELECT 
          m1.shelly_id,
          m1.potencia_activa,
          m1.timestamp_local
        FROM sem_mediciones m1
        INNER JOIN (
          SELECT 
            shelly_id, 
            MAX(timestamp_local) as max_timestamp
          FROM sem_mediciones 
          WHERE timestamp_local > DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND fase = 'TOTAL'
          GROUP BY shelly_id
        ) m2 ON m1.shelly_id = m2.shelly_id AND m1.timestamp_local = m2.max_timestamp
        WHERE m1.fase = 'TOTAL'
      ) latest ON d.shelly_id = latest.shelly_id
      WHERE d.activo = 1
      ORDER BY 
        CASE 
          WHEN cur.nombre_ubicacion LIKE 'Cámara%' THEN 1
          WHEN cur.nombre_ubicacion LIKE 'Reefer%' THEN 2
          ELSE 3
        END,
        cur.nombre_ubicacion ASC, 
        d.nombre ASC
    `;

    try {
      const [rows] = await databaseService.pool.query(query);
      console.log(
        `[ElectricDashboardService] Obtenidos ${
          rows?.length || 0
        } dispositivos activos de la base de datos`
      );

      // Log de dispositivos por estado
      if (rows && rows.length > 0) {
        const statusCount = rows.reduce((acc, row) => {
          acc[row.status] = (acc[row.status] || 0) + 1;
          return acc;
        }, {});
        console.log(
          "[ElectricDashboardService] Estado de dispositivos:",
          statusCount
        );
      }

      return rows;
    } catch (error) {
      console.error(
        "[ElectricDashboardService] Error en consulta de dispositivos:",
        error
      );
      throw error;
    }
  }

  /**
   * Obtiene los umbrales de categorización desde sem_configuracion y sem_tipos_parametros
   * Maneja rangos de validez temporal de los valores
   */
  async getThresholds() {
    try {
      const query = `
        SELECT 
          stp.nombre as parametro_nombre,
          sc.valor as parametro_valor,
          sc.valido_desde,
          sc.valido_hasta,
          sc.fecha_actualizacion
        FROM sem_configuracion sc
        JOIN sem_tipos_parametros stp ON sc.tipo_parametro_id = stp.id
        WHERE sc.activo = 1 
        AND stp.nombre IN ('LIMITE APAGADO', 'CONSUMO BAJO', 'CONSUMO MEDIO', 'CONSUMO ALTO')
        AND sc.valido_desde <= NOW()
        AND (sc.valido_hasta IS NULL OR sc.valido_hasta > NOW())
        ORDER BY stp.nombre, sc.valido_desde DESC
      `;

      const [rows] = await databaseService.pool.query(query);

      if (!rows || rows.length === 0) {
        console.warn(
          "[ElectricDashboardService] No se encontraron umbrales válidos, usando valores por defecto"
        );
        return { 1: this.defaultThresholds };
      }

      console.log(
        `[ElectricDashboardService] Encontrados ${rows.length} registros de configuración válidos`
      );

      // Procesar los valores obtenidos, tomando el más reciente para cada parámetro
      const parametros = {};
      let limiteApagado = this.defaultThresholds.limiteApagado;

      // Agrupar por nombre de parámetro y tomar el más reciente válido
      const parametrosMasRecientes = {};
      rows.forEach((row) => {
        const nombre = row.parametro_nombre;
        const fechaActualizacion = new Date(row.fecha_actualizacion);

        if (
          !parametrosMasRecientes[nombre] ||
          new Date(parametrosMasRecientes[nombre].fecha_actualizacion) <
            fechaActualizacion
        ) {
          parametrosMasRecientes[nombre] = row;
        }
      });

      console.log(
        "[ElectricDashboardService] Parámetros más recientes:",
        Object.keys(parametrosMasRecientes)
      );

      // Procesar cada parámetro
      Object.values(parametrosMasRecientes).forEach((row) => {
        try {
          const nombre = row.parametro_nombre;
          const valor = row.parametro_valor;

          console.log(
            `[ElectricDashboardService] Procesando ${nombre}:`,
            valor
          );

          if (nombre === "LIMITE APAGADO") {
            limiteApagado =
              parseFloat(valor) || this.defaultThresholds.limiteApagado;
            console.log(
              `[ElectricDashboardService] Límite apagado establecido: ${limiteApagado}W`
            );
          } else if (nombre.startsWith("CONSUMO")) {
            // Los valores de consumo están en formato JSON con grupos
            let consumoData;
            try {
              consumoData =
                typeof valor === "string" ? JSON.parse(valor) : valor;
            } catch (jsonError) {
              console.error(
                `[ElectricDashboardService] Error parseando JSON para ${nombre}:`,
                jsonError
              );
              return; // Saltar este parámetro
            }

            if (!consumoData || typeof consumoData !== "object") {
              console.warn(
                `[ElectricDashboardService] Datos de consumo inválidos para ${nombre}`
              );
              return;
            }

            // Procesar cada grupo en el JSON
            Object.keys(consumoData).forEach((grupoId) => {
              const grupoData = consumoData[grupoId];

              if (!grupoData || typeof grupoData.valor === "undefined") {
                console.warn(
                  `[ElectricDashboardService] Datos de grupo inválidos para ${nombre}, grupo ${grupoId}`
                );
                return;
              }

              // Inicializar estructura del grupo si no existe
              if (!parametros[grupoId]) {
                parametros[grupoId] = {
                  limiteApagado: limiteApagado,
                  cuartilBajo: this.defaultThresholds.cuartilBajo,
                  cuartilMedio: this.defaultThresholds.cuartilMedio,
                  cuartilAlto: this.defaultThresholds.cuartilAlto,
                  nombreGrupo: grupoData.nombre_grupo || `Grupo ${grupoId}`,
                };
              }

              const valorNumerico = parseFloat(grupoData.valor);
              if (!isNaN(valorNumerico)) {
                switch (nombre) {
                  case "CONSUMO BAJO":
                    parametros[grupoId].cuartilBajo = valorNumerico;
                    console.log(
                      `[ElectricDashboardService] Grupo ${grupoId} - Cuartil bajo: ${valorNumerico}W`
                    );
                    break;
                  case "CONSUMO MEDIO":
                    parametros[grupoId].cuartilMedio = valorNumerico;
                    console.log(
                      `[ElectricDashboardService] Grupo ${grupoId} - Cuartil medio: ${valorNumerico}W`
                    );
                    break;
                  case "CONSUMO ALTO":
                    parametros[grupoId].cuartilAlto = valorNumerico;
                    console.log(
                      `[ElectricDashboardService] Grupo ${grupoId} - Cuartil alto: ${valorNumerico}W`
                    );
                    break;
                }
              } else {
                console.warn(
                  `[ElectricDashboardService] Valor numérico inválido para ${nombre}, grupo ${grupoId}:`,
                  grupoData.valor
                );
              }
            });
          }
        } catch (parseError) {
          console.error(
            "[ElectricDashboardService] Error procesando parámetro:",
            row.parametro_nombre,
            parseError
          );
        }
      });

      // Si no se encontraron grupos específicos, crear grupo por defecto
      if (Object.keys(parametros).length === 0) {
        console.warn(
          "[ElectricDashboardService] No se encontraron grupos específicos, creando grupo por defecto"
        );
        parametros[1] = {
          limiteApagado: limiteApagado,
          cuartilBajo: this.defaultThresholds.cuartilBajo,
          cuartilMedio: this.defaultThresholds.cuartilMedio,
          cuartilAlto: this.defaultThresholds.cuartilAlto,
          nombreGrupo: "General",
        };
      } else {
        // Aplicar límite apagado actualizado a todos los grupos
        Object.keys(parametros).forEach((grupoId) => {
          parametros[grupoId].limiteApagado = limiteApagado;
        });
      }

      // Validar la coherencia de los umbrales
      this.validateThresholds(parametros);

      console.log(
        "[ElectricDashboardService] Umbrales cargados:",
        Object.keys(parametros).length,
        "grupos"
      );
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[ElectricDashboardService] Umbrales detalle:",
          JSON.stringify(parametros, null, 2)
        );
      }

      return parametros;
    } catch (error) {
      console.error(
        "[ElectricDashboardService] Error obteniendo umbrales:",
        error
      );
      // Retornar umbrales por defecto en caso de error
      return { 1: this.defaultThresholds };
    }
  }

  /**
   * Procesa un dispositivo individual con toda la lógica de categorización
   */
  async processDevice(device, thresholds) {
    const {
      deviceId,
      deviceName,
      location,
      grupo_id,
      groupName,
      activePower,
      lastUpdate,
      status,
    } = device;

    // Categorizar el consumo usando el grupo_id del dispositivo
    const category = this.categorizeConsumption(
      activePower,
      thresholds,
      grupo_id
    );

    // Formatear valores para el frontend
    const powerKw = (activePower || 0) / 1000;
    const powerFormatted = powerKw.toFixed(1).padStart(5, " ");

    // Formatear fechas
    const formattedDates = this.formatDates(lastUpdate);

    // Log para debugging
    console.log(
      `[ElectricDashboardService] Dispositivo ${deviceId}: categoria=${category}, power=${activePower}W`
    );

    return {
      deviceId,
      deviceName,
      location,
      groupId: grupo_id,
      groupName: groupName || "Sin Grupo",
      powerKw: powerKw.toFixed(1),
      powerFormatted,
      category, // Solo enviar el número de categoría
      lastUpdate: formattedDates.desktop,
      lastUpdateMobile: formattedDates.mobile,
      status: status === "disconnected" ? "disconnected" : "connected",
      activePowerRaw: activePower || 0,
    };
  }

  /**
   * Categoriza el consumo basándose en los umbrales
   * Replica exactamente la lógica de consumoCategoriaService.categorizarConsumo
   */
  categorizeConsumption(activePower, thresholds, grupoId = 1) {
    try {
      // Convertir a números para asegurar comparaciones correctas
      const valorWatts = parseFloat(activePower) || 0;
      const grupoIdNum = parseInt(grupoId, 10) || 1;

      // Si el valor es 0 o no es un número válido, considerarlo como apagado directamente
      if (isNaN(valorWatts) || valorWatts === 0) {
        return 0; // Apagado
      }

      // Obtener umbrales para el grupo específico
      const groupThresholds =
        thresholds[grupoIdNum] || thresholds[1] || this.defaultThresholds;

      // Verificar si el dispositivo está apagado
      if (valorWatts <= groupThresholds.limiteApagado) {
        return 0; // Apagado
      }

      // Categorizar según los umbrales (replicando lógica original)
      if (valorWatts <= groupThresholds.cuartilBajo) {
        return 1; // Bajo consumo
      } else if (valorWatts <= groupThresholds.cuartilMedio) {
        return 2; // Consumo medio
      } else {
        return 3; // Consumo alto
      }
    } catch (error) {
      console.error(
        "[ElectricDashboardService] Error al categorizar consumo:",
        error
      );
      return 0; // En caso de error, devolver 0 como valor predeterminado
    }
  }

  /**
   * Formatea fechas para desktop y móvil
   */
  formatDates(timestamp) {
    if (!timestamp) {
      return {
        desktop: "Sin actualización",
        mobile: "Sin actualización",
      };
    }

    const date = new Date(timestamp);

    return {
      desktop: date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      mobile: date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  /**
   * Valida la coherencia de los umbrales obtenidos
   * @param {Object} thresholds - Umbrales por grupo
   */
  validateThresholds(thresholds) {
    Object.keys(thresholds).forEach((grupoId) => {
      const t = thresholds[grupoId];

      // Validar que los umbrales estén en orden ascendente
      if (t.cuartilBajo <= t.limiteApagado) {
        console.warn(
          `[ElectricDashboardService] Grupo ${grupoId}: cuartilBajo (${t.cuartilBajo}) debería ser mayor que limiteApagado (${t.limiteApagado})`
        );
      }

      if (t.cuartilMedio <= t.cuartilBajo) {
        console.warn(
          `[ElectricDashboardService] Grupo ${grupoId}: cuartilMedio (${t.cuartilMedio}) debería ser mayor que cuartilBajo (${t.cuartilBajo})`
        );
      }

      if (t.cuartilAlto <= t.cuartilMedio) {
        console.warn(
          `[ElectricDashboardService] Grupo ${grupoId}: cuartilAlto (${t.cuartilAlto}) debería ser mayor que cuartilMedio (${t.cuartilMedio})`
        );
      }

      // Validar que no hay valores negativos
      Object.keys(t).forEach((key) => {
        if (
          key !== "nombreGrupo" &&
          (typeof t[key] !== "number" || t[key] < 0)
        ) {
          console.warn(
            `[ElectricDashboardService] Grupo ${grupoId}: valor inválido para ${key}: ${t[key]}`
          );
        }
      });
    });
  }

  /**
   * Obtiene la fecha de la última actualización de configuración
   * Para invalidar cache cuando cambien los umbrales
   */
  async getLastConfigUpdate() {
    try {
      const query = `
        SELECT MAX(sc.fecha_actualizacion) as ultima_actualizacion
        FROM sem_configuracion sc
        JOIN sem_tipos_parametros stp ON sc.tipo_parametro_id = stp.id
        WHERE sc.activo = 1 
        AND stp.nombre IN ('LIMITE APAGADO', 'CONSUMO BAJO', 'CONSUMO MEDIO', 'CONSUMO ALTO')
        AND sc.valido_desde <= NOW()
        AND (sc.valido_hasta IS NULL OR sc.valido_hasta > NOW())
      `;

      const [rows] = await databaseService.pool.query(query);

      if (rows && rows.length > 0 && rows[0].ultima_actualizacion) {
        return new Date(rows[0].ultima_actualizacion);
      }

      return new Date(); // Si no hay datos, usar fecha actual
    } catch (error) {
      console.error(
        "[ElectricDashboardService] Error obteniendo última actualización:",
        error
      );
      return new Date();
    }
  }

  /**
   * Gestión de cache inteligente que se invalida cuando cambian las configuraciones
   */
  async getCachedData() {
    const cached = this.cache.get(this.CACHE_KEY);
    const cacheAge = cached
      ? Date.now() - cached.timestamp
      : this.CACHE_TTL + 1;

    // Si no hay cache o ha expirado por tiempo
    if (!cached || cacheAge >= this.CACHE_TTL) {
      return null;
    }

    // Verificar si las configuraciones han cambiado
    try {
      const lastConfigUpdate = await this.getLastConfigUpdate();
      const cachedConfigUpdate = this.cache.get(this.CONFIG_CACHE_KEY);

      // Si la configuración ha cambiado desde el último cache, invalidar
      if (
        !cachedConfigUpdate ||
        lastConfigUpdate > new Date(cachedConfigUpdate.timestamp)
      ) {
        console.log(
          "[ElectricDashboardService] Cache invalidado por cambio en configuración"
        );
        this.cache.delete(this.CACHE_KEY);
        this.cache.delete(this.CONFIG_CACHE_KEY);
        return null;
      }

      return cached;
    } catch (error) {
      console.error(
        "[ElectricDashboardService] Error verificando cache:",
        error
      );
      // En caso de error, usar cache por tiempo solamente
      return cached;
    }
  }

  async setCachedData(data) {
    try {
      // Cachear los datos
      this.cache.set(this.CACHE_KEY, {
        data,
        timestamp: Date.now(),
      });

      // Cachear la fecha de última actualización de configuración
      const lastConfigUpdate = await this.getLastConfigUpdate();
      this.cache.set(this.CONFIG_CACHE_KEY, {
        timestamp: lastConfigUpdate.toISOString(),
      });
    } catch (error) {
      console.error("[ElectricDashboardService] Error cacheando datos:", error);
      // Si falla el cache inteligente, usar cache simple
      this.cache.set(this.CACHE_KEY, {
        data,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats() {
    const cached = this.cache.get(this.CACHE_KEY);
    const configCache = this.cache.get(this.CONFIG_CACHE_KEY);

    return {
      hasCache: !!cached,
      cacheAge: cached ? Date.now() - cached.timestamp : 0,
      cacheTTL: this.CACHE_TTL,
      isValid: cached ? Date.now() - cached.timestamp < this.CACHE_TTL : false,
      configCacheTimestamp: configCache ? configCache.timestamp : null,
      hasConfigCache: !!configCache,
      intelligentCacheEnabled: true,
    };
  }

  /**
   * Limpia el cache (útil para invalidación manual)
   */
  clearCache() {
    this.cache.clear();
    console.log("[ElectricDashboardService] Cache limpiado");
  }

  /**
   * Obtiene todas las ubicaciones registradas en el sistema
   * Para generar placeholders dinámicamente
   */
  async getAllRegisteredLocations() {
    try {
      const query = `
        SELECT DISTINCT
          -- Migrado: catalogo_ubicaciones_reales → gen_ubicaciones_reales; nombre_ubicacion → nombre aliasado
          cur.nombre AS location,
          cur.id_ubicacion_real AS locationId,
          COUNT(d.shelly_id) as deviceCount,
          CASE
            WHEN cur.nombre LIKE 'Cámara%' THEN 'camera'
            WHEN cur.nombre LIKE 'Reefer%' THEN 'reefer'
            ELSE 'other'
          END as locationType
        FROM gen_ubicaciones_reales cur
        LEFT JOIN sem_dispositivos d ON cur.id_ubicacion_real = d.id_ubicacion_real
                                    AND d.activo = 1
        WHERE cur.nombre IS NOT NULL
        AND cur.nombre != ''
        GROUP BY cur.id_ubicacion_real, cur.nombre
        ORDER BY
          CASE
            WHEN cur.nombre LIKE 'Cámara%' THEN 1
            WHEN cur.nombre LIKE 'Reefer%' THEN 2
            ELSE 3
          END,
          cur.nombre ASC
      `;

      const [rows] = await databaseService.pool.query(query);

      const locations = rows.map((row) => ({
        location: row.location,
        locationId: row.locationId,
        type: row.locationType,
        hasDevices: row.deviceCount > 0,
        deviceCount: row.deviceCount,
      }));

      console.log(
        `[ElectricDashboardService] Encontradas ${locations.length} ubicaciones registradas`
      );

      return {
        locations,
        summary: {
          total: locations.length,
          withDevices: locations.filter((l) => l.hasDevices).length,
          cameras: locations.filter((l) => l.type === "camera").length,
          reefers: locations.filter((l) => l.type === "reefer").length,
          others: locations.filter((l) => l.type === "other").length,
        },
      };
    } catch (error) {
      console.error(
        "[ElectricDashboardService] Error obteniendo ubicaciones:",
        error
      );
      throw error;
    }
  }
}

module.exports = new ElectricDashboardService();
