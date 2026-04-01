// src/services/push/pushNotificationService.js
// Servicio para gestionar Push Notifications en PWA

const webpush = require('web-push');
const mysql = require("mysql2/promise");
const configLoader = require("../../config/js_files/configLoader_Config");
const { DateTime } = require('luxon');
const alertScheduleConfigService = require("../db/alertScheduleConfig_Service");
const notificationScheduleService = require("../notificationSchedule_Service");

/**
 * Servicio para gestionar suscripciones y envío de Push Notifications
 */
class PushNotificationService {
    constructor() {
        console.log("[PushNotificationService] Inicializando...");

        this.config = null;
        this.pool = null;
        this.initialized = false;
        this.timeZone = "America/Santiago";

        // Criticality configuration (loaded from database)
        this.criticalityConfig = {
            tempDeviationPercent: 20, // Default: 20%
            disconnectionHours: 2,     // Default: 2 hours
            disconnectionCount: 5      // Default: 5 sensors
        };

        // Estadísticas
        this.stats = {
            totalSent: 0,
            totalFailed: 0,
            totalSubscriptions: 0,
            lastSentTime: null
        };
    }

    /**
     * Inicializa el servicio: configura VAPID y crea pool de BD
     */
    async initialize() {
        if (this.initialized) {
            console.log("[PushNotificationService] Ya inicializado.");
            return true;
        }

        console.log("[PushNotificationService] Iniciando inicialización...");

        try {
            // 1. Cargar configuración
            let appConfig = configLoader.getConfig();

            // Si no encuentra pushNotifications, intentar recargar configuración
            if (!appConfig.pushNotifications) {
                console.warn("[PushNotificationService] pushNotifications no encontrada en config, recargando...");
                configLoader.reloadConfig();
                appConfig = configLoader.getConfig();
            }

            this.config = appConfig.pushNotifications;
            this.timeZone = appConfig.alertSystem?.timeZone || this.timeZone;

            if (!this.config) {
                console.error("[PushNotificationService] pushNotifications no encontrada después de recargar config.");
                console.log("[PushNotificationService] Config disponible:", Object.keys(appConfig));
                return false;
            }

            if (!this.config.enabled) {
                console.warn("[PushNotificationService] Push Notifications deshabilitadas en config.");
                return false;
            }

            // 2. Validar claves VAPID
            if (!this.config.vapidPublicKey || !this.config.vapidPrivateKey || !this.config.vapidSubject) {
                throw new Error("Configuración VAPID incompleta. Verifica vapidPublicKey, vapidPrivateKey y vapidSubject.");
            }

            // 3. Configurar web-push con claves VAPID
            webpush.setVapidDetails(
                this.config.vapidSubject,
                this.config.vapidPublicKey,
                this.config.vapidPrivateKey
            );
            console.log("[PushNotificationService] VAPID configurado correctamente.");

            // 4. Crear pool de BD
            const dbConfig = appConfig.database;
            if (!dbConfig?.host || !dbConfig.database) {
                throw new Error("Configuración de base de datos inválida.");
            }

            const userDb = dbConfig.user || dbConfig.username;
            this.pool = mysql.createPool({
                host: dbConfig.host,
                user: userDb,
                password: dbConfig.password,
                database: dbConfig.database,
                port: dbConfig.port || 3306,
                waitForConnections: true,
                connectionLimit: dbConfig.pool?.max_size || 10,
                queueLimit: 0
            });

            // Probar conexión
            const connection = await this.pool.getConnection();
            connection.release();
            console.log("[PushNotificationService] Pool de BD creado correctamente.");

            // 5. Cargar estadísticas iniciales
            await this._loadStats();

            // 6. Cargar configuración de criticidad desde BD
            await this._loadCriticalityConfig();

            this.initialized = true;
            console.log("✅ [PushNotificationService] Inicializado correctamente.");
            console.log(`   - Suscripciones activas: ${this.stats.totalSubscriptions}`);

            return true;

        } catch (error) {
            console.error("❌ [PushNotificationService] Error en inicialización:", error.message);
            this.initialized = false;
            if (this.pool) {
                await this.pool.end().catch(() => {});
                this.pool = null;
            }
            throw error;
        }
    }

    /**
     * Carga estadísticas desde la BD
     * @private
     */
    async _loadStats() {
        if (!this.pool) return;

        try {
            const connection = await this.pool.getConnection();
            try {
                const [rows] = await connection.query(
                    "SELECT COUNT(*) as total FROM ale_push_suscripciones WHERE activo = TRUE"
                );
                this.stats.totalSubscriptions = rows[0]?.total || 0;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error("[PushNotificationService] Error cargando stats:", error.message);
        }
    }

    /**
     * Carga configuración de criticidad desde la BD (alert_schedule_config)
     * @private
     */
    async _loadCriticalityConfig() {
        try {
            const config = await alertScheduleConfigService.loadAllConfig();

            // Cargar parámetros de criticidad (con fallback a defaults si no existen)
            if (config.critical_temp_deviation_percent !== undefined) {
                this.criticalityConfig.tempDeviationPercent = parseFloat(config.critical_temp_deviation_percent);
            }

            if (config.critical_disconnection_hours !== undefined) {
                this.criticalityConfig.disconnectionHours = parseFloat(config.critical_disconnection_hours);
            }

            if (config.critical_disconnection_count !== undefined) {
                this.criticalityConfig.disconnectionCount = parseInt(config.critical_disconnection_count, 10);
            }

            console.log("[PushNotificationService] Configuración de criticidad cargada desde BD:");
            console.log(`   - Desviación temperatura crítica: ${this.criticalityConfig.tempDeviationPercent}%`);
            console.log(`   - Horas desconexión crítica: ${this.criticalityConfig.disconnectionHours}h`);
            console.log(`   - Cantidad sensores desconectados crítica: ${this.criticalityConfig.disconnectionCount}`);

        } catch (error) {
            console.warn("[PushNotificationService] Error cargando criticality config, usando defaults:", error.message);
            console.log("[PushNotificationService] Usando configuración de criticidad por defecto (20%, 2h, 5 sensores)");
        }
    }

    /**
     * Guarda una nueva suscripción en la BD
     * @param {Object} subscription - Objeto de suscripción del navegador
     * @param {Object} metadata - Información adicional (userId, userEmail, userAgent)
     * @returns {Promise<Object>} Resultado de la operación
     */
    async saveSubscription(subscription, metadata = {}) {
        if (!this.initialized || !this.pool) {
            throw new Error("Servicio no inicializado");
        }

        console.log("[PushNotificationService] Guardando nueva suscripción...");

        const connection = await this.pool.getConnection();
        try {
            const { endpoint, keys } = subscription;
            const { p256dh, auth } = keys;

            // Extraer metadata
            const userId = metadata.userId || null;
            if (!userId) {
                throw new Error('userId es requerido para guardar una suscripción push');
            }
            const userEmail = metadata.userEmail || null;
            const userAgent = metadata.userAgent || null;
            const deviceType = this._detectDeviceType(userAgent);
            const browserName = this._detectBrowser(userAgent);

            // Verificar si ya existe (actualizar en lugar de insertar)
            const [existing] = await connection.query(
                "SELECT id_suscripcion, activo FROM ale_push_suscripciones WHERE endpoint = ?",
                [endpoint]
            );

            if (existing.length > 0) {
                // Actualizar suscripción existente
                const subscriptionId = existing[0].id_suscripcion;
                await connection.query(
                    `UPDATE ale_push_suscripciones
                     SET p256dh = ?, auth = ?, activo = TRUE,
                         ultima_conexion = NOW(), tipo_dispositivo = ?,
                         id_usuario = ?
                     WHERE id_suscripcion = ?`,
                    [p256dh, auth, deviceType, userId, subscriptionId]
                );

                console.log(`[PushNotificationService] Suscripción actualizada: ${subscriptionId}`);
                return { success: true, subscriptionId, updated: true };
            }

            // Insertar nueva suscripción
            const [result] = await connection.query(
                `INSERT INTO ale_push_suscripciones
                 (id_usuario, endpoint, p256dh, auth, tipo_dispositivo, ultima_conexion)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [userId, endpoint, p256dh, auth, deviceType]
            );

            this.stats.totalSubscriptions++;
            console.log(`✅ [PushNotificationService] Nueva suscripción guardada: ${result.insertId}`);

            return { success: true, subscriptionId: result.insertId, updated: false };

        } catch (error) {
            console.error("❌ [PushNotificationService] Error guardando suscripción:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Elimina una suscripción (desactivar o eliminar físicamente)
     * @param {string} endpoint - Endpoint de la suscripción a eliminar
     * @param {boolean} hardDelete - Si es true, elimina físicamente; si es false, solo desactiva
     * @returns {Promise<boolean>}
     */
    async removeSubscription(endpoint, hardDelete = false) {
        if (!this.initialized || !this.pool) {
            throw new Error("Servicio no inicializado");
        }

        console.log(`[PushNotificationService] Eliminando suscripción: ${endpoint.substring(0, 50)}...`);

        const connection = await this.pool.getConnection();
        try {
            if (hardDelete) {
                const [result] = await connection.query(
                    "DELETE FROM ale_push_suscripciones WHERE endpoint = ?",
                    [endpoint]
                );
                console.log(`[PushNotificationService] Suscripción eliminada físicamente.`);
                return result.affectedRows > 0;
            } else {
                const [result] = await connection.query(
                    "UPDATE ale_push_suscripciones SET activo = FALSE WHERE endpoint = ?",
                    [endpoint]
                );
                console.log(`[PushNotificationService] Suscripción desactivada.`);
                return result.affectedRows > 0;
            }
        } catch (error) {
            console.error("❌ [PushNotificationService] Error eliminando suscripción:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene datos básicos de una suscripción por endpoint (para verificación de propiedad)
     * @param {string} endpoint
     * @returns {Promise<{id_suscripcion, id_usuario}|null>}
     */
    async getSubscriptionByEndpoint(endpoint) {
        if (!this.initialized || !this.pool) {
            throw new Error('Servicio no inicializado');
        }
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT id_suscripcion, id_usuario FROM ale_push_suscripciones WHERE endpoint = ?',
                [endpoint]
            );
            return rows.length > 0 ? rows[0] : null;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene datos básicos de una suscripción por id (para verificación de propiedad)
     * @param {number} subscriptionId
     * @returns {Promise<{id_suscripcion, id_usuario}|null>}
     */
    async getSubscriptionById(subscriptionId) {
        if (!this.initialized || !this.pool) {
            throw new Error('Servicio no inicializado');
        }
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.query(
                'SELECT id_suscripcion, id_usuario FROM ale_push_suscripciones WHERE id_suscripcion = ?',
                [subscriptionId]
            );
            return rows.length > 0 ? rows[0] : null;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene todas las suscripciones activas
     * @param {Object} filters - Filtros opcionales (userId, deviceType)
     * @returns {Promise<Array>} Lista de suscripciones
     */
    async getActiveSubscriptions(filters = {}) {
        if (!this.initialized || !this.pool) {
            throw new Error("Servicio no inicializado");
        }

        const connection = await this.pool.getConnection();
        try {
            let query = "SELECT * FROM ale_push_suscripciones WHERE activo = TRUE";
            const params = [];

            if (filters.userId) {
                query += " AND id_usuario = ?";
                params.push(filters.userId);
            }

            if (filters.deviceType) {
                query += " AND tipo_dispositivo = ?";
                params.push(filters.deviceType);
            }

            const [rows] = await connection.query(query, params);
            return rows;

        } catch (error) {
            console.error("❌ [PushNotificationService] Error obteniendo suscripciones:", error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene suscripciones push solo de usuarios que tienen ale_suscripciones_notificacion (canal=push) para el tipo/origen dado.
     * @param {number} idTipoAlerta - 1=temperatura, 2=desconexion
     * @param {number} idOrigenTipo - FK gen_tipos_origen (ej. 1=ubibot)
     * @returns {Promise<Array>} Filas de ale_push_suscripciones (activas) para esos usuarios
     */
    async getPushSubscriptionsForAlertType(idTipoAlerta, idOrigenTipo) {
        if (!this.initialized || !this.pool) {
            return [];
        }
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT p.* FROM ale_push_suscripciones p
                 INNER JOIN ale_suscripciones_notificacion s ON s.id_usuario = p.id_usuario
                   AND s.id_tipo_alerta = ? AND s.id_origen_tipo = ? AND s.canal = 'push' AND s.activo = 1
                 WHERE p.activo = 1`,
                [idTipoAlerta, idOrigenTipo]
            );
            return rows || [];
        } catch (error) {
            console.error("❌ [PushNotificationService] getPushSubscriptionsForAlertType:", error.message);
            return [];
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene las preferencias de DND de una suscripción
     * @param {number} subscriptionId - ID de la suscripción
     * @returns {Promise<Object|null>} Objeto con las preferencias o null si no existen
     */
    async getPreferences(subscriptionId) {
        if (!this.initialized || !this.pool) {
            throw new Error("Servicio no inicializado");
        }

        console.log(`[PushNotificationService] Obteniendo preferencias para suscripción ${subscriptionId}...`);

        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.query(
                `SELECT
                    id_preferencia as preferenceId,
                    id_suscripcion as subscriptionId,
                    dnd_habilitado as dndEnabled,
                    hora_inicio_dnd as dndStartTime,
                    hora_fin_dnd as dndEndTime,
                    dias_dnd as dndDays,
                    permitir_alertas_criticas as allowCriticalAlerts,
                    tipos_alerta_habilitados as enabledAlertTypes
                 FROM ale_preferencias_push
                 WHERE id_suscripcion = ?`,
                [subscriptionId]
            );

            if (rows.length === 0) {
                console.log(`[PushNotificationService] No se encontraron preferencias para suscripción ${subscriptionId}`);
                return null;
            }

            const preferences = rows[0];

            // Parsear campos JSON
            if (preferences.dndDays && typeof preferences.dndDays === 'string') {
                try {
                    preferences.dndDays = JSON.parse(preferences.dndDays);
                } catch (e) {
                    preferences.dndDays = [];
                }
            }

            if (preferences.enabledAlertTypes && typeof preferences.enabledAlertTypes === 'string') {
                try {
                    preferences.enabledAlertTypes = JSON.parse(preferences.enabledAlertTypes);
                } catch (e) {
                    preferences.enabledAlertTypes = ['temperature', 'disconnection'];
                }
            }

            return preferences;

        } catch (error) {
            console.error(`❌ [PushNotificationService] Error obteniendo preferencias:`, error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Actualiza las preferencias de DND de una suscripción
     * @param {number} subscriptionId - ID de la suscripción
     * @param {Object} preferences - Objeto con las preferencias a actualizar
     * @returns {Promise<Object>} Resultado de la operación
     */
    async updatePreferences(subscriptionId, preferences) {
        if (!this.initialized || !this.pool) {
            throw new Error("Servicio no inicializado");
        }

        console.log(`[PushNotificationService] Actualizando preferencias para suscripción ${subscriptionId}...`);

        const connection = await this.pool.getConnection();
        try {
            // ✅ MEJORADO: Preparar valores con defaults y normalización de formato
            const dndEnabled = preferences.dndEnabled !== undefined ? preferences.dndEnabled : false;

            // Normalizar formato de tiempo (si viene HH:mm, agregar :00)
            let dndStartTime = preferences.dndStartTime || '22:00:00';
            let dndEndTime = preferences.dndEndTime || '08:00:00';

            // Si el formato es HH:mm (5 caracteres), agregar :00
            if (dndStartTime && dndStartTime.length === 5) {
                dndStartTime = `${dndStartTime}:00`;
            }
            if (dndEndTime && dndEndTime.length === 5) {
                dndEndTime = `${dndEndTime}:00`;
            }

            const dndDays = JSON.stringify(preferences.dndDays || []);
            const allowCriticalAlerts = preferences.allowCriticalAlerts !== undefined ? preferences.allowCriticalAlerts : true;
            const enabledAlertTypes = JSON.stringify(preferences.enabledAlertTypes || ['temperature', 'disconnection']);

            // Verificar si ya existen preferencias
            const [existing] = await connection.query(
                "SELECT id_preferencia FROM ale_preferencias_push WHERE id_suscripcion = ?",
                [subscriptionId]
            );

            let preferenceId;

            if (existing.length > 0) {
                // Actualizar preferencias existentes
                preferenceId = existing[0].id_preferencia;
                await connection.query(
                    `UPDATE ale_preferencias_push
                     SET dnd_habilitado = ?, hora_inicio_dnd = ?, hora_fin_dnd = ?,
                         dias_dnd = ?, permitir_alertas_criticas = ?, tipos_alerta_habilitados = ?
                     WHERE id_preferencia = ?`,
                    [dndEnabled, dndStartTime, dndEndTime, dndDays,
                     allowCriticalAlerts, enabledAlertTypes, preferenceId]
                );

                console.log(`[PushNotificationService] Preferencias actualizadas: ${preferenceId}`);

            } else {
                // Insertar nuevas preferencias
                const [result] = await connection.query(
                    `INSERT INTO ale_preferencias_push
                     (id_suscripcion, dnd_habilitado, hora_inicio_dnd, hora_fin_dnd,
                      dias_dnd, permitir_alertas_criticas, tipos_alerta_habilitados)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [subscriptionId, dndEnabled, dndStartTime, dndEndTime,
                     dndDays, allowCriticalAlerts, enabledAlertTypes]
                );

                preferenceId = result.insertId;
                console.log(`[PushNotificationService] Nuevas preferencias creadas: ${preferenceId}`);
            }

            return { success: true, preferenceId };

        } catch (error) {
            console.error(`❌ [PushNotificationService] Error actualizando preferencias:`, error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Evalúa si se debe enviar una notificación a una suscripción según sus preferencias DND
     * @param {Object} subscription - Objeto de suscripción con subscription_id
     * @param {string} alertType - Tipo de alerta ('temperature' | 'disconnection')
     * @param {boolean} isCritical - Si la alerta es crítica (default false)
     * @returns {Promise<boolean>} true = enviar, false = bloquear por DND
     */
    async shouldSendToSubscription(subscription, alertType = 'unknown', isCritical = false) {
        if (!this.initialized || !this.pool) {
            return true; // En caso de error, permitir el envío
        }

        const subscriptionId = subscription.id_suscripcion;

        try {
            // Usar la función MySQL para evaluar si se debe enviar
            const connection = await this.pool.getConnection();
            try {
                const [rows] = await connection.query(
                    "SELECT fun_should_send_notification(?, ?, ?) as should_send",
                    [subscriptionId, alertType, isCritical ? 1 : 0]
                );

                const shouldSend = rows[0]?.should_send === 1;

                if (!shouldSend) {
                    console.log(`[PushNotificationService] Notificación bloqueada por DND para suscripción ${subscriptionId} (tipo: ${alertType}, crítica: ${isCritical})`);
                }

                return shouldSend;

            } finally {
                connection.release();
            }

        } catch (error) {
            console.error(`[PushNotificationService] Error evaluando DND:`, error.message);
            // En caso de error, verificar con lógica local o permitir envío
            return await this._shouldSendToSubscriptionLocal(subscription, alertType, isCritical);
        }
    }

    /**
     * Evaluación local de DND (fallback cuando falla la función MySQL)
     * @private
     */
    async _shouldSendToSubscriptionLocal(subscription, alertType, isCritical) {
        try {
            const preferences = await this.getPreferences(subscription.id_suscripcion);

            if (!preferences || !preferences.dndEnabled) {
                return true; // Sin preferencias o DND deshabilitado
            }

            // Verificar si el tipo de alerta está habilitado
            if (preferences.enabledAlertTypes && preferences.enabledAlertTypes.length > 0) {
                if (!preferences.enabledAlertTypes.includes(alertType)) {
                    console.log(`[PushNotificationService] Tipo de alerta '${alertType}' no habilitado para suscripción ${subscription.id_suscripcion}`);
                    return false;
                }
            }

            // Si es crítica y se permiten alertas críticas durante DND
            if (isCritical && preferences.allowCriticalAlerts) {
                console.log(`[PushNotificationService] Permitiendo alerta crítica durante DND para suscripción ${subscription.id_suscripcion}`);
                return true;
            }

            // Verificar ventana DND
            const isInDND = this._isInDNDWindow(new Date(), preferences);

            if (isInDND) {
                console.log(`[PushNotificationService] Suscripción ${subscription.id_suscripcion} en ventana DND`);
                return false;
            }

            return true;

        } catch (error) {
            console.error(`[PushNotificationService] Error en evaluación local de DND:`, error.message);
            return true; // En caso de error, permitir envío
        }
    }

    /**
     * Verifica si la hora actual está dentro de la ventana DND
     * @private
     * @param {Date} currentTime - Hora actual
     * @param {Object} preferences - Preferencias de DND
     * @returns {boolean} true si está en DND
     */
    _isInDNDWindow(currentTime, preferences) {
        if (!preferences.dndEnabled) return false;

        const now = DateTime.fromJSDate(currentTime instanceof Date ? currentTime : new Date(currentTime)).setZone(this.timeZone);
        const dayName = now.toFormat('EEEE'); // "Monday", "Tuesday", etc.

        // Validar día de la semana
        if (preferences.dndDays && preferences.dndDays.length > 0) {
            if (!preferences.dndDays.includes(dayName)) {
                return false; // Hoy no aplica DND
            }
        }

        // Validar horario
        const currentMinutes = now.hour * 60 + now.minute;
        const startMinutes = this._timeToMinutes(preferences.dndStartTime);
        const endMinutes = this._timeToMinutes(preferences.dndEndTime);

        // Caso 1: Sin cruce de medianoche (ej: 08:00 - 22:00)
        if (startMinutes < endMinutes) {
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }

        // Caso 2: Cruce de medianoche (ej: 22:00 - 08:00)
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    /**
     * Convierte una cadena de tiempo a minutos desde medianoche
     * @private
     * @param {string} timeString - Tiempo en formato HH:MM o HH:MM:SS
     * @returns {number} Minutos desde medianoche
     */
    _timeToMinutes(timeString) {
        if (!timeString) return 0;
        const parts = timeString.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
    }

    /**
     * Envía una notificación push a una suscripción específica
     * @param {Object} subscription - Objeto de suscripción con endpoint y keys
     * @param {Object} payload - Datos de la notificación
     * @returns {Promise<boolean>}
     */
    async sendNotification(subscription, payload) {
        if (!this.initialized) {
            throw new Error("Servicio no inicializado");
        }

        try {
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth
                }
            };

            const payloadString = JSON.stringify(payload);

            await webpush.sendNotification(pushSubscription, payloadString);

            // Actualizar estadísticas en BD
            await this._updateSubscriptionStats(subscription.id_suscripcion, true);

            this.stats.totalSent++;
            this.stats.lastSentTime = new Date();

            return true;

        } catch (error) {
            console.error("[PushNotificationService] Error enviando notificación:", error.message);

            // Si es error 410 (Gone), desactivar suscripción
            if (error.statusCode === 410) {
                console.warn("[PushNotificationService] Suscripción expirada, desactivando...");
                await this.removeSubscription(subscription.endpoint, false);
            }

            this.stats.totalFailed++;
            await this._updateSubscriptionStats(subscription.id_suscripcion, false);

            return false;
        }
    }

    /**
     * Envía notificación a todas las suscripciones activas (o a las de un tipo/origen si se indica).
     * @param {Object} payload - Datos de la notificación
     * @param {Object} filters - Filtros opcionales. Si idTipoAlerta e idOrigenTipo están presentes, se usan ale_suscripciones_notificacion y shouldSendNotification (ventana + DND).
     * @returns {Promise<Object>} Resultados del envío
     */
    async sendNotificationToAll(payload, filters = {}) {
        if (!this.initialized) {
            throw new Error("Servicio no inicializado");
        }

        const { idTipoAlerta, idOrigenTipo } = filters;
        const useScheduleService = idTipoAlerta != null && idOrigenTipo != null;

        let subscriptions;
        if (useScheduleService) {
            console.log("[PushNotificationService] Enviando a suscriptores push (tipo=" + idTipoAlerta + ", origen=" + idOrigenTipo + ") con ventana + DND...");
            subscriptions = await this.getPushSubscriptionsForAlertType(idTipoAlerta, idOrigenTipo);
        } else {
            console.log("[PushNotificationService] Enviando notificación a todas las suscripciones activas...");
            subscriptions = await this.getActiveSubscriptions(filters);
        }

        if (subscriptions.length === 0) {
            console.warn("[PushNotificationService] No hay suscripciones activas.");
            return { sent: 0, failed: 0, total: 0, skippedByDND: 0 };
        }

        const alertType = payload.data?.type || 'unknown';
        const isCritical = payload.requireInteraction === true &&
                          (payload.data?.isCritical === true || payload.isCritical === true);

        const eligibleSubs = [];
        let skippedByDND = 0;
        const now = DateTime.now().setZone(this.timeZone || 'America/Santiago');

        for (const sub of subscriptions) {
            let shouldSend;
            if (useScheduleService) {
                const { allowed } = await notificationScheduleService.shouldSendNotification({
                    idTipoAlerta,
                    idOrigenTipo,
                    canal: 'push',
                    idUsuario: sub.id_usuario,
                    fechaHora: now,
                    idSuscripcionPush: sub.id_suscripcion
                });
                shouldSend = allowed;
            } else {
                shouldSend = await this.shouldSendToSubscription(sub, alertType, isCritical);
            }
            if (shouldSend) {
                eligibleSubs.push(sub);
            } else {
                skippedByDND++;
                if (!useScheduleService) {
                    console.log(`[PushNotificationService] Skipping sub ${sub.id_suscripcion} (DND active)`);
                }
            }
        }

        console.log(`[PushNotificationService] Filtered: ${eligibleSubs.length}/${subscriptions.length} eligible (${skippedByDND} skipped)`);

        if (eligibleSubs.length === 0) {
            console.warn("[PushNotificationService] No hay suscripciones elegibles después del filtrado DND.");
            return { sent: 0, failed: 0, total: subscriptions.length, skippedByDND };
        }

        const results = {
            sent: 0,
            failed: 0,
            total: subscriptions.length,
            skippedByDND,
            eligible: eligibleSubs.length
        };

        // Enviar en paralelo con Promise.allSettled
        const promises = eligibleSubs.map(sub => this.sendNotification(sub, payload));
        const outcomes = await Promise.allSettled(promises);

        outcomes.forEach((outcome, index) => {
            if (outcome.status === 'fulfilled' && outcome.value === true) {
                results.sent++;
            } else {
                results.failed++;
                console.error(`[PushNotificationService] Fallo enviando a suscripción ${eligibleSubs[index].id_suscripcion}`);
            }
        });

        console.log(`[PushNotificationService] Envío completado: ${results.sent}/${results.eligible} exitosos (${results.skippedByDND} bloqueados por DND)`);

        return results;
    }

    /**
     * Envía notificación de alerta de temperatura
     * @param {Array} channelsInAlert - Canales con alertas
     * @param {Array} alertIds - IDs de las alertas generadas
     * @returns {Promise<Object>}
     */
    async sendTemperatureAlert(channelsInAlert, alertIds = []) {
        const callId = `PUSH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        console.log(`\n📱 [${callId}] sendTemperatureAlert() INICIADO`);
        console.log(`📱 [${callId}] Timestamp: ${new Date().toISOString()}`);
        console.log(`📱 [${callId}] Canales recibidos: ${channelsInAlert?.length || 0}`);
        console.log(`📱 [${callId}] AlertIds recibidos: ${alertIds?.length || 0}`);

        if (!channelsInAlert || channelsInAlert.length === 0) return { sent: 0, failed: 0, total: 0, skippedByDND: 0 };

        const count = channelsInAlert.length;
        const firstChannel = channelsInAlert[0];
        const time = DateTime.now().setZone(this.timeZone).toFormat('dd/MM HH:mm');

        // Evaluar criticidad: Si algún canal está fuera de rango según configuración
        let isCritical = false;
        let maxDeviation = 0;

        for (const channel of channelsInAlert) {
            if (channel.minTemp !== undefined && channel.maxTemp !== undefined) {
                const range = channel.maxTemp - channel.minTemp;
                const thresholdPercent = range * (this.criticalityConfig.tempDeviationPercent / 100);

                // Verificar si está fuera del rango según umbral configurado
                if (channel.averageTemperature < channel.minTemp) {
                    const deviation = channel.minTemp - channel.averageTemperature;
                    if (deviation > thresholdPercent) {
                        isCritical = true;
                        maxDeviation = Math.max(maxDeviation, (deviation / range) * 100);
                    }
                } else if (channel.averageTemperature > channel.maxTemp) {
                    const deviation = channel.averageTemperature - channel.maxTemp;
                    if (deviation > thresholdPercent) {
                        isCritical = true;
                        maxDeviation = Math.max(maxDeviation, (deviation / range) * 100);
                    }
                }
            }
        }

        if (isCritical) {
            console.log(`[PushNotificationService] Alerta de temperatura CRÍTICA - Desviación máxima: ${maxDeviation.toFixed(1)}%`);
        }

        // Construir URL dinámica con alertId si está disponible
        // Usar appBaseUrl de configuración (para ngrok en desarrollo) o ruta relativa (producción/PWA)
        const baseUrl = this.config.appBaseUrl || '';

        // ✅ MEJORADO: Usar rutas relativas cuando no hay baseUrl (funciona en PWAs instaladas)
        let alertUrl;
        if (alertIds.length > 0) {
            const path = `/TNSTrack/gestion-alertas?alertId=${alertIds[0]}&channelId=${firstChannel.channelId}&type=temperature`;
            alertUrl = baseUrl ? `${baseUrl}${path}` : path; // Ruta relativa si no hay baseUrl
        } else {
            const path = `/TNSTrack/metricas-alertas`;
            alertUrl = baseUrl ? `${baseUrl}${path}` : path; // Ruta relativa si no hay baseUrl
        }

        console.log(`[PushNotificationService] sendTemperatureAlert: URL generada: ${alertUrl} (baseUrl: "${baseUrl}")`);

        const payload = {
            title: `${isCritical ? '🚨' : '🌡️'} Alerta de Temperatura${isCritical ? ' CRÍTICA' : ''}`,
            body: `${count} sensor${count > 1 ? 'es' : ''} fuera de rango. ${firstChannel.channelName}: ${firstChannel.averageTemperature.toFixed(1)}°C`,
            icon: this.config.notificationOptions?.icon || '/TNSTrack/icons/icon-192x192.png',
            badge: this.config.notificationOptions?.badge || '/TNSTrack/icons/icon-72x72.png',
            vibrate: isCritical
                ? [500, 200, 500, 200, 500] // Vibración más intensa para críticas
                : (this.config.notificationOptions?.vibrate || [200, 100, 200]),
            data: {
                type: 'temperature',
                isCritical,
                maxDeviation,
                url: alertUrl, // URL dinámica con alertId
                alertIds: alertIds, // Array completo de alertIds
                channels: channelsInAlert.map((c, index) => ({
                    id: c.channelId,
                    name: c.channelName,
                    temp: c.averageTemperature,
                    status: c.status,
                    minTemp: c.minTemp,
                    maxTemp: c.maxTemp,
                    alertId: alertIds[index] || null // Vincular cada canal con su alertId
                })),
                timestamp: Date.now()
            },
            tag: 'temperature-alert',
            renotify: true,
            requireInteraction: true,
            isCritical // Marcador adicional para el filtrado DND
        };

        console.log(`📱 [${callId}] ➡️  LLAMANDO sendNotificationToAll()...`);
        const result = await this.sendNotificationToAll(payload, { idTipoAlerta: 1, idOrigenTipo: 1 });
        console.log(`📱 [${callId}] ✅  sendNotificationToAll() completado: ${result.sent}/${result.total} exitosas`);
        return result;
    }

    /**
     * Envía notificación de alerta de conexión/desconexión
     * @param {Array} disconnectedChannels - Canales con cambios de estado
     * @param {Array} alertIds - IDs de las alertas generadas
     * @returns {Promise<Object>}
     */
    async sendDisconnectionAlert(disconnectedChannels, alertIds = []) {
        if (!disconnectedChannels || disconnectedChannels.length === 0) return { sent: 0, failed: 0, total: 0, skippedByDND: 0 };

        const count = disconnectedChannels.length;
        const firstChannel = disconnectedChannels[0];
        const time = DateTime.now().setZone(this.timeZone).toFormat('dd/MM HH:mm');
        const now = DateTime.now().setZone(this.timeZone);

        // Evaluar criticidad: Si algún canal está desconectado según configuración
        let isCritical = false;
        let maxDisconnectionHours = 0;
        const criticalThresholdHours = this.criticalityConfig.disconnectionHours;

        for (const channel of disconnectedChannels) {
            // Verificar si está desconectado y por cuánto tiempo
            if (channel.finalStatus === 'disconnected' || channel.finalStatus === 'Desconectado') {
                if (channel.horaDesconexion) {
                    // Calcular duración de desconexión
                    const disconnectTime = DateTime.fromJSDate(channel.horaDesconexion instanceof Date ? channel.horaDesconexion : new Date(channel.horaDesconexion)).setZone(this.timeZone);
                    const hoursDisconnected = now.diff(disconnectTime, 'hours').hours;

                    if (hoursDisconnected > criticalThresholdHours) {
                        isCritical = true;
                        maxDisconnectionHours = Math.max(maxDisconnectionHours, hoursDisconnected);
                    }
                } else if (channel.disconnectDuration) {
                    // Si ya viene con duración calculada
                    const hours = channel.disconnectDuration / (1000 * 60 * 60); // Convertir ms a horas
                    if (hours > criticalThresholdHours) {
                        isCritical = true;
                        maxDisconnectionHours = Math.max(maxDisconnectionHours, hours);
                    }
                }
            }

            // También considerar crítico si múltiples sensores están desconectados
            if (count >= this.criticalityConfig.disconnectionCount) {
                isCritical = true;
                console.log(`[PushNotificationService] ${count} sensores desconectados (>=${this.criticalityConfig.disconnectionCount}) - marcando como crítico`);
            }
        }

        if (isCritical) {
            const durationText = maxDisconnectionHours > 0
                ? ` (máx: ${maxDisconnectionHours.toFixed(1)}h)`
                : '';
            console.log(`[PushNotificationService] Alerta de conexión CRÍTICA${durationText}`);
        }

        // Construir URL dinámica con alertId si está disponible
        // Usar appBaseUrl de configuración (para ngrok en desarrollo) o ruta relativa (producción/PWA)
        const baseUrl = this.config.appBaseUrl || '';

        // ✅ MEJORADO: Usar rutas relativas cuando no hay baseUrl (funciona en PWAs instaladas)
        let alertUrl;
        if (alertIds.length > 0) {
            const path = `/TNSTrack/gestion-alertas?alertId=${alertIds[0]}&channelId=${firstChannel.channelId}&type=disconnection`;
            alertUrl = baseUrl ? `${baseUrl}${path}` : path; // Ruta relativa si no hay baseUrl
        } else {
            const path = `/TNSTrack/metricas-alertas`;
            alertUrl = baseUrl ? `${baseUrl}${path}` : path; // Ruta relativa si no hay baseUrl
        }

        console.log(`[PushNotificationService] sendDisconnectionAlert: URL generada: ${alertUrl} (baseUrl: "${baseUrl}")`);

        const payload = {
            title: `${isCritical ? '🚨' : '⚠️'} Alerta de Conexión${isCritical ? ' CRÍTICA' : ''}`,
            body: isCritical && maxDisconnectionHours > 0
                ? `${count} sensor${count > 1 ? 'es' : ''} reportados. Máx desconexión: ${maxDisconnectionHours.toFixed(1)}h`
                : `${count} sensor${count > 1 ? 'es' : ''} reportados. ${firstChannel.name}: ${firstChannel.finalStatus}`,
            icon: this.config.notificationOptions?.icon || '/TNSTrack/icons/icon-192x192.png',
            badge: this.config.notificationOptions?.badge || '/TNSTrack/icons/icon-72x72.png',
            vibrate: isCritical
                ? [500, 200, 500, 200, 500] // Vibración más intensa para críticas
                : (this.config.notificationOptions?.vibrate || [200, 100, 200]),
            data: {
                type: 'disconnection',
                isCritical,
                maxDisconnectionHours,
                url: alertUrl, // URL dinámica con alertId
                alertIds: alertIds, // Array completo de alertIds
                channels: disconnectedChannels.map((c, index) => ({
                    id: c.channelId,
                    name: c.name,
                    status: c.finalStatus,
                    disconnectTime: c.horaDesconexion,
                    reconnectTime: c.horaReconexion,
                    disconnectDuration: c.disconnectDuration,
                    alertId: alertIds[index] || null // Vincular cada canal con su alertId
                })),
                timestamp: Date.now()
            },
            tag: 'disconnection-alert',
            renotify: true,
            requireInteraction: true,
            isCritical // Marcador adicional para el filtrado DND
        };

        return await this.sendNotificationToAll(payload, { idTipoAlerta: 2, idOrigenTipo: 1 });
    }

    /**
     * Actualiza estadísticas de una suscripción
     * @private
     */
    async _updateSubscriptionStats(subscriptionId, success) {
        if (!this.pool) return;

        try {
            const connection = await this.pool.getConnection();
            try {
                await connection.query(
                    `UPDATE ale_push_suscripciones
                     SET ultima_notificacion_enviada = NOW()
                     WHERE id_suscripcion = ?`,
                    [subscriptionId]
                );
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error("[PushNotificationService] Error actualizando stats:", error.message);
        }
    }

    /**
     * Detecta el tipo de dispositivo desde el user agent
     * @private
     */
    _detectDeviceType(userAgent) {
        if (!userAgent) return 'unknown';
        const ua = userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|ipod/.test(ua)) return 'mobile';
        if (/tablet/.test(ua)) return 'tablet';
        return 'desktop';
    }

    /**
     * Detecta el navegador desde el user agent
     * @private
     */
    _detectBrowser(userAgent) {
        if (!userAgent) return 'Unknown';
        const ua = userAgent.toLowerCase();
        if (ua.includes('edg')) return 'Edge';
        if (ua.includes('chrome')) return 'Chrome';
        if (ua.includes('firefox')) return 'Firefox';
        if (ua.includes('safari')) return 'Safari';
        if (ua.includes('opera')) return 'Opera';
        return 'Unknown';
    }

    /**
     * Obtiene la clave pública VAPID (para el cliente)
     */
    getPublicVapidKey() {
        return this.config?.vapidPublicKey || null;
    }

    /**
     * Obtiene estadísticas del servicio
     */
    getStats() {
        return {
            ...this.stats,
            initialized: this.initialized,
            enabled: this.config?.enabled || false
        };
    }

    /**
     * Limpia suscripciones inactivas
     * @param {number} daysInactive - Días de inactividad
     */
    async cleanupInactiveSubscriptions(daysInactive = 90) {
        if (!this.initialized || !this.pool) {
            console.warn("[PushNotificationService] No se puede ejecutar cleanup, servicio no inicializado.");
            return 0;
        }

        console.log(`[PushNotificationService] Limpiando suscripciones inactivas (>${daysInactive} días)...`);

        const connection = await this.pool.getConnection();
        try {
            const [result] = await connection.query(
                "CALL stpr_cleanup_old_push_subscriptions(?)",
                [daysInactive]
            );

            const deactivated = result[0]?.[0]?.subscriptions_deactivated || 0;
            console.log(`[PushNotificationService] Suscripciones desactivadas: ${deactivated}`);

            await this._loadStats(); // Recargar estadísticas

            return deactivated;

        } catch (error) {
            console.error("[PushNotificationService] Error en cleanup:", error.message);
            return 0;
        } finally {
            connection.release();
        }
    }

    /**
     * Cierra el servicio y libera recursos
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        this.initialized = false;
        console.log("[PushNotificationService] Servicio cerrado.");
    }
}

// Exportar instancia singleton. initialize() se llama desde server.js (initializeServices) tras configLoader.initialize().
const serviceInstance = new PushNotificationService();
module.exports = serviceInstance;
