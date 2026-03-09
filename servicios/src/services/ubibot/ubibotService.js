// src/services/ubibot/ubibotService.js

const mysql = require("mysql2/promise");
const configLoader = require("../../config/js_files/configLoader_Config");
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
        // No leer config en constructor. Se asigna en init() tras configLoader.initialize().
        this.accountKey = null;
        this.tokenFile = null;
        this.timeZone = "America/Santiago";
        console.log("[UbibotService] Instancia creada (config en init()).");
    }

    /**
     * Carga config. Llamar desde boot() tras configLoader.initialize().
     */
    init() {
        const { ubibot: ubibotConfig, alertSystem } = configLoader.getConfig();
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
        console.log("✅ UbibotService init completado.");
    }

    /**
     * Obtiene una conexión del pool.
     * @private
     */
    async _getConnection() {
        if (!pool) await initializePool();
        return await pool.getConnection();
    }

    /**
     * Convierte una fecha/hora UTC a la zona horaria configurada.
     * @param {string|Date} utcTime
     * @returns {moment.Moment}
     */
    getLocalTime(utcTime) {
        return moment.utc(utcTime).tz(this.timeZone);
    }

    /**
     * Procesa los datos de un canal recibidos de la API de Ubibot.
     * Inserta el canal si es nuevo o actualiza sus datos básicos y estado de conexión.
     *
     * Mapeo API → ubi_canal:
     *   channel_id      → canal_id
     *   name            → nombre
     *   product_id      → id_producto
     *   device_id       → id_dispositivo
     *   latitude        → latitud
     *   longitude       → longitud
     *   firmware        → firmware
     *   mac_address     → mac_address
     *   net             → en_linea  (1=online, 0=offline)
     *   last_entry_date → ultima_lectura_ubibot
     *   full_serial     → serial
     *   last_ip         → ultima_ip
     *   device_health.score → puntaje_salud
     *
     * @param {Object} channelData - Datos del canal obtenidos de la API de Ubibot.
     * @returns {Promise<boolean>}
     */
    async processChannelData(channelData) {
        if (!channelData || !channelData.channel_id) {
            console.warn("[UbibotService] processChannelData: datos de canal inválidos o sin channel_id.");
            return false;
        }

        console.log(`[UbibotService] processChannelData: Procesando canal ${channelData.channel_id} (${channelData.name || 'Sin Nombre'})...`);
        const connection = await this._getConnection();
        try {
            const [existingRows] = await connection.query(
                "SELECT * FROM ubi_canal WHERE canal_id = ?",
                [channelData.channel_id]
            );
            const existingChannel = existingRows[0];

            const isOnline = channelData.net === "1" || channelData.net === 1;
            const currentTime = new Date();

            // Campos que se sincronizan desde la API en cada ciclo
            const basicInfo = {
                nombre:               channelData.name || `Canal ${channelData.channel_id}`,
                id_producto:          channelData.product_id || null,
                id_dispositivo:       channelData.device_id || null,
                latitud:              channelData.latitude || null,
                longitud:             channelData.longitude || null,
                firmware:             channelData.firmware || null,
                mac_address:          channelData.mac_address || null,
                en_linea:             isOnline ? 1 : 0,
                ultima_lectura_ubibot: channelData.last_entry_date
                    ? new Date(channelData.last_entry_date)
                    : null,
                serial:               channelData.full_serial || null,
                ultima_ip:            channelData.last_ip || null,
                puntaje_salud:        channelData.device_health?.score ?? null,
            };

            if (!existingChannel) {
                // Canal nuevo: insertar con valores por defecto para campos de negocio
                console.log(`[UbibotService] processChannelData: Canal ${channelData.channel_id} es nuevo. Insertando en ubi_canal...`);
                const newChannel = {
                    ...basicInfo,
                    canal_id:                    channelData.channel_id,
                    id_ubicacion_real:            1,      // Sin asignar — el operador deberá configurarlo
                    temperatura_minima_umbral:    -25.00, // Umbral por defecto para refrigeración
                    temperatura_maxima_umbral:    -10.00,
                    usuario_actualizacion_umbral: 'sistema',
                    fuera_linea_desde:            isOnline ? null : currentTime,
                    activo:                       1,
                };
                await connection.query("INSERT INTO ubi_canal SET ?", newChannel);
                console.log(`[UbibotService] processChannelData: Canal ${channelData.channel_id} insertado en ubi_canal.`);

            } else {
                // Canal existente: actualizar campos básicos y estado de conexión
                console.log(`[UbibotService] processChannelData: Canal ${channelData.channel_id} existe. Actualizando...`);

                const wasOnline = existingChannel.en_linea === 1;
                const updateData = { ...basicInfo };

                // Gestionar timestamp de desconexión
                if (!isOnline && wasOnline) {
                    updateData.fuera_linea_desde = currentTime; // Nueva desconexión
                } else if (isOnline && !wasOnline) {
                    updateData.fuera_linea_desde = null;        // Reconexión
                }

                await connection.query(
                    "UPDATE ubi_canal SET ? WHERE canal_id = ?",
                    [updateData, channelData.channel_id]
                );

                // Notificar cambios de estado de conexión
                await this.updateConnectionStatus(
                    connection,
                    channelData.channel_id,
                    existingChannel.nombre,
                    isOnline,
                    !wasOnline,             // wasOffline
                    existingChannel.activo === 1,
                    existingChannel,
                    currentTime
                );
            }
            return true;

        } catch (error) {
            console.error(`❌ [UbibotService] Error en processChannelData para canal ${channelData.channel_id}:`, error.message);
            return false;
        } finally {
            connection.release();
            console.log(`[UbibotService] processChannelData: Conexión liberada para canal ${channelData.channel_id}.`);
        }
    }

    /**
     * Actualiza el estado de conexión de un canal y notifica si corresponde.
     * Trabaja sobre ubi_canal usando canal_id como identificador natural de Ubibot.
     *
     * Mapeo de estados:
     *   Old: is_currently_out_of_range=1 → New: en_linea=0
     *   Old: out_of_range_since          → New: fuera_linea_desde
     *   Old: esOperativa                 → New: activo
     *   Old: last_alert_sent             → New: ultima_alerta_enviada
     *
     * @param {mysql.PoolConnection} connection
     * @param {string} canalId - ID natural de Ubibot (channel_id en la API).
     * @param {string} channelName
     * @param {boolean} isOnline
     * @param {boolean} wasOffline - Estado previo: true si estaba desconectado.
     * @param {boolean} isOperational - Equivalente a activo=1 en ubi_canal.
     * @param {Object|null} currentChannel - Fila actual de ubi_canal.
     * @param {Date} currentTime
     * @returns {Promise<boolean>}
     */
    async updateConnectionStatus(connection, canalId, channelName, isOnline, wasOffline, isOperational, currentChannel, currentTime) {
        console.log(`[UbibotService] updateConnectionStatus: Canal ${canalId}, isOnline=${isOnline}, wasOffline=${wasOffline}, isOperational=${isOperational}`);
        try {
            if (!isOperational) {
                console.log(`[UbibotService] updateConnectionStatus: Canal ${canalId} NO activo. Ignorando notificaciones.`);
                // Actualizar estado en BD igualmente
                if (isOnline && wasOffline) {
                    await connection.query(
                        "UPDATE ubi_canal SET en_linea = 1, fuera_linea_desde = NULL WHERE canal_id = ?",
                        [canalId]
                    );
                } else if (!isOnline && !wasOffline) {
                    await connection.query(
                        "UPDATE ubi_canal SET en_linea = 0, fuera_linea_desde = ? WHERE canal_id = ?",
                        [currentTime, canalId]
                    );
                }
                return true;
            }

            let stateChanged = false;
            if (isOnline && wasOffline) {
                stateChanged = true;
                console.log(`[UbibotService] updateConnectionStatus: RECONEXIÓN detectada para canal ${canalId}.`);
                await connection.query(
                    "UPDATE ubi_canal SET en_linea = 1, fuera_linea_desde = NULL WHERE canal_id = ?",
                    [canalId]
                );
            } else if (!isOnline && !wasOffline) {
                stateChanged = true;
                console.log(`[UbibotService] updateConnectionStatus: NUEVA DESCONEXIÓN detectada para canal ${canalId}.`);
                await connection.query(
                    "UPDATE ubi_canal SET en_linea = 0, fuera_linea_desde = ? WHERE canal_id = ?",
                    [currentTime, canalId]
                );
            } else {
                console.log(`[UbibotService] updateConnectionStatus: Sin cambio de estado para canal ${canalId}.`);
            }

            if (stateChanged) {
                console.log(`[UbibotService] updateConnectionStatus: Notificando cambio de estado para canal ${canalId}...`);
                await notificationController.processConnectionStatusChange(
                    canalId,
                    channelName ?? `Canal ${canalId}`,
                    isOnline,
                    wasOffline,
                    isOnline ? currentChannel?.fuera_linea_desde : currentTime,
                    currentChannel?.ultima_alerta_enviada,
                    isOperational
                );
                console.log(`[UbibotService] updateConnectionStatus: Notificación completada para canal ${canalId}.`);
            }
            return true;

        } catch (error) {
            console.error(`❌ [UbibotService] Error en updateConnectionStatus para canal ${canalId}:`, error.message);
            return false;
        }
    }

    /**
     * Procesa e inserta las lecturas de sensores de un canal en ubi_lecturas_sensor.
     *
     * Mapeo last_values → ubi_lecturas_sensor:
     *   field1 → temperatura           (temp. ambiente interior del sensor)
     *   field2 → humedad
     *   field3 → luz
     *   field4 → voltaje
     *   field5 → wifi_rssi
     *   field8 → temperatura_externa   (sonda exterior — dato principal de refrigeración)
     *   field8.created_at → fecha_lectura_externa
     *   field1.created_at → fecha_lectura
     *   channel.net → en_linea_lectura
     *
     * @param {string} canalId - ID natural de Ubibot (channel_id en la API).
     * @param {Object} lastValues - Objeto last_values ya parseado desde JSON.
     * @param {string|number|null} channelNet - Valor de channel.net ('1' = online, '0' = offline).
     * @returns {Promise<boolean>}
     */
    async processSensorReadings(canalId, lastValues, channelNet = null) {
        if (!canalId || !lastValues || typeof lastValues !== 'object' || !lastValues.field1?.created_at) {
            console.warn(`[UbibotService] processSensorReadings: Datos inválidos o timestamp faltante para canal ${canalId}.`);
            return false;
        }

        console.log(`[UbibotService] processSensorReadings: Procesando lecturas para canal ${canalId}...`);
        const connection = await this._getConnection();
        try {
            // Resolver canal_id de Ubibot → id_canal interno de ubi_canal
            const [canalRows] = await connection.query(
                "SELECT id_canal, activo FROM ubi_canal WHERE canal_id = ?",
                [canalId]
            );
            if (!canalRows.length) {
                console.warn(`[UbibotService] processSensorReadings: Canal ${canalId} no existe en ubi_canal. Omitiendo lectura.`);
                return false;
            }
            const { id_canal, activo } = canalRows[0];
            if (!activo) {
                console.log(`[UbibotService] processSensorReadings: Canal ${canalId} está inactivo. Omitiendo lectura.`);
                return false;
            }

            // Timestamp principal: field1 (temperatura ambiente)
            const utcTimestamp = moment.utc(lastValues.field1.created_at);
            if (!utcTimestamp.isValid()) {
                console.error(`[UbibotService] processSensorReadings: Timestamp inválido en field1 para canal ${canalId}: ${lastValues.field1.created_at}`);
                return false;
            }

            // Timestamp sonda externa: field8 (puede diferir del ciclo principal)
            const field8CreatedAt = lastValues.field8?.created_at
                ? convertToMySQLDateTime(lastValues.field8.created_at)
                : null;

            const dataToInsert = {
                id_canal,
                temperatura:          lastValues.field1?.value !== undefined ? parseFloat(lastValues.field1.value) : null,
                humedad:              lastValues.field2?.value !== undefined ? parseFloat(lastValues.field2.value) : null,
                luz:                  lastValues.field3?.value !== undefined ? parseFloat(lastValues.field3.value) : null,
                voltaje:              lastValues.field4?.value !== undefined ? parseFloat(lastValues.field4.value) : null,
                temperatura_externa:  lastValues.field8?.value !== undefined ? parseFloat(lastValues.field8.value) : null,
                fecha_lectura_externa: field8CreatedAt,
                wifi_rssi:            lastValues.field5?.value !== undefined ? parseInt(lastValues.field5.value, 10) : null,
                en_linea_lectura:     channelNet !== null ? (channelNet === '1' || channelNet === 1 ? 1 : 0) : null,
                fecha_lectura:        utcTimestamp.toDate(),
            };

            // Limpiar NaN por si algún parseFloat/parseInt falló
            for (const key in dataToInsert) {
                if (Number.isNaN(dataToInsert[key])) dataToInsert[key] = null;
            }

            await connection.query("INSERT INTO ubi_lecturas_sensor SET ?", dataToInsert);
            console.log(`[UbibotService] processSensorReadings: Lectura insertada para canal ${canalId} (id_canal=${id_canal}, fecha_lectura=${utcTimestamp.format()})`);

            return true;

        } catch (error) {
            console.error(`❌ [UbibotService] Error en processSensorReadings para canal ${canalId}:`, error.message);
            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene el timestamp de la última lectura de sonda externa para un canal.
     * Útil para detectar sensores silenciosos.
     *
     * @param {string} canalId - ID natural de Ubibot (channel_id en la API).
     * @returns {Promise<Object|null>} { fecha_lectura_externa } o null.
     */
    async getLastSensorReading(canalId) {
        if (!canalId) return null;
        const connection = await this._getConnection();
        try {
            // Primero resolver canal_id → id_canal
            const [canalRows] = await connection.query(
                "SELECT id_canal FROM ubi_canal WHERE canal_id = ?",
                [canalId]
            );
            if (!canalRows.length) return null;

            const { id_canal } = canalRows[0];
            const [rows] = await connection.query(
                "SELECT MAX(fecha_lectura_externa) AS fecha_lectura_externa FROM ubi_lecturas_sensor WHERE id_canal = ?",
                [id_canal]
            );
            return rows[0] || null;

        } catch (error) {
            console.error(`❌ [UbibotService] Error en getLastSensorReading para canal ${canalId}:`, error.message);
            return null;
        } finally {
            connection.release();
        }
    }
}

module.exports = new UbibotService();
