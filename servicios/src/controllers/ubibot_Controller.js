// src/controllers/ubibotController.js

const { DateTime } = require("luxon");
const TZ_UBI = "America/Santiago";
const axios = require("axios");
const fs = require("fs").promises; // Usar promesas de fs
const path = require("path"); // <--- Importante: Añadido import de path
const config = require("../config/js_files/configLoader_Config");
const databaseService = require("../services/database_Service");
const WeeklyTemperatureAnalyzer = require("../utils/weeklyTemperatureAnalyzer_Utils");
const temperatureAnalyzer = require("../utils/temperatureAnalyzer_Utils"); // Asumo que este es el correcto para reportes diarios

class UbibotController {
  /**
   * Constructor. No usa config-loader aquí; la config se carga en init() tras configLoader.initialize().
   */
  constructor() {
    console.log("[UbibotController] Constructor: Creando instancia...");
    this._configInitialized = false;
  }

  /**
   * Inicializa la config de Ubibot desde config-loader. Debe llamarse desde server.js después de configLoader.initialize().
   * @throws {Error} Si falta account_key, token_file o no se puede resolver la ruta del token.
   */
  init() {
    if (this._configInitialized) {
      console.log("[UbibotController] init: ya inicializado, omitiendo.");
      return;
    }
    try {
      const { ubibot: ubibotConfig } = config.getConfig();

      const accountKeyValue = ubibotConfig?.account_key;
      if (!accountKeyValue || typeof accountKeyValue !== 'string' || accountKeyValue.trim() === '') {
        console.error("❌ [UbibotController] Configuración crítica faltante o vacía: ubibot.account_key");
        throw new Error("Falta account_key de Ubibot (o está vacía) en la configuración.");
      }
      this.accountKey = accountKeyValue.trim();

      const tokenFilePathValue = ubibotConfig?.token_file;
      if (!tokenFilePathValue || typeof tokenFilePathValue !== 'string' || tokenFilePathValue.trim() === '') {
        console.error("❌ [UbibotController] Configuración crítica faltante o vacía: ubibot.token_file");
        throw new Error("Falta token_file de Ubibot (o está vacía) en la configuración.");
      }
      this.relativeTokenFilePath = tokenFilePathValue;
      this.absoluteTokenFilePath = this.resolveTokenPath(this.relativeTokenFilePath);

      if (!this.absoluteTokenFilePath) {
        throw new Error("No se pudo determinar la ruta absoluta para el archivo de token Ubibot.");
      }

      this._configInitialized = true;
      console.log(`[UbibotController] Configuración Ubibot cargada (init).`);
      console.log(`  -> Account Key: ${this.accountKey.substring(0, 5)}... (verificada)`);
      console.log(`  -> Token Path (Relativo): ${this.relativeTokenFilePath}`);
      console.log(`  -> Token Path (Absoluto): ${this.absoluteTokenFilePath}`);
    } catch (error) {
      console.error("💥 [UbibotController] Error CRÍTICO en init():", error.message);
      throw error;
    }
  }

  /**
   * Asegura que init() se haya llamado. Lanzar error claro si no.
   * @private
   */
  _ensureConfig() {
    if (!this._configInitialized) {
      throw new Error(
        '[UbibotController] No inicializado. Debe llamarse init() después de configLoader.initialize() en server.js.'
      );
    }
  }

  /**
   * Resuelve la ruta absoluta del archivo de token basado en la ruta relativa de la config.
   * @param {string} relativePath - Ruta relativa desde la configuración (ej. "./src/config/token_id.txt").
   * @returns {string|null} - Ruta absoluta o null si falla o la ruta es inválida.
   * @private
   */
  resolveTokenPath(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') {
      console.error("[UbibotController] resolveTokenPath: Ruta relativa inválida o faltante.");
      return null;
    }
    try {
      // *** DECISIÓN IMPORTANTE: ¿La ruta es relativa a la raíz del proyecto o a este archivo? ***
      // Opción 1: Relativa a la RAÍZ DEL PROYECTO (donde se ejecuta 'node server.js')
      const resolvedPath = path.resolve(process.cwd(), relativePath);

      // Opción 2: Relativa a ESTE ARCHIVO (ubibotController.js en src/controllers)
      // const resolvedPath = path.resolve(__dirname, relativePath);

      // Elige la opción correcta descomentándola y comentando la otra.
      // Por defecto, se usa la relativa a la raíz del proyecto, que suele ser más común para archivos de config.

      return resolvedPath;
    } catch (error) {
      console.error(`[UbibotController] resolveTokenPath: Error resolviendo ruta "${relativePath}":`, error.message);
      return null; // Devolver null si hay error en la resolución
    }
  }

  /**
   * Obtiene un nuevo token de la API de Ubibot y lo guarda en el archivo configurado.
   * @returns {Promise<string|null>} El token ID si se genera y guarda (o solo genera) exitosamente, o null si falla.
   */
  async getNewToken() {
    this._ensureConfig();
    // Validar que accountKey existe
    if (!this.accountKey) {
      console.error("Ubibot: Falta accountKey para generar nuevo token.");
      return null;
    }
    // Validar que tenemos una ruta donde guardar
    if (!this.absoluteTokenFilePath) {
      console.error("Ubibot: Falta ruta absoluta del archivo para guardar nuevo token.");
      // Podríamos intentar generar el token pero no guardarlo, aunque es menos útil.
      // Por ahora, fallamos si no podemos guardar.
      return null;
    }

    try {
      const response = await axios.get(
        "https://webapi.ubibot.com/accounts/generate_access_token",
        { params: { account_key: this.accountKey }, timeout: 10000 } // Añadir timeout
      );

      // Verificar éxito y presencia del token_id
      if (response.data?.result === "success" && response.data.token_id) {
        const tokenId = response.data.token_id;
        console.log(`Ubibot: Nuevo token ID recibido (${tokenId.substring(0, 5)}...). Intentando guardar...`);

        // Intentar guardar el token en el archivo (usando la ruta absoluta)
        try {
          await fs.writeFile(this.absoluteTokenFilePath, tokenId, "utf8");
          console.log(`Ubibot: Token guardado exitosamente en ${this.absoluteTokenFilePath}`);
          return tokenId; // Devolver token tras guardar
        } catch (writeError) {
          // Error al guardar, pero el token se generó. Loguear y devolver el token.
          console.error(`Ubibot: Error al GUARDAR el token en ${this.absoluteTokenFilePath}:`, writeError.message);
          console.warn(`Ubibot: El token ${tokenId.substring(0, 5)}... se generó pero no se pudo guardar.`);
          return tokenId; // Devolver el token de todas formas para intentar usarlo
        }
      } else {
        // Manejar respuesta de error de la API
        const errorDetail = response.data?.reason || `Respuesta inesperada (status ${response.status}): ${JSON.stringify(response.data)}`;
        console.error(`Ubibot: Error al generar el token desde API: ${errorDetail}`);
        return null; // Falló la generación
      }
    } catch (error) {
      // Capturar errores de red/axios
      const errorMsg = error.response ? `Status ${error.response.status} - ${error.response.data}` : error.message;
      console.error(`Ubibot: Excepción en getNewToken: ${errorMsg}`);
      return null; // Indicar fallo
    }
  }

  /**
   * Lee el token desde el archivo configurado usando la ruta absoluta.
   * @returns {Promise<string|null>} El token leído o null si no se encuentra o hay error.
   */
  async readToken() {
    this._ensureConfig();
    // Validar que tenemos la ruta
    if (!this.absoluteTokenFilePath) {
      console.error("Ubibot: No se puede leer token, ruta absoluta no definida.");
      return null;
    }

    try {
      // Usar await con fs.promises.readFile
      const token = await fs.readFile(this.absoluteTokenFilePath, "utf8");
      const trimmedToken = token.trim();
      if (!trimmedToken) {
        console.warn(`Ubibot: Archivo de token (${this.absoluteTokenFilePath}) está vacío.`);
        return null;
      }

      return trimmedToken;
    } catch (error) {
      // Manejar específicamente el error "archivo no encontrado"
      if (error.code === 'ENOENT') {
        console.warn(`Ubibot: Archivo de token no encontrado en ${this.absoluteTokenFilePath}. Se intentará generar uno nuevo.`);
      } else {
        // Loguear otros errores de lectura
        console.error(`Ubibot: Error al leer el token desde ${this.absoluteTokenFilePath}:`, error.message);
      }
      return null; // Devolver null si no se puede leer
    }
  }


  /**
   * Valida si un token ID es aceptado por la API de Ubibot.
   * @param {string} tokenId - El token a validar.
   * @returns {Promise<boolean>} True si el token parece válido, false si no.
   */
  async isTokenValid(tokenId) {
    if (!tokenId || typeof tokenId !== 'string' || tokenId.trim() === '') {
      console.log("[UbibotController] isTokenValid: Token proporcionado es inválido o vacío.");
      return false;
    }
    const shortToken = tokenId.substring(0, 5) + '...'; // Para logs

    try {
      // Usar una llamada ligera como /channels con limit=1
      const response = await axios.get(`https://webapi.ubibot.com/channels`, {
        params: { token_id: tokenId, limit: 1 },
        timeout: 8000 // Timeout razonable para validación
      });
      // Asumir éxito si la respuesta es 200 y el result es 'success'
      const isValid = response.status === 200 && response.data?.result === "success";

      return isValid;
    } catch (error) {
      // Cualquier error (401, 403, timeout, red, etc.) significa que el token no es válido/utilizable
      const errorMsg = error.response ? `Status ${error.response.status}` : error.message;
      console.warn(`Ubibot: Error al validar token ${shortToken}: ${errorMsg}. Asumiendo inválido.`);
      return false;
    }
  }

  /**
   * Obtiene y asegura un token válido, leyéndolo del archivo o generando uno nuevo.
   * Es el método principal para obtener el token antes de cualquier llamada a la API.
   * @private
   * @returns {Promise<string|null>} Token válido o null si todo falla.
   */
  async _getValidToken() {

    let tokenId = await this.readToken(); // Intenta leer primero

    if (tokenId) {

      if (await this.isTokenValid(tokenId)) {

        return tokenId; // Perfecto, usar este
      } else {
        console.warn("[UbibotController] _getValidToken: Token leído del archivo es INVÁLIDO según la API.");
      }
    } else {
      console.log("[UbibotController] _getValidToken: No se pudo leer token del archivo (o estaba vacío/no existía).");
    }

    tokenId = await this.getNewToken(); // Intentar generar y guardar

    if (!tokenId) {
      console.error("❌ [UbibotController] _getValidToken: FALLO al generar nuevo token.");
      return null; // Falló la generación
    }

    if (await this.isTokenValid(tokenId)) {
      return tokenId; // Éxito
    } else {
      // Esto es grave, significa que la API Key podría ser incorrecta
      console.error("❌ [UbibotController] _getValidToken: ¡El token recién generado NO es válido! Verifica la accountKey en la configuración o el estado de la API de Ubibot.");
      return null; // Fallo incluso con nuevo token
    }
  }


  /**
   * Obtiene la lista de canales Ubibot filtrados según la configuración.
   * @returns {Promise<Array<Object>>} Lista de canales o array vacío si falla.
   */
  async getChannels() {

    const tokenId = await this._getValidToken(); // Obtener token válido

    if (!tokenId) {
      console.error("Ubibot: No se pudo obtener un token válido para getChannels. No se pueden listar canales.");
      return []; // Devolver array vacío si no hay token
    }


    try {
      const response = await axios.get("https://webapi.ubibot.com/channels", {
        params: { token_id: tokenId },
        timeout: 15000 // Timeout más largo para obtener datos
      });

      // Validar respuesta
      if (response.data?.result === "success" && Array.isArray(response.data.channels)) {
        const ubibotConfig = config.getConfig().ubibot; // Obtener config de nuevo por si cambió
        const excludedChannels = ubibotConfig?.excluded_channels || [];
        const filteredChannels = response.data.channels.filter(
          (channel) => !excludedChannels.includes(channel.channel_id?.toString()) // Comparar como strings por si acaso
        );

        return filteredChannels;
      } else {
        // Error en la respuesta de la API
        const errorDetail = response.data?.reason || `Respuesta inesperada en getChannels: ${JSON.stringify(response.data)}`;
        console.error(`Ubibot: Error al obtener los canales desde API: ${errorDetail}`);
        return []; // Devolver array vacío en caso de error de API
      }
    } catch (error) {
      // Error de red o timeout
      const errorMsg = error.response ? `Status ${error.response.status}` : error.message;
      console.error(`Ubibot: Excepción en getChannels: ${errorMsg}`);
      return []; // Devolver array vacío en caso de excepción
    }
  }

  /**
   * Obtiene datos detallados de un canal específico.
   * @param {string|number} channelId - ID del canal.
   * @returns {Promise<Object|null>} Datos del canal o null si falla.
   */
  async getChannelData(channelId) {
    console.log(`[UbibotController] getChannelData: Obteniendo datos para canal ${channelId}...`);
    if (!channelId) {
      console.error("Ubibot: Se requiere channelId para getChannelData.");
      return null;
    }
    const tokenId = await this._getValidToken(); // Obtener token válido

    if (!tokenId) {
      console.error(`Ubibot: No se pudo obtener token válido para getChannelData (canal ${channelId}).`);
      return null;
    }

    try {
      const response = await axios.get(
        `https://webapi.ubibot.com/channels/${channelId}`,
        { params: { token_id: tokenId }, timeout: 15000 }
      );

      // Validar respuesta
      if (response.data?.result === "success" && response.data.channel) {
        return response.data.channel; // Devolver el objeto del canal
      } else {
        const errorDetail = response.data?.reason || `Respuesta inesperada en getChannelData: ${JSON.stringify(response.data)}`;
        console.error(`Ubibot: Error al obtener datos del canal ${channelId} desde API: ${errorDetail}`);
        return null; // Devolver null en caso de error de API
      }
    } catch (error) {
      const errorMsg = error.response ? `Status ${error.response.status}` : error.message;
      console.error(`Ubibot: Excepción en getChannelData (canal ${channelId}): ${errorMsg}`);
      return null; // Devolver null en caso de excepción
    }
  }

  // --- Métodos de Rutas ---
  // (Se mantienen igual pero ahora usan databaseService.query y tienen algunas mejoras menores)

  async getTemperatureDashboardData(req, res) {

    try {
      // Query migrada al nuevo schema (ubi_canal, ubi_lecturas_sensor, ubi_grupo)
      // Lógica dual: COALESCE(c.umbral_min, g.temperatura_minima) — override individual tiene prioridad sobre el grupo.
      const query = `
         SELECT
           c.canal_id AS channel_id,
           c.nombre AS name,
           s.temperatura_externa AS external_temperature,
           s.fecha_lectura_externa AS external_temperature_timestamp,
           -- is_currently_out_of_range: en nuevo schema se infiere de fuera_linea_desde
           (c.fuera_linea_desde IS NOT NULL) AS is_currently_out_of_range,
           COALESCE(c.umbral_min, g.temperatura_minima) AS minimo,
           COALESCE(c.umbral_max, g.temperatura_maxima) AS maximo,
           NULL AS threshold_updated_at,
           NULL AS threshold_updated_by,
           g.id_preset AS param_id,
           CASE WHEN c.umbral_min IS NOT NULL THEN 'individual' ELSE 'group' END AS threshold_type,
           -- Calcular si la temperatura está fuera de los umbrales efectivos
           CASE
             WHEN s.temperatura_externa < COALESCE(c.umbral_min, g.temperatura_minima) THEN 1
             WHEN s.temperatura_externa > COALESCE(c.umbral_max, g.temperatura_maxima) THEN 1
             ELSE 0
           END AS is_temperature_out_of_range
         FROM ubi_canal c
         JOIN (
           SELECT id_canal, temperatura_externa, fecha_lectura_externa,
                  ROW_NUMBER() OVER (PARTITION BY id_canal ORDER BY fecha_lectura_externa DESC) AS rn
           FROM ubi_lecturas_sensor
           WHERE fecha_lectura_externa >= NOW() - INTERVAL 48 HOUR
         ) s ON c.id_canal = s.id_canal
         LEFT JOIN ubi_grupo g ON c.id_preset = g.id_preset
         WHERE s.rn = 1
         ORDER BY c.nombre;
       `;
      const results = await databaseService.query(query);

      // Registrar los valores originales para debug
      console.log(`[UbibotController] getTemperatureDashboardData: ${results.length} registros obtenidos de la base de datos.`);

      // Extraer los datos en el formato exacto que necesitamos para el frontend
      const processedResults = [];

      // Iterar sobre los resultados y construir manualmente los objetos
      for (const row of results) {
        // Conservar el valor original de is_currently_out_of_range (conectividad)
        const originalValue = row.is_currently_out_of_range;

        // Nuevo: is_temperature_out_of_range (basado en umbrales)
        const temperatureOutOfRange = row.is_temperature_out_of_range;

        processedResults.push({
          channel_id: row.channel_id,
          name: row.name,
          external_temperature: row.external_temperature !== null
            ? parseFloat(row.external_temperature)
            : null,
          external_temperature_timestamp: row.external_temperature_timestamp,
          // Campo original (conectividad WiFi)
          is_currently_out_of_range: originalValue,
          // Campos de umbrales (individuales o grupales)
          minimo: row.minimo !== null ? parseFloat(row.minimo) : null,
          maximo: row.maximo !== null ? parseFloat(row.maximo) : null,
          threshold_type: row.threshold_type,
          threshold_updated_at: row.threshold_updated_at,
          threshold_updated_by: row.threshold_updated_by,
          param_id: row.param_id,
          // Indicador de temperatura fuera de rango
          is_temperature_out_of_range: temperatureOutOfRange
        });

        // Log para verificar cada registro procesado
      }

      console.log(`[UbibotController] getTemperatureDashboardData: ${processedResults.length} resultados procesados.`);

      // Verificar el primer resultado completo antes de enviarlo
      if (processedResults.length > 0) {
        console.log("Primer resultado completo:", JSON.stringify(processedResults[0]));
      }

      // Enviar la respuesta como JSON
      res.json(processedResults);
    } catch (error) {
      console.error("❌ Error fetching temperature dashboard data:", error.message);
      res.status(500).json({ error: "Error del servidor al obtener datos del dashboard." });
    }
  }

  async getTemperatureCamarasData(req, res) {
    console.log("[UbibotController] getTemperatureCamarasData: Solicitud recibida.");
    try {
      const { date } = req.query;
      console.log(`[UbibotController] getTemperatureCamarasData: Fecha solicitada: ${date}`);

      const dtDate = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TZ_UBI });
      if (!date || !dtDate.isValid) {
        console.warn("[UbibotController] getTemperatureCamarasData: Fecha inválida o faltante.");
        return res.status(400).json({ error: "Se requiere una fecha válida en formato YYYY-MM-DD" });
      }

      const start = dtDate.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
      const end = dtDate.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss");

      console.log(`[UbibotController] getTemperatureCamarasData: Querying entre ${start} y ${end}`);

      // Query migrada al nuevo schema (ubi_lecturas_sensor, ubi_canal, ubi_grupo)
      // Lógica dual: COALESCE(c.umbral_min, g.temperatura_minima) — override individual tiene prioridad sobre el grupo.
      const query = `
         SELECT
           sr.id_lectura_sensor AS id,
           c.canal_id AS channel_id,
           sr.temperatura_externa AS external_temperature,
           sr.fecha_lectura_externa AS external_temperature_timestamp,
           c.nombre AS name,
           COALESCE(c.umbral_min, g.temperatura_minima) AS minimo,
           COALESCE(c.umbral_max, g.temperatura_maxima) AS maximo,
           CASE WHEN c.umbral_min IS NOT NULL THEN 'individual' ELSE 'group' END AS threshold_type
         FROM ubi_lecturas_sensor sr
         JOIN ubi_canal c ON sr.id_canal = c.id_canal
         LEFT JOIN ubi_grupo g ON c.id_preset = g.id_preset
         WHERE sr.fecha_lectura_externa BETWEEN ? AND ?
         ORDER BY c.nombre, sr.fecha_lectura_externa ASC;
       `;

      const rows = await databaseService.query(query, [start, end]);
      console.log(`[UbibotController] getTemperatureCamarasData: Query retornó ${rows.length} filas.`);

      // Agrupar los datos por canal manteniendo los timestamps originales
      const groupedData = rows.reduce((acc, row) => {
        const channelKey = row.channel_id;
        if (!acc[channelKey]) {
          acc[channelKey] = {
            id: row.id,
            channel_id: row.channel_id,
            name: row.name,
            // Parámetros de temperatura (individuales o grupales)
            parametros: {
              minimo: parseFloat(row.minimo),
              maximo: parseFloat(row.maximo),
              type: row.threshold_type
            },
            data: [],
          };
        }

        // Validar y parsear temperatura
        const tempValue = row.external_temperature !== null ? parseFloat(row.external_temperature) : null;
        acc[channelKey].data.push({
          id: row.id,
          timestamp: row.external_temperature_timestamp,
          external_temperature: isNaN(tempValue) ? null : tempValue,
        });
        return acc;
      }, {});

      // Función para determinar el orden de visualización
      const getOrderIndex = (name = '') => {
        if (name.toLowerCase().startsWith("camara")) {
          const num = parseInt(name.split(" ")[1]);
          return isNaN(num) ? 1000 : num;
        } else if (name.toLowerCase().startsWith("reefer")) {
          const letter = (name.split(" ")[1] || 'Z').toUpperCase();
          return 100 + (letter.charCodeAt(0) - "A".charCodeAt(0));
        }
        return 9999;
      };

      // Ordenar los canales agrupados
      const sortedData = Object.values(groupedData).sort((a, b) => {
        return getOrderIndex(a.name) - getOrderIndex(b.name);
      });

      console.log(`[UbibotController] getTemperatureCamarasData: Datos procesados y ordenados para ${sortedData.length} canales.`);
      res.json(sortedData);

    } catch (error) {
      console.error("❌ Error fetching temperature camera data:", error.message);
      res.status(500).json({ error: "Error del servidor al obtener datos de temperatura." });
    }
  }

  async getTemperatureDevices(req, res) {
    console.log("[UbibotController] getTemperatureDevices: Solicitud recibida.");
    try {
      // Migrado: channels_ubibot → ubi_canal; aliases para compatibilidad con JS
      const devices = await databaseService.query(
        "SELECT canal_id AS channel_id, nombre AS name FROM ubi_canal ORDER BY nombre"
      );
      console.log(`[UbibotController] getTemperatureDevices: ${devices.length} dispositivos encontrados.`);
      res.json(devices);
    } catch (error) {
      console.error("❌ Ubibot: Error al obtener dispositivos de temperatura:", error.message);
      res.status(500).json({ error: "Error del servidor al obtener lista de dispositivos." });
    }
  }

  async getTemperatureRangeData(req, res) {
    console.log("[UbibotController] getTemperatureRangeData: Solicitud recibida.");
    try {
      const { startDate, endDate, sector } = req.query;
      
      const dtStart = DateTime.fromFormat(startDate, "yyyy-MM-dd", { zone: TZ_UBI });
      const dtEnd = DateTime.fromFormat(endDate, "yyyy-MM-dd", { zone: TZ_UBI });
      if (!startDate || !endDate || !dtStart.isValid || !dtEnd.isValid) {
        console.warn(`[UbibotController] getTemperatureRangeData: Parámetros inválidos:`, req.query);
        return res.status(400).json({ error: "Faltan datos o formato inválido (startDate, endDate YYYY-MM-DD requeridos)" });
      }

      const start = dtStart.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
      const end = dtEnd.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss");

      // Si sector está presente, retornar datos de un solo sector
      if (sector) {
        console.log(`[UbibotController] getTemperatureRangeData: Buscando datos para sector "${sector}" entre ${start} y ${end}`);

        const query = `
          SELECT sector, temperature, timestamp
          FROM door_status
          WHERE sector = ?
          AND timestamp BETWEEN ? AND ?
          ORDER BY timestamp ASC
        `;

        const rows = await databaseService.query(query, [sector, start, end]);
        console.log(`[UbibotController] getTemperatureRangeData: ${rows.length} registros encontrados.`);

        // Retornar en el mismo formato que cuando no hay sector (array con name y data)
        const data = rows.map((item) => ({
          timestamp: item.timestamp,
          external_temperature: item.temperature !== null ? parseFloat(item.temperature) : null,
        }));

        const result = [{
          name: sector,
          data: data
        }];

        return res.json(result);
      }

      // Si NO hay sector, retornar datos de TODOS los sectores agrupados
      console.log(`[UbibotController] getTemperatureRangeData: Buscando datos de TODOS los sectores entre ${start} y ${end}`);

      const query = `
        SELECT 
          ds.sector,
          ds.temperature,
          ds.timestamp
        FROM door_status ds
        WHERE ds.timestamp BETWEEN ? AND ?
        ORDER BY ds.sector, ds.timestamp ASC
      `;

      const rows = await databaseService.query(query, [start, end]);
      console.log(`[UbibotController] getTemperatureRangeData: ${rows.length} registros encontrados para todos los sectores.`);

      // Agrupar por sector
      const groupedData = {};
      rows.forEach((item) => {
        const sectorName = item.sector;
        if (!groupedData[sectorName]) {
          groupedData[sectorName] = [];
        }
        groupedData[sectorName].push({
          timestamp: item.timestamp,
          external_temperature: item.temperature !== null ? parseFloat(item.temperature) : null,
        });
      });

      // Convertir a array de objetos con name y data
      const result = Object.keys(groupedData).map(name => ({
        name,
        data: groupedData[name]
      }));

      res.json(result);
    } catch (error) {
      console.error("❌ Ubibot: Error al obtener datos de rango de temperatura:", error.message);
      res.status(500).json({ error: "Error del servidor al obtener rango de temperatura." });
    }
  }

  async getTemperatureRangeByDeviceData(req, res) {
    console.log("[UbibotController] getTemperatureRangeByDeviceData: Solicitud recibida.");
    try {
      const { startDate, endDate, deviceId, tz = TZ_UBI } = req.query;

      const dtStart = DateTime.fromFormat(startDate, "yyyy-MM-dd", { zone: TZ_UBI });
      const dtEnd = DateTime.fromFormat(endDate, "yyyy-MM-dd", { zone: TZ_UBI });
      if (!startDate || !endDate || !deviceId || !dtStart.isValid || !dtEnd.isValid) {
        console.warn("[UbibotController] getTemperatureRangeByDeviceData: Parámetros inválidos:", req.query);
        return res.status(400).json({
          error: "Parámetros inválidos. Requeridos: startDate, endDate (YYYY-MM-DD), deviceId",
        });
      }

      const start = dtStart.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
      const end = dtEnd.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss");

      const query = `
        SELECT
          c.canal_id AS device_id,
          c.nombre AS device_name,
          sr.fecha_lectura_externa AS timestamp,
          sr.temperatura_externa AS external_temperature
        FROM ubi_lecturas_sensor sr
        JOIN ubi_canal c ON c.id_canal = sr.id_canal
        WHERE c.canal_id = ?
          AND sr.fecha_lectura_externa BETWEEN ? AND ?
        ORDER BY sr.fecha_lectura_externa ASC
      `;

      const rows = await databaseService.query(query, [deviceId, start, end]);

      // Ensure device exists even when there are no readings in range.
      const [deviceInfo] = await databaseService.pool.query(
        "SELECT canal_id AS device_id, nombre AS device_name, activo FROM ubi_canal WHERE canal_id = ?",
        [deviceId]
      );

      if (!deviceInfo || deviceInfo.length === 0) {
        return res.status(404).json({ error: `Dispositivo ${deviceId} no encontrado` });
      }

      const meta = {
        deviceId: Number(deviceInfo[0].device_id),
        deviceName: deviceInfo[0].device_name,
        timezone: tz,
        start,
        end,
        pointCount: rows.length,
        source: "ubi_lecturas_sensor",
      };

      const series = rows.map((item) => ({
        timestamp: item.timestamp,
        external_temperature:
          item.external_temperature !== null ? parseFloat(item.external_temperature) : null,
      }));

      return res.json({ meta, series });
    } catch (error) {
      console.error("❌ Ubibot: Error en getTemperatureRangeByDeviceData:", error.message);
      return res.status(500).json({ error: "Error del servidor al obtener rango por dispositivo." });
    }
  }

  // --- Métodos de Reportes ---
  // (Se mantienen sin cambios funcionales relevantes para el error del token,
  //  pero se podrían mejorar validaciones o logs si fuera necesario)

  async getDefrostAnalysisData(req, res) {
    const { channelId, date } = req.query;

    try {
      const dt = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TZ_UBI });
      const startOfDay = dt.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
      const endOfDay = dt.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss");

      const dtPrev = dt.minus({ days: 7 });
      const startOfPreviousDay = dtPrev.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
      const endOfPreviousDay = dtPrev.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss");

      // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor
      // channel_id (API ID) → id_canal via subquery en ubi_canal
      const query = `
      (SELECT
        temperatura_externa AS temperature,
        fecha_lectura_externa AS timestamp,
        'current' AS period
      FROM ubi_lecturas_sensor
      WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
      AND fecha_lectura_externa BETWEEN ? AND ?)
      UNION ALL
      (SELECT
        temperatura_externa AS temperature,
        fecha_lectura_externa AS timestamp,
        'previous' AS period
      FROM ubi_lecturas_sensor
      WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
      AND fecha_lectura_externa BETWEEN ? AND ?)
      ORDER BY timestamp ASC
    `;

      const [results] = await databaseService.pool.query(query, [
        channelId,
        startOfDay,
        endOfDay,
        channelId,
        startOfPreviousDay,
        endOfPreviousDay,
      ]);

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "No data found for selected dates" });
      }

      // Separar los datos por período
      const currentData = results.filter((r) => r.period === "current");
      const previousData = results.filter((r) => r.period === "previous");

      res.json({
        currentData,
        previousData,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Server Error" });
    }

  }
  async getWeeklyDefrostAnalysisData(req, res) {
    const { channelId, date } = req.query;

    const dt = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TZ_UBI });
    const endDate = dt;
    const startDate = dt.minus({ days: 6 }).startOf("day");
    const endCurrentWeek = dt.endOf("day");
    const prevEndDate = dt.minus({ days: 7 });
    const prevStartDate = dt.minus({ days: 13 }).startOf("day");

    console.log("API /api/weekly-defrost-analysis-data - Dates:");
    console.log("  Selected Date:", endDate.toFormat("yyyy-MM-dd HH:mm:ss"));
    console.log("  Current Week Start:", startDate.toFormat("yyyy-MM-dd HH:mm:ss"));
    console.log("  Current Week End:", endCurrentWeek.toFormat("yyyy-MM-dd HH:mm:ss"));
    console.log("  Previous Week Start:", prevStartDate.toFormat("yyyy-MM-dd HH:mm:ss"));
    console.log("  Previous Week End:", prevEndDate.toFormat("yyyy-MM-dd HH:mm:ss"));

    try {
      // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor
      // channel_id (API ID) → id_canal via subquery en ubi_canal
      const query = `
        (SELECT
          temperatura_externa AS temperature,
          fecha_lectura_externa AS timestamp,
          'current' AS period
        FROM ubi_lecturas_sensor
        WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
        AND fecha_lectura_externa BETWEEN ? AND ?)
        UNION ALL
        (SELECT
          temperatura_externa AS temperature,
          fecha_lectura_externa AS timestamp,
          'previous' AS period
        FROM ubi_lecturas_sensor
        WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
        AND fecha_lectura_externa BETWEEN ? AND ?)
        ORDER BY timestamp ASC
      `;

      const [results] = await databaseService.pool.query(query, [
        channelId,
        startDate.toFormat("yyyy-MM-dd HH:mm:ss"),
        endCurrentWeek.toFormat("yyyy-MM-dd HH:mm:ss"),
        channelId,
        prevStartDate.toFormat("yyyy-MM-dd HH:mm:ss"),
        prevEndDate.toFormat("yyyy-MM-dd HH:mm:ss"),
      ]);

      const currentData = results.filter((r) => r.period === "current");
      const previousData = results.filter((r) => r.period === "previous");
      console.log("API /api/weekly-defrost-analysis-data - Results:");
      console.log("  Current Data Length:", currentData.length);
      console.log("  Previous Data Length:", previousData.length);
      if (currentData && currentData.length > 0) {
        console.log("First current record:", currentData[0].timestamp);
        console.log("Last current record:", currentData[currentData.length - 1].timestamp);
      }
      if (previousData && previousData.length > 0) {
        console.log("First previous record:", previousData[0].timestamp);
        console.log("Last previous record:", previousData[previousData.length - 1].timestamp);
      }

      res.json({
        currentData,
        previousData,
        periods: {
          current: {
            start: startDate.toFormat("yyyy-MM-dd"),
            end: endDate.toFormat("yyyy-MM-dd"),
          },
          previous: {
            start: prevStartDate.toFormat("yyyy-MM-dd"),
            end: prevEndDate.toFormat("yyyy-MM-dd"),
          },
        },
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Server Error" });
    }

  }
  async handleGenerateDefrostReport(req, res) {
    try {
      const { channelId, date } = req.body;

      // Get camera name — migrado: channels_ubibot → ubi_canal
      const [cameraInfo] = await databaseService.pool.query(
        "SELECT nombre AS name FROM ubi_canal WHERE canal_id = ?",
        [channelId]
      );
      const cameraName = cameraInfo[0]?.name || "Unknown";

      // Get data for current date and 7 days before
      const selectedDate = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TZ_UBI });
      const previousDate = selectedDate.minus({ days: 7 });

      const { results: currentData } = await this.getDefrostData(
        channelId,
        selectedDate.toFormat("yyyy-MM-dd"),
        cameraName
      );

      const { results: previousData, fileName } = await this.getDefrostData(
        channelId,
        previousDate.toFormat("yyyy-MM-dd"),
        cameraName
      );

      if (!currentData || currentData.length === 0) {
        return res.status(400).json({
          error: "No hay datos disponibles para esta fecha",
        });
      }

      const TemperatureAnalyzer = require("../utils/temperatureAnalyzer_Utils");
      const analyzer = new TemperatureAnalyzer();

      // Process the data
      await analyzer.analyzeData(currentData, previousData, cameraName, date);

      // Generate PDF
      const pdfBuffer = await analyzer.generatePDF(cameraName, date);

      // Send response
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        error: "Error generando el informe",
        details: error.message,
      });
    }
  }
  async handleGenerateWeeklyDefrostReport(req, res) {
    const { channelId, date } = req.body;

    try {
      // Migrado: channels_ubibot → ubi_canal
      const [cameraInfo] = await databaseService.pool.query(
        "SELECT nombre AS name FROM ubi_canal WHERE canal_id = ?",
        [channelId]
      );
      const cameraName = cameraInfo[0]?.name || "Unknown";

      const dt = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TZ_UBI });
      const selectedDate = dt;
      const startOfCurrentWeek = dt.minus({ days: 6 });
      const endOfCurrentWeek = dt.endOf("day");
      const startOfPreviousWeek = dt.minus({ days: 13 });
      const endOfPreviousWeek = dt.minus({ days: 7 }).endOf("day");

      console.log("API /api/generate-weekly-defrost-report - Dates:");
      console.log("  Selected Date:", selectedDate.toFormat("yyyy-MM-dd HH:mm:ss"));
      console.log("  Current Week Start:", startOfCurrentWeek.toFormat("yyyy-MM-dd HH:mm:ss"));
      console.log("  Current Week End:", endOfCurrentWeek.toFormat("yyyy-MM-dd HH:mm:ss"));
      console.log("  Previous Week Start:", startOfPreviousWeek.toFormat("yyyy-MM-dd HH:mm:ss"));
      console.log("   Previous Week End:", endOfPreviousWeek.toFormat("yyyy-MM-dd HH:mm:ss"));

      // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor
      // Obtener datos de temperatura para ambas semanas
      const query = `
      SELECT
        temperatura_externa AS temperature,
        fecha_lectura_externa AS timestamp
      FROM ubi_lecturas_sensor
      WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
      AND fecha_lectura_externa >= ? AND fecha_lectura_externa <= ?
      ORDER BY fecha_lectura_externa ASC
    `;

      const [currentWeekData] = await databaseService.pool.query(query, [
        channelId,
        startOfCurrentWeek.toFormat("yyyy-MM-dd HH:mm:ss"),
        endOfCurrentWeek.toFormat("yyyy-MM-dd HH:mm:ss"),
      ]);

      const [previousWeekData] = await databaseService.pool.query(query, [
        channelId,
        startOfPreviousWeek.toFormat("yyyy-MM-dd HH:mm:ss"),
        endOfPreviousWeek.toFormat("yyyy-MM-dd HH:mm:ss"),
      ]);

      if (!currentWeekData || currentWeekData.length === 0) {
        return res.status(400).json({
          error: "No hay datos disponibles para esta semana",
        });
      }

      // Crear una instancia del analizador semanalmperatureAnalyzer');
      const analyzer = new WeeklyTemperatureAnalyzer();

      console.log(
        "API /api/generate-weekly-defrost-report - Passing data to WeeklyTemperatureAnalyzer:"
      );
      console.log("  Current Week Data Length:", currentWeekData.length);
      console.log("  Previous Week Data Length:", previousWeekData.length);
      // Log the first and last record to verify date ranges
      if (currentWeekData && currentWeekData.length > 0) {
        console.log("  First current record:", currentWeekData[0].timestamp);
        console.log(
          "  Last current record:",
          currentWeekData[currentWeekData.length - 1].timestamp
        );
      }
      if (previousWeekData && previousWeekData.length > 0) {
        console.log("  First previous record:", previousWeekData[0].timestamp);
        console.log(
          "  Last previous record:",
          previousWeekData[previousWeekData.length - 1].timestamp
        );
      }
      // Procesar los datos para ambas semanas
      await analyzer.analyzeData(
        currentWeekData,
        previousWeekData,
        cameraName,
        date
      );

      // Generar el PDF
      const pdfBuffer = await analyzer.generatePDF(cameraName, date);

      // Crear nombre del archivo
      const sanitizedCameraName = cameraName.replace(/\s+/g, "_").trim();
      const fileName = `Weekly_Temperature_Analysis_${sanitizedCameraName}_${DateTime.fromFormat(date, "yyyy-MM-dd").toFormat("dd-MM-yyyy")}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating weekly report:", error);
      res.status(500).json({
        error: "Error generando el informe semanal",
        details: error.message,
      });
    }
  }
  // === NUEVOS MÉTODOS PARA GESTIÓN DE UMBRALES INDIVIDUALES ===

  /**
   * Obtiene los umbrales de temperatura de un canal específico
   * GET /api/ubibot/channel/:channelId/thresholds
   */
  async getChannelThresholds(req, res) {
    console.log("[UbibotController] getChannelThresholds: Solicitud recibida.");

    try {
      const { channelId } = req.params;

      if (!channelId) {
        console.warn("[UbibotController] getChannelThresholds: channelId faltante");
        return res.status(400).json({ error: "Se requiere channelId" });
      }

      // Migrado: channels_ubibot → ubi_canal; parametrizaciones → ubi_grupo
      // Lógica dual: COALESCE(c.umbral_min, g.temperatura_minima) — override individual tiene prioridad sobre el grupo.
      const query = `
        SELECT
          c.canal_id AS channel_id,
          c.nombre AS name,
          COALESCE(c.umbral_min, g.temperatura_minima) AS threshold_min,
          COALESCE(c.umbral_max, g.temperatura_maxima) AS threshold_max,
          NULL AS threshold_updated_at,
          NULL AS threshold_updated_by,
          CASE WHEN c.umbral_min IS NOT NULL THEN 'individual' ELSE 'group' END AS threshold_type,
          c.id_preset AS legacy_param_id,
          g.temperatura_minima AS group_threshold_min,
          g.temperatura_maxima AS group_threshold_max
        FROM ubi_canal c
        LEFT JOIN ubi_grupo g ON c.id_preset = g.id_preset
        WHERE c.canal_id = ?
      `;

      const results = await databaseService.query(query, [channelId]);

      if (results.length === 0) {
        console.warn(`[UbibotController] getChannelThresholds: Canal ${channelId} no encontrado`);
        return res.status(404).json({ error: `Canal ${channelId} no encontrado` });
      }

      const data = results[0];

      // Formatear respuesta
      const response = {
        channel_id: data.channel_id,
        name: data.name,
        thresholds: {
          min: data.threshold_min !== null ? parseFloat(data.threshold_min) : null,
          max: data.threshold_max !== null ? parseFloat(data.threshold_max) : null,
          type: data.threshold_type,
          updated_at: data.threshold_updated_at,
          updated_by: data.threshold_updated_by
        },
        group_thresholds: {
          min: data.group_threshold_min !== null ? parseFloat(data.group_threshold_min) : null,
          max: data.group_threshold_max !== null ? parseFloat(data.group_threshold_max) : null,
          param_id: data.legacy_param_id
        }
      };

      console.log(`[UbibotController] getChannelThresholds: Umbrales obtenidos para canal ${channelId}`);
      res.json(response);

    } catch (error) {
      console.error("❌ Error obteniendo umbrales del canal:", error.message);
      res.status(500).json({ error: "Error del servidor al obtener umbrales" });
    }
  }

  /**
   * Actualiza los umbrales de temperatura de un canal específico
   * PUT /api/ubibot/channel/:channelId/thresholds
   */
  async updateChannelThresholds(req, res) {
    console.log("[UbibotController] updateChannelThresholds: Solicitud recibida.");

    try {
      const { channelId } = req.params;
      const { threshold_min, threshold_max, updated_by, reason } = req.body;

      // Validaciones
      if (!channelId) {
        console.warn("[UbibotController] updateChannelThresholds: channelId faltante");
        return res.status(400).json({ error: "Se requiere channelId" });
      }

      if (threshold_min === undefined || threshold_max === undefined) {
        console.warn("[UbibotController] updateChannelThresholds: Umbrales faltantes");
        return res.status(400).json({ error: "Se requieren threshold_min y threshold_max" });
      }

      const min = parseFloat(threshold_min);
      const max = parseFloat(threshold_max);

      if (isNaN(min) || isNaN(max)) {
        console.warn("[UbibotController] updateChannelThresholds: Umbrales inválidos");
        return res.status(400).json({ error: "Los umbrales deben ser números válidos" });
      }

      if (min >= max) {
        console.warn("[UbibotController] updateChannelThresholds: Umbral mínimo >= máximo");
        return res.status(400).json({ error: "El umbral mínimo debe ser menor que el máximo" });
      }

      // Validar rangos razonables para temperaturas de refrigeración
      if (min < -40 || max > 50) {
        console.warn("[UbibotController] updateChannelThresholds: Umbrales fuera de rango razonable");
        return res.status(400).json({ error: "Los umbrales deben estar entre -40°C y 50°C" });
      }

      console.log(`[UbibotController] updateChannelThresholds: Actualizando canal ${channelId} con min=${min}, max=${max}`);

      // Si existe el procedimiento almacenado, usarlo
      const useProcedure = false; // Cambiar a true si el SP está creado en la BD

      if (useProcedure) {
        // Usar procedimiento almacenado
        const query = `CALL sp_update_channel_thresholds(?, ?, ?, ?, ?)`;
        await databaseService.query(query, [
          channelId,
          min,
          max,
          updated_by || 'API',
          reason || 'Actualización manual desde API'
        ]);
      } else {
        // Actualiza los overrides individuales de umbral en ubi_canal.
        // fecha_actualizacion se actualiza automáticamente vía ON UPDATE CURRENT_TIMESTAMP.
        const updateQuery = `
          UPDATE ubi_canal
          SET
            umbral_min = ?,
            umbral_max = ?
          WHERE canal_id = ?
        `;

        const result = await databaseService.query(updateQuery, [
          min,
          max,
          channelId
        ]);

        if (result.affectedRows === 0) {
          console.warn(`[UbibotController] updateChannelThresholds: Canal ${channelId} no encontrado`);
          return res.status(404).json({ error: `Canal ${channelId} no encontrado` });
        }
      }

      console.log(`[UbibotController] updateChannelThresholds: Canal ${channelId} actualizado exitosamente`);

      res.json({
        success: true,
        message: "Umbrales actualizados correctamente",
        data: {
          channel_id: channelId,
          threshold_min: min,
          threshold_max: max,
          updated_at: new Date().toISOString(),
          updated_by: updated_by || 'API'
        }
      });

    } catch (error) {
      console.error("❌ Error actualizando umbrales del canal:", error.message);
      res.status(500).json({ error: "Error del servidor al actualizar umbrales" });
    }
  }

  /**
   * Actualiza el estado operativo de un canal
   * PUT /api/ubibot/channel/:channelId/operativa
   */
  async updateChannelOperativa(req, res) {
    console.log("[UbibotController] updateChannelOperativa: Solicitud recibida.");

    try {
      const { channelId } = req.params;
      const { esOperativa } = req.body;

      // Validaciones
      if (!channelId) {
        console.warn("[UbibotController] updateChannelOperativa: channelId faltante");
        return res.status(400).json({ error: "Se requiere channelId" });
      }

      if (esOperativa === undefined || typeof esOperativa !== 'boolean') {
        console.warn("[UbibotController] updateChannelOperativa: esOperativa inválido");
        return res.status(400).json({ error: "Se requiere esOperativa (boolean)" });
      }

      const operativaValue = esOperativa ? 1 : 0;

      console.log(`[UbibotController] updateChannelOperativa: Actualizando canal ${channelId} a esOperativa=${operativaValue}`);

      // Migrado: channels_ubibot → ubi_canal; esOperativa → activo; channel_id → canal_id
      const updateQuery = `
        UPDATE ubi_canal
        SET activo = ?
        WHERE canal_id = ?
      `;

      const result = await databaseService.query(updateQuery, [operativaValue, channelId]);

      if (result.affectedRows === 0) {
        console.warn(`[UbibotController] updateChannelOperativa: Canal ${channelId} no encontrado`);
        return res.status(404).json({ error: `Canal ${channelId} no encontrado` });
      }

      console.log(`[UbibotController] updateChannelOperativa: Canal ${channelId} actualizado exitosamente a esOperativa=${operativaValue}`);

      res.json({
        success: true,
        message: `Cámara ${esOperativa ? 'activada' : 'desactivada'} correctamente`,
        data: {
          channel_id: channelId,
          esOperativa: operativaValue,
          updated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("❌ Error actualizando estado operativo del canal:", error.message);
      res.status(500).json({ error: "Error del servidor al actualizar estado operativo" });
    }
  }

  /**
   * Obtiene los umbrales de todos los canales
   * GET /api/ubibot/channels/thresholds
   */
  async getAllChannelsThresholds(req, res) {
    console.log("[UbibotController] getAllChannelsThresholds: Solicitud recibida.");

    try {
      // Migrado: channels_ubibot → ubi_canal; parametrizaciones → ubi_grupo;
      // sensor_readings_ubibot → ubi_lecturas_sensor
      // Lógica dual: COALESCE(c.umbral_min, g.temperatura_minima) — override individual tiene prioridad sobre el grupo.
      const query = `
        SELECT
          c.canal_id AS channel_id,
          c.nombre AS name,
          c.activo AS esOperativa,
          COALESCE(c.umbral_min, g.temperatura_minima) AS threshold_min,
          COALESCE(c.umbral_max, g.temperatura_maxima) AS threshold_max,
          NULL AS threshold_updated_at,
          NULL AS threshold_updated_by,
          CASE WHEN c.umbral_min IS NOT NULL THEN 'individual' ELSE 'group' END AS threshold_type,
          c.id_preset AS legacy_param_id,
          -- Última lectura de temperatura
          lr.temperatura_externa AS current_temperature,
          lr.fecha_lectura_externa AS last_reading,
          -- Estado de temperatura respecto a umbrales efectivos
          CASE
            WHEN lr.temperatura_externa IS NULL THEN 'NO_DATA'
            WHEN lr.temperatura_externa < COALESCE(c.umbral_min, g.temperatura_minima) THEN 'BELOW_MIN'
            WHEN lr.temperatura_externa > COALESCE(c.umbral_max, g.temperatura_maxima) THEN 'ABOVE_MAX'
            ELSE 'IN_RANGE'
          END AS temperature_status
        FROM ubi_canal c
        LEFT JOIN ubi_grupo g ON c.id_preset = g.id_preset
        LEFT JOIN (
          SELECT
            id_canal,
            temperatura_externa,
            fecha_lectura_externa,
            ROW_NUMBER() OVER (PARTITION BY id_canal ORDER BY fecha_lectura_externa DESC) AS rn
          FROM ubi_lecturas_sensor
        ) lr ON c.id_canal = lr.id_canal AND lr.rn = 1
        ORDER BY c.nombre
      `;

      const results = await databaseService.query(query);

      // Formatear respuesta
      const formattedResults = results.map(row => ({
        channel_id: row.channel_id,
        name: row.name,
        is_active: row.esOperativa === 1,
        thresholds: {
          min: row.threshold_min !== null ? parseFloat(row.threshold_min) : null,
          max: row.threshold_max !== null ? parseFloat(row.threshold_max) : null,
          type: row.threshold_type,
          updated_at: row.threshold_updated_at,
          updated_by: row.threshold_updated_by
        },
        current_status: {
          temperature: row.current_temperature !== null ? parseFloat(row.current_temperature) : null,
          last_reading: row.last_reading,
          status: row.temperature_status
        }
      }));

      // Estadísticas resumen
      const stats = {
        total_channels: formattedResults.length,
        with_individual_thresholds: formattedResults.filter(c => c.thresholds.type === 'individual').length,
        with_group_thresholds: formattedResults.filter(c => c.thresholds.type === 'group').length,
        out_of_range: formattedResults.filter(c =>
          c.current_status.status === 'BELOW_MIN' || c.current_status.status === 'ABOVE_MAX'
        ).length
      };

      console.log(`[UbibotController] getAllChannelsThresholds: ${results.length} canales obtenidos`);

      res.json({
        stats,
        channels: formattedResults
      });

    } catch (error) {
      console.error("❌ Error obteniendo umbrales de todos los canales:", error.message);
      res.status(500).json({ error: "Error del servidor al obtener umbrales" });
    }
  }

  /**
   * Actualiza los umbrales de temperatura de múltiples canales en una sola operación
   * PUT /api/temperatura/canales/umbrales/bulk
   * Body: { channels: [{ channelId, threshold_min, threshold_max }] }
   */
  async bulkUpdateChannelThresholds(req, res) {
    console.log("[UbibotController] bulkUpdateChannelThresholds: Solicitud recibida.");

    const { channels } = req.body;

    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: "Se requiere un array 'channels' no vacío" });
    }

    const results = [];
    const errors = [];

    for (const item of channels) {
      const { channelId, threshold_min, threshold_max } = item;

      if (!channelId) {
        errors.push({ channelId, error: "channelId requerido" });
        continue;
      }

      if (threshold_min === undefined || threshold_max === undefined) {
        errors.push({ channelId, error: "threshold_min y threshold_max requeridos" });
        continue;
      }

      const min = parseFloat(threshold_min);
      const max = parseFloat(threshold_max);

      if (isNaN(min) || isNaN(max)) {
        errors.push({ channelId, error: "Los umbrales deben ser números válidos" });
        continue;
      }

      if (min >= max) {
        errors.push({ channelId, error: "El umbral mínimo debe ser menor que el máximo" });
        continue;
      }

      if (min < -40 || max > 50) {
        errors.push({ channelId, error: "Los umbrales deben estar entre -40°C y 50°C" });
        continue;
      }

      try {
        const updateQuery = `
          UPDATE ubi_canal
          SET umbral_min = ?, umbral_max = ?
          WHERE canal_id = ?
        `;
        const result = await databaseService.query(updateQuery, [min, max, channelId]);

        if (result.affectedRows === 0) {
          errors.push({ channelId, error: `Canal ${channelId} no encontrado` });
        } else {
          results.push({ channelId, threshold_min: min, threshold_max: max });
        }
      } catch (err) {
        console.error(`❌ Error actualizando canal ${channelId}:`, err.message);
        errors.push({ channelId, error: "Error interno al actualizar" });
      }
    }

    console.log(`[UbibotController] bulkUpdateChannelThresholds: ${results.length} actualizados, ${errors.length} errores.`);

    res.json({
      success: errors.length === 0,
      updated: results.length,
      failed: errors.length,
      results,
      errors
    });
  }

  async getDefrostData(channelId, date, cameraName) {
    const dt = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TZ_UBI });
    const startOfDay = dt.startOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
    const endOfDay = dt.endOf("day").toFormat("yyyy-MM-dd HH:mm:ss");
    const formattedDate = dt.toFormat("dd-MM-yyyy");

    // Create filename
    const sanitizedCameraName = cameraName.replace(/\s+/g, "_").trim();
    const fileName = `Defrost_Analysis_${sanitizedCameraName}_${formattedDate}.pdf`;

    // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor
    // channel_id (API ID) → id_canal via subquery en ubi_canal
    const query = `
    SELECT
      temperatura_externa AS temperature,
      fecha_lectura_externa AS timestamp
    FROM ubi_lecturas_sensor
    WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
    AND fecha_lectura_externa BETWEEN ? AND ?
    ORDER BY fecha_lectura_externa ASC
  `;

    const [results] = await databaseService.pool.query(query, [
      channelId,
      startOfDay,
      endOfDay,
    ]);
    return { results, fileName };
  }

}
module.exports = new UbibotController();