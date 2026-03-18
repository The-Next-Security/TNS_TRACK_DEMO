// src/services/notificationService.js
// VERSIÓN FINAL - Pool interno, logging a BD, robustez por canal

const mysql = require("mysql2/promise");
const configLoader = require("../config/js_files/configLoader_Config");
const { DateTime } = require('luxon');

// Pool interno del servicio
let pool = null;
const MIN_READINGS_REQUIRED = 5; // Mínimo de lecturas válidas para considerar un canal

// Función para inicializar el pool INTERNO del servicio
async function initializePool() {
    if (pool) return;
    console.log("[NotificationService] Intentando inicializar pool interno...");
    try {
        const dbConfigLoaded = configLoader.getConfig().database;
        if (!dbConfigLoaded || !dbConfigLoaded.host || !dbConfigLoaded.database) {
            throw new Error(`Configuración de BD base inválida para pool interno.`);
        }
        const userValue = dbConfigLoaded.user || dbConfigLoaded.username; // Leer 'user' o 'username'
        if (!userValue) {
            throw new Error(`Usuario ('user' o 'username') no encontrado en config BD.`);
        }
        const poolConfig = {
            host: dbConfigLoaded.host,
            user: userValue, // Usar clave 'user' con el valor correcto
            password: dbConfigLoaded.password,
            database: dbConfigLoaded.database,
            port: dbConfigLoaded.port || 3306,
            waitForConnections: true,
            connectionLimit: dbConfigLoaded.pool?.max_size || 10,
            queueLimit: 0,
            decimalNumbers: true // Devolver DECIMAL/NEWDECIMAL como números JS
        };
        console.log(`[NotificationService] Configuración para pool interno adaptada (decimalNumbers: true): User=${poolConfig.user}, DB=${poolConfig.database}, Host=${poolConfig.host}`);
        pool = mysql.createPool(poolConfig);
        console.log("[NotificationService] Pool de conexiones MySQL interno inicializado.");
        // Probar conexión
        const connection = await pool.getConnection();
        console.log("[NotificationService] Conexión inicial (interna) a la base de datos establecida.");
        connection.release();
    } catch (error) {
        console.error("❌ [NotificationService] Error CRÍTICO al inicializar el pool de conexiones INTERNO:", error.message);
        pool = null;
        throw error; // Relanzar para detener si es necesario
    }
}

class NotificationService {
    constructor() {
        // No leer config en constructor. Se asigna en init() tras configLoader.initialize().
        this.timeZone = "America/Santiago";
        this.initialized = false;
        if (!pool) {
            console.log("[NotificationService] Constructor: Pool interno no listo, se inicializará asíncronamente.");
        }
        console.log("✅ NotificationService instanciado (gestionará pool interno).");
    }

    /**
     * Inicializa propiedades que dependen de config. Llamar desde boot() tras configLoader.initialize().
     */
    init() {
        const { alertSystem } = configLoader.getConfig();
        this.timeZone = alertSystem?.timeZone || "America/Santiago";
        console.log(`[NotificationService] init: Zona horaria configurada: ${this.timeZone}`);
    }

    /**
     * Inicializa explícitamente el servicio, asegurando que el pool esté listo.
     * @returns {Promise<boolean>} true si la inicialización fue exitosa
     */
    async initialize() {
        try {
            if (this.initialized && pool) {
                console.log("[NotificationService] Ya inicializado, omitiendo initialize()");
                return true;
            }
            
            console.log("[NotificationService] Inicializando explícitamente...");
            await initializePool();
            
            // Verificar que el pool se inicializó correctamente
            if (!pool) {
                throw new Error("Fallo al inicializar pool interno");
            }
            
            // Verificar que podemos obtener una conexión
            const testConn = await pool.getConnection();
            testConn.release();
            
            this.initialized = true;
            console.log("[NotificationService] Inicializado correctamente (pool interno listo)");
            return true;
        } catch (error) {
            console.error(`[NotificationService] Error en initialize(): ${error.message}`);
            this.initialized = false;
            return false;
        }
    }
    
    /**
     * Obtiene el pool interno para uso directo (exponer solo cuando sea necesario)
     * @returns {mysql.Pool|null} El pool interno o null si no está inicializado
     */
    getPool() {
        return pool;
    }

    /**
     * Obtiene una conexión del pool INTERNO.
     * @private
     * @returns {Promise<mysql.PoolConnection>} Conexión a la base de datos.
     * @throws {Error} Si el pool interno no está inicializado o falla la conexión.
     */
    async _getConnection() {
        if (!pool) {
            console.error("❌ [NotificationService] Pool INTERNO no inicializado al intentar obtener conexión.");
            // Podríamos intentar inicializar aquí de nuevo, pero es mejor asegurar que esté listo antes.
            throw new Error("Pool interno no disponible. El servicio no puede operar.");
        }
        try {
            return await pool.getConnection();
        } catch (connectionError) {
            console.error("❌ [NotificationService] Error al obtener conexión del pool interno:", connectionError.message);
            if (connectionError.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error("   --> ¡Verifica las credenciales y permisos del usuario en la base de datos!");
            } else if (connectionError.code === 'POOL_CLOSED') {
                console.error("   --> El pool de conexiones se cerró inesperadamente.");
                // Intentar reinicializar podría ser una opción aquí, pero complejo.
                // Por ahora, lanzamos el error.
            }
            throw connectionError; // Relanzar para indicar fallo
        }
    }

    /**
      * Registra un evento detallado del análisis en la tabla notification_analysis_log.
      * @private
      * @param {string} level - 'DEBUG', 'INFO', 'WARN', 'ERROR'.
      * @param {string|null} channelId - ID del canal asociado, o null para logs generales.
      * @param {string} message - Mensaje del log.
      * @param {Object|null} details - Datos JSON opcionales.
      * @param {mysql.PoolConnection|null} [conn=null] - Conexión opcional existente. Si es null, obtiene una nueva.
      * @param {Date} analysisTimestamp - Hora de inicio del ciclo de análisis (Date object).
      * @param {Date} windowStart - Inicio de la ventana de datos (Date object).
      * @param {Date} windowEnd - Fin de la ventana de datos (Date object).
      * @returns {Promise<void>}
      */
    async _logAnalysisEvent(level, channelId, message, details = null, conn = null, analysisTimestamp, windowStart, windowEnd) {
        // Formatear fechas a SQL DATETIME string 'YYYY-MM-DD HH:MM:SS'
        const formatToSqlDatetime = (date) => {
            if (!date || !(date instanceof Date)) return null;
            return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd HH:mm:ss');
        };

        const logEntry = {
            analysis_timestamp: formatToSqlDatetime(analysisTimestamp),
            analysis_window_start: formatToSqlDatetime(windowStart),
            analysis_window_end: formatToSqlDatetime(windowEnd),
            channel_id: channelId,
            log_level: level,
            message: message.substring(0, 1024), // Truncar si es muy largo
            details: null // Inicializar como null
        };

        // Validar y stringify JSON
        if (details && typeof details === 'object') {
            try {
                logEntry.details = JSON.stringify(details);
            } catch (jsonError) {
                console.error(`Error convirtiendo 'details' a JSON para log: ${jsonError.message}`);
                // Guardar el error en details o un mensaje genérico
                logEntry.details = JSON.stringify({ json_error: `Failed to stringify details: ${jsonError.message}` });
            }
        } else if (details) {
            // Si details no es un objeto, intentar convertirlo a string
            logEntry.details = JSON.stringify({ original_details: String(details) });
        }


        let connection = conn;
        let poolUsed = false;
        try {
            if (!connection) {
                connection = await this._getConnection(); // Usar método interno seguro
                poolUsed = true;
            }
            // Doble chequeo por si _getConnection falló silenciosamente (aunque no debería)
            if (!connection || typeof connection.query !== 'function') {
                console.error("Error interno: Conexión inválida para log de análisis (post _getConnection).");
                console.error(`Intento de Log Análisis (${level}): Ch=${channelId} Msg=${message}`);
                return;
            }

            await connection.query("INSERT INTO notification_analysis_log SET ?", logEntry);

        } catch (dbError) {
            // Evitar bucle infinito si el log falla por problema de conexión
            console.error(`❌ Error al registrar en notification_analysis_log: ${dbError.message}`);
            console.error(`   -> Mensaje original (${level}): Ch=${channelId} Msg=${message}`);
            // No intentar loguear el error a la misma tabla
        } finally {
            // Solo liberar si obtuvimos una conexión nueva aquí
            if (connection && poolUsed) {
                try {
                    connection.release();
                } catch (releaseError) {
                    console.error(`Error liberando conexión post-log: ${releaseError.message}`);
                }
            }
        }
    }

    /**
     * Realiza una consulta de prueba para verificar la disponibilidad de la base de datos.
     * @returns {Promise<Object>} Resultado de la consulta de prueba
     */
    async runTestQuery() {
        try {
            const connection = await this._getConnection();
            try {
                const [result] = await connection.query('SELECT 1 as test');
                return { 
                    success: true, 
                    result: result[0].test,
                    message: "Consulta de prueba exitosa" 
                };
            } finally {
                connection.release();
            }
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                message: "Error en consulta de prueba" 
            };
        }
    }

    /**
     * Analiza los datos de temperatura de los canales operativos en una ventana de tiempo dada.
     * Incluye logging detallado a la tabla 'notification_analysis_log'.
     * @param {string} startTimeStr - Hora de inicio ('YYYY-MM-DD HH:mm:ss').
     * @param {string} endTimeStr - Hora de fin ('YYYY-MM-DD HH:mm:ss').
     * @returns {Promise<Array<Object>>} Lista de canales en alerta.
     */
    async analyzeHourlyTemperatureData(startTimeStr, endTimeStr) {
        // Asegurar inicialización explícita primero
        if (!this.initialized) {
            console.log("[NotificationService] analyzeHourlyTemperatureData: Inicializando automáticamente...");
            await this.initialize();
        }
        
        // Marcas de tiempo para logging (usar Date objects)
        const analysisExecutionTime = new Date(); // Hora real de ejecución
        const windowStartTime = DateTime.fromFormat(startTimeStr, 'yyyy-MM-dd HH:mm:ss').toJSDate();
        const windowEndTime = DateTime.fromFormat(endTimeStr, 'yyyy-MM-dd HH:mm:ss').toJSDate();

        // Log a consola (más inmediato)
        console.log(`[NotificationService] Iniciando análisis horario: ${startTimeStr} -> ${endTimeStr}`);
        // Log inicial a la nueva tabla (sin pasar conexión, la obtendrá internamente)
        await this._logAnalysisEvent('INFO', null, 'Inicio del ciclo de análisis horario.', null, null, analysisExecutionTime, windowStartTime, windowEndTime);

        let connection;
        const channelsInAlert = [];

        try {
            connection = await this._getConnection(); // Obtener conexión para todo el proceso
            console.log("[NotificationService] Conexión (interna) a BD obtenida para análisis.");
            // Loguear obtención de conexión
            await this._logAnalysisEvent('INFO', null, 'Conexión a BD establecida.', null, connection, analysisExecutionTime, windowStartTime, windowEndTime);

            // Verificar si el pool está activo (extra check)
            if (!pool || pool.pool._closed) {
                await this._logAnalysisEvent('ERROR', null, 'Pool de conexiones parece estar cerrado antes de consultar canales.', null, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                throw new Error("Pool de conexiones cerrado.");
            }

            // Obtener conteo total de canales y canales no operativos para logging
            // Migrado: channels_ubibot → ubi_canal, esOperativa → activo
            const [totalChannelsResult] = await connection.query(
                `SELECT COUNT(*) as total FROM ubi_canal`
            );
            const [nonOperativeResult] = await connection.query(
                `SELECT COUNT(*) as count FROM ubi_canal WHERE activo = 0`
            );
            const totalChannels = totalChannelsResult[0]?.total || 0;
            const nonOperativeCount = nonOperativeResult[0]?.count || 0;

            // Obtener canales operativos
            // Migrado: channels_ubibot → ubi_canal, parametrizaciones → ubi_grupo
            // Lógica dual: COALESCE(c.umbral_min, g.temperatura_minima) — override individual tiene prioridad sobre el grupo.
            // Aliases preservan nombres de variables JS downstream (channel_id, channelName, minThreshold, maxThreshold, id_parametrizacion)
            const [channels] = await connection.query(
                `SELECT c.canal_id AS channel_id, c.nombre AS channelName,
                        COALESCE(c.umbral_min, g.temperatura_minima) AS minThreshold,
                        COALESCE(c.umbral_max, g.temperatura_maxima) AS maxThreshold,
                        c.id_preset AS id_parametrizacion
                 FROM ubi_canal c JOIN ubi_grupo g ON c.id_preset = g.id_preset
                 WHERE c.activo = 1
                   AND COALESCE(c.umbral_min, g.temperatura_minima) IS NOT NULL
                   AND COALESCE(c.umbral_max, g.temperatura_maxima) IS NOT NULL`
            );
            console.log(`[NotificationService] ${channels.length} canales operativos encontrados (${nonOperativeCount} canales no operativos omitidos, ${totalChannels} total).`);

            // Loguear conteo de canales
            await this._logAnalysisEvent('INFO', null, `Canales operativos encontrados: ${channels.length} de ${totalChannels} (${nonOperativeCount} no operativos omitidos).`,
                { operative: channels.length, nonOperative: nonOperativeCount, total: totalChannels },
                connection, analysisExecutionTime, windowStartTime, windowEndTime);


            // Bucle externo para procesar cada canal
            for (const channel of channels) {
                const { channel_id, channelName, minThreshold, maxThreshold } = channel;
                const paramId = channel.id_parametrizacion;
                let numMinThreshold, numMaxThreshold; // Definir fuera del try para scope

                // ---- INICIO Bloque Try/Catch por Canal ----
                try {
                    // Log inicio procesamiento canal
                    await this._logAnalysisEvent('DEBUG', channel_id, `Iniciando procesamiento. ParamID=${paramId}. Umbrales BD=[${minThreshold}, ${maxThreshold}]`,
                        { paramId, rawMin: minThreshold, rawMax: maxThreshold }, connection, analysisExecutionTime, windowStartTime, windowEndTime);

                    // 1. Parsear y Validar Umbrales
                    numMinThreshold = parseFloat(minThreshold);
                    numMaxThreshold = parseFloat(maxThreshold);

                    if (isNaN(numMinThreshold) || isNaN(numMaxThreshold)) {
                        // Log WARN y continuar al siguiente canal
                        await this._logAnalysisEvent('WARN', channel_id, `Umbrales inválidos (NaN desde BD). Omitiendo canal.`,
                            { rawMin: minThreshold, rawMax: maxThreshold }, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                        continue; // Saltar al siguiente canal
                    }
                    // Log umbrales parseados
                    await this._logAnalysisEvent('DEBUG', channel_id, `Umbrales parseados: [${numMinThreshold}, ${numMaxThreshold}]`,
                        { min: numMinThreshold, max: numMaxThreshold }, connection, analysisExecutionTime, windowStartTime, windowEndTime);


                    // 2. Consultar Lecturas
                    // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor; id_canal via lookup de canal_id (API ID)
                    // Aliases preservan nombres de variables JS downstream (external_temperature, external_temperature_timestamp)
                    const querySQL = `SELECT temperatura_externa AS external_temperature, fecha_lectura_externa AS external_temperature_timestamp
                                      FROM ubi_lecturas_sensor
                                      WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
                                        AND fecha_lectura_externa BETWEEN ? AND ?
                                        AND temperatura_externa IS NOT NULL
                                      ORDER BY fecha_lectura_externa ASC`;
                    const queryParams = [channel_id, startTimeStr, endTimeStr];
                    // Log antes de consulta
                    await this._logAnalysisEvent('DEBUG', channel_id, `Ejecutando consulta de lecturas...`, { sql: querySQL.substring(0, 200), params: queryParams }, connection, analysisExecutionTime, windowStartTime, windowEndTime);

                    const [readings] = await connection.query(querySQL, queryParams);
                    const readingCount = readings.length; // Número total de filas recuperadas

                    // Log después de consulta
                    await this._logAnalysisEvent('DEBUG', channel_id, `Consulta completada. Lecturas encontradas: ${readingCount}`, { count: readingCount }, connection, analysisExecutionTime, windowStartTime, windowEndTime);


                    // 3. Validar Mínimo de Datos INICIAL
                    if (readingCount < MIN_READINGS_REQUIRED) {
                        // Log WARN y continuar
                        await this._logAnalysisEvent('WARN', channel_id, `Omitiendo canal: Datos insuficientes encontrados [${readingCount}/${MIN_READINGS_REQUIRED}].`,
                            { found: readingCount, required: MIN_READINGS_REQUIRED }, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                        continue;
                    }

                    // 4. Analizar Lecturas con forEach
                    let allOutOfRange = true; // Asumir verdad inicial
                    let sumTemperature = 0;
                    let validReadingCount = 0; // Contar solo las válidas numéricamente
                    let firstInRangeReading = null; // Para loguear la primera lectura DENTRO
                    let firstOutOfRangeReading = null; // Para loguear la primera lectura FUERA
                    let invalidReadingsFound = []; // Para loguear lecturas inválidas

                    readings.forEach((reading, index) => {
                        const temp = reading.external_temperature; // Debería ser número por decimalNumbers:true
                        const tempTs = reading.external_temperature_timestamp; // Debería ser Date object

                        if (typeof temp === 'number' && !isNaN(temp)) {
                            validReadingCount++;
                            sumTemperature += temp;
                            const isInside = temp >= numMinThreshold && temp <= numMaxThreshold;

                            // Log detallado de cada lectura (controlado por nivel DEBUG)
                            this._logAnalysisEvent('DEBUG', channel_id, `Lectura #${index + 1}: Temp=${temp.toFixed(2)}, TS=${DateTime.fromJSDate(tempTs instanceof Date ? tempTs : new Date(tempTs)).toISO()}, DentroRango=${isInside}`,
                                { index: index + 1, temp: temp.toFixed(2), ts: DateTime.fromJSDate(tempTs instanceof Date ? tempTs : new Date(tempTs)).toISO(), inRange: isInside }, connection, analysisExecutionTime, windowStartTime, windowEndTime);


                            if (isInside) {
                                allOutOfRange = false; // Marcar si *alguna* está dentro
                                if (!firstInRangeReading) firstInRangeReading = { temp: temp.toFixed(2), ts: DateTime.fromJSDate(tempTs instanceof Date ? tempTs : new Date(tempTs)).toISO() };
                            } else {
                                if (!firstOutOfRangeReading) firstOutOfRangeReading = { temp: temp.toFixed(2), ts: DateTime.fromJSDate(tempTs instanceof Date ? tempTs : new Date(tempTs)).toISO() };
                            }
                        } else {
                            // Log WARN para lecturas inválidas
                            const invalidData = { index: index + 1, value: temp, type: typeof temp, ts: tempTs ? DateTime.fromJSDate(tempTs instanceof Date ? tempTs : new Date(tempTs)).toISO() : null };
                            invalidReadingsFound.push(invalidData);
                            this._logAnalysisEvent('WARN', channel_id, `Lectura #${index + 1} inválida/no numérica omitida.`,
                                invalidData, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                        }
                    }); // Fin forEach

                    // Log resumen del análisis de lecturas
                    await this._logAnalysisEvent('DEBUG', channel_id, `Análisis de lecturas completado. validReadingCount=${validReadingCount}, allOutOfRange=${allOutOfRange}.`,
                        { validCount: validReadingCount, allOut: allOutOfRange, firstIn: firstInRangeReading, firstOut: firstOutOfRangeReading, invalidCount: invalidReadingsFound.length }, connection, analysisExecutionTime, windowStartTime, windowEndTime);


                    // 5. Evaluar Resultado Post-Bucle
                    if (validReadingCount < MIN_READINGS_REQUIRED) {
                        // Log WARN y continuar (ya no se omite aquí, se omite en el paso 3)
                        await this._logAnalysisEvent('WARN', channel_id, `Omitiendo canal: Datos válidos insuficientes post-análisis [${validReadingCount}/${MIN_READINGS_REQUIRED}].`,
                            { validCount: validReadingCount, required: MIN_READINGS_REQUIRED, totalFound: readingCount }, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                    } else if (!allOutOfRange) { // Si se encontró al menos una lectura dentro (y hubo suficientes válidas)
                        // Log INFO canal OK
                        await this._logAnalysisEvent('INFO', channel_id, `Canal OK (lecturas encontradas dentro del rango).`,
                            { firstInRange: firstInRangeReading, validCount: validReadingCount }, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                    } else {
                        // Si llegamos aquí, es porque:
                        // - validReadingCount >= MIN_READINGS_REQUIRED
                        // - Y NINGUNA lectura válida estuvo dentro (allOutOfRange == true)

                        const averageTemperature = sumTemperature / validReadingCount;
                        const centerThreshold = (numMinThreshold + numMaxThreshold) / 2;
                        const status = averageTemperature < centerThreshold ? "Baja" : "Alta";

                        // Construir objeto de alerta
                        const alertData = {
                            channelId: channel_id,
                            channelName: channelName,
                            averageTemperature: parseFloat(averageTemperature.toFixed(2)), // Mantener número
                            status: status,
                            minThreshold: numMinThreshold,
                            maxThreshold: numMaxThreshold,
                        };
                        channelsInAlert.push(alertData); // Añadir a la lista de resultados

                        // Log WARN confirmando la alerta
                        await this._logAnalysisEvent('WARN', channel_id, `ALERTA CONFIRMADA: Canal consistentemente fuera de rango. Añadido a resultados.`,
                            { avgTemp: alertData.averageTemperature, status: alertData.status, validCount: validReadingCount, range: `[${numMinThreshold}, ${numMaxThreshold}]` }, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                    }

                } catch (channelError) { // ---- FIN Bloque Try por Canal ----
                    // Loguear error específico del canal y continuar
                    console.error(`❌ Error procesando canal ${channel_id} (${channelName}): ${channelError.message}`);
                    // Log ERROR a la tabla
                    await this._logAnalysisEvent('ERROR', channel_id, `Error durante el procesamiento del canal: ${channelError.message}`,
                        { stack: channelError.stack?.substring(0, 500) }, connection, analysisExecutionTime, windowStartTime, windowEndTime);
                    // Importante: El bucle 'for' continuará con el siguiente canal
                }
            } // Fin bucle for (channels)

            console.log(`[NotificationService] Análisis horario finalizado. ${channelsInAlert.length} canales en alerta encontrados.`);
            // Log INFO resumen final
            await this._logAnalysisEvent('INFO', null, `Análisis horario finalizado. Canales en alerta: ${channelsInAlert.length}.`,
                { alertCount: channelsInAlert.length, alertChannelIds: channelsInAlert.map(c => c.channelId) }, connection, analysisExecutionTime, windowStartTime, windowEndTime);

            return channelsInAlert; // Devolver la lista de canales en alerta

        } catch (error) { // Captura errores generales (obtención de conexión, consulta de canales inicial, etc.)
            const fatalErrorMsg = `Error fatal durante análisis horario: ${error.message}`;
            console.error(`❌ [NotificationService] ${fatalErrorMsg}`);
            // Intentar loguear el error fatal a la tabla, puede fallar si no hay conexión
            await this._logAnalysisEvent('ERROR', null, `Error fatal durante análisis horario: ${error.message}`,
                { stack: error.stack?.substring(0, 500) }, connection || null, analysisExecutionTime, windowStartTime, windowEndTime);
            throw error; // Relanzar para que el proceso que llamó sepa del fallo
        } finally {
            // Liberar la conexión si se obtuvo correctamente al inicio
            if (connection) {
                try {
                    connection.release();
                    console.log("[NotificationService] Conexión (interna) a BD liberada post-análisis.");
                    // Opcional: Loguear liberación a la tabla
                    await this._logAnalysisEvent('INFO', null, 'Conexión a BD liberada.', null, null, analysisExecutionTime, windowStartTime, windowEndTime);
                } catch (releaseError) {
                    console.error(`Error liberando conexión BD post-análisis: ${releaseError.message}`);
                    // No intentar loguear este error a la BD
                }
            }
        }
    } // Fin analyzeHourlyTemperatureData

} // Fin Clase NotificationService

// Crear instancia singleton
const serviceInstance = new NotificationService();

// Inicialización asíncrona del pool INTERNO al cargar el módulo
// No auto-inicializar al cargar: initialize() se llama desde server.js (initializeServices) tras configLoader.initialize().
module.exports = serviceInstance;