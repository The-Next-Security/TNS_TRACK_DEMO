// src/services/ubibotService.js

const mysql = require("mysql2/promise");
const configLoader = require("../../config/js_files/config-loader");
const notificationController = require("../../controllers/notificationController");
const { convertToMySQLDateTime } = require("../../utils/transformUtils");
const moment = require("moment-timezone");

// Variable para el pool, se inicializará después de cargar la config
let pool = null;

// Función para inicializar el pool (se llamará una vez)
async function initializePool() {
    if (pool) return;
    try {
        const dbConfig = configLoader.getConfig().database;
        pool = mysql.createPool({
            host: dbConfig.host,
            user: dbConfig.username,
            password: dbConfig.password,
            database: dbConfig.database,
            waitForConnections: true,
            connectionLimit: dbConfig.pool?.max_size || 10,
            queueLimit: 0,
        });
        console.log("[UbibotService] Pool de conexiones MySQL inicializado.");
    } catch (error) {
        console.error("❌ [UbibotService] Error CRÍTICO al inicializar el pool de conexiones:", error.message);
        throw error;
    }
}

class UbibotService {
    constructor() {
        try {
            const { ubibot: ubibotConfig, alertSystem } = configLoader.getConfig();

            // Validar configuración (sin cambios)
            const accountKeyValue = ubibotConfig?.account_key;
            const tokenFilePathValue = ubibotConfig?.token_file;
            if (!accountKeyValue || typeof accountKeyValue !== 'string' || accountKeyValue.trim() === '') {
                console.error("❌ [UbibotService] Configuración crítica faltante o vacía: ubibot.account_key.");
                this.accountKey = null;
            } else {
                this.accountKey = accountKeyValue.trim();
            }
            if (!tokenFilePathValue || typeof tokenFilePathValue !== 'string' || tokenFilePathValue.trim() === '') {
                console.error("❌ [UbibotService] Configuración crítica faltante o vacía: ubibot.token_file.");
                this.tokenFile = null;
            } else {
                this.tokenFile = tokenFilePathValue;
            }

            this.timeZone = alertSystem?.timeZone || "America/Santiago";

            // Asegurar que el pool se inicialice
            if (!pool) {
                initializePool(); // Llamar a la inicialización si no está listo
            }

            console.log("✅ UbibotService inicializado/instanciado (Lógica Temp Removida).");

        } catch (error) {
            console.error("💥 [UbibotService] Error CRÍTICO en el constructor:", error.message);
            throw error;
        }
    }

    /**
     * Obtiene una conexión del pool.
     * @private
     */
    async _getConnection() {
        if (!pool) {
          console.error("❌ [UbibotService] Intento de obtener conexión pero el pool no está inicializado.");
          throw new Error("Pool de base de datos no inicializado para UbibotService.");
        }
        return await pool.getConnection();
    }

    /**
     * Convierte una fecha/hora UTC a una fecha/hora en la zona horaria configurada.
     * @param {string|Date} utcTime - Fecha/hora en UTC.
     * @returns {moment.Moment} Fecha/hora local.
     */
    getLocalTime(utcTime) {
        // ... (sin cambios)
        return moment.utc(utcTime).tz(this.timeZone);
    }

    /**
     * Procesa los datos de un canal de Ubibot recibidos de la API.
     * Actualiza la información del canal en la BD y su estado de conexión (delegando a updateConnectionStatus).
     * @param {Object} channelData - Datos del canal obtenidos de la API de Ubibot.
     * @returns {Promise<boolean>} true si el procesamiento fue exitoso.
     */
    async processChannelData(channelData) {
        // --- Lógica principal sin cambios ---
        if (!channelData || !channelData.channel_id) {
          console.warn("[UbibotService] processChannelData: Se recibieron datos de canal inválidos o sin channel_id.");
          return false;
        }
        console.log(`[UbibotService] processChannelData: Procesando canal ${channelData.channel_id} (${channelData.name || 'Sin Nombre'})...`);
        const connection = await this._getConnection();
        try {
            const [existingChannelRows] = await connection.query( /* ... consulta ... */
                "SELECT * FROM channels_ubibot WHERE channel_id = ?", [channelData.channel_id]
            );
            const existingChannel = existingChannelRows[0];
            const basicInfo = { /* ... extraer info ... */
                product_id: channelData.product_id, device_id: channelData.device_id, latitude: channelData.latitude,
                longitude: channelData.longitude, firmware: channelData.firmware, mac_address: channelData.mac_address,
                last_entry_date: channelData.last_entry_date ? new Date(channelData.last_entry_date) : null,
                created_at: channelData.created_at ? new Date(channelData.created_at) : null,
                name: channelData.name || `Canal ${channelData.channel_id}`,
             };
            const isOnline = channelData.net === "1" || channelData.net === 1;
            const currentTime = new Date();

            if (!existingChannel) {
                // Insertar nuevo canal (lógica sin cambios)
                console.log(`[UbibotService] processChannelData: Canal ${channelData.channel_id} es nuevo. Insertando...`);
                const newChannelData = { /* ... construir datos ... */
                    ...basicInfo, channel_id: channelData.channel_id, is_currently_out_of_range: isOnline ? 0 : 1,
                    out_of_range_since: isOnline ? null : currentTime, last_alert_sent: null, esOperativa: 1,
                    id_parametrizacion: 7, ubicacion_real: 1,
                 };
                await connection.query("INSERT INTO channels_ubibot SET ?", newChannelData);
                console.log(`[UbibotService] processChannelData: Canal ${channelData.channel_id} insertado.`);
                // Notificar posible desconexión inicial (esta lógica es de conexión, no temperatura)
                 if (!isOnline && newChannelData.esOperativa === 1) {
                    // **** LLAMADA A MÉTODO INTERNO ****
                    await this.updateConnectionStatus(connection, channelData.channel_id, newChannelData.name, isOnline, false, true, null, currentTime);
                }

            } else {
                // Actualizar canal existente
                console.log(`[UbibotService] processChannelData: Canal ${channelData.channel_id} existe. Verificando actualizaciones...`);
                const wasOffline = existingChannel.is_currently_out_of_range === 1;
                const isOperational = existingChannel.esOperativa === 1;

                // Actualizar campos básicos si cambiaron (lógica sin cambios)
                const fieldsToUpdate = {}; let hasChanges = false;
                for (const key in basicInfo) { /* ... comparar y añadir a fieldsToUpdate ... */
                   let apiValue = basicInfo[key]; let dbValue = existingChannel[key];
                   if (apiValue instanceof Date) apiValue = apiValue.getTime();
                   if (dbValue instanceof Date) dbValue = dbValue.getTime();
                   if (apiValue !== dbValue) { fieldsToUpdate[key] = basicInfo[key]; hasChanges = true; }
                }
                if (hasChanges) {
                    console.log(`[UbibotService] processChannelData: Actualizando ${Object.keys(fieldsToUpdate).length} campos básicos para canal ${channelData.channel_id}...`);
                    await connection.query( "UPDATE channels_ubibot SET ? WHERE channel_id = ?", [fieldsToUpdate, channelData.channel_id] );
                } else {
                    console.log(`[UbibotService] processChannelData: Sin cambios en datos básicos para canal ${channelData.channel_id}.`);
                }

                await this.updateConnectionStatus( connection, channelData.channel_id, existingChannel.name, isOnline, wasOffline, isOperational, existingChannel, currentTime );
            }
            return true;
        } catch (error) {
            console.error(`❌ [UbibotService] Error en processChannelData para canal ${channelData.channel_id}:`, error.message);
            return false;
        } finally {
            if (connection) connection.release();
            console.log(`[UbibotService] processChannelData: Conexión liberada para canal ${channelData.channel_id}.`);
        }
    }

    /**
     * Actualiza el estado de conexión de un canal en la BD y notifica al controlador si es operativo.
     * **NOTA:** Esta función ahora llama a notificationController.processConnectionStatusChange,
     * que SÍ existe y se usa para las alertas de *desconexión*.
     * @param {mysql.PoolConnection} connection - Conexión activa.
     * @param {string} channelId - ID del canal.
     * @param {string} channelName - Nombre del canal.
     * @param {boolean} isOnline - Estado actual de la API.
     * @param {boolean} wasOffline - Estado previo en BD.
     * @param {boolean} isOperational - Operatividad en BD.
     * @param {Object|null} currentChannel - Datos actuales de BD.
     * @param {Date} currentTime - Timestamp actual.
     * @returns {Promise<boolean>}
     */
    async updateConnectionStatus( connection, channelId, channelName, isOnline, wasOffline, isOperational, currentChannel, currentTime ) {
         console.log(`[UbibotService] updateConnectionStatus: Canal ${channelId}, isOnline=${isOnline}, wasOffline=${wasOffline}, isOperational=${isOperational}`);
         try {
            // Ignorar si no es operativo (lógica sin cambios)
             if (!isOperational) {
                 console.log(`[UbibotService] updateConnectionStatus: Canal ${channelId} NO operativo. Evento ignorado para notificaciones.`);
                 // Actualizar BD igualmente
                 if (isOnline && wasOffline) { await connection.query("UPDATE channels_ubibot SET is_currently_out_of_range = 0 WHERE channel_id = ?", [channelId]); }
                 else if (!isOnline && !wasOffline) { await connection.query("UPDATE channels_ubibot SET is_currently_out_of_range = 1, out_of_range_since = ? WHERE channel_id = ?", [currentTime, channelId]); }
                 return true;
             }

             // Lógica de Actualización BD y Notificación (SOLO SI ES OPERATIVO)
             let stateChanged = false;
             if (isOnline && wasOffline) { // Reconexión
                 stateChanged = true;
                 console.log(`[UbibotService] updateConnectionStatus: Detectada RECONEXIÓN para canal ${channelId}.`);
                 await connection.query("UPDATE channels_ubibot SET is_currently_out_of_range = 0 WHERE channel_id = ?", [channelId]);
             } else if (!isOnline && !wasOffline) { // Nueva Desconexión
                 stateChanged = true;
                 console.log(`[UbibotService] updateConnectionStatus: Detectada NUEVA DESCONEXIÓN para canal ${channelId}.`);
                 await connection.query("UPDATE channels_ubibot SET is_currently_out_of_range = 1, out_of_range_since = ? WHERE channel_id = ?", [currentTime, channelId]);
             } else {
                 // Sin cambio de estado relevante
                 console.log(`[UbibotService] updateConnectionStatus: Sin cambio de estado relevante para ${channelId}.`);
             }

             // Notificar al controlador SOLO si hubo cambio de estado Y es operativo
             if (stateChanged) {
                 console.log(`[UbibotService] updateConnectionStatus: Hubo cambio de estado, llamando a notificationController.processConnectionStatusChange para ${channelId}...`);
                 // **** LLAMADA A NOTIFICATION CONTROLLER (para desconexiones) ****
                 await notificationController.processConnectionStatusChange(
                     channelId, channelName ?? `Canal ${channelId}`, isOnline, wasOffline,
                     isOnline ? currentChannel?.out_of_range_since : currentTime, // Timestamp relevante
                     currentChannel?.last_alert_sent, isOperational
                 );
                 console.log(`[UbibotService] updateConnectionStatus: Llamada a notificationController completada para ${channelId}.`);
             }
             return true;
         } catch (error) {
             console.error(`❌ [UbibotService] Error en updateConnectionStatus para canal ${channelId}:`, error.message);
             return false;
         }
    }


    /**
     * Procesa las lecturas de sensores (temperatura, etc.) y las inserta en la BD.
     * Ya NO llama a la verificación de parámetros para alertas de temperatura.
     * @param {string} channelId - ID del canal.
     * @param {Object} lastValues - Objeto con los últimos valores leídos (ya parseado).
     * @returns {Promise<boolean>} true si el procesamiento fue exitoso.
     */
    async processSensorReadings(channelId, lastValues) {
        if (!channelId || !lastValues || typeof lastValues !== 'object' || !lastValues.field1?.created_at) {
            console.warn(`[UbibotService] processSensorReadings: Datos inválidos o timestamp faltante para canal ${channelId}.`);
            return false;
        }
        console.log(`[UbibotService] processSensorReadings: Procesando lecturas para canal ${channelId}...`);

        const connection = await this._getConnection();
        try {
            const utcTimestamp = moment.utc(lastValues.field1.created_at);
            if (!utcTimestamp.isValid()) {
                console.error(`[UbibotService] processSensorReadings: Timestamp inválido en field1 para canal ${channelId}: ${lastValues.field1.created_at}`);
                return false;
            }
            const santiagoTime = this.getLocalTime(utcTimestamp);
            const utcDateObject = utcTimestamp.toDate();

            const dataToInsert = { /* ... construir datos ... */
                channel_id: channelId, timestamp: utcDateObject,
                temperature: lastValues.field1?.value !== undefined ? parseFloat(lastValues.field1.value) : null,
                humidity: lastValues.field2?.value !== undefined ? parseFloat(lastValues.field2.value) : null,
                light: lastValues.field3?.value !== undefined ? parseFloat(lastValues.field3.value) : null,
                voltage: lastValues.field4?.value !== undefined ? parseFloat(lastValues.field4.value) : null,
                wifi_rssi: lastValues.field5?.value !== undefined ? parseInt(lastValues.field5.value, 10) : null,
                external_temperature: lastValues.field8?.value !== undefined ? parseFloat(lastValues.field8.value) : null,
                external_temperature_timestamp: lastValues.field8?.created_at ? convertToMySQLDateTime(lastValues.field8.created_at) : null,
                insercion: santiagoTime.format("YYYY-MM-DD HH:mm:ss"),
            };
            for (const key in dataToInsert) { // Reemplazar NaN
                if (Number.isNaN(dataToInsert[key])) dataToInsert[key] = null;
            }

            await connection.query("INSERT INTO sensor_readings_ubibot SET ?", dataToInsert);
            console.log(`[UbibotService] processSensorReadings: Datos insertados para canal ${channelId} (Timestamp UTC: ${utcTimestamp.format()})`);


            return true; // Éxito

        } catch (error) {
            console.error(`❌ [UbibotService] Error en processSensorReadings para canal ${channelId}:`, error.message);
            return false;
        } finally {
            if (connection) connection.release();
            // ELIMINADO Log redundante de liberación
            // console.log(`[UbibotService] processSensorReadings: Conexión liberada para canal ${channelId}.`);
        }
    }

    /**
     * Obtiene el timestamp de la última lectura registrada para un canal.
     * (Sin cambios)
     * @param {string} channelId - ID del canal.
     * @returns {Promise<Object|null>} Objeto con { external_temperature_timestamp } o null.
     */
    async getLastSensorReading(channelId) {
        // ... (sin cambios)
        if (!channelId) return null;
        const connection = await this._getConnection();
        try {
          const [rows] = await connection.query( "SELECT MAX(external_temperature_timestamp) AS external_temperature_timestamp FROM sensor_readings_ubibot WHERE channel_id = ?", [channelId] );
          return rows[0];
        } catch (error) {
          console.error(`❌ [UbibotService] Error en getLastSensorReading para canal ${channelId}:`, error.message);
          return null;
        } finally {
          if (connection) connection.release();
        }
    }
}

// Inicialización del pool (sin cambios)
(async () => {
    try { await initializePool(); } catch (e) { /* error ya logueado */ }
})();

module.exports = new UbibotService();