// servicios/src/services/alertTrackingService.js
// Servicio para gestionar el ciclo de vida completo de alertas en el sistema de notificaciones push

const mysql = require("mysql2/promise");
const configLoader = require("../config/js_files/configLoader_Config");
const moment = require("moment-timezone");

// Pool interno del servicio
let pool = null;

/**
 * Inicializa el pool de conexiones INTERNO del servicio
 * @private
 */
async function initializePool() {
    if (pool) return;

    console.log("[AlertTrackingService] Intentando inicializar pool interno...");

    try {
        const dbConfigLoaded = configLoader.getConfig().database;

        if (!dbConfigLoaded || !dbConfigLoaded.host || !dbConfigLoaded.database) {
            throw new Error("Configuración de BD base inválida para pool interno.");
        }

        const userValue = dbConfigLoaded.user || dbConfigLoaded.username;
        if (!userValue) {
            throw new Error("Usuario ('user' o 'username') no encontrado en config BD.");
        }

        const poolConfig = {
            host: dbConfigLoaded.host,
            user: userValue,
            password: dbConfigLoaded.password,
            database: dbConfigLoaded.database,
            port: dbConfigLoaded.port || 3306,
            waitForConnections: true,
            connectionLimit: dbConfigLoaded.pool?.max_size || 10,
            queueLimit: 0,
            decimalNumbers: true // Devolver DECIMAL/NEWDECIMAL como números JS
        };

        console.log(`[AlertTrackingService] Configuración para pool interno: User=${poolConfig.user}, DB=${poolConfig.database}, Host=${poolConfig.host}`);

        pool = mysql.createPool(poolConfig);
        console.log("[AlertTrackingService] Pool de conexiones MySQL interno inicializado.");

        // Probar conexión
        const connection = await pool.getConnection();
        console.log("[AlertTrackingService] Conexión inicial (interna) a la base de datos establecida.");
        connection.release();

    } catch (error) {
        console.error("❌ [AlertTrackingService] Error CRÍTICO al inicializar el pool de conexiones INTERNO:", error.message);
        pool = null;
        throw error;
    }
}

/**
 * Servicio para gestionar el ciclo de vida completo de alertas
 */
class AlertTrackingService {
    constructor() {
        this.timeZone = "America/Santiago";
        this.initialized = false;
        console.log("[AlertTrackingService] Instancia creada (config en init()).");
    }

    /**
     * Carga config. Llamar desde boot() tras configLoader.initialize().
     */
    init() {
        const { alertSystem } = configLoader.getConfig();
        this.timeZone = alertSystem?.timeZone || "America/Santiago";
        console.log(`[AlertTrackingService] init: Zona horaria: ${this.timeZone}`);
    }

    /**
     * Inicializa explícitamente el servicio, asegurando que el pool esté listo
     * @returns {Promise<boolean>} true si la inicialización fue exitosa
     */
    async initialize() {
        try {
            if (this.initialized && pool) {
                console.log("[AlertTrackingService] Ya inicializado, omitiendo initialize()");
                return true;
            }

            console.log("[AlertTrackingService] Inicializando explícitamente...");
            await initializePool();

            if (!pool) {
                throw new Error("Fallo al inicializar pool interno");
            }

            // Verificar que podemos obtener una conexión
            const testConn = await pool.getConnection();
            testConn.release();

            this.initialized = true;
            console.log("[AlertTrackingService] Inicializado correctamente (pool interno listo)");
            return true;

        } catch (error) {
            console.error(`[AlertTrackingService] Error en initialize(): ${error.message}`);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Obtiene una conexión del pool INTERNO
     * @private
     * @returns {Promise<mysql.PoolConnection>} Conexión a la base de datos
     * @throws {Error} Si el pool interno no está inicializado o falla la conexión
     */
    async _getConnection() {
        if (!pool) {
            console.error("❌ [AlertTrackingService] Pool INTERNO no inicializado al intentar obtener conexión.");
            throw new Error("Pool interno no disponible. El servicio no puede operar.");
        }

        try {
            return await pool.getConnection();
        } catch (connectionError) {
            console.error("❌ [AlertTrackingService] Error al obtener conexión del pool interno:", connectionError.message);

            if (connectionError.code === 'ER_ACCESS_DENIED_ERROR') {
                console.error("   --> ¡Verifica las credenciales y permisos del usuario en la base de datos!");
            } else if (connectionError.code === 'POOL_CLOSED') {
                console.error("   --> El pool de conexiones se cerró inesperadamente.");
            }

            throw connectionError;
        }
    }

    /**
     * Formatea una fecha a formato SQL DATETIME
     * @private
     * @param {Date|string} date - Fecha a formatear
     * @returns {string} Fecha en formato 'YYYY-MM-DD HH:mm:ss'
     */
    _formatToSqlDatetime(date) {
        if (!date) return null;
        return moment(date).tz(this.timeZone).format('YYYY-MM-DD HH:mm:ss');
    }

    /**
     * Parsea un objeto JSON de manera segura
     * @private
     * @param {string} jsonString - String JSON a parsear
     * @returns {Object|null} Objeto parseado o null si falla
     */
    _safeJsonParse(jsonString) {
        if (!jsonString) return null;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("[AlertTrackingService] Error parseando JSON:", error.message);
            return null;
        }
    }

    // ====================== MÉTODOS CRUD ======================

    /**
     * Crea una nueva alerta en el sistema
     * @param {Object} alertData - Datos de la alerta
     * @param {string} alertData.channelId - ID del canal
     * @param {string} alertData.channelName - Nombre del canal
     * @param {string} alertData.alertType - Tipo de alerta ('temperature'|'disconnection')
     * @param {Date|string} alertData.alertTimestamp - Timestamp de la alerta
     * @param {Object} alertData.alertData - Datos específicos de la alerta
     * @returns {Promise<Object>} Resultado con success y alertId
     */
    async createAlert(alertData) {
        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] createAlert: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            // Validar parámetros requeridos
            const { channelId, channelName, alertType, alertTimestamp, alertData: details } = alertData;

            if (!channelId || !channelName || !alertType) {
                throw new Error("Faltan parámetros requeridos: channelId, channelName, alertType");
            }

            if (!['temperature', 'disconnection'].includes(alertType)) {
                throw new Error(`Tipo de alerta inválido: ${alertType}. Debe ser 'temperature' o 'disconnection'`);
            }

            console.log(`[AlertTrackingService] Creando alerta de tipo '${alertType}' para canal ${channelId}`);

            // Preparar datos para inserción
            const insertData = {
                channel_id: channelId,
                channel_name: channelName,
                alert_type: alertType,
                alert_timestamp: this._formatToSqlDatetime(alertTimestamp || new Date()),
                status: 'pending',
                alert_data: JSON.stringify(details || {}),
                created_at: this._formatToSqlDatetime(new Date())
            };

            // Insertar alerta
            const [result] = await connection.query(
                "INSERT INTO alert_tracking SET ?",
                insertData
            );

            const alertId = result.insertId;

            console.log(`✅ [AlertTrackingService] Alerta creada con ID: ${alertId}`);

            // Intentar sincronizar campos de temperatura vía SP (omite si no aplica)
            try {
                await connection.query("CALL sp_sync_alert_temperature_by_id(?)", [alertId]);
            } catch (spErr) {
                console.warn(`[AlertTrackingService] SP sync omitido para alerta ${alertId}: ${spErr.message}`);
            }
            // Actualizar métricas
            await this._updateMetrics(alertType, 'created', connection);

            return {
                success: true,
                alertId: alertId,
                message: `Alerta ${alertType} creada exitosamente`
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error creando alerta:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Crea múltiples alertas en una sola transacción
     * @param {Array<Object>} alertsArray - Array de alertas a crear
     * @param {string} alertType - Tipo de alerta ('temperature'|'disconnection')
     * @returns {Promise<Object>} Resultado con success y alertIds
     */
    async createBulkAlerts(alertsArray, alertType) {
        if (!alertsArray || alertsArray.length === 0) {
            return { success: true, alertIds: [], message: "No hay alertas para crear" };
        }

        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] createBulkAlerts: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            // Validar tipo de alerta
            if (!['temperature', 'disconnection'].includes(alertType)) {
                throw new Error(`Tipo de alerta inválido: ${alertType}`);
            }

            console.log(`[AlertTrackingService] Creando ${alertsArray.length} alertas de tipo '${alertType}' en lote`);

            // Iniciar transacción
            await connection.beginTransaction();

            const alertIds = [];
            const timestamp = this._formatToSqlDatetime(new Date());

            for (const alertItem of alertsArray) {
                try {
                    // Preparar datos según el tipo de alerta
                    let alertData = {};
                    let channelId = '';
                    let channelName = '';

                    if (alertType === 'temperature') {
                        channelId = alertItem.channelId;
                        channelName = alertItem.channelName;
                        alertData = {
                            averageTemperature: alertItem.averageTemperature,
                            minThreshold: alertItem.minThreshold,
                            maxThreshold: alertItem.maxThreshold,
                            status: alertItem.status
                        };
                    } else if (alertType === 'disconnection') {
                        channelId = alertItem.channelId;
                        channelName = alertItem.name || alertItem.channelName;
                        alertData = {
                            disconnectTime: alertItem.horaDesconexion || alertItem.disconnectTime,
                            reconnectTime: alertItem.horaReconexion || alertItem.reconnectTime,
                            finalStatus: alertItem.finalStatus
                        };
                    }

                    const insertData = {
                        channel_id: channelId,
                        channel_name: channelName,
                        alert_type: alertType,
                        alert_timestamp: timestamp,
                        status: 'pending',
                        alert_data: JSON.stringify(alertData),
                        created_at: timestamp
                    };

                    const [result] = await connection.query(
                        "INSERT INTO alert_tracking SET ?",
                        insertData
                    );

                    alertIds.push(result.insertId);
                    // Intentar sincronizar campos de temperatura vía SP por cada fila insertada
                    try {
                        await connection.query("CALL sp_sync_alert_temperature_by_id(?)", [result.insertId]);
                    } catch (spErr) {
                        console.warn(`[AlertTrackingService] SP sync omitido para alerta ${result.insertId}: ${spErr.message}`);
                    }

                } catch (itemError) {
                    console.error(`[AlertTrackingService] Error insertando alerta individual:`, itemError.message);
                    // Decidir si continuar o hacer rollback
                    await connection.rollback();
                    throw itemError;
                }
            }

            // Confirmar transacción
            await connection.commit();

            console.log(`✅ [AlertTrackingService] ${alertIds.length} alertas creadas exitosamente`);

            // Actualizar métricas
            await this._updateMetrics(alertType, 'bulk_created', connection, alertIds.length);

            return {
                success: true,
                alertIds: alertIds,
                count: alertIds.length,
                message: `${alertIds.length} alertas de tipo ${alertType} creadas exitosamente`
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error creando alertas en lote:", error.message);
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Marca una alerta como atendida/reconocida
     * @param {number} alertId - ID de la alerta
     * @param {string} userId - ID/email del usuario que atiende
     * @param {Object} deviceInfo - Información del dispositivo
     * @returns {Promise<Object>} Resultado con success y responseTimeMinutes
     */
    async acknowledgeAlert(alertId, userId, deviceInfo = {}) {
        // Validar parámetros
        if (!alertId) {
            throw new Error("alertId es requerido");
        }

        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] acknowledgeAlert: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            console.log(`[AlertTrackingService] Reconociendo alerta ${alertId} por usuario ${userId}`);

            // Verificar que la alerta existe y obtener su timestamp
            const [alerts] = await connection.query(
                "SELECT alert_id, alert_timestamp, status, acknowledged_at FROM alert_tracking WHERE alert_id = ?",
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            const alert = alerts[0];

            // Verificar si ya fue reconocida
            if (alert.acknowledged_at) {
                console.warn(`[AlertTrackingService] Alerta ${alertId} ya fue reconocida anteriormente`);
                return {
                    success: true,
                    message: "Alerta ya había sido reconocida",
                    responseTimeMinutes: null
                };
            }

            const acknowledgedAt = new Date();
            const responseTimeMs = acknowledgedAt - new Date(alert.alert_timestamp);
            const responseTimeMinutes = Math.round(responseTimeMs / 60000);

            // Actualizar alerta
            await connection.query(
                `UPDATE alert_tracking
                 SET status = 'acknowledged',
                     acknowledged_at = ?,
                     acknowledged_by = ?,
                     response_time_minutes = ?,
                     device_info = ?,
                     updated_at = NOW()
                 WHERE alert_id = ?`,
                [
                    this._formatToSqlDatetime(acknowledgedAt),
                    userId,
                    responseTimeMinutes,
                    JSON.stringify(deviceInfo),
                    alertId
                ]
            );

            console.log(`✅ [AlertTrackingService] Alerta ${alertId} reconocida. Tiempo de respuesta: ${responseTimeMinutes} minutos`);

            // Actualizar métricas
            await this._updateMetrics(null, 'acknowledged', connection);

            return {
                success: true,
                responseTimeMinutes: responseTimeMinutes,
                message: `Alerta reconocida exitosamente`
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error reconociendo alerta:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Agrega una observación a una alerta
     * @param {number} alertId - ID de la alerta
     * @param {string} observation - Observación a agregar
     * @param {string} userId - ID/email del usuario
     * @returns {Promise<Object>} Resultado de la operación
     */
    async addObservation(alertId, observation, userId) {
        // Validar parámetros
        if (!alertId || !observation) {
            throw new Error("alertId y observation son requeridos");
        }

        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] addObservation: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            console.log(`[AlertTrackingService] Agregando observación a alerta ${alertId}`);

            // Verificar que la alerta existe
            const [alerts] = await connection.query(
                "SELECT alert_id, observations FROM alert_tracking WHERE alert_id = ?",
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            const currentObservations = alerts[0].observations || '';
            const timestamp = moment().tz(this.timeZone).format('YYYY-MM-DD HH:mm:ss');

            // Construir nueva observación
            const newObservation = `[${timestamp}] ${userId}: ${observation}`;
            const updatedObservations = currentObservations
                ? `${currentObservations}\n${newObservation}`
                : newObservation;

            // Actualizar alerta
            await connection.query(
                `UPDATE alert_tracking
                 SET observations = ?,
                     updated_at = NOW()
                 WHERE alert_id = ?`,
                [updatedObservations, alertId]
            );

            console.log(`✅ [AlertTrackingService] Observación agregada a alerta ${alertId}`);

            return {
                success: true,
                message: "Observación agregada exitosamente"
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error agregando observación:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Resuelve/cierra una alerta
     * @param {number} alertId - ID de la alerta
     * @param {string} resolutionNotes - Notas de resolución
     * @param {string} userId - ID/email del usuario que resuelve
     * @returns {Promise<Object>} Resultado con success y resolutionTimeMinutes
     */
    async resolveAlert(alertId, resolutionNotes, userId) {
        // Validar parámetros
        if (!alertId) {
            throw new Error("alertId es requerido");
        }

        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] resolveAlert: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            console.log(`[AlertTrackingService] Resolviendo alerta ${alertId}`);

            // Verificar que la alerta existe y obtener timestamps
            const [alerts] = await connection.query(
                `SELECT alert_id, alert_timestamp, status, resolved_at
                 FROM alert_tracking WHERE alert_id = ?`,
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            const alert = alerts[0];

            // Verificar si ya fue resuelta
            if (alert.resolved_at) {
                console.warn(`[AlertTrackingService] Alerta ${alertId} ya fue resuelta anteriormente`);
                return {
                    success: true,
                    message: "Alerta ya había sido resuelta",
                    resolutionTimeMinutes: null
                };
            }

            const resolvedAt = new Date();
            const resolutionTimeMs = resolvedAt - new Date(alert.alert_timestamp);
            const resolutionTimeMinutes = Math.round(resolutionTimeMs / 60000);

            // Actualizar alerta
            await connection.query(
                `UPDATE alert_tracking
                 SET status = 'resolved',
                     resolution_notes = ?,
                     resolved_at = ?,
                     resolved_by = ?,
                     resolution_time_minutes = ?,
                     updated_at = NOW()
                 WHERE alert_id = ?`,
                [
                    resolutionNotes,
                    this._formatToSqlDatetime(resolvedAt),
                    userId,
                    resolutionTimeMinutes,
                    alertId
                ]
            );

            console.log(`✅ [AlertTrackingService] Alerta ${alertId} resuelta. Tiempo de resolución: ${resolutionTimeMinutes} minutos`);

            // Actualizar métricas
            await this._updateMetrics(null, 'resolved', connection);

            return {
                success: true,
                resolutionTimeMinutes: resolutionTimeMinutes,
                message: `Alerta resuelta exitosamente`
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error resolviendo alerta:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Marca una alerta como falsa alarma
     * @param {number} alertId - ID de la alerta
     * @param {string} userId - ID/email del usuario
     * @param {string} reason - Razón por la cual es falsa alarma
     * @returns {Promise<Object>} Resultado de la operación
     */
    async markAsFalseAlarm(alertId, userId, reason = '') {
        // Validar parámetros
        if (!alertId) {
            throw new Error("alertId es requerido");
        }

        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] markAsFalseAlarm: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            console.log(`[AlertTrackingService] Marcando alerta ${alertId} como falsa alarma`);

            // Verificar que la alerta existe
            const [alerts] = await connection.query(
                "SELECT alert_id, status FROM alert_tracking WHERE alert_id = ?",
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            const timestamp = this._formatToSqlDatetime(new Date());
            const falseAlarmNote = reason
                ? `Marcada como falsa alarma por ${userId}: ${reason}`
                : `Marcada como falsa alarma por ${userId}`;

            // Actualizar alerta
            await connection.query(
                `UPDATE alert_tracking
                 SET status = 'false_alarm',
                     is_false_alarm = TRUE,
                     resolution_notes = ?,
                     resolved_at = ?,
                     resolved_by = ?,
                     updated_at = NOW()
                 WHERE alert_id = ?`,
                [falseAlarmNote, timestamp, userId, alertId]
            );

            console.log(`✅ [AlertTrackingService] Alerta ${alertId} marcada como falsa alarma`);

            // Actualizar métricas
            await this._updateMetrics(null, 'false_alarm', connection);

            return {
                success: true,
                message: "Alerta marcada como falsa alarma exitosamente"
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error marcando como falsa alarma:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    // ====================== MÉTODOS DE CONSULTA ======================

    /**
     * Obtiene el detalle completo de una alerta
     * @param {number} alertId - ID de la alerta
     * @returns {Promise<Object>} Detalle de la alerta
     */
    async getAlertDetails(alertId) {
        // Validar parámetros
        if (!alertId) {
            throw new Error("alertId es requerido");
        }

        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] getAlertDetails: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            console.log(`[AlertTrackingService] Obteniendo detalles de alerta ${alertId}`);

            const [alerts] = await connection.query(
                `SELECT
                    alert_id,
                    channel_id,
                    channel_name,
                    alert_type,
                    alert_timestamp,
                    status,
                    alert_data,
                    acknowledged_at,
                    acknowledged_by,
                    observations,
                    resolution_notes,
                    resolved_at,
                    resolved_by,
                    response_time_minutes,
                    resolution_time_minutes,
                    is_false_alarm,
                    device_info,
                    created_at,
                    updated_at
                 FROM alert_tracking
                 WHERE alert_id = ?`,
                [alertId]
            );

            if (alerts.length === 0) {
                return {
                    success: false,
                    message: `Alerta con ID ${alertId} no encontrada`,
                    alert: null
                };
            }

            const alert = alerts[0];

            // Parsear campos JSON - MySQL ya devuelve objetos JSON parseados con el tipo JSON
            // Solo parseamos si es string, sino lo dejamos como está
            alert.alertData = typeof alert.alert_data === 'string'
                ? this._safeJsonParse(alert.alert_data)
                : alert.alert_data;
            alert.deviceInfo = typeof alert.device_info === 'string'
                ? this._safeJsonParse(alert.device_info)
                : alert.device_info;
            delete alert.alert_data;
            delete alert.device_info;

            // Formatear timestamps
            alert.alertTimestamp = alert.alert_timestamp;
            alert.acknowledgedAt = alert.acknowledged_at;
            alert.resolvedAt = alert.resolved_at;
            alert.createdAt = alert.created_at;
            alert.updatedAt = alert.updated_at;

            // Limpiar nombres de campos
            alert.alertId = alert.alert_id;
            alert.channelId = alert.channel_id;
            alert.channelName = alert.channel_name;
            alert.alertType = alert.alert_type;
            alert.acknowledgedBy = alert.acknowledged_by;
            alert.resolutionNotes = alert.resolution_notes;
            alert.resolvedBy = alert.resolved_by;
            alert.responseTimeMinutes = alert.response_time_minutes;
            alert.resolutionTimeMinutes = alert.resolution_time_minutes;
            alert.isFalseAlarm = alert.is_false_alarm;

            // Eliminar campos con nombres originales
            delete alert.alert_id;
            delete alert.channel_id;
            delete alert.channel_name;
            delete alert.alert_type;
            delete alert.alert_timestamp;
            delete alert.acknowledged_at;
            delete alert.acknowledged_by;
            delete alert.resolution_notes;
            delete alert.resolved_at;
            delete alert.resolved_by;
            delete alert.response_time_minutes;
            delete alert.resolution_time_minutes;
            delete alert.is_false_alarm;
            delete alert.created_at;
            delete alert.updated_at;

            console.log(`✅ [AlertTrackingService] Detalles de alerta ${alertId} obtenidos`);

            return {
                success: true,
                alert: alert
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error obteniendo detalles de alerta:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene lista de alertas con filtros
     * @param {Object} filters - Filtros a aplicar
     * @returns {Promise<Object>} Lista de alertas y metadata
     */
    async getAlertsList(filters = {}) {
        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] getAlertsList: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            console.log("[AlertTrackingService] Obteniendo lista de alertas con filtros:", filters);

            // Construir query base
            let query = `
                SELECT
                    alert_id,
                    channel_id,
                    channel_name,
                    alert_type,
                    alert_timestamp,
                    status,
                    alert_data,
                    acknowledged_at,
                    acknowledged_by,
                    resolved_at,
                    resolved_by,
                    response_time_minutes,
                    resolution_time_minutes,
                    is_false_alarm,
                    observations
                FROM alert_tracking
                WHERE 1=1
            `;

            const params = [];

            // Aplicar filtros
            if (filters.startDate) {
                query += " AND alert_timestamp >= ?";
                params.push(this._formatToSqlDatetime(filters.startDate));
            }

            if (filters.endDate) {
                query += " AND alert_timestamp <= ?";
                params.push(this._formatToSqlDatetime(filters.endDate));
            }

            if (filters.status) {
                const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
                const placeholders = statusArray.map(() => '?').join(',');
                query += ` AND status IN (${placeholders})`;
                params.push(...statusArray);
            }

            if (filters.alertType) {
                query += " AND alert_type = ?";
                params.push(filters.alertType);
            }

            if (filters.channelId) {
                query += " AND channel_id = ?";
                params.push(filters.channelId);
            }

            // Agregar ordenamiento
            const orderBy = filters.orderBy || 'alert_timestamp';
            const order = filters.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Mapear createdAt a alert_timestamp para compatibilidad frontend
            const orderColumn = orderBy === 'createdAt' ? 'alert_timestamp' : orderBy;

            // Validar que la columna existe (seguridad)
            const validColumns = ['alert_timestamp', 'alert_id', 'status', 'alert_type', 'channel_id'];
            const safeOrderColumn = validColumns.includes(orderColumn) ? orderColumn : 'alert_timestamp';

            query += ` ORDER BY ${safeOrderColumn} ${order}`;

            // Obtener total antes de aplicar paginación
            const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
            const [countResult] = await connection.query(countQuery, params);
            const total = countResult[0].total;

            // Aplicar paginación
            const limit = parseInt(filters.limit) || 50;
            const offset = parseInt(filters.offset) || 0;
            query += " LIMIT ? OFFSET ?";
            params.push(limit, offset);

            // Ejecutar query
            const [alerts] = await connection.query(query, params);

            // Procesar resultados
            const processedAlerts = alerts.map(alert => ({
                id: alert.alert_id, // Para key de React
                alertId: alert.alert_id,
                channelId: alert.channel_id,
                channelName: alert.channel_name,
                sensorName: alert.channel_name, // Alias para compatibilidad con frontend
                type: alert.alert_type, // Forma simplificada
                alertType: alert.alert_type,
                createdAt: alert.alert_timestamp, // Para ordenamiento frontend
                alertTimestamp: alert.alert_timestamp,
                status: alert.status,
                alertData: typeof alert.alert_data === 'string'
                    ? this._safeJsonParse(alert.alert_data)
                    : alert.alert_data,
                acknowledgedAt: alert.acknowledged_at,
                acknowledgedBy: alert.acknowledged_by,
                resolvedAt: alert.resolved_at,
                resolvedBy: alert.resolved_by,
                responseTime: alert.response_time_minutes, // Forma simplificada
                responseTimeMinutes: alert.response_time_minutes,
                resolutionTimeMinutes: alert.resolution_time_minutes,
                isFalseAlarm: alert.is_false_alarm,
                observations: alert.observations // Agregar campo observations
            }));

            const page = Math.floor(offset / limit) + 1;
            const totalPages = Math.ceil(total / limit);

            console.log(`✅ [AlertTrackingService] ${processedAlerts.length} alertas obtenidas de ${total} totales`);

            return {
                success: true,
                alerts: processedAlerts,
                total: total,
                page: page,
                pageSize: limit,
                totalPages: totalPages
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error obteniendo lista de alertas:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene métricas agregadas para dashboard
     * @param {Date|string} startDate - Fecha inicio
     * @param {Date|string} endDate - Fecha fin
     * @param {string|null} alertType - Tipo de alerta para filtrar (opcional)
     * @returns {Promise<Object>} Métricas agregadas
     */
    async getMetricsSummary(startDate, endDate, alertType = null) {
        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] getMetricsSummary: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            const startDateSql = this._formatToSqlDatetime(startDate || moment().subtract(30, 'days').toDate());
            const endDateSql = this._formatToSqlDatetime(endDate || new Date());

            console.log(`[AlertTrackingService] Obteniendo métricas: ${startDateSql} a ${endDateSql}${alertType ? `, tipo: ${alertType}` : ''}`);

            // Query principal de métricas con filtro opcional de tipo
            let metricsQuery = `
                SELECT
                    COUNT(*) as totalAlerts,
                    SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END) as temperatureAlerts,
                    SUM(CASE WHEN alert_type = 'disconnection' THEN 1 ELSE 0 END) as disconnectionAlerts,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingAlerts,
                    SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledgedAlerts,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedAlerts,
                    SUM(CASE WHEN status = 'false_alarm' THEN 1 ELSE 0 END) as falseAlarms,
                    AVG(CASE WHEN response_time_minutes IS NOT NULL THEN response_time_minutes ELSE NULL END) as avgResponseTimeMinutes,
                    AVG(CASE WHEN resolution_time_minutes IS NOT NULL THEN resolution_time_minutes ELSE NULL END) as avgResolutionTimeMinutes,
                    MIN(response_time_minutes) as minResponseTime,
                    MAX(response_time_minutes) as maxResponseTime,
                    MIN(resolution_time_minutes) as minResolutionTime,
                    MAX(resolution_time_minutes) as maxResolutionTime
                FROM alert_tracking
                WHERE alert_timestamp BETWEEN ? AND ?
            `;

            const params = [startDateSql, endDateSql];

            // Agregar filtro de tipo si se especifica
            if (alertType) {
                metricsQuery += ` AND alert_type = ?`;
                params.push(alertType);
            }

            const [metricsResult] = await connection.query(metricsQuery, params);
            const metrics = metricsResult[0];

            // Calcular tasa de entrega de push (simplificado - basado en alertas con acknowledged_at)
            let deliveryQuery = `
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN acknowledged_at IS NOT NULL THEN 1 ELSE 0 END) as delivered
                FROM alert_tracking
                WHERE alert_timestamp BETWEEN ? AND ?
            `;

            const deliveryParams = [startDateSql, endDateSql];
            if (alertType) {
                deliveryQuery += ` AND alert_type = ?`;
                deliveryParams.push(alertType);
            }

            const [deliveryResult] = await connection.query(deliveryQuery, deliveryParams);
            const delivery = deliveryResult[0];
            const pushDeliveryRate = delivery.total > 0
                ? ((delivery.delivered / delivery.total) * 100).toFixed(1)
                : 0;

            // Query de canales más activos
            let topChannelsQuery = `
                SELECT
                    channel_id,
                    channel_name,
                    COUNT(*) as alert_count
                FROM alert_tracking
                WHERE alert_timestamp BETWEEN ? AND ?
            `;

            const topChannelsParams = [startDateSql, endDateSql];
            if (alertType) {
                topChannelsQuery += ` AND alert_type = ?`;
                topChannelsParams.push(alertType);
            }

            topChannelsQuery += `
                GROUP BY channel_id, channel_name
                ORDER BY alert_count DESC
                LIMIT 5
            `;

            const [topChannels] = await connection.query(topChannelsQuery, topChannelsParams);

            console.log(`✅ [AlertTrackingService] Métricas obtenidas exitosamente`);

            return {
                success: true,
                metrics: {
                    totalAlerts: metrics.totalAlerts || 0,
                    temperatureAlerts: metrics.temperatureAlerts || 0,
                    disconnectionAlerts: metrics.disconnectionAlerts || 0,
                    pendingAlerts: metrics.pendingAlerts || 0,
                    acknowledgedAlerts: metrics.acknowledgedAlerts || 0,
                    resolvedAlerts: metrics.resolvedAlerts || 0,
                    falseAlarms: metrics.falseAlarms || 0,
                    avgResponseTimeMinutes: parseFloat(metrics.avgResponseTimeMinutes?.toFixed(1) || 0),
                    avgResolutionTimeMinutes: parseFloat(metrics.avgResolutionTimeMinutes?.toFixed(1) || 0),
                    minResponseTime: metrics.minResponseTime || 0,
                    maxResponseTime: metrics.maxResponseTime || 0,
                    minResolutionTime: metrics.minResolutionTime || 0,
                    maxResolutionTime: metrics.maxResolutionTime || 0,
                    pushDeliveryRate: parseFloat(pushDeliveryRate),
                    topChannels: topChannels
                },
                period: {
                    startDate: startDateSql,
                    endDate: endDateSql
                }
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error obteniendo métricas:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene datos para gráficos del dashboard
     * @param {string} type - Tipo de gráfico ('hourly'|'daily'|'by_channel'|'by_type')
     * @param {Date|string} startDate - Fecha inicio
     * @param {Date|string} endDate - Fecha fin
     * @param {string|null} alertType - Tipo de alerta para filtrar (opcional)
     * @returns {Promise<Object>} Datos formateados para recharts
     */
    async getChartData(type, startDate, endDate, alertType = null) {
        // Asegurar inicialización
        if (!this.initialized) {
            console.log("[AlertTrackingService] getChartData: Inicializando automáticamente...");
            await this.initialize();
        }

        const connection = await this._getConnection();

        try {
            const startDateSql = this._formatToSqlDatetime(startDate || moment().subtract(7, 'days').toDate());
            const endDateSql = this._formatToSqlDatetime(endDate || new Date());

            console.log(`[AlertTrackingService] Obteniendo datos de gráfico tipo '${type}'${alertType ? `, alertType: ${alertType}` : ''}`);

            let query = '';
            let data = [];
            let params = [];

            switch (type) {
                case 'hourly':
                    // Alertas por hora (últimas 24 horas)
                    query = `
                        SELECT
                            DATE_FORMAT(alert_timestamp, '%Y-%m-%d %H:00:00') as hour,
                            COUNT(*) as total,
                            SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END) as temperature,
                            SUM(CASE WHEN alert_type = 'disconnection' THEN 1 ELSE 0 END) as disconnection
                        FROM alert_tracking
                        WHERE alert_timestamp BETWEEN DATE_SUB(NOW(), INTERVAL 24 HOUR) AND NOW()
                    `;

                    if (alertType) {
                        query += ` AND alert_type = ?`;
                        params = [alertType];
                    }

                    query += `
                        GROUP BY hour
                        ORDER BY hour ASC
                    `;

                    const [hourlyData] = await connection.query(query, params);

                    data = hourlyData.map(row => ({
                        time: moment(row.hour).format('HH:00'),
                        total: row.total,
                        temperature: row.temperature,
                        disconnection: row.disconnection
                    }));
                    break;

                case 'daily':
                    // Alertas por día agrupadas por canal (para barras apiladas)
                    query = `
                        SELECT
                            DATE(alert_timestamp) as day,
                            channel_id,
                            channel_name,
                            COUNT(*) as count
                        FROM alert_tracking
                        WHERE alert_timestamp BETWEEN ? AND ?
                    `;

                    params = [startDateSql, endDateSql];

                    if (alertType) {
                        query += ` AND alert_type = ?`;
                        params.push(alertType);
                    }

                    query += `
                        GROUP BY day, channel_id, channel_name
                        ORDER BY day ASC, count DESC
                    `;

                    const [dailyData] = await connection.query(query, params);

                    // Agrupar datos por fecha y crear estructura para barras apiladas
                    const dataByDate = {};

                    dailyData.forEach(row => {
                        const dateKey = moment(row.day).format('DD/MM');
                        if (!dataByDate[dateKey]) {
                            dataByDate[dateKey] = { fecha: dateKey };
                        }
                        // Usar channel_name como key para las barras apiladas
                        dataByDate[dateKey][row.channel_name] = row.count;
                    });

                    // Incluir lista de canales únicos para la leyenda
                    const uniqueChannels = [...new Set(dailyData.map(row => row.channel_name))];

                    // Retornar objeto con datos y canales
                    data = {
                        chartData: Object.values(dataByDate),
                        channels: uniqueChannels
                    };

                    break;

                case 'by_channel':
                    // Alertas por canal (top 10)
                    query = `
                        SELECT
                            channel_id,
                            channel_name,
                            COUNT(*) as total,
                            SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END) as temperature,
                            SUM(CASE WHEN alert_type = 'disconnection' THEN 1 ELSE 0 END) as disconnection
                        FROM alert_tracking
                        WHERE alert_timestamp BETWEEN ? AND ?
                    `;

                    params = [startDateSql, endDateSql];

                    if (alertType) {
                        query += ` AND alert_type = ?`;
                        params.push(alertType);
                    }

                    query += `
                        GROUP BY channel_id, channel_name
                        ORDER BY total DESC
                        LIMIT 10
                    `;

                    const [channelData] = await connection.query(query, params);

                    data = channelData.map(row => ({
                        channelId: row.channel_id,
                        sensorName: row.channel_name,
                        channel: row.channel_name.substring(0, 20), // Limitar longitud para visualización
                        count: row.total, // Propiedad esperada por el frontend
                        total: row.total,
                        temperature: row.temperature,
                        disconnection: row.disconnection
                    }));
                    break;

                case 'by_type':
                    // Distribución por tipo (formato para PieChart)
                    query = `
                        SELECT
                            alert_type,
                            COUNT(*) as count
                        FROM alert_tracking
                        WHERE alert_timestamp BETWEEN ? AND ?
                    `;

                    params = [startDateSql, endDateSql];

                    if (alertType) {
                        query += ` AND alert_type = ?`;
                        params.push(alertType);
                    }

                    query += `
                        GROUP BY alert_type
                        ORDER BY count DESC
                    `;

                    const [typeData] = await connection.query(query, params);

                    // Formato optimizado para PieChart de Recharts
                    data = typeData.map(row => ({
                        type: row.alert_type,
                        count: row.count,
                        name: row.alert_type === 'temperature' ? 'Temperatura' : 'Desconexión'
                    }));
                    break;

                default:
                    throw new Error(`Tipo de gráfico no válido: ${type}`);
            }

            console.log(`✅ [AlertTrackingService] Datos de gráfico obtenidos: ${data.length} puntos`);

            return {
                success: true,
                type: type,
                data: data,
                period: {
                    startDate: startDateSql,
                    endDate: endDateSql
                }
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error obteniendo datos de gráfico:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    // ====================== MÉTODOS AUXILIARES ======================

    /**
     * Calcula el tiempo de respuesta de una alerta
     * @private
     * @param {number} alertId - ID de la alerta
     * @returns {Promise<number|null>} Tiempo en minutos o null
     */
    async _calculateResponseTime(alertId) {
        const connection = await this._getConnection();

        try {
            const [alerts] = await connection.query(
                `SELECT alert_timestamp, acknowledged_at
                 FROM alert_tracking
                 WHERE alert_id = ? AND acknowledged_at IS NOT NULL`,
                [alertId]
            );

            if (alerts.length === 0) return null;

            const alert = alerts[0];
            const responseTimeMs = new Date(alert.acknowledged_at) - new Date(alert.alert_timestamp);
            return Math.round(responseTimeMs / 60000);

        } catch (error) {
            console.error(`[AlertTrackingService] Error calculando tiempo de respuesta:`, error.message);
            return null;
        } finally {
            connection.release();
        }
    }

    /**
     * Actualiza el estado de una alerta
     * @private
     * @param {number} alertId - ID de la alerta
     * @param {string} newStatus - Nuevo estado
     * @param {mysql.PoolConnection} [conn] - Conexión opcional
     * @returns {Promise<boolean>} Success
     */
    async _updateStatus(alertId, newStatus, conn = null) {
        const connection = conn || await this._getConnection();
        const shouldRelease = !conn;

        try {
            await connection.query(
                "UPDATE alert_tracking SET status = ?, updated_at = NOW() WHERE alert_id = ?",
                [newStatus, alertId]
            );

            return true;

        } catch (error) {
            console.error(`[AlertTrackingService] Error actualizando estado:`, error.message);
            return false;
        } finally {
            if (shouldRelease) {
                connection.release();
            }
        }
    }

    /**
     * Actualiza métricas agregadas
     * @private
     * @param {string} alertType - Tipo de alerta
     * @param {string} action - Acción realizada
     * @param {mysql.PoolConnection} [conn] - Conexión opcional
     * @param {number} [count] - Cantidad (para bulk operations)
     */
    async _updateMetrics(alertType, action, conn = null, count = 1) {
        try {
            // Por ahora solo log, implementar actualización de alert_metrics_summary si es necesario
            console.log(`[AlertTrackingService] Métricas: ${action} (${alertType || 'all'}) x${count}`);
        } catch (error) {
            console.error(`[AlertTrackingService] Error actualizando métricas:`, error.message);
        }
    }

    /**
     * Obtiene estadísticas generales del servicio
     * @returns {Promise<Object>} Estadísticas
     */
    async getServiceStats() {
        const connection = await this._getConnection();

        try {
            const statsQuery = `
                SELECT
                    (SELECT COUNT(*) FROM alert_tracking) as totalAlerts,
                    (SELECT COUNT(*) FROM alert_tracking WHERE status = 'pending') as pendingAlerts,
                    (SELECT COUNT(*) FROM alert_tracking WHERE DATE(alert_timestamp) = CURDATE()) as todayAlerts,
                    (SELECT COUNT(*) FROM alert_tracking WHERE acknowledged_at IS NOT NULL) as acknowledgedAlerts,
                    (SELECT AVG(response_time_minutes) FROM alert_tracking WHERE response_time_minutes IS NOT NULL) as avgResponseTime
            `;

            const [stats] = await connection.query(statsQuery);

            return {
                success: true,
                stats: stats[0]
            };

        } catch (error) {
            console.error("❌ [AlertTrackingService] Error obteniendo estadísticas del servicio:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }
}

// Crear instancia singleton. initialize() se llama desde server.js (initializeServices) tras configLoader.initialize().
const serviceInstance = new AlertTrackingService();
module.exports = serviceInstance;