// src/services/ubibot/ubibot-service-adapter.js
const mysql = require('mysql2/promise');
const config = require('../../config/js_files/configLoader_Config');
const { convertToMySQLDateTime } = require('../../utils/transform_Utils');
const { DateTime } = require('luxon');
const notificationController = require('../../controllers/notification_Controller');

/**
 * Adaptador para el servicio Ubibot
 * Proporciona una interfaz unificada para interactuar con la API de Ubibot y procesar los datos
 */
class UbibotServiceAdapter {
    constructor() {
        this.config = null;
        this.pool = null;
        this.initialized = false;
        this.timeZone = 'America/Santiago';
    }

    /**
     * Inicializa el adaptador de servicio Ubibot. Llamar desde boot() tras configLoader.initialize().
     */
    async init() {
        try {
            // Cargar configuración
            const appConfig = config.getConfig();

            // Verificar si existe configuración Ubibot
            if (!appConfig.ubibot || !appConfig.ubibot.account_key) {
                console.error('No se encontró configuración de Ubibot válida. Usando configuración de respaldo.');
                this.useBackupConfig();
            } else {
                this.config = {
                    accountKey: appConfig.ubibot.account_key,
                    tokenFile: appConfig.ubibot.token_file,
                    excludedChannels: appConfig.ubibot.excluded_channels || [],
                    collectionInterval: appConfig.ubibot.collectionInterval || 300000, // 5 minutos por defecto
                    timeZone: appConfig.alertSystem?.timeZone || 'America/Santiago'
                };

                this.timeZone = this.config.timeZone;
            }

            // Configurar pool de conexiones
            this.pool = mysql.createPool({
                host: appConfig.database.host,
                user: appConfig.database.username,
                password: appConfig.database.password,
                database: appConfig.database.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            this.initialized = true;
            console.log('UbibotServiceAdapter inicializado correctamente');
            console.log(`- Account Key: ${this.config.accountKey.substring(0, 10)}...`);
            console.log(`- Token File: ${this.config.tokenFile}`);
            console.log(`- Canales excluidos: ${this.config.excludedChannels.length}`);
            console.log(`- Intervalo de recolección: ${this.config.collectionInterval}ms`);

            return true;
        } catch (error) {
            console.error('Error al inicializar UbibotServiceAdapter:', error.message);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Usa una configuración de respaldo en caso de problemas
     * @private
     */
    useBackupConfig() {
        this.config = {
            accountKey: '2bb378b1b4e0b210b3974a02b9d5b4d0',
            tokenFile: './src/config/token_id.txt',
            excludedChannels: ['80005'],
            collectionInterval: 300000,
            timeZone: 'America/Santiago'
        };

        console.log('UbibotServiceAdapter: Usando configuración de respaldo');
    }

    /**
     * Recarga la configuración de Ubibot
     */
    async reloadConfig() {
        try {
            const appConfig = config.reloadConfig();

            // Verificar si existe configuración Ubibot válida
            if (!appConfig.ubibot || !appConfig.ubibot.account_key) {
                console.warn('Configuración de Ubibot inválida al recargar. Manteniendo configuración actual.');
                return false;
            }

            this.config = {
                accountKey: appConfig.ubibot.account_key,
                tokenFile: appConfig.ubibot.token_file,
                excludedChannels: appConfig.ubibot.excluded_channels || [],
                collectionInterval: appConfig.ubibot.collectionInterval || 300000,
                timeZone: appConfig.alertSystem?.timeZone || 'America/Santiago'
            };

            this.timeZone = this.config.timeZone;

            console.log('UbibotServiceAdapter: Configuración recargada correctamente');
            return true;
        } catch (error) {
            console.error('Error al recargar configuración de UbibotServiceAdapter:', error.message);
            return false;
        }
    }

    /**
     * Verifica si el servicio está configurado correctamente
     * @returns {boolean} - true si está configurado correctamente
     */
    isConfigured() {
        return this.initialized &&
            this.config &&
            this.config.accountKey &&
            this.pool !== null;
    }

    /**
     * Convierte una fecha/hora UTC a una fecha/hora en la zona horaria configurada
     * @param {string|Date} utcTime - Fecha/hora en UTC
     * @returns {DateTime} - Fecha/hora en la zona horaria configurada
     */
    getLocalTime(utcTime) {
        return DateTime.fromISO(String(utcTime), { zone: 'utc' }).setZone(this.timeZone);
    }

    /**
     * Procesa los datos de un canal de Ubibot
     * @param {Object} channelData - Datos del canal
     * @returns {Promise<boolean>} - true si el procesamiento fue exitoso
     */
    async processChannelData(channelData) {
        if (!this.isConfigured()) {
            console.error('El servicio Ubibot no está configurado correctamente');
            return false;
        }

        if (!channelData || !channelData.channel_id) {
            console.error('Datos de canal inválidos:', channelData);
            return false;
        }

        const connection = await this.pool.getConnection();
        try {
            // Migrado: channels_ubibot → ubi_canal, channel_id → canal_id
            const [existingChannel] = await connection.query(
                "SELECT * FROM ubi_canal WHERE canal_id = ?",
                [channelData.channel_id]
            );

            const basicInfo = {
                product_id: channelData.product_id,
                device_id: channelData.device_id,
                latitude: channelData.latitude,
                longitude: channelData.longitude,
                firmware: channelData.firmware,
                mac_address: channelData.mac_address,
                last_entry_date: new Date(channelData.last_entry_date),
                created_at: new Date(channelData.created_at),
            };

            // Determinar estado de conexión
            const isOnline = channelData.net === "1" || channelData.net === 1;
            const currentTime = new Date();

            if (existingChannel.length === 0) {
                // Canal nuevo
                // Migrado: channels_ubibot → ubi_canal; is_currently_out_of_range eliminado,
                // se usa en_linea (conectividad) y fuera_linea_desde (timestamp de desconexión)
                await connection.query("INSERT INTO ubi_canal SET ?", {
                    ...basicInfo,
                    canal_id: channelData.channel_id,
                    nombre: channelData.name,
                    en_linea: isOnline ? 1 : 0,
                    fuera_linea_desde: isOnline ? null : currentTime,
                    ultima_alerta_enviada: null,
                });
                console.log(`Canal nuevo ${channelData.channel_id} (${channelData.name}) registrado`);
            } else {
                // Canal existente
                const currentChannel = existingChannel[0];
                // Migrado: is_currently_out_of_range eliminado → inferir de fuera_linea_desde; esOperativa → activo
                const wasOffline = currentChannel.fuera_linea_desde !== null;
                const isOperational = currentChannel.activo === 1;

                // Actualizar información básica
                const hasChanges = Object.keys(basicInfo).some((key) =>
                    basicInfo[key] instanceof Date
                        ? basicInfo[key].getTime() !== new Date(currentChannel[key]).getTime()
                        : basicInfo[key] !== currentChannel[key]
                );

                if (hasChanges) {
                    // Migrado: channels_ubibot → ubi_canal, channel_id → canal_id
                    await connection.query(
                        "UPDATE ubi_canal SET ? WHERE canal_id = ?",
                        [basicInfo, channelData.channel_id]
                    );
                }

                // Manejar lógica de estado de conexión
                await this.updateConnectionStatus(
                    connection,
                    channelData.channel_id,
                    channelData.name,
                    isOnline,
                    wasOffline,
                    isOperational,
                    currentChannel,
                    currentTime
                );
            }

            return true;
        } catch (error) {
            console.error(`Error al procesar datos del canal ${channelData.channel_id}:`, error.message);
            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Actualiza el estado de conexión de un canal
     * @param {Object} connection - Conexión a la base de datos
     * @param {string} channelId - ID del canal
     * @param {string} channelName - Nombre del canal
     * @param {boolean} isOnline - Si el canal está en línea
     * @param {boolean} wasOffline - Si el canal estaba previamente fuera de línea
     * @param {boolean} isOperational - Si el canal está operativo
     * @param {Object} currentChannel - Datos actuales del canal
     * @param {Date} currentTime - Tiempo actual
     * @returns {Promise<boolean>} - true si la actualización fue exitosa
     */
    async updateConnectionStatus(
        connection,
        channelId,
        channelName,
        isOnline,
        wasOffline,
        isOperational,
        currentChannel,
        currentTime
    ) {
        try {
            if (isOnline) {
                // Canal en línea
                if (wasOffline) {
                    // Si estaba offline, actualizar a online
                    // Migrado: channels_ubibot → ubi_canal; is_currently_out_of_range → en_linea + fuera_linea_desde
                    await connection.query(
                        "UPDATE ubi_canal SET en_linea = 1, fuera_linea_desde = NULL WHERE canal_id = ?",
                        [channelId]
                    );
                    console.log(`Canal ${channelId} (${channelName}) está nuevamente en línea`);
                }
            } else {
                // Canal offline
                if (!wasOffline) {
                    // Si acaba de quedar offline, actualizar out_of_range_since
                    // Migrado: channels_ubibot → ubi_canal; out_of_range_since → fuera_linea_desde
                    await connection.query(
                        "UPDATE ubi_canal SET en_linea = 0, fuera_linea_desde = ? WHERE canal_id = ?",
                        [currentTime, channelId]
                    );
                    console.log(`Canal ${channelId} (${channelName}) ha quedado fuera de línea a las ${currentTime.toISOString()}`);
                }
            }

            // Notificar al controlador
            if (notificationController && typeof notificationController.processConnectionStatusChange === 'function') {
                // Migrado: out_of_range_since → fuera_linea_desde, last_alert_sent → ultima_alerta_enviada
                await notificationController.processConnectionStatusChange(
                    channelId,
                    channelName,
                    isOnline,
                    wasOffline,
                    currentChannel.fuera_linea_desde,
                    currentChannel.ultima_alerta_enviada,
                    isOperational
                );
            }

            return true;
        } catch (error) {
            console.error(`Error al actualizar estado de conexión para canal ${channelId}:`, error.message);
            return false;
        }
    }

    /**
     * Procesa las lecturas del sensor y las inserta en la base de datos
     * @param {string} channelId - ID del canal
     * @param {Object} lastValues - Valores más recientes del sensor
     * @returns {Promise<boolean>} - true si el procesamiento fue exitoso
     */
    async processSensorReadings(channelId, lastValues) {
        if (!this.isConfigured()) {
            console.error('El servicio Ubibot no está configurado correctamente');
            return false;
        }

        if (!channelId || !lastValues) {
            console.error('ID de canal o valores inválidos');
            return false;
        }

        // Validar que existen los campos necesarios
        if (!lastValues.field1 || !lastValues.field1.created_at) {
            console.error(`Ubibot: No se encontraron valores o timestamp para el canal ${channelId}`);
            return false;
        }

        const connection = await this.pool.getConnection();
        try {
            // Convertir timestamp a hora local
            const utcTimestamp = DateTime.fromISO(String(lastValues.field1.created_at), { zone: 'utc' });
            const localTime = this.getLocalTime(lastValues.field1.created_at);

            console.log("UTC Timestamp:", utcTimestamp.toISO());
            console.log("Local Time:", localTime.toISO());

            // Insertar lecturas en la base de datos
            // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor
            // id_canal es FK a ubi_canal.id_canal (PK), NO a canal_id (API ID) — se usa subquery
            // fecha_creacion tiene DEFAULT CURRENT_TIMESTAMP, no se inserta manualmente
            await connection.query(
                `INSERT INTO ubi_lecturas_sensor
                 (id_canal, temperatura, humedad, luz, voltaje, wifi_rssi, temperatura_externa, fecha_lectura_externa, fecha_lectura)
                 VALUES ((SELECT id_canal FROM ubi_canal WHERE canal_id = ?), ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    channelId,                                                          // para subquery canal_id → id_canal
                    lastValues.field1.value,                                            // temperatura
                    lastValues.field2.value,                                            // humedad
                    lastValues.field3.value,                                            // luz
                    lastValues.field4.value,                                            // voltaje
                    lastValues.field5.value,                                            // wifi_rssi
                    lastValues.field8 ? lastValues.field8.value : null,                 // temperatura_externa
                    lastValues.field8 ? convertToMySQLDateTime(lastValues.field8.created_at) : null, // fecha_lectura_externa
                    utcTimestamp.toJSDate(),                                            // fecha_lectura (field1.created_at)
                ]
            );

            console.log("Datos insertados para el canal:", channelId);

            // Verificar parámetros después de la inserción
            await this.checkParametersAndNotify(channelId, lastValues);

            return true;
        } catch (error) {
            console.error(`Error al procesar lecturas del sensor para canal ${channelId}:`, error.message);
            return false;
        } finally {
            connection.release();
        }
    }

    /**
     * Verifica los parámetros del canal y notifica si la temperatura está fuera de rango
     * @param {string} channelId - ID del canal
     * @param {Object} lastValues - Valores más recientes del sensor
     * @returns {Promise<boolean>} - true si la verificación fue exitosa
     */
    async checkParametersAndNotify(channelId, lastValues) {
        if (!this.isConfigured()) {
            console.error('El servicio Ubibot no está configurado correctamente');
            return false;
        }

        // Validar argumentos
        if (!channelId || !lastValues || !lastValues.field8) {
            console.log(`Ubibot: Canal ${channelId} sin datos de temperatura. Omitiendo verificación.`);
            return false;
        }

        let connection;
        try {
            connection = await this.pool.getConnection();

            // Obtener información del canal
            // Migrado: channels_ubibot → ubi_canal, parametrizaciones → ubi_presets_temperatura
            // Aliases preservan nombres de variables JS downstream (channelName, isOperational)
            const [channelInfo] = await connection.query(
                "SELECT c.nombre AS name, c.activo AS esOperativa, p.temperatura_minima AS minima_temp_camara, p.temperatura_maxima AS maxima_temp_camara " +
                "FROM ubi_canal c " +
                "JOIN ubi_presets_temperatura p ON c.id_preset = p.id_preset " +
                "WHERE c.canal_id = ?",
                [channelId]
            );

            if (channelInfo.length === 0) {
                console.log(`Ubibot: Canal ${channelId} no encontrado. Abortando la verificación.`);
                return false;
            }

            const {
                name: channelName,
                esOperativa,
                minima_temp_camara,
                maxima_temp_camara,
            } = channelInfo[0];

            // Convertir a booleano explícitamente (activo reemplaza esOperativa)
            const isOperational = esOperativa === 1;

            // Si el canal no está operativo, ignorarlo
            if (!isOperational) {
                console.log(`Ubibot: Canal ${channelId} (${channelName}) no operativo. Ignorando lectura.`);
                return false;
            }

            // Obtener la temperatura
            const temperature = parseFloat(lastValues.field8.value);

            if (isNaN(temperature)) {
                console.log(`Ubibot: No se pudo obtener la temperatura para el canal ${channelId}.`);
                return false;
            }

            console.log(`Ubibot: Verificando temperatura para el canal ${channelId} (${channelName}): ${temperature.toFixed(2)}°C`);
            console.log(`Ubibot: Rango permitido: ${minima_temp_camara}°C a ${maxima_temp_camara}°C`);

            // Procesar la lectura con el controlador de notificaciones
            if (notificationController && typeof notificationController.processTemperatureReading === 'function') {
                const timestamp = DateTime.fromISO(String(lastValues.field8.created_at)).toFormat('yyyy-MM-dd HH:mm:ss');

                await notificationController.processTemperatureReading(
                    channelId,
                    channelName,
                    temperature,
                    timestamp,
                    minima_temp_camara,
                    maxima_temp_camara,
                    isOperational
                );
            }

            return true;
        } catch (error) {
            console.error("Ubibot: Error en checkParametersAndNotify:", error.message);
            return false;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Obtiene la última lectura de un sensor
     * @param {string} channelId - ID del canal
     * @returns {Promise<Object|null>} - Última lectura o null si no existe
     */
    async getLastSensorReading(channelId) {
        if (!this.isConfigured()) {
            console.error('El servicio Ubibot no está configurado correctamente');
            return null;
        }

        try {
            // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor; id_canal via lookup de canal_id
            const [rows] = await this.pool.query(
                "SELECT fecha_lectura_externa AS external_temperature_timestamp FROM ubi_lecturas_sensor WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?) ORDER BY fecha_lectura_externa DESC LIMIT 1",
                [channelId]
            );

            if (rows && rows.length > 0) {
                return rows[0];
            }

            return null;
        } catch (error) {
            console.error(`Error al obtener última lectura para canal ${channelId}:`, error.message);
            return null;
        }
    }

    /**
     * Cierra las conexiones del adaptador
     * @returns {Promise<boolean>} - true si se cerraron correctamente
     */
    async close() {
        if (this.pool) {
            try {
                await this.pool.end();
                console.log('UbibotServiceAdapter: Conexiones cerradas correctamente');
                return true;
            } catch (error) {
                console.error('Error al cerrar conexiones de UbibotServiceAdapter:', error.message);
                return false;
            }
        }

        return true; // No hay conexiones que cerrar
    }
}

module.exports = new UbibotServiceAdapter();