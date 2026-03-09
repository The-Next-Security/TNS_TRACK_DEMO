// src/controllers/ubibotController.js

const moment = require("moment");
const axios = require("axios");
const fs = require("fs").promises; // Usar promesas de fs
const path = require("path"); // <--- Importante: Añadido import de path
const config = require("../config/js_files/configLoader_Config");
const databaseService = require("../services/database-service");
const WeeklyTemperatureAnalyzer = require("../utils/WeeklyTemperatureAnalyzer");
const temperatureAnalyzer = require("../utils/TemperatureAnalyzer"); // Asumo que este es el correcto para reportes diarios

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
        const excludedChannels = ubibotConfig?.excludedChannels || [];
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
      // Query actualizada para usar umbrales individuales
      const query = `
         SELECT
           c.channel_id,
           c.name,
           s.external_temperature,
           s.external_temperature_timestamp,
           c.is_currently_out_of_range,
           -- Usar umbrales individuales si existen, sino usar los de parametrizaciones
           COALESCE(c.threshold_min, p.minimo) as minimo,
           COALESCE(c.threshold_max, p.maximo) as maximo,
           c.threshold_updated_at,
           c.threshold_updated_by,
           p.param_id,
           -- Indicador si está usando umbrales individuales o grupales
           CASE
             WHEN c.threshold_min IS NOT NULL THEN 'individual'
             ELSE 'group'
           END as threshold_type,
           -- Calcular si la temperatura está fuera de los umbrales configurados
           CASE
             WHEN s.external_temperature < COALESCE(c.threshold_min, p.minimo) THEN 1
             WHEN s.external_temperature > COALESCE(c.threshold_max, p.maximo) THEN 1
             ELSE 0
           END AS is_temperature_out_of_range
         FROM channels_ubibot c
         JOIN (
           SELECT channel_id, external_temperature, external_temperature_timestamp,
                  ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY external_temperature_timestamp DESC) as rn
           FROM sensor_readings_ubibot
         ) s ON c.channel_id = s.channel_id
         LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
         WHERE s.rn = 1
         ORDER BY c.name;
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

      if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
        console.warn("[UbibotController] getTemperatureCamarasData: Fecha inválida o faltante.");
        return res.status(400).json({ error: "Se requiere una fecha válida en formato YYYY-MM-DD" });
      }

      // Usar Moment para asegurar el formato correcto para la query
      const start = moment(date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const end = moment(date).endOf('day').format('YYYY-MM-DD HH:mm:ss');

      console.log(`[UbibotController] getTemperatureCamarasData: Querying entre ${start} y ${end}`);

      // Query actualizada para usar umbrales individuales
      const query = `
         SELECT
           sr.id,
           sr.channel_id,
           sr.external_temperature,
           sr.external_temperature_timestamp,
           c.name,
           -- Usar umbrales individuales si existen, sino usar los de parametrizaciones
           COALESCE(c.threshold_min, p.minimo) as minimo,
           COALESCE(c.threshold_max, p.maximo) as maximo,
           CASE
             WHEN c.threshold_min IS NOT NULL THEN 'individual'
             ELSE 'group'
           END as threshold_type
         FROM sensor_readings_ubibot sr
         JOIN channels_ubibot c ON sr.channel_id = c.channel_id
         LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
         WHERE sr.external_temperature_timestamp BETWEEN ? AND ?
         ORDER BY c.name, sr.external_temperature_timestamp ASC;
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
      const devices = await databaseService.query(
        "SELECT channel_id, name FROM channels_ubibot ORDER BY name"
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
      
      // Validar fechas obligatorias (sector es opcional)
      if (!startDate || !endDate ||
        !moment(startDate, 'YYYY-MM-DD', true).isValid() ||
        !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
        console.warn(`[UbibotController] getTemperatureRangeData: Parámetros inválidos:`, req.query);
        return res.status(400).json({ error: "Faltan datos o formato inválido (startDate, endDate YYYY-MM-DD requeridos)" });
      }

      const start = moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
      const end = moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

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

  // MÉTODOS OBSOLETOS ELIMINADOS:
  // - getChannelStatus: Reemplazado por getAllChannelsThresholds que ya incluye esOperativa
  // - handleUpdateChannelStatus: Reemplazado por updateChannelOperativa (PUT /channel/:channelId/operativa)

  // --- Métodos de Reportes ---
  // (Se mantienen sin cambios funcionales relevantes para el error del token,
  //  pero se podrían mejorar validaciones o logs si fuera necesario)

  async getDefrostAnalysisData(req, res) {
    const { channelId, date } = req.query;

    try {
      // Fecha seleccionada
      const startOfDay = moment(date)
        .startOf("day")
        .format("YYYY-MM-DD HH:mm:ss");
      const endOfDay = moment(date).endOf("day").format("YYYY-MM-DD HH:mm:ss");

      // Fecha del domingo anterior
      const startOfPreviousDay = moment(date)
        .subtract(7, "days")
        .startOf("day")
        .format("YYYY-MM-DD HH:mm:ss");
      const endOfPreviousDay = moment(date)
        .subtract(7, "days")
        .endOf("day")
        .format("YYYY-MM-DD HH:mm:ss");

      const query = `
      (SELECT 
        external_temperature as temperature,
        external_temperature_timestamp as timestamp,
        'current' as period
      FROM sensor_readings_ubibot 
      WHERE channel_id = ? 
      AND external_temperature_timestamp BETWEEN ? AND ?)
      UNION ALL
      (SELECT 
        external_temperature as temperature,
        external_temperature_timestamp as timestamp,
        'previous' as period
      FROM sensor_readings_ubibot 
      WHERE channel_id = ? 
      AND external_temperature_timestamp BETWEEN ? AND ?)
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

    // Calcular fechas para la semana actual
    const endDate = moment(date);
    const startDate = moment(date).subtract(6, "days").startOf("day");
    const endCurrentWeek = moment(date).endOf("day"); // Fixed log

    // Calcular fechas para la semana anterior
    const prevEndDate = moment(date).subtract(7, "days");
    const prevStartDate = moment(date).subtract(13, "days").startOf("day");

    // Log the dates before querying the database
    console.log("API /api/weekly-defrost-analysis-data - Dates:");
    console.log("  Selected Date:", endDate.format("YYYY-MM-DD HH:mm:ss"));
    console.log(
      "  Current Week Start:",
      startDate.format("YYYY-MM-DD HH:mm:ss")
    );
    console.log(
      "  Current Week End:",
      endCurrentWeek.format("YYYY-MM-DD HH:mm:ss")
    ); // Fixed log
    console.log(
      "  Previous Week Start:",
      prevStartDate.format("YYYY-MM-DD HH:mm:ss")
    );
    console.log(
      "  Previous Week End:",
      prevEndDate.format("YYYY-MM-DD HH:mm:ss")
    );

    try {
      const query = `
        (SELECT 
          external_temperature as temperature,
          external_temperature_timestamp as timestamp,
          'current' as period
        FROM sensor_readings_ubibot 
        WHERE channel_id = ? 
        AND external_temperature_timestamp BETWEEN ? AND ?)
        UNION ALL
        (SELECT 
          external_temperature as temperature,
          external_temperature_timestamp as timestamp,
          'previous' as period
        FROM sensor_readings_ubibot 
        WHERE channel_id = ? 
        AND external_temperature_timestamp BETWEEN ? AND ?)
        ORDER BY timestamp ASC
      `;

      const [results] = await databaseService.pool.query(query, [
        channelId,
        startDate.format("YYYY-MM-DD HH:mm:ss"),
        endCurrentWeek.format("YYYY-MM-DD HH:mm:ss"),
        channelId,
        prevStartDate.format("YYYY-MM-DD HH:mm:ss"),
        prevEndDate.format("YYYY-MM-DD HH:mm:ss"),
      ]);

      const currentData = results.filter((r) => r.period === "current");
      const previousData = results.filter((r) => r.period === "previous");
      // Log the number of records returned
      console.log("API /api/weekly-defrost-analysis-data - Results:");
      console.log("  Current Data Length:", currentData.length);
      console.log("  Previous Data Length:", previousData.length);
      if (currentData && currentData.length > 0) {
        console.log("First current record:", currentData[0].timestamp);
        console.log(
          "Last current record:",
          currentData[currentData.length - 1].timestamp
        );
      }
      if (previousData && previousData.length > 0) {
        console.log("First previous record:", previousData[0].timestamp);
        console.log(
          "Last previous record:",
          previousData[previousData.length - 1].timestamp
        );
      }

      res.json({
        currentData,
        previousData,
        periods: {
          current: {
            start: startDate.format("YYYY-MM-DD"),
            end: endDate.format("YYYY-MM-DD"),
          },
          previous: {
            start: prevStartDate.format("YYYY-MM-DD"),
            end: prevEndDate.format("YYYY-MM-DD"),
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

      // Get camera name
      const [cameraInfo] = await databaseService.pool.query(
        "SELECT name FROM channels_ubibot WHERE channel_id = ?",
        [channelId]
      );
      const cameraName = cameraInfo[0]?.name || "Unknown";

      // Get data for current date and 7 days before
      const selectedDate = moment(date);
      const previousDate = moment(date).subtract(7, "days");

      // Get current and previous data
      const { results: currentData } = await this.getDefrostData(
        channelId,
        selectedDate.format("YYYY-MM-DD"),
        cameraName
      );

      const { results: previousData, fileName } = await this.getDefrostData(
        channelId,
        previousDate.format("YYYY-MM-DD"),
        cameraName
      );

      if (!currentData || currentData.length === 0) {
        return res.status(400).json({
          error: "No hay datos disponibles para esta fecha",
        });
      }

      const TemperatureAnalyzer = require("../utils/TemperatureAnalyzer");
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
      const [cameraInfo] = await databaseService.pool.query(
        "SELECT name FROM channels_ubibot WHERE channel_id = ?",
        [channelId]
      );
      const cameraName = cameraInfo[0]?.name || "Unknown";

      // Obtener fechas para la semana actual y anterior
      const selectedDate = moment(date);
      const startOfCurrentWeek = moment(date).subtract(6, "days");
      const endOfCurrentWeek = moment(date).endOf("day"); // Fixed log
      const startOfPreviousWeek = moment(date).subtract(13, "days");
      const endOfPreviousWeek = moment(date).subtract(7, "days").endOf("day"); // Fixed log

      // Log the dates before querying the database
      console.log("API /api/generate-weekly-defrost-report - Dates:");
      console.log(
        "  Selected Date:",
        selectedDate.format("YYYY-MM-DD HH:mm:ss")
      );
      console.log(
        "  Current Week Start:",
        startOfCurrentWeek.format("YYYY-MM-DD HH:mm:ss")
      );
      console.log(
        "  Current Week End:",
        endOfCurrentWeek.format("YYYY-MM-DD HH:mm:ss")
      );
      console.log(
        "  Previous Week Start:",
        startOfPreviousWeek.format("YYYY-MM-DD HH:mm:ss")
      );
      console.log(
        "   Previous Week End:",
        endOfPreviousWeek.format("YYYY-MM-DD HH:mm:ss")
      ); // Fixed log

      // Obtener datos de temperatura para ambas semanas
      const query = `
      SELECT 
        external_temperature as temperature,
        external_temperature_timestamp as timestamp
      FROM sensor_readings_ubibot 
      WHERE channel_id = ? 
      AND external_temperature_timestamp >= ? AND external_temperature_timestamp <= ?
      ORDER BY external_temperature_timestamp ASC
    `;

      const [currentWeekData] = await databaseService.pool.query(query, [
        channelId,
        startOfCurrentWeek.format("YYYY-MM-DD HH:mm:ss"),
        endOfCurrentWeek.format("YYYY-MM-DD HH:mm:ss"), // Fixed log
      ]);

      const [previousWeekData] = await databaseService.pool.query(query, [
        channelId,
        startOfPreviousWeek.format("YYYY-MM-DD HH:mm:ss"),
        endOfPreviousWeek.format("YYYY-MM-DD HH:mm:ss"), // Fixed log
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
      const fileName = `Weekly_Temperature_Analysis_${sanitizedCameraName}_${moment(
        date
      ).format("DD-MM-YYYY")}.pdf`;

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

      const query = `
        SELECT
          c.channel_id,
          c.name,
          COALESCE(c.threshold_min, p.minimo) as threshold_min,
          COALESCE(c.threshold_max, p.maximo) as threshold_max,
          c.threshold_updated_at,
          c.threshold_updated_by,
          CASE
            WHEN c.threshold_min IS NOT NULL THEN 'individual'
            ELSE 'group'
          END as threshold_type,
          c.id_parametrizacion as legacy_param_id,
          p.minimo as group_threshold_min,
          p.maximo as group_threshold_max
        FROM channels_ubibot c
        LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
        WHERE c.channel_id = ?
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
        // Actualización directa
        const updateQuery = `
          UPDATE channels_ubibot
          SET
            threshold_min = ?,
            threshold_max = ?,
            threshold_updated_at = CURRENT_TIMESTAMP,
            threshold_updated_by = ?
          WHERE channel_id = ?
        `;

        const result = await databaseService.query(updateQuery, [
          min,
          max,
          updated_by || 'API',
          channelId
        ]);

        if (result.affectedRows === 0) {
          console.warn(`[UbibotController] updateChannelThresholds: Canal ${channelId} no encontrado`);
          return res.status(404).json({ error: `Canal ${channelId} no encontrado` });
        }

        // Opcional: Insertar en histórico si la tabla existe
        try {
          const historyQuery = `
            INSERT INTO channel_threshold_history
            (channel_id, new_threshold_min, new_threshold_max, changed_by, change_reason)
            VALUES (?, ?, ?, ?, ?)
          `;
          await databaseService.query(historyQuery, [
            channelId,
            min,
            max,
            updated_by || 'API',
            reason || 'Actualización manual desde API'
          ]);
        } catch (historyError) {
          // Silenciar error si la tabla de histórico no existe
          console.log("[UbibotController] Tabla de histórico no disponible, continuando...");
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

      const updateQuery = `
        UPDATE channels_ubibot
        SET esOperativa = ?
        WHERE channel_id = ?
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
      const query = `
        SELECT
          c.channel_id,
          c.name,
          c.esOperativa,
          COALESCE(c.threshold_min, p.minimo) as threshold_min,
          COALESCE(c.threshold_max, p.maximo) as threshold_max,
          c.threshold_updated_at,
          c.threshold_updated_by,
          CASE
            WHEN c.threshold_min IS NOT NULL THEN 'individual'
            ELSE 'group'
          END as threshold_type,
          c.id_parametrizacion as legacy_param_id,
          -- Última lectura de temperatura
          lr.external_temperature as current_temperature,
          lr.external_temperature_timestamp as last_reading,
          -- Estado de temperatura
          CASE
            WHEN lr.external_temperature IS NULL THEN 'NO_DATA'
            WHEN lr.external_temperature < COALESCE(c.threshold_min, p.minimo) THEN 'BELOW_MIN'
            WHEN lr.external_temperature > COALESCE(c.threshold_max, p.maximo) THEN 'ABOVE_MAX'
            ELSE 'IN_RANGE'
          END as temperature_status
        FROM channels_ubibot c
        LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
        LEFT JOIN (
          SELECT
            channel_id,
            external_temperature,
            external_temperature_timestamp,
            ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY external_temperature_timestamp DESC) as rn
          FROM sensor_readings_ubibot
        ) lr ON c.channel_id = lr.channel_id AND lr.rn = 1
        ORDER BY c.name
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

  async getDefrostData(channelId, date, cameraName) {
    const startOfDay = moment(date)
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss");
    const endOfDay = moment(date).endOf("day").format("YYYY-MM-DD HH:mm:ss");
    const formattedDate = moment(date).format("DD-MM-YYYY");

    // Create filename
    const sanitizedCameraName = cameraName.replace(/\s+/g, "_").trim();
    const fileName = `Defrost_Analysis_${sanitizedCameraName}_${formattedDate}.pdf`;

    const query = `
    SELECT 
      external_temperature as temperature,
      external_temperature_timestamp as timestamp
    FROM sensor_readings_ubibot 
    WHERE channel_id = ? 
    AND external_temperature_timestamp BETWEEN ? AND ?
    ORDER BY external_temperature_timestamp ASC
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