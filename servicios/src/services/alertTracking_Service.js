// servicios/src/services/alertTrackingService.js
// Servicio para gestionar el ciclo de vida completo de alertas en el sistema de notificaciones push

const mysql = require("mysql2/promise");
const configLoader = require("../config/js_files/configLoader_Config");
const { DateTime } = require('luxon');

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
        const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date instanceof Date ? date : new Date(date));
        return dt.setZone(this.timeZone).toFormat('yyyy-MM-dd HH:mm:ss');
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

            if (!channelId || !alertType) {
                throw new Error("Faltan parámetros requeridos: channelId, alertType");
            }

            if (!['temperature', 'disconnection'].includes(alertType)) {
                throw new Error(`Tipo de alerta inválido: ${alertType}. Debe ser 'temperature' o 'disconnection'`);
            }

            console.log(`[AlertTrackingService] Creando alerta de tipo '${alertType}' para canal ${channelId}`);

            // Mapeo de tipo de alerta string → id numérico (ale_tipo_alerta)
            const alertTypeMap = { temperature: 1, disconnection: 2 };
            const idTipoAlerta = alertTypeMap[alertType];
            if (!idTipoAlerta) throw new Error(`Tipo de alerta inválido: ${alertType}`);

            // Insertar alerta — origen_id se resuelve via subquery desde ubi_canal.canal_id
            const [result] = await connection.query(
                `INSERT INTO ale_seguimiento
                 (origen_id, id_tipo_alerta, id_origen_tipo, estado, severidad, datos_alerta, fecha_alerta)
                 VALUES (
                   (SELECT id_canal FROM ubi_canal WHERE canal_id = ?),
                   ?, 1, 'pendiente', 'media', ?, ?
                 )`,
                [channelId, idTipoAlerta, JSON.stringify(details || {}), this._formatToSqlDatetime(alertTimestamp || new Date())]
            );

            const alertId = result.insertId;

            console.log(`✅ [AlertTrackingService] Alerta creada con ID: ${alertId}`);

            // SP eliminado: era específico del schema legacy alert_tracking
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

                    // Mapeo de tipo de alerta string → id numérico (ale_tipo_alerta)
                    const alertTypeMap = { temperature: 1, disconnection: 2 };
                    const idTipoAlerta = alertTypeMap[alertType];
                    if (!idTipoAlerta) throw new Error(`Tipo de alerta inválido: ${alertType}`);

                    // Insertar alerta — origen_id se resuelve via subquery desde ubi_canal.canal_id
                    const [result] = await connection.query(
                        `INSERT INTO ale_seguimiento
                         (origen_id, id_tipo_alerta, id_origen_tipo, estado, severidad, datos_alerta, fecha_alerta)
                         VALUES (
                           (SELECT id_canal FROM ubi_canal WHERE canal_id = ?),
                           ?, 1, 'pendiente', 'media', ?, ?
                         )`,
                        [channelId, idTipoAlerta, JSON.stringify(alertData), timestamp]
                    );

                    alertIds.push(result.insertId);
                    // SP eliminado: era específico del schema legacy alert_tracking

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
                "SELECT id_alerta, fecha_alerta, estado, fecha_confirmacion FROM ale_seguimiento WHERE id_alerta = ?",
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            const alert = alerts[0];

            // Verificar si ya fue reconocida — fecha_confirmacion reemplaza acknowledged_at
            if (alert.fecha_confirmacion) {
                console.warn(`[AlertTrackingService] Alerta ${alertId} ya fue reconocida anteriormente`);
                return {
                    success: true,
                    message: "Alerta ya había sido reconocida",
                    responseTimeMinutes: null
                };
            }

            const acknowledgedAt = new Date();
            // fecha_alerta reemplaza alert_timestamp
            const responseTimeMs = acknowledgedAt - new Date(alert.fecha_alerta);
            const responseTimeMinutes = Math.round(responseTimeMs / 60000);

            // Actualizar alerta
            await connection.query(
                `UPDATE ale_seguimiento
                 SET estado = 'confirmado',
                     fecha_confirmacion = ?,
                     atendido_por = ?,
                     tiempo_respuesta_minutos = ?,
                     info_dispositivo = ?
                 WHERE id_alerta = ?`,
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
                "SELECT id_alerta, observaciones FROM ale_seguimiento WHERE id_alerta = ?",
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            // observaciones reemplaza observations
            const currentObservations = alerts[0].observaciones || '';
            const timestamp = DateTime.now().setZone(this.timeZone).toFormat('yyyy-MM-dd HH:mm:ss');

            // Construir nueva observación
            const newObservation = `[${timestamp}] ${userId}: ${observation}`;
            const updatedObservations = currentObservations
                ? `${currentObservations}\n${newObservation}`
                : newObservation;

            // Actualizar alerta
            await connection.query(
                `UPDATE ale_seguimiento
                 SET observaciones = ?
                 WHERE id_alerta = ?`,
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
                `SELECT id_alerta, fecha_alerta, estado, fecha_resolucion
                 FROM ale_seguimiento WHERE id_alerta = ?`,
                [alertId]
            );

            if (alerts.length === 0) {
                throw new Error(`Alerta con ID ${alertId} no encontrada`);
            }

            const alert = alerts[0];

            // Verificar si ya fue resuelta — fecha_resolucion reemplaza resolved_at
            if (alert.fecha_resolucion) {
                console.warn(`[AlertTrackingService] Alerta ${alertId} ya fue resuelta anteriormente`);
                return {
                    success: true,
                    message: "Alerta ya había sido resuelta",
                    resolutionTimeMinutes: null
                };
            }

            const resolvedAt = new Date();
            // fecha_alerta reemplaza alert_timestamp
            const resolutionTimeMs = resolvedAt - new Date(alert.fecha_alerta);
            const resolutionTimeMinutes = Math.round(resolutionTimeMs / 60000);

            // Actualizar alerta
            await connection.query(
                `UPDATE ale_seguimiento
                 SET estado = 'resuelto',
                     notas_resolucion = ?,
                     fecha_resolucion = ?,
                     resuelto_por = ?,
                     tiempo_resolucion_minutos = ?
                 WHERE id_alerta = ?`,
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
                "SELECT id_alerta, estado FROM ale_seguimiento WHERE id_alerta = ?",
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
                `UPDATE ale_seguimiento
                 SET estado = 'falsa_alarma',
                     es_falsa_alarma = TRUE,
                     notas_resolucion = ?,
                     fecha_resolucion = ?,
                     resuelto_por = ?
                 WHERE id_alerta = ?`,
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

            // Query con JOIN a ubi_canal para obtener channel_id y channel_name via alias
            const [alerts] = await connection.query(
                `SELECT
                    alerta.id_alerta,
                    uc.canal_id AS channel_id,
                    uc.nombre AS channel_name,
                    CASE alerta.id_tipo_alerta WHEN 1 THEN 'temperature' WHEN 2 THEN 'disconnection' ELSE 'unknown' END AS alert_type,
                    alerta.fecha_alerta AS alert_timestamp,
                    alerta.estado AS status,
                    alerta.datos_alerta AS alert_data,
                    alerta.fecha_confirmacion AS acknowledged_at,
                    alerta.atendido_por AS acknowledged_by,
                    alerta.observaciones AS observations,
                    alerta.notas_resolucion AS resolution_notes,
                    alerta.fecha_resolucion AS resolved_at,
                    alerta.resuelto_por AS resolved_by,
                    alerta.tiempo_respuesta_minutos AS response_time_minutes,
                    alerta.tiempo_resolucion_minutos AS resolution_time_minutes,
                    alerta.es_falsa_alarma AS is_false_alarm,
                    alerta.info_dispositivo AS device_info
                 FROM ale_seguimiento alerta
                 LEFT JOIN ubi_canal uc ON uc.id_canal = alerta.origen_id
                 WHERE alerta.id_alerta = ?`,
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

            // Formatear timestamps — created_at y updated_at no existen en ale_seguimiento
            alert.alertTimestamp = alert.alert_timestamp;
            alert.acknowledgedAt = alert.acknowledged_at;
            alert.resolvedAt = alert.resolved_at;

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

            // Construir query base — JOIN con ubi_canal para channel_id y channel_name
            let query = `
                SELECT
                    alerta.id_alerta AS alert_id,
                    uc.canal_id AS channel_id,
                    uc.nombre AS channel_name,
                    CASE alerta.id_tipo_alerta WHEN 1 THEN 'temperature' WHEN 2 THEN 'disconnection' ELSE 'unknown' END AS alert_type,
                    alerta.fecha_alerta AS alert_timestamp,
                    alerta.estado AS status,
                    alerta.datos_alerta AS alert_data,
                    alerta.fecha_confirmacion AS acknowledged_at,
                    alerta.atendido_por AS acknowledged_by,
                    alerta.fecha_resolucion AS resolved_at,
                    alerta.resuelto_por AS resolved_by,
                    alerta.tiempo_respuesta_minutos AS response_time_minutes,
                    alerta.tiempo_resolucion_minutos AS resolution_time_minutes,
                    alerta.es_falsa_alarma AS is_false_alarm,
                    alerta.observaciones AS observations
                FROM ale_seguimiento alerta
                LEFT JOIN ubi_canal uc ON uc.id_canal = alerta.origen_id
                WHERE 1=1
            `;

            const params = [];

            // Aplicar filtros
            if (filters.startDate) {
                query += " AND alerta.fecha_alerta >= ?";
                params.push(this._formatToSqlDatetime(filters.startDate));
            }

            if (filters.endDate) {
                query += " AND alerta.fecha_alerta <= ?";
                params.push(this._formatToSqlDatetime(filters.endDate));
            }

            // Mapeo de status string inglés → ENUM español en ale_seguimiento
            if (filters.status) {
                const statusMap = { pending: 'pendiente', acknowledged: 'confirmado', resolved: 'resuelto', false_alarm: 'falsa_alarma' };
                const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
                const mappedStatuses = statusArray.map(s => statusMap[s] || s);
                const placeholders = mappedStatuses.map(() => '?').join(',');
                query += ` AND alerta.estado IN (${placeholders})`;
                params.push(...mappedStatuses);
            }

            // Mapeo de alertType string → id numérico (ale_tipo_alerta)
            if (filters.alertType) {
                const alertTypeMap = { temperature: 1, disconnection: 2 };
                const idTipoAlerta = alertTypeMap[filters.alertType];
                if (idTipoAlerta) {
                    query += " AND alerta.id_tipo_alerta = ?";
                    params.push(idTipoAlerta);
                }
            }

            // channelId filtra por canal_id en ubi_canal (JOIN)
            if (filters.channelId) {
                query += " AND uc.canal_id = ?";
                params.push(filters.channelId);
            }

            // Agregar ordenamiento — mapeo de nombres legacy a columnas reales del nuevo schema
            const orderBy = filters.orderBy || 'alert_timestamp';
            const order = filters.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Mapear createdAt a alert_timestamp para compatibilidad frontend
            const orderColumn = orderBy === 'createdAt' ? 'alert_timestamp' : orderBy;

            // Validar y mapear columnas al nuevo schema
            const columnMap = {
                'alert_timestamp': 'alerta.fecha_alerta',
                'alert_id': 'alerta.id_alerta',
                'status': 'alerta.estado',
                'alert_type': 'alerta.id_tipo_alerta',
                'channel_id': 'uc.canal_id'
            };
            const safeOrderColumn = columnMap[orderColumn] || 'alerta.fecha_alerta';

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
            const startDateSql = this._formatToSqlDatetime(startDate || DateTime.now().minus({ days: 30 }).toJSDate());
            const endDateSql = this._formatToSqlDatetime(endDate || new Date());

            console.log(`[AlertTrackingService] Obteniendo métricas: ${startDateSql} a ${endDateSql}${alertType ? `, tipo: ${alertType}` : ''}`);

            // Query principal de métricas con filtro opcional de tipo
            let metricsQuery = `
                SELECT
                    COUNT(*) as totalAlerts,
                    SUM(CASE WHEN id_tipo_alerta = 1 THEN 1 ELSE 0 END) as temperatureAlerts,
                    SUM(CASE WHEN id_tipo_alerta = 2 THEN 1 ELSE 0 END) as disconnectionAlerts,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendingAlerts,
                    SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END) as acknowledgedAlerts,
                    SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) as resolvedAlerts,
                    SUM(CASE WHEN estado = 'falsa_alarma' THEN 1 ELSE 0 END) as falseAlarms,
                    AVG(CASE WHEN tiempo_respuesta_minutos IS NOT NULL THEN tiempo_respuesta_minutos ELSE NULL END) as avgResponseTimeMinutes,
                    AVG(CASE WHEN tiempo_resolucion_minutos IS NOT NULL THEN tiempo_resolucion_minutos ELSE NULL END) as avgResolutionTimeMinutes,
                    MIN(tiempo_respuesta_minutos) as minResponseTime,
                    MAX(tiempo_respuesta_minutos) as maxResponseTime,
                    MIN(tiempo_resolucion_minutos) as minResolutionTime,
                    MAX(tiempo_resolucion_minutos) as maxResolutionTime
                FROM ale_seguimiento
                WHERE fecha_alerta BETWEEN ? AND ?
            `;

            const params = [startDateSql, endDateSql];

            // Agregar filtro de tipo si se especifica — mapeo string → id numérico
            if (alertType) {
                const alertTypeMap = { temperature: 1, disconnection: 2 };
                const idTipoAlerta = alertTypeMap[alertType];
                if (idTipoAlerta) {
                    metricsQuery += ` AND id_tipo_alerta = ?`;
                    params.push(idTipoAlerta);
                }
            }

            const [metricsResult] = await connection.query(metricsQuery, params);
            const metrics = metricsResult[0];

            // Calcular tasa de entrega de push (simplificado - basado en alertas con fecha_confirmacion)
            let deliveryQuery = `
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN fecha_confirmacion IS NOT NULL THEN 1 ELSE 0 END) as delivered
                FROM ale_seguimiento
                WHERE fecha_alerta BETWEEN ? AND ?
            `;

            const deliveryParams = [startDateSql, endDateSql];
            if (alertType) {
                const alertTypeMapDelivery = { temperature: 1, disconnection: 2 };
                const idTipoAlertaDelivery = alertTypeMapDelivery[alertType];
                if (idTipoAlertaDelivery) {
                    deliveryQuery += ` AND id_tipo_alerta = ?`;
                    deliveryParams.push(idTipoAlertaDelivery);
                }
            }

            const [deliveryResult] = await connection.query(deliveryQuery, deliveryParams);
            const delivery = deliveryResult[0];
            const pushDeliveryRate = delivery.total > 0
                ? ((delivery.delivered / delivery.total) * 100).toFixed(1)
                : 0;

            // Query de canales más activos — JOIN ubi_canal para obtener canal_id y nombre
            let topChannelsQuery = `
                SELECT
                    uc.canal_id AS channel_id,
                    uc.nombre AS channel_name,
                    COUNT(*) as alert_count
                FROM ale_seguimiento alerta
                JOIN ubi_canal uc ON uc.id_canal = alerta.origen_id
                WHERE alerta.fecha_alerta BETWEEN ? AND ?
            `;

            const topChannelsParams = [startDateSql, endDateSql];
            if (alertType) {
                // Mapear tipo string a id_tipo_alerta INT
                const alertTypeMapTop = { temperature: 1, disconnection: 2 };
                const idTipoAlertaTop = alertTypeMapTop[alertType];
                if (idTipoAlertaTop) {
                    topChannelsQuery += ` AND alerta.id_tipo_alerta = ?`;
                    topChannelsParams.push(idTipoAlertaTop);
                }
            }

            topChannelsQuery += `
                GROUP BY uc.canal_id, uc.nombre
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
            const startDateSql = this._formatToSqlDatetime(startDate || DateTime.now().minus({ days: 7 }).toJSDate());
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
                            DATE_FORMAT(fecha_alerta, '%Y-%m-%d %H:00:00') as hour,
                            COUNT(*) as total,
                            SUM(CASE WHEN id_tipo_alerta = 1 THEN 1 ELSE 0 END) as temperature,
                            SUM(CASE WHEN id_tipo_alerta = 2 THEN 1 ELSE 0 END) as disconnection
                        FROM ale_seguimiento
                        WHERE fecha_alerta BETWEEN DATE_SUB(NOW(), INTERVAL 24 HOUR) AND NOW()
                    `;

                    if (alertType) {
                        // Mapear tipo string a id_tipo_alerta INT
                        const alertTypeMapHourly = { temperature: 1, disconnection: 2 };
                        const idTipoAlertaHourly = alertTypeMapHourly[alertType];
                        if (idTipoAlertaHourly) {
                            query += ` AND id_tipo_alerta = ?`;
                            params = [idTipoAlertaHourly];
                        }
                    }

                    query += `
                        GROUP BY hour
                        ORDER BY hour ASC
                    `;

                    const [hourlyData] = await connection.query(query, params);

                    data = hourlyData.map(row => ({
                        time: DateTime.fromJSDate(row.hour instanceof Date ? row.hour : new Date(row.hour)).toFormat('HH:00'),
                        total: row.total,
                        temperature: row.temperature,
                        disconnection: row.disconnection
                    }));
                    break;

                case 'daily':
                    // Alertas por día agrupadas por canal (para barras apiladas)
                    // JOIN ubi_canal para obtener canal_id y nombre del canal
                    query = `
                        SELECT
                            DATE(alerta.fecha_alerta) as day,
                            uc.canal_id AS channel_id,
                            uc.nombre AS channel_name,
                            COUNT(*) as count
                        FROM ale_seguimiento alerta
                        JOIN ubi_canal uc ON uc.id_canal = alerta.origen_id
                        WHERE alerta.fecha_alerta BETWEEN ? AND ?
                    `;

                    params = [startDateSql, endDateSql];

                    if (alertType) {
                        // Mapear tipo string a id_tipo_alerta INT
                        const alertTypeMapDaily = { temperature: 1, disconnection: 2 };
                        const idTipoAlertaDaily = alertTypeMapDaily[alertType];
                        if (idTipoAlertaDaily) {
                            query += ` AND alerta.id_tipo_alerta = ?`;
                            params.push(idTipoAlertaDaily);
                        }
                    }

                    query += `
                        GROUP BY day, uc.canal_id, uc.nombre
                        ORDER BY day ASC, count DESC
                    `;

                    const [dailyData] = await connection.query(query, params);

                    // Agrupar datos por fecha y crear estructura para barras apiladas
                    const dataByDate = {};

                    dailyData.forEach(row => {
                        const dateKey = DateTime.fromJSDate(row.day instanceof Date ? row.day : new Date(row.day)).toFormat('dd/MM');
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
                    // Alertas por canal (top 10) — JOIN ubi_canal para canal_id y nombre
                    query = `
                        SELECT
                            uc.canal_id AS channel_id,
                            uc.nombre AS channel_name,
                            COUNT(*) as total,
                            SUM(CASE WHEN alerta.id_tipo_alerta = 1 THEN 1 ELSE 0 END) as temperature,
                            SUM(CASE WHEN alerta.id_tipo_alerta = 2 THEN 1 ELSE 0 END) as disconnection
                        FROM ale_seguimiento alerta
                        JOIN ubi_canal uc ON uc.id_canal = alerta.origen_id
                        WHERE alerta.fecha_alerta BETWEEN ? AND ?
                    `;

                    params = [startDateSql, endDateSql];

                    if (alertType) {
                        // Mapear tipo string a id_tipo_alerta INT
                        const alertTypeMapByChannel = { temperature: 1, disconnection: 2 };
                        const idTipoAlertaByChannel = alertTypeMapByChannel[alertType];
                        if (idTipoAlertaByChannel) {
                            query += ` AND alerta.id_tipo_alerta = ?`;
                            params.push(idTipoAlertaByChannel);
                        }
                    }

                    query += `
                        GROUP BY uc.canal_id, uc.nombre
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
                    // CASE para devolver string 'temperature'/'disconnection' que espera el frontend
                    query = `
                        SELECT
                            CASE id_tipo_alerta WHEN 1 THEN 'temperature' WHEN 2 THEN 'disconnection' ELSE 'unknown' END AS alert_type,
                            COUNT(*) as count
                        FROM ale_seguimiento
                        WHERE fecha_alerta BETWEEN ? AND ?
                    `;

                    params = [startDateSql, endDateSql];

                    if (alertType) {
                        // Mapear tipo string a id_tipo_alerta INT
                        const alertTypeMapByType = { temperature: 1, disconnection: 2 };
                        const idTipoAlertaByType = alertTypeMapByType[alertType];
                        if (idTipoAlertaByType) {
                            query += ` AND id_tipo_alerta = ?`;
                            params.push(idTipoAlertaByType);
                        }
                    }

                    query += `
                        GROUP BY id_tipo_alerta
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
                `SELECT fecha_alerta, fecha_confirmacion
                 FROM ale_seguimiento
                 WHERE id_alerta = ? AND fecha_confirmacion IS NOT NULL`,
                [alertId]
            );

            if (alerts.length === 0) return null;

            const alert = alerts[0];
            const responseTimeMs = new Date(alert.fecha_confirmacion) - new Date(alert.fecha_alerta);
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
                "UPDATE ale_seguimiento SET estado = ? WHERE id_alerta = ?",
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
                    (SELECT COUNT(*) FROM ale_seguimiento) as totalAlerts,
                    (SELECT COUNT(*) FROM ale_seguimiento WHERE estado = 'pendiente') as pendingAlerts,
                    (SELECT COUNT(*) FROM ale_seguimiento WHERE DATE(fecha_alerta) = CURDATE()) as todayAlerts,
                    (SELECT COUNT(*) FROM ale_seguimiento WHERE fecha_confirmacion IS NOT NULL) as acknowledgedAlerts,
                    (SELECT AVG(tiempo_respuesta_minutos) FROM ale_seguimiento WHERE tiempo_respuesta_minutos IS NOT NULL) as avgResponseTime
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