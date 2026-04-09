// src/controllers/notificationController.js

const mysql = require("mysql2/promise");
const { DateTime } = require("luxon");
const configLoader = require("../config/js_files/configLoader_Config");
const emailService = require("../services/email/email_Service");
const notificationService = require("../services/notification_Service");
const pushNotificationService = require("../services/push/pushNotification_Service");
const alertTrackingService = require("../services/alertTracking_Service");
const alertScheduleConfigService = require("../services/db/alertScheduleConfig_Service");

class NotificationController {
    constructor() {
        // No leer config en constructor. Se asigna en init() tras configLoader.initialize().
        console.log("[NotificationCtrl] Constructor: Creando instancia...");
        this.appConfig = null;
        this.timeZone = "America/Santiago";
        this.disconnectionAlertThreshold = 55;
        this.cleanupInterval = 720;
        this.pool = null;
        this.initialized = false;
        this.disconnectionAlertsByHour = {};
        this.hourlyProcessingTimer = null;
        this.recurringHourlyTimer = null;
        this.cleanupDisconnectTimer = null;
        console.log("[NotificationCtrl] Constructor: Propiedades básicas (sin config) configuradas.");
    }

    /**
     * Carga config y propiedades derivadas. Llamar desde boot() tras configLoader.initialize().
     */
    init() {
        this.appConfig = configLoader.getConfig();
        this.timeZone = this.appConfig.alertSystem?.timeZone || "America/Santiago";
        this.disconnectionAlertThreshold = this.appConfig.alertSystem?.intervals?.disconnection?.initialDelay || 55;
        this.cleanupInterval = this.appConfig.alertSystem?.intervals?.cleanupMinutes || 720;
        console.log(`[NotificationCtrl] init: Zona horaria: ${this.timeZone}, cleanupInterval: ${this.cleanupInterval} min`);
    }

    /**
     * Inicializa el controlador: crea el pool de BD y configura los timers.
     * Debe ser llamado desde server.js DESPUÉS de cargar la configuración.
     */
    async initialize() {
        if (this.initialized) {
            console.warn("[NotificationCtrl] initialize: Ya inicializado. Omitiendo.");
            return;
        }
        console.log("[NotificationCtrl] initialize: Iniciando inicialización...");

        try {
            // 1. Crear Pool de Conexiones (si no existe)
            if (!this.pool) {
                console.log("[NotificationCtrl] initialize: Creando pool de conexiones MySQL...");
                const dbConfig = this.appConfig.database; // Usar config ya cargada del constructor
                // Validar configuración esencial para el pool
                if (!dbConfig?.host || !dbConfig.database || !(dbConfig.user || dbConfig.username) || dbConfig.password === undefined) {
                    throw new Error("Configuración de base de datos incompleta o inválida para NotificationController pool.");
                }
                const userDb = dbConfig.user || dbConfig.username; // Usar 'user' o 'username'

                this.pool = mysql.createPool({
                    host: dbConfig.host,
                    user: userDb,
                    password: dbConfig.password,
                    database: dbConfig.database,
                    port: dbConfig.port || 3306,
                    waitForConnections: true,
                    connectionLimit: dbConfig.pool?.max_size || 10,
                    queueLimit: 0,
                    decimalNumbers: true // Es buena práctica mantenerlo consistente
                });

                // Probar conexión obteniendo una y liberándola
                let connection = null;
                try {
                    connection = await this.pool.getConnection();
                    console.log("[NotificationCtrl] initialize: Pool creado y conexión inicial verificada.");
                } finally {
                    if (connection) connection.release();
                }
            } else {
                console.log("[NotificationCtrl] initialize: Pool ya existe (posible re-inicialización?).");
            }

            // 2. Configurar Timers
            this.setupTimers(); // Llama al método existente que configura los timers

            this.initialized = true;
            console.log("✅ [NotificationCtrl] initialize: Controlador inicializado correctamente (Pool listo, Timers configurados).");

        } catch (error) {
            console.error("❌ [NotificationCtrl] Error CRÍTICO durante initialize:", error.message);
            this.initialized = false;
            // Intentar cerrar el pool si se creó parcialmente y falló después
            if (this.pool) {
                try { await this.pool.end(); } catch (e) { /* Ignorar error de cierre */ }
            }
            this.pool = null; // Asegurar que el pool quede nulo si falla
            // Relanzar para que server.js sepa que falló
            throw error;
        }
    }

    /**
     * Configura los timers para procesar alertas y limpiar buffers antiguos.
     * (Llamado desde initialize)
     */
    setupTimers() {
        // Asegurarse de que los timers solo se configuren una vez o limpiar existentes
        this.cleanupTimers();
        console.log("[NotificationCtrl] setupTimers: Configurando timers...");

        // 1. Timer para procesar alertas acumuladas cada hora exacta
        this.setupHourlyAlertProcessing();

        // 2. Timer para limpieza periódica de buffers de DESCONEXIÓN antiguos
        const cleanupIntervalMs = (this.cleanupInterval || 720) * 60 * 1000;
        if (cleanupIntervalMs > 0) { // Asegurar que el intervalo sea válido
            this.cleanupDisconnectTimer = setInterval(() => {
                // Añadir try-catch dentro del interval para evitar que falle todo el timer
                try {
                    console.log(`[NotificationCtrl] Ejecutando limpieza periódica de buffers de desconexión...`);
                    this.cleanupOldHourlyAlerts();
                } catch (cleanupError) {
                    console.error("❌ [NotificationCtrl] Error durante la ejecución de limpieza periódica:", cleanupError);
                }
            }, cleanupIntervalMs);
            console.log(`[NotificationCtrl] setupTimers: Timer de limpieza (desconexión) configurado cada ${this.cleanupInterval} minutos.`);
        } else {
            console.warn("[NotificationCtrl] setupTimers: Intervalo de limpieza inválido o cero. Timer de limpieza no configurado.");
        }

        console.log(`[NotificationCtrl] setupTimers: Configuración de timers completada.`);
    }

    /**
     * Configura el timer para procesar alertas cada hora exacta.
     * (Llamado desde setupTimers)
     */
    setupHourlyAlertProcessing() {
        try {
            const now = DateTime.now().setZone(this.timeZone);
            const nextHour = now.endOf("hour").plus({ milliseconds: 1 });
            const timeToNextHour = nextHour.diff(now).toMillis();

            console.log(`[NotificationCtrl] Configurando timer para procesar alertas en la próxima hora (${nextHour.toISO()})`);
            console.log(`  -> Tiempo restante: ${Math.round(timeToNextHour / 60000)} minutos`);

            // Limpiar timer anterior si existe (importante en caso de re-inicialización)
            if (this.hourlyProcessingTimer) clearTimeout(this.hourlyProcessingTimer);

            this.hourlyProcessingTimer = setTimeout(() => {
                console.log(`[NotificationCtrl] Ejecutando procesamiento de alertas programado para: ${DateTime.now().setZone(this.timeZone).toISO()}`);
                // Envolver llamada en try-catch
                this.processHourlyAlerts()
                    .catch(err => console.error("❌ [NotificationCtrl] Error durante el procesamiento HORARIO INICIAL de alertas:", err));

                // Limpiar timer recurrente anterior si existe
                if (this.recurringHourlyTimer) clearInterval(this.recurringHourlyTimer);

                // Configurar timer recurrente CADA HORA
                this.recurringHourlyTimer = setInterval(async () => {
                    const currentTime = DateTime.now().setZone(this.timeZone);
                    console.log(`[NotificationCtrl] Ejecutando procesamiento recurrente de alertas: ${currentTime.toISO()}`);
                    try {
                        await this.processHourlyAlerts();
                    } catch (err) {
                        console.error("❌ [NotificationCtrl] Error durante el procesamiento RECURRENTE de alertas:", err);
                        // Considerar si detener el interval aquí o dejar que siga intentando
                    }
                }, 60 * 60 * 1000); // 1 hora

            }, timeToNextHour);

            console.log("[NotificationCtrl] Timer para procesamiento horario de alertas configurado.");
        } catch (error) {
            console.error("❌ [NotificationCtrl] Error al configurar timer para procesamiento de alertas:", error);
            console.log("  -> Reintentando configuración del timer en 1 minuto...");
            // Asegurar que el reintento no cree múltiples timeouts
            if (this.hourlyProcessingTimer) clearTimeout(this.hourlyProcessingTimer);
            // Usar una variable diferente o limpiar explícitamente para evitar solapamientos
            setTimeout(() => { this.setupHourlyAlertProcessing(); }, 60 * 1000);
        }
    }

    /**
     * Detiene y limpia todos los timers activos del controlador.
     */
    cleanupTimers() {
        if (this.hourlyProcessingTimer) {
            clearTimeout(this.hourlyProcessingTimer);
            this.hourlyProcessingTimer = null;
            console.log("[NotificationCtrl] Timer de procesamiento inicial detenido.");
        }
        if (this.recurringHourlyTimer) {
            clearInterval(this.recurringHourlyTimer);
            this.recurringHourlyTimer = null;
            console.log("[NotificationCtrl] Timer recurrente de procesamiento detenido.");
        }
        if (this.cleanupDisconnectTimer) {
            clearInterval(this.cleanupDisconnectTimer);
            this.cleanupDisconnectTimer = null;
            console.log("[NotificationCtrl] Timer de limpieza (desconexión) detenido.");
        }
    }

    // --- Métodos de Ayuda (Sin Cambios Funcionales) ---
    getHourKey(date = null) {
        const d = date
            ? (date instanceof DateTime ? date : DateTime.fromJSDate(date instanceof Date ? date : new Date(date))).setZone(this.timeZone)
            : DateTime.now().setZone(this.timeZone);
        return d.toFormat("yyyy-MM-dd-HH");
    }

    async isWithinWorkingHours(checkTime = null) {
        const now = checkTime
            ? (checkTime instanceof DateTime ? checkTime : DateTime.fromJSDate(checkTime instanceof Date ? checkTime : new Date(checkTime))).setZone(this.timeZone)
            : DateTime.now().setZone(this.timeZone);

        // Verificar feriados si respetar_feriados está habilitado (Nivel 1 - config global)
        const configCache = alertScheduleConfigService.configCache;
        if (configCache?.respetar_feriados) {
            const isHolidayToday = await this.isHoliday(now);
            if (isHolidayToday) {
                console.log(`[NotificationCtrl] isWithinWorkingHours: Feriado ${now.toFormat('yyyy-MM-dd')} — fuera de horario operacional`);
                return false;
            }
        }

        // Delegar evaluación de horario al servicio (Nivel 1 — única fuente de verdad)
        const resultado = await alertScheduleConfigService.isWithinOperationalHours(now);

        console.log(`[NotificationCtrl] isWithinWorkingHours: ${resultado.motivo}`);

        return resultado.enHorario;
    }

    // --- MÉTODO PRINCIPAL REFACTORIZADO (processHourlyAlerts - Lógica Interna Sin Cambios) ---
    async processHourlyAlerts() {
        const executionId = `EXEC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`\n========== [${executionId}] ==========`);
        console.log(`[NotificationCtrl][${executionId}] processHourlyAlerts: LLAMADA INICIADA`);
        console.log(`[NotificationCtrl][${executionId}] Timestamp: ${new Date().toISOString()}`);

        // Verificar si está inicializado antes de proceder
        if (!this.initialized || !this.pool) {
            console.error(`❌ [NotificationCtrl][${executionId}] processHourlyAlerts llamado pero el controlador/pool no está inicializado.`);
            return; // No continuar si no está listo
        }

        const now = DateTime.now().setZone(this.timeZone);
        const prevHour = now.minus({ hours: 1 });
        const prevHourKey = this.getHourKey(prevHour);

        console.log(`[NotificationCtrl][${executionId}] processHourlyAlerts: Iniciando procesamiento para la hora ${prevHourKey}`);

        // --- 1. Procesar Desconexiones (SIEMPRE) ---
        let disconnectionResults = null;
        try {
            console.log(`[NotificationCtrl] processHourlyAlerts: Procesando alertas de conexión/desconexión para ${prevHourKey}...`);
            disconnectionResults = await this.processHourlyDisconnectionAlerts(prevHourKey);
            console.log(`[NotificationCtrl] processHourlyAlerts: Análisis de desconexión completado para ${prevHourKey}. Alertas a enviar: ${disconnectionResults?.formattedAlerts?.length ?? 0}.`);
        } catch (error) {
            console.error(`❌ [NotificationCtrl] Error CRÍTICO durante processHourlyDisconnectionAlerts para ${prevHourKey}:`, error.message);
            await this.logError(`Fallo en processHourlyDisconnectionAlerts para ${prevHourKey}: ${error.message}`);
            disconnectionResults = null; // Para evitar procesamiento posterior
        }

        // Enviar notificaciones de Desconexión (Email + SMS) y actualizar BD si hubo alertas
        if (disconnectionResults && disconnectionResults.formattedAlerts.length > 0) {
            console.log(`[NotificationCtrl] processHourlyAlerts: ${disconnectionResults.formattedAlerts.length} alertas de conexión/desconexión detectadas. Iniciando registro y notificación...`);

            // **NUEVO: Registrar alertas en BD ANTES de enviar notificaciones**
            let alertIds = [];
            try {
                console.log("  -> Registrando alertas de desconexión en BD...");
                const result = await alertTrackingService.createBulkAlerts(disconnectionResults.formattedAlerts, 'disconnection');
                alertIds = result.alertIds || [];
                console.log(`  -> ${alertIds.length} alertas de desconexión registradas en BD. IDs: [${alertIds.join(', ')}]`);
            } catch (trackingError) {
                console.error(`❌ Error registrando alertas de desconexión en BD:`, trackingError);
                await this.logError(`Fallo registro alertas desconexión en BD: ${trackingError.message}`);
                // Continuar con el envío aunque falle el tracking
            }

            // Enviar Email (código existente)
            let emailSentSuccessfully = false;
            try {
                // sendDisconnectedSensorsEmail ahora usa destinatarios dinámicos con fallback
                emailSentSuccessfully = await emailService.sendDisconnectedSensorsEmail(disconnectionResults.formattedAlerts);
                if (!emailSentSuccessfully) {
                    console.warn("  -> Fallo reportado por emailService al enviar correo de conexión/desconexión (Intento 1).");
                } else {
                    console.log("  -> Correo de conexión/desconexión enviado (Intento 1 exitoso).");
                }
            } catch (emailError) {
                console.error("  -> Error CRÍTICO enviando email de conexión/desconexión:", emailError.message);
                await this.logError(`Fallo envío email desconexión: ${emailError.message}`);
                emailSentSuccessfully = false;
            }

            // Actualizar BD SOLO si el email fue exitoso (código existente)
            if (emailSentSuccessfully) {
                await this.updateDatabaseForDisconnections(disconnectionResults);
            } else {
                console.warn("[NotificationCtrl] processHourlyAlerts: Intento 1 de envío de correo de conexión/desconexión falló. NO se actualizará last_alert_sent en BD.");
                await this.logError(`Fallo envío email desconexión impidió actualización BD para hora ${prevHourKey}.`);
            }


            // **MODIFICADO: Enviar Push Notifications CON alertIds**
            try {
                console.log(`[NotificationCtrl] processHourlyAlerts: Intentando enviar Push Notification de conexión/desconexión...`);
                const pushResult = await pushNotificationService.sendDisconnectionAlert(disconnectionResults.formattedAlerts, alertIds);
                console.log(`  -> Push Notifications de desconexión enviadas: ${pushResult.sent}/${pushResult.total} exitosas`);
                if (alertIds.length > 0) {
                    console.log(`  -> Notificaciones vinculadas a alertas: [${alertIds.join(', ')}]`);
                }
            } catch (pushError) {
                console.error("  -> Error enviando Push Notification de conexión/desconexión:", pushError.message);
                await this.logError(`Fallo envío Push desconexión: ${pushError.message}`);
            }
        } else if (disconnectionResults) {
            console.log(`[NotificationCtrl] processHourlyAlerts: No se requieren notificaciones de conexión/desconexión para ${prevHourKey}.`);
        }
        // --- FIN Procesamiento Desconexiones ---


        // --- 2. Procesar Temperaturas (ventana y envío decididos por notificationSchedule_Service en Email/Push) ---
        console.log(`[NotificationCtrl] processHourlyAlerts: Iniciando análisis de temperatura...`);
        await this.logToDatabase(`INFO: Iniciando análisis horario de temperatura.`);

        const endTime = now.startOf("hour");
        const startTime = endTime.minus({ minutes: 110 });
        const startTimeStr = startTime.toFormat("yyyy-MM-dd HH:mm:ss");
        const endTimeStr = endTime.toFormat("yyyy-MM-dd HH:mm:ss");

        try {
            await this.logToDatabase(`INFO: Analizando ventana temperatura [${startTimeStr} - ${endTimeStr}]`);
            const channelsInAlert = await notificationService.analyzeHourlyTemperatureData(startTimeStr, endTimeStr);
            await this.logToDatabase(`INFO: Análisis temperatura completado. ${channelsInAlert.length} canales en alerta.`);

            if (channelsInAlert.length > 0) {
                console.log(`[NotificationCtrl] processHourlyAlerts: ${channelsInAlert.length} canales con alertas de temperatura. Registro y notificación (ventana/DND en servicios)...`);

                let alertIds = [];
                try {
                    const result = await alertTrackingService.createBulkAlerts(channelsInAlert, 'temperature');
                    alertIds = result.alertIds || [];
                } catch (trackingError) {
                    console.error(`❌ Error registrando alertas de temperatura en BD:`, trackingError);
                    await this.logError(`Fallo registro alertas temperatura en BD: ${trackingError.message}`);
                }

                try {
                    await emailService.sendTemperatureRangeAlertsEmail(channelsInAlert, null, true);
                } catch (emailTempError) {
                    console.error(`❌ [${executionId}] Error enviando Email de temperatura:`, emailTempError);
                    await this.logError(`Fallo envío email temperatura: ${emailTempError.message}`);
                }

                try {
                    const pushResult = await pushNotificationService.sendTemperatureAlert(channelsInAlert, alertIds);
                    console.log(`[${executionId}] Push temperatura: ${pushResult.sent}/${pushResult.total} exitosas`);
                } catch (pushTempError) {
                    console.error(`❌ [${executionId}] Error enviando Push temperatura:`, pushTempError);
                    await this.logError(`Fallo envío Push temperatura: ${pushTempError.message}`);
                }
            } else {
                console.log(`[NotificationCtrl] processHourlyAlerts: No hay alertas de temperatura para la ventana a las ${endTime.toFormat('HH:mm')}.`);
            }
        } catch (analysisError) {
            console.error(`❌ Error CRÍTICO durante analyzeHourlyTemperatureData: ${analysisError.message}`);
            await this.logError(`Fallo análisis horario temperatura [${startTimeStr}-${endTimeStr}]: ${analysisError.message}`);
        }
        // --- FIN Procesamiento Temperaturas ---


        // --- 3. Limpieza ---
        // Limpiar buffers procesados de DESCONEXIÓN para la hora anterior
        this.cleanupProcessedHourlyAlerts(prevHourKey);

        console.log(`[NotificationCtrl] processHourlyAlerts: Procesamiento para la hora ${prevHourKey} finalizado.`);
    }


    // --- MÉTODO AUXILIAR PARA ACTUALIZAR BD DE DESCONEXIONES (Sin Cambios Funcionales) ---
    async updateDatabaseForDisconnections(disconnectionResults) {
        if (!this.pool || !this.initialized) {
            console.error("❌ [NotificationCtrl] updateDatabaseForDisconnections: Pool/Controlador no inicializado.");
            return;
        }
        console.log("[NotificationCtrl] updateDatabaseForDisconnections: Actualizando BD para last_alert_sent...");
        let connection;
        try {
            connection = await this.pool.getConnection(); // Usar pool de instancia
            const nowTimestamp = DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");

            // Actualizar last_alert_sent
            if (disconnectionResults.channelsToUpdateLastSent.length > 0) {
                const idsToUpdate = disconnectionResults.channelsToUpdateLastSent;
                console.log(`  -> Actualizando last_alert_sent a ${nowTimestamp} para canales: ${idsToUpdate.join(', ')}`);
                // Migrado: channels_ubibot → ubi_canal, last_alert_sent → ultima_alerta_enviada, channel_id → canal_id
                const [updateResult] = await connection.query(
                    "UPDATE ubi_canal SET ultima_alerta_enviada = ? WHERE canal_id IN (?)",
                    [nowTimestamp, idsToUpdate]
                );
                console.log(`    -> Filas afectadas por UPDATE ultima_alerta_enviada: ${updateResult.affectedRows}`);
            } else { console.log("  -> No hay canales que requieran actualizar last_alert_sent (nuevas desconexiones)."); }

            // Resetear last_alert_sent
            if (disconnectionResults.channelsToResetLastSent.length > 0) {
                const idsToReset = disconnectionResults.channelsToResetLastSent;
                console.log(`  -> Reseteando last_alert_sent a NULL para canales: ${idsToReset.join(', ')}`);
                // Migrado: channels_ubibot → ubi_canal, last_alert_sent → ultima_alerta_enviada, channel_id → canal_id
                const [resetResult] = await connection.query(
                    "UPDATE ubi_canal SET ultima_alerta_enviada = NULL WHERE canal_id IN (?)",
                    [idsToReset]
                );
                console.log(`    -> Filas afectadas por RESET ultima_alerta_enviada: ${resetResult.affectedRows}`);
            } else { console.log("  -> No hay canales que requieran resetear last_alert_sent (reconexiones)."); }

        } catch (dbError) {
            console.error("❌ [NotificationCtrl] Error CRÍTICO actualizando last_alert_sent en BD:", dbError.message);
            await this.logError(`Fallo actualización BD last_alert_sent: ${dbError.message}`);
            console.error("   - Canales para actualizar:", disconnectionResults.channelsToUpdateLastSent);
            console.error("   - Canales para resetear:", disconnectionResults.channelsToResetLastSent);
        } finally {
            if (connection) { connection.release(); console.log("  -> Conexión DB liberada después de actualizaciones de desconexión."); }
        }
    }


    // --- Métodos de Procesamiento de Desconexiones (Sin Cambios Funcionales Internos) ---
    async processHourlyDisconnectionAlerts(hourKey) {
        if (!this.pool || !this.initialized) {
            console.error("❌ [NotificationCtrl] processHourlyDisconnectionAlerts: Pool/Controlador no inicializado.");
            // Devolver estructura vacía para no detener el flujo principal
            return { formattedAlerts: [], channelsToUpdateLastSent: [], channelsToResetLastSent: [] };
        }
        // ... (resto de la lógica como estaba, usando this.pool) ...
        console.log(`[NotificationCtrl] processHourlyDisconnectionAlerts: Iniciando análisis para ${hourKey}.`);

        // ==================== PARTE 1: Procesar eventos de cambio de estado ====================
        const eventsByChannel = this.disconnectionAlertsByHour[hourKey] || {};
        const channelIdsWithEvents = Object.keys(eventsByChannel);
        const results = { formattedAlerts: [], channelsToUpdateLastSent: [], channelsToResetLastSent: [] };

        let connection;
        try {
            connection = await this.pool.getConnection();

            if (channelIdsWithEvents.length > 0) {
                console.log(`[NotificationCtrl] processHourlyDisconnectionAlerts: Analizando ${channelIdsWithEvents.length} canales con eventos en ${hourKey}.`);

                for (const channelId of channelIdsWithEvents) {
                // ... (lógica interna de análisis de eventos, consulta a BD, llenado de 'results') ...
                const events = eventsByChannel[channelId] || [];
                if (events.length === 0) continue;
                events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const lastEvent = events[events.length - 1];
                const finalStatus = lastEvent.event;
                const channelName = lastEvent.channelName;
                const firstDisconnectEvent = events.find(e => e.event === 'disconnected');
                const lastConnectEvent = events.slice().reverse().find(e => e.event === 'connected');
                const firstDisconnectTs = firstDisconnectEvent ? DateTime.fromISO(firstDisconnectEvent.timestamp).setZone(this.timeZone) : null;
                const lastReconnectTs = lastConnectEvent ? DateTime.fromISO(lastConnectEvent.timestamp).setZone(this.timeZone) : null;

                // Migrado: channels_ubibot → ubi_canal; is_currently_out_of_range inferido de fuera_linea_desde
                const [channelDbStateRows] = await connection.query(
                    "SELECT (fuera_linea_desde IS NOT NULL) AS fuera_linea, fuera_linea_desde, ultima_alerta_enviada FROM ubi_canal WHERE canal_id = ?",
                    [channelId]
                );
                if (channelDbStateRows.length === 0) {
                    console.warn(`[NotificationCtrl] processHourlyDisconnectionAlerts: Canal ${channelId} con eventos en buffer no encontrado en BD. Omitiendo.`);
                    continue;
                }
                const dbState = channelDbStateRows[0];
                // Migrado: out_of_range_since → fuera_linea_desde, last_alert_sent → ultima_alerta_enviada
                const dbOutOfRangeSince = dbState.fuera_linea_desde ? DateTime.fromJSDate(dbState.fuera_linea_desde).setZone(this.timeZone) : null;
                const dbLastAlertSent = dbState.ultima_alerta_enviada ? DateTime.fromJSDate(dbState.ultima_alerta_enviada).setZone(this.timeZone) : null;

                if (finalStatus === 'disconnected') {
                    if (dbOutOfRangeSince && (!dbLastAlertSent || dbLastAlertSent < dbOutOfRangeSince)) {
                        results.formattedAlerts.push({
                            name: channelName, channelId: channelId, finalStatus: 'DESCONECTADO',
                            horaDesconexion: dbOutOfRangeSince ? dbOutOfRangeSince.toFormat("dd/MM HH:mm:ss") : 'N/A',
                            horaReconexion: 'N/A en periodo',
                        });
                        results.channelsToUpdateLastSent.push(channelId);
                    }
                } else { // finalStatus === 'connected'
                    const horaDesconexionParaCorreo = firstDisconnectTs ? firstDisconnectTs.toFormat("dd/MM HH:mm:ss") : (dbOutOfRangeSince ? dbOutOfRangeSince.toFormat("dd/MM HH:mm:ss") : 'N/A');
                    const horaReconexionParaCorreo = lastReconnectTs ? lastReconnectTs.toFormat("dd/MM HH:mm:ss") : 'N/A';
                    results.formattedAlerts.push({
                        name: channelName, channelId: channelId, finalStatus: 'CONECTADO',
                        horaDesconexion: horaDesconexionParaCorreo, horaReconexion: horaReconexionParaCorreo,
                    });
                    results.channelsToResetLastSent.push(channelId);
                }
                } // Fin for
                console.log(`[NotificationCtrl] processHourlyDisconnectionAlerts: Análisis de eventos completado. Alertas: ${results.formattedAlerts.length}, Actualizar: ${results.channelsToUpdateLastSent.length}, Resetear: ${results.channelsToResetLastSent.length}`);
            } // Fin if (channelIdsWithEvents.length > 0)

            // ==================== PARTE 2: Monitoreo continuo - Enviar alertas cada hora ====================
            console.log(`[NotificationCtrl] Iniciando monitoreo continuo de desconexiones para ${hourKey}...`);

            // Consultar TODOS los canales operativos y su última lectura
            // Migrado: channels_ubibot → ubi_canal, sensor_readings_ubibot → ubi_lecturas_sensor
            // JOIN usa id_canal (PK), no canal_id (API ID)
            const [currentStatus] = await connection.query(`
                SELECT
                    c.id_canal,
                    c.canal_id,
                    c.nombre,
                    c.id_producto,
                    MAX(sr.fecha_lectura_externa) as last_reading,
                    TIMESTAMPDIFF(MINUTE, MAX(sr.fecha_lectura_externa), NOW()) as minutes_disconnected
                FROM ubi_canal c
                LEFT JOIN ubi_lecturas_sensor sr ON c.id_canal = sr.id_canal
                WHERE c.activo = 1
                GROUP BY c.id_canal, c.canal_id, c.nombre, c.id_producto
            `);

            // Separar en DESCONECTADOS vs CONECTADOS
            const disconnectionThreshold = this.disconnectionThreshold; // 55 minutos
            const currentlyDisconnected = [];
            const currentlyConnected = [];

            for (const channel of currentStatus) {
                if (!channel.last_reading || channel.minutes_disconnected > disconnectionThreshold) {
                    currentlyDisconnected.push(channel);
                } else {
                    currentlyConnected.push(channel);
                }
            }

            console.log(`[NotificationCtrl] Estado actual: ${currentlyDisconnected.length} desconectados, ${currentlyConnected.length} conectados`);

            // PASO A: Procesar DESCONECTADOS - Enviar alerta cada hora
            if (currentlyDisconnected.length > 0) {
                console.log(`[NotificationCtrl] Procesando ${currentlyDisconnected.length} canales desconectados...`);

                for (const channel of currentlyDisconnected) {
                    // Agregar a results.formattedAlerts para que se envíe la notificación
                    const horaDesconexion = channel.last_reading
                        ? DateTime.fromJSDate(channel.last_reading).setZone(this.timeZone).toFormat("dd/MM HH:mm:ss")
                        : 'Sin lecturas';

                    results.formattedAlerts.push({
                        name: channel.nombre,
                        channelId: channel.canal_id,
                        productId: channel.id_producto,
                        finalStatus: 'DESCONECTADO',
                        horaDesconexion: horaDesconexion,
                        horaReconexion: 'N/A',
                        minutesDisconnected: channel.minutes_disconnected
                    });

                    // Verificar si ya existe alerta activa en ale_seguimiento
                    // Migrado: alert_tracking → ale_seguimiento; alert_type='disconnection' → id_tipo_alerta=2
                    const [existingAlert] = await connection.query(`
                        SELECT id_alerta
                        FROM ale_seguimiento
                        WHERE origen_id = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
                          AND id_tipo_alerta = 2
                          AND estado IN ('pendiente', 'confirmado')
                        ORDER BY fecha_alerta DESC
                        LIMIT 1
                    `, [channel.canal_id]);

                    if (existingAlert.length > 0) {
                        // Nuevo modelo: un registro por evento, sin contador de ocurrencias
                        console.log(`[NotificationCtrl]   - ${channel.nombre}: Alerta ${existingAlert[0].id_alerta} activa (sensor aún desconectado)`);
                    } else {
                        // No existe alerta activa — nueva desconexión detectada
                        console.log(`[NotificationCtrl]   - ${channel.nombre}: Nueva alerta de desconexión detectada`);
                    }
                }
            }

            // PASO B: Procesar RECONECTADOS - Detectar y notificar reconexiones
            if (currentlyConnected.length > 0) {
                // Buscar si alguno tiene alerta activa (estaba desconectado antes)
                // Migrado: alert_tracking → ale_seguimiento, channels_ubibot → ubi_canal
                const [reconnectedAlerts] = await connection.query(`
                    SELECT aseg.*, uc.nombre AS channel_name
                    FROM ale_seguimiento aseg
                    INNER JOIN ubi_canal uc ON uc.id_canal = aseg.origen_id
                    WHERE aseg.origen_id IN (SELECT id_canal FROM ubi_canal WHERE canal_id IN (?))
                      AND aseg.id_tipo_alerta = 2
                      AND aseg.estado IN ('pendiente', 'confirmado')
                `, [currentlyConnected.map(ch => ch.canal_id)]);

                if (reconnectedAlerts.length > 0) {
                    console.log(`[NotificationCtrl] ${reconnectedAlerts.length} canales RECONECTADOS detectados`);

                    for (const alert of reconnectedAlerts) {
                        // alert.origen_id = id_canal (PK interna) — comparar con id_canal, no canal_id
                        const channel = currentlyConnected.find(ch => ch.id_canal === alert.origen_id);
                        if (!channel) {
                            console.warn(`[NotificationCtrl] Canal con id_canal=${alert.origen_id} no encontrado en currentlyConnected. Omitiendo alerta de reconexión.`);
                            continue;
                        }
                        const horaReconexion = channel.last_reading
                            ? DateTime.fromJSDate(channel.last_reading).setZone(this.timeZone).toFormat("dd/MM HH:mm:ss")
                            : 'Sin lecturas';

                        // Agregar a results como CONECTADO
                        results.formattedAlerts.push({
                            name: alert.channel_name,
                            channelId: alert.origen_id,
                            finalStatus: 'CONECTADO',
                            horaDesconexion: alert.fecha_alerta
                                ? DateTime.fromJSDate(alert.fecha_alerta).setZone(this.timeZone).toFormat("dd/MM HH:mm:ss")
                                : 'N/A',
                            horaReconexion: horaReconexion,
                            alertId: alert.id_alerta
                        });

                        // Marcar alerta como resuelta
                        // Migrado: alert_tracking → ale_seguimiento; status='resolved' → estado='resuelto'
                        await connection.query(`
                            UPDATE ale_seguimiento
                            SET estado = 'resuelto',
                                fecha_resolucion = NOW(),
                                tiempo_resolucion_minutos = TIMESTAMPDIFF(MINUTE, fecha_alerta, NOW())
                            WHERE id_alerta = ?
                        `, [alert.id_alerta]);

                        console.log(`[NotificationCtrl]   - ${alert.channel_name}: Reconectado (alerta ${alert.id_alerta} resuelta)`);
                    }
                }
            }

            console.log(`[NotificationCtrl] Monitoreo continuo completado. Total alertas a enviar: ${results.formattedAlerts.length}`);
            return results;
        } catch (error) {
            console.error(`❌ [NotificationCtrl] Error CRÍTICO en processHourlyDisconnectionAlerts para ${hourKey}:`, error.message);
            await this.logError(`Fallo en processHourlyDisconnectionAlerts [${hourKey}]: ${error.message}`);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    async processConnectionStatusChange(channelId, channelName, isOnline, wasOffline, outOfRangeSince, lastAlertSent, isOperational) {
        // ... (lógica existente para añadir a disconnectionAlertsByHour) ...
        try {
            if (!isOperational) { return; }
            const currentEvent = isOnline ? "connected" : "disconnected";
            const eventTimestamp = new Date();
            const hourKey = this.getHourKey(eventTimestamp);
            if (!this.disconnectionAlertsByHour[hourKey]) this.disconnectionAlertsByHour[hourKey] = {};
            if (!this.disconnectionAlertsByHour[hourKey][channelId]) this.disconnectionAlertsByHour[hourKey][channelId] = [];
            const eventData = { event: currentEvent, timestamp: eventTimestamp.toISOString(), channelId: channelId, channelName: channelName };
            this.disconnectionAlertsByHour[hourKey][channelId].push(eventData);
        } catch (error) {
            console.error(`❌ [NotificationCtrl] Error en processConnectionStatusChange para ${channelId}:`, error.message);
            await this.logError(`Fallo en processConnectionStatusChange [${channelId}]: ${error.message}`);
        }
    }

    /**
     * Verifica si una fecha específica es un feriado en Chile.
     * @param {Date|string|import('luxon').DateTime|null} checkTime - Fecha a verificar, si es null se usa la fecha actual
     * @returns {Promise<boolean>} - true si la fecha es un feriado, false en caso contrario
     */
    async isHoliday(checkTime = null) {
        // Si no está inicializado o no hay pool de conexiones disponible
        if (!this.initialized || !this.pool) {
            console.error("[NotificationCtrl] isHoliday: Controller not initialized or pool not available");
            return false; // Por defecto asumimos que no es feriado si no podemos verificar
        }

        // Normalizar fecha a DateTime en zona horaria correcta (America/Santiago)
        const dateToCheck = checkTime
            ? (checkTime instanceof DateTime ? checkTime : DateTime.fromJSDate(checkTime instanceof Date ? checkTime : new Date(checkTime))).setZone(this.timeZone)
            : DateTime.now().setZone(this.timeZone);

        // Formatear la fecha en formato yyyy-MM-dd para consulta SQL
        const formattedDate = dateToCheck.toFormat('yyyy-MM-dd');

        let connection;
        try {
            connection = await this.pool.getConnection();

            // Consultar si la fecha existe en la tabla de feriados
            // Migrado: feriados_cl → gen_feriados_cl
            const [rows] = await connection.query(
                "SELECT 1 FROM gen_feriados_cl WHERE fecha = ?",
                [formattedDate]
            );

            // Si hay al menos una fila, es un feriado
            const isHoliday = rows.length > 0;

            if (isHoliday) {
                console.log(`[NotificationCtrl] isHoliday: La fecha ${formattedDate} ES un feriado.`);
            } else {
                console.log(`[NotificationCtrl] isHoliday: La fecha ${formattedDate} NO es un feriado.`);
            }

            return isHoliday;

        } catch (error) {
            console.error(`[NotificationCtrl] Error verificando si ${formattedDate} es feriado:`, error.message);
            // Si ocurre un error, por seguridad asumimos que no es feriado
            return false;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
    // --- Métodos de Limpieza de Buffers (Sin Cambios Funcionales Internos) ---
    cleanupProcessedHourlyAlerts(hourKey) {  // ELIMINADO: Limpieza de temperatureAlertsByHour
        let cleanedDisc = false;
        if (this.disconnectionAlertsByHour[hourKey]) {
            delete this.disconnectionAlertsByHour[hourKey];
            cleanedDisc = true;
        }
        if (cleanedDisc) {
            console.log(`[NotificationCtrl] Buffers horarios de DESCONEXIÓN limpiados para la hora: ${hourKey}`);
        }
    }

    cleanupOldHourlyAlerts() {
        const now = DateTime.now().setZone(this.timeZone);
        const cutoffHours = 48; // Mantener buffers de las últimas 48 horas (ajustable)
        const cutoffTime = now.minus({ hours: cutoffHours });
        let cleanedKeys = 0;

        console.log(`[NotificationCtrl] cleanupOldHourlyAlerts: Limpiando buffers de DESCONEXIÓN anteriores a ${cutoffTime.toISO()}`);

        // ELIMINADO: Limpieza de temperatureAlertsByHour

        // Limpiar alertas de desconexión
        for (const hourKey in this.disconnectionAlertsByHour) {
            const hourDt = DateTime.fromFormat(hourKey, "yyyy-MM-dd-HH", { zone: this.timeZone });
            if (!hourDt.isValid || hourDt < cutoffTime) {
                delete this.disconnectionAlertsByHour[hourKey];
                cleanedKeys++;
            }
        }
        if (cleanedKeys > 0) {
            console.log(`[NotificationCtrl] cleanupOldHourlyAlerts: ${cleanedKeys} claves horarias antiguas eliminadas de los buffers de DESCONEXIÓN.`);
        } else {
            console.log(`[NotificationCtrl] cleanupOldHourlyAlerts: No se encontraron buffers de desconexión antiguos para limpiar.`);
        }
    }




    async logToDatabase(message) {
        if (!this.pool || !this.initialized) {
            console.error(`[NotificationCtrl] Intento de log DB (${message}) pero el pool/controlador no está inicializado.`);
            return;
        }
        let connection = null; // Declarar fuera para finally
        try {
            connection = await this.pool.getConnection(); // Usar pool de instancia
            if (!message.startsWith('INFO:') && !message.startsWith('WARN:') && !message.startsWith('ERROR:')) {
                message = `INFO: ${message}`;
            }
            // Migrado: process_log → log_general; origen es NOT NULL y debe especificarse siempre
            await connection.query("INSERT INTO log_general (origen, mensaje) VALUES ('NotificationController', ?)", [message]);
        } catch (error) {
            console.error("Error al registrar en la base de datos (log_general):", error);
        } finally {
            if (connection) connection.release(); // Asegurar liberación
        }
    }
    async logError(errorMessage) {
        const fullMessage = `ERROR: ${errorMessage}`;
        await this.logToDatabase(fullMessage); // logToDatabase ya maneja la conexión/liberación
    }

} // Fin Clase NotificationController

// Exportar la instancia Singleton creada al cargar el módulo
module.exports = new NotificationController();