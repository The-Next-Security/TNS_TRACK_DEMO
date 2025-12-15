// src/controllers/notificationController.js

const mysql = require("mysql2/promise");
const moment = require("moment-timezone");
const configLoader = require("../config/js_files/config-loader"); // Usar configLoader consistentemente
const emailService = require("../services/email/emailService");
const smsService = require("../services/sms/smsService");
const notificationService = require("../services/notificationService");
const pushNotificationService = require("../services/push/pushNotificationService");
const alertTrackingService = require("../services/alertTrackingService");

class NotificationController {
    constructor() {
        // --- Constructor: Solo inicialización básica de propiedades ---
        console.log("[NotificationCtrl] Constructor: Creando instancia...");
        try {
            // Cargar configuración necesaria inmediatamente
            this.appConfig = configLoader.getConfig();
            this.timeZone = this.appConfig.alertSystem?.timeZone || "America/Santiago";

            // Configuraciones específicas o con defaults
            this.workingHours = this.appConfig.alertSystem?.workingHours || {
                weekdays: { start: 8.5, end: 18.5 },
                saturday: { start: 8.5, end: 14.5 }
            };
            this.disconnectionAlertThreshold = this.appConfig.alertSystem?.intervals?.disconnection?.initialDelay || 55;
            this.cleanupInterval = this.appConfig.alertSystem?.intervals?.cleanupMinutes || 720; // 12 horas

            // Estado y recursos que se inicializarán después
            this.pool = null; // El pool se creará en initialize()
            this.initialized = false; // Flag para estado de inicialización

            // Buffers y Timers se inicializan como null
            this.disconnectionAlertsByHour = {};
            this.hourlyProcessingTimer = null;
            this.recurringHourlyTimer = null;
            this.cleanupDisconnectTimer = null;

            console.log("[NotificationCtrl] Constructor: Propiedades básicas configuradas.");
            console.log(`  - Zona horaria: ${this.timeZone}`);
            console.log(`  - Horario laboral L-V: ${this.workingHours.weekdays?.start ?? 'N/A'} - ${this.workingHours.weekdays?.end ?? 'N/A'}`);
            console.log(`  - Horario laboral Sábado: ${this.workingHours.saturday?.start ?? 'N/A'} - ${this.workingHours.saturday?.end ?? 'N/A'}`);
            console.log(`  - Intervalo de limpieza (desconexión): ${this.cleanupInterval} minutos`);

        } catch (error) {
            console.error("❌ [NotificationCtrl] Error CRÍTICO en el constructor (probablemente cargando config):", error.message);
            // Es vital lanzar el error aquí si la config falla, para detener el arranque.
            throw error;
        }
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
            const now = moment().tz(this.timeZone);
            const nextHour = now.clone().endOf('hour').add(1, 'millisecond');
            const timeToNextHour = nextHour.diff(now);

            console.log(`[NotificationCtrl] Configurando timer para procesar alertas en la próxima hora (${nextHour.format()})`);
            console.log(`  -> Tiempo restante: ${moment.duration(timeToNextHour).humanize()}`);

            // Limpiar timer anterior si existe (importante en caso de re-inicialización)
            if (this.hourlyProcessingTimer) clearTimeout(this.hourlyProcessingTimer);

            this.hourlyProcessingTimer = setTimeout(() => {
                console.log(`[NotificationCtrl] Ejecutando procesamiento de alertas programado para: ${moment().tz(this.timeZone).format()}`);
                // Envolver llamada en try-catch
                this.processHourlyAlerts()
                    .catch(err => console.error("❌ [NotificationCtrl] Error durante el procesamiento HORARIO INICIAL de alertas:", err));

                // Limpiar timer recurrente anterior si existe
                if (this.recurringHourlyTimer) clearInterval(this.recurringHourlyTimer);

                // Configurar timer recurrente CADA HORA
                this.recurringHourlyTimer = setInterval(async () => {
                    const currentTime = moment().tz(this.timeZone);
                    console.log(`[NotificationCtrl] Ejecutando procesamiento recurrente de alertas: ${currentTime.format()}`);
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
        const d = date ? moment(date).tz(this.timeZone) : moment().tz(this.timeZone);
        return d.format("YYYY-MM-DD-HH");
    }

    async isWithinWorkingHours(checkTime = null) {
        const now = checkTime ? moment(checkTime).tz(this.timeZone) : moment().tz(this.timeZone);
        const hourDecimal = now.hour() + now.minute() / 60;
        const dayOfWeek = now.day(); // 0 = Domingo, 6 = Sábado

        // Si es domingo, siempre es fuera de horario laboral
        if (dayOfWeek === 0) return false;

        // Verificar si es un feriado (los feriados se comportan como domingos)
        const isHolidayToday = await this.isHoliday(now);
        if (isHolidayToday) {
            console.log(`[NotificationCtrl] isWithinWorkingHours: Fecha ${now.format('YYYY-MM-DD')} es feriado, se considera fuera de horario laboral.`);
            return false;
        }

        // Obtener horarios configurados con valores por defecto seguros
        const weekdaysStart = this.workingHours?.weekdays?.start ?? 8.5;
        const weekdaysEnd = this.workingHours?.weekdays?.end ?? 18.5;
        const saturdayStart = this.workingHours?.saturday?.start ?? 8.5;
        const saturdayEnd = this.workingHours?.saturday?.end ?? 14.5;

        // Agregar logs para depuración
        console.log(`[DEBUG] Valores de comparación: dayOfWeek=${dayOfWeek}, hourDecimal=${hourDecimal}`);
        console.log(`[DEBUG] Horarios: weekdaysStart=${weekdaysStart}, weekdaysEnd=${weekdaysEnd}, saturdayStart=${saturdayStart}, saturdayEnd=${saturdayEnd}`);

        let result = false;
        if (dayOfWeek === 6) { // Sábado
            result = hourDecimal >= saturdayStart && hourDecimal < saturdayEnd;
        } else { // Lunes a Viernes (1-5)
            result = hourDecimal >= weekdaysStart && hourDecimal < weekdaysEnd;
        }

        console.log(`[DEBUG] Resultado de isWithinWorkingHours: ${result}`);
        return result;
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

        const now = moment().tz(this.timeZone);
        const prevHour = now.clone().subtract(1, 'hour');
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

            // ==================== SMS DISABLED - Stand-by for future reactivation ====================
            // REASON: SMS notifications temporarily disabled (2025-10-20) to reduce operational costs
            // TO RE-ENABLE: Uncomment this block and remove "_DISABLED" flag from smsConfig.json
            // ALTERNATIVE CHANNELS: Email (emailService) and Push (pushNotificationService) remain active
            //
            /*
            try {
                console.log(`[NotificationCtrl] processHourlyAlerts: Intentando enviar SMS de conexión/desconexión...`);
                // sendDisconnectionAlert usa destinatarios específicos + default de config SMS
                await smsService.sendDisconnectionAlert(disconnectionResults.formattedAlerts, null, true); // Forzar envío
                console.log("  -> Llamada a sendDisconnectionAlert (SMS) completada.");
            } catch (smsError) {
                console.error("  -> Error CRÍTICO enviando SMS de conexión/desconexión:", smsError.message);
                await this.logError(`Fallo envío SMS desconexión: ${smsError.message}`);
            }
            */
            console.log(`[SMS DISABLED] Disconnection alert SMS skipped (Email + Push sent) - Re-enable in smsConfig.json if needed`);
            // =====================================================================================

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


        // --- 2. Procesar Temperaturas (SOLO FUERA DE HORARIO LABORAL) ---
        console.log(`[NotificationCtrl] processHourlyAlerts: Verificando horario laboral para alertas de temperatura...`);
        const isWorkingTimeNow = await this.isWithinWorkingHours(now); // Usar await aquí

        if (!isWorkingTimeNow) {
            console.log(`[NotificationCtrl] processHourlyAlerts: Fuera de horario laboral o en feriado. Iniciando análisis de temperatura...`);
            await this.logToDatabase(`INFO: Iniciando análisis horario de temperatura (Fuera Horario Laboral o Feriado).`);

            // Calcular ventana de 110 minutos ANTES de la hora actual en punto
            const endTime = now.clone().startOf('hour');
            const startTime = endTime.clone().subtract(110, 'minutes');
            const startTimeStr = startTime.format('YYYY-MM-DD HH:mm:ss');
            const endTimeStr = endTime.format('YYYY-MM-DD HH:mm:ss');

            try {
                await this.logToDatabase(`INFO: Analizando ventana temperatura [${startTimeStr} - ${endTimeStr}]`);
                // Llamar al servicio de notificación que contiene la lógica robusta
                const channelsInAlert = await notificationService.analyzeHourlyTemperatureData(startTimeStr, endTimeStr);

                await this.logToDatabase(`INFO: Análisis temperatura completado. ${channelsInAlert.length} canales en alerta.`);

                if (channelsInAlert.length > 0) {
                    console.log(`[NotificationCtrl] processHourlyAlerts: ${channelsInAlert.length} canales con alertas de temperatura detectadas. Iniciando registro y notificación...`);

                    // **NUEVO: Registrar alertas en BD ANTES de enviar notificaciones**
                    let alertIds = [];
                    try {
                        console.log("  -> Registrando alertas de temperatura en BD...");
                        const result = await alertTrackingService.createBulkAlerts(channelsInAlert, 'temperature');
                        alertIds = result.alertIds || [];
                        console.log(`  -> ${alertIds.length} alertas de temperatura registradas en BD. IDs: [${alertIds.join(', ')}]`);
                    } catch (trackingError) {
                        console.error(`❌ Error registrando alertas de temperatura en BD:`, trackingError);
                        await this.logError(`Fallo registro alertas temperatura en BD: ${trackingError.message}`);
                        // Continuar con el envío aunque falle el tracking (no bloquear notificaciones)
                    }

                    // Enviar Email de Temperatura (código existente)
                    try {
                        console.log(`[${executionId}] ➡️  LLAMANDO emailService.sendTemperatureRangeAlertsEmail()...`);
                        console.log(`[${executionId}]    Canales: ${channelsInAlert.length}`);
                        await emailService.sendTemperatureRangeAlertsEmail(channelsInAlert, null, true); // Forzar envío
                        console.log(`[${executionId}] ✅  emailService.sendTemperatureRangeAlertsEmail() completado.`);
                    } catch (emailTempError) {
                        console.error(`❌ [${executionId}] Error enviando Email de temperatura para hora ${endTime.format('HH:mm')}:`, emailTempError);
                        await this.logError(`Fallo envío email temperatura: ${emailTempError.message}`);
                    }

                    // ==================== SMS DISABLED - Stand-by for future reactivation ====================
                    // REASON: SMS notifications temporarily disabled (2025-10-20) to reduce operational costs
                    // TO RE-ENABLE: Uncomment this block and remove "_DISABLED" flag from smsConfig.json
                    // ALTERNATIVE CHANNELS: Email (emailService) and Push (pushNotificationService) remain active
                    //
                    /*
                    try {
                        console.log("  -> Enviando SMS de temperatura...");
                        await smsService.sendTemperatureAlert(channelsInAlert, null, true); // Forzar envío
                        console.log("  -> Llamada a sendTemperatureAlert (SMS) completada.");
                    } catch (smsTempError) {
                        console.error(`❌ Error enviando SMS de temperatura para hora ${endTime.format('HH:mm')}:`, smsTempError);
                        await this.logError(`Fallo envío SMS temperatura: ${smsTempError.message}`);
                    }
                    */
                    console.log(`[SMS DISABLED] Temperature alert SMS skipped (Email + Push sent) - Re-enable in smsConfig.json if needed`);
                    // =====================================================================================

                    // **MODIFICADO: Enviar Push Notifications CON alertIds**
                    try {
                        console.log(`[${executionId}] ➡️  LLAMANDO pushNotificationService.sendTemperatureAlert()...`);
                        console.log(`[${executionId}]    Canales: ${channelsInAlert.length}, AlertIds: ${alertIds.length}`);
                        const pushResult = await pushNotificationService.sendTemperatureAlert(channelsInAlert, alertIds);
                        console.log(`[${executionId}] ✅  pushNotificationService.sendTemperatureAlert() completado.`);
                        console.log(`[${executionId}]    Push enviadas: ${pushResult.sent}/${pushResult.total} exitosas`);
                        if (alertIds.length > 0) {
                            console.log(`[${executionId}]    Notificaciones vinculadas a alertas: [${alertIds.join(', ')}]`);
                        }
                    } catch (pushTempError) {
                        console.error(`❌ [${executionId}] Error enviando Push Notification de temperatura para hora ${endTime.format('HH:mm')}:`, pushTempError);
                        await this.logError(`Fallo envío Push temperatura: ${pushTempError.message}`);
                    }
                } else {
                    console.log(`[NotificationCtrl] processHourlyAlerts: No hay alertas de temperatura que enviar para la ventana finalizada a las ${endTime.format('HH:mm')}.`);
                }

            } catch (analysisError) {
                console.error(`❌ Error CRÍTICO durante analyzeHourlyTemperatureData: ${analysisError.message}`);
                await this.logError(`Fallo análisis horario temperatura [${startTimeStr}-${endTimeStr}]: ${analysisError.message}`);
            }

        } else {
            console.log(`[NotificationCtrl] processHourlyAlerts: Dentro de horario laboral. Omitiendo análisis y envío de alertas de temperatura.`);
            await this.logToDatabase(`INFO: Análisis temp omitido para hora ${now.format('HH:mm')} (Dentro Horario Laboral).`);
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
            const nowTimestamp = moment().utc().format('YYYY-MM-DD HH:mm:ss');

            // Actualizar last_alert_sent
            if (disconnectionResults.channelsToUpdateLastSent.length > 0) {
                const idsToUpdate = disconnectionResults.channelsToUpdateLastSent;
                console.log(`  -> Actualizando last_alert_sent a ${nowTimestamp} para canales: ${idsToUpdate.join(', ')}`);
                const [updateResult] = await connection.query(
                    "UPDATE channels_ubibot SET last_alert_sent = ? WHERE channel_id IN (?)",
                    [nowTimestamp, idsToUpdate]
                );
                console.log(`    -> Filas afectadas por UPDATE last_alert_sent: ${updateResult.affectedRows}`);
            } else { console.log("  -> No hay canales que requieran actualizar last_alert_sent (nuevas desconexiones)."); }

            // Resetear last_alert_sent
            if (disconnectionResults.channelsToResetLastSent.length > 0) {
                const idsToReset = disconnectionResults.channelsToResetLastSent;
                console.log(`  -> Reseteando last_alert_sent a NULL para canales: ${idsToReset.join(', ')}`);
                const [resetResult] = await connection.query(
                    "UPDATE channels_ubibot SET last_alert_sent = NULL WHERE channel_id IN (?)",
                    [idsToReset]
                );
                console.log(`    -> Filas afectadas por RESET last_alert_sent: ${resetResult.affectedRows}`);
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
                const firstDisconnectTs = firstDisconnectEvent ? moment(firstDisconnectEvent.timestamp).tz(this.timeZone) : null;
                const lastReconnectTs = lastConnectEvent ? moment(lastConnectEvent.timestamp).tz(this.timeZone) : null;

                const [channelDbStateRows] = await connection.query(
                    "SELECT is_currently_out_of_range, out_of_range_since, last_alert_sent FROM channels_ubibot WHERE channel_id = ?",
                    [channelId]
                );
                if (channelDbStateRows.length === 0) {
                    console.warn(`[NotificationCtrl] processHourlyDisconnectionAlerts: Canal ${channelId} con eventos en buffer no encontrado en BD. Omitiendo.`);
                    continue;
                }
                const dbState = channelDbStateRows[0];
                const dbOutOfRangeSince = dbState.out_of_range_since ? moment(dbState.out_of_range_since).tz(this.timeZone) : null;
                const dbLastAlertSent = dbState.last_alert_sent ? moment(dbState.last_alert_sent).tz(this.timeZone) : null;

                if (finalStatus === 'disconnected') {
                    if (dbOutOfRangeSince && (!dbLastAlertSent || dbLastAlertSent.isBefore(dbOutOfRangeSince))) {
                        results.formattedAlerts.push({
                            name: channelName, channelId: channelId, finalStatus: 'DESCONECTADO',
                            horaDesconexion: dbOutOfRangeSince ? dbOutOfRangeSince.format("DD/MM HH:mm:ss") : 'N/A',
                            horaReconexion: 'N/A en periodo',
                        });
                        results.channelsToUpdateLastSent.push(channelId);
                    }
                } else { // finalStatus === 'connected'
                    const horaDesconexionParaCorreo = firstDisconnectTs ? firstDisconnectTs.format("DD/MM HH:mm:ss") : (dbOutOfRangeSince ? dbOutOfRangeSince.format("DD/MM HH:mm:ss") : 'N/A');
                    const horaReconexionParaCorreo = lastReconnectTs ? lastReconnectTs.format("DD/MM HH:mm:ss") : 'N/A';
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
            const [currentStatus] = await connection.query(`
                SELECT
                    c.channel_id,
                    c.name,
                    c.product_id,
                    MAX(sr.external_temperature_timestamp) as last_reading,
                    TIMESTAMPDIFF(MINUTE, MAX(sr.external_temperature_timestamp), NOW()) as minutes_disconnected
                FROM channels_ubibot c
                LEFT JOIN sensor_readings_ubibot sr ON c.channel_id = sr.channel_id
                WHERE c.esOperativa = 1
                GROUP BY c.channel_id, c.name, c.product_id
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
                        ? moment(channel.last_reading).tz(this.timeZone).format("DD/MM HH:mm:ss")
                        : 'Sin lecturas';

                    results.formattedAlerts.push({
                        name: channel.name,
                        channelId: channel.channel_id,
                        productId: channel.product_id,
                        finalStatus: 'DESCONECTADO',
                        horaDesconexion: horaDesconexion,
                        horaReconexion: 'N/A',
                        minutesDisconnected: channel.minutes_disconnected
                    });

                    // Verificar si ya existe alerta activa en alert_tracking
                    const [existingAlert] = await connection.query(`
                        SELECT alert_id, occurrence_count
                        FROM alert_tracking
                        WHERE channel_id = ?
                          AND alert_type = 'disconnection'
                          AND status IN ('pending', 'acknowledged')
                        ORDER BY alert_timestamp DESC
                        LIMIT 1
                    `, [channel.channel_id]);

                    if (existingAlert.length > 0) {
                        // Ya existe alerta - Actualizar occurrence_count
                        await connection.query(`
                            UPDATE alert_tracking
                            SET last_occurrence = NOW(),
                                occurrence_count = occurrence_count + 1,
                                alert_data = JSON_SET(
                                    COALESCE(alert_data, '{}'),
                                    '$.minutesDisconnected', ?,
                                    '$.lastCheck', ?
                                )
                            WHERE alert_id = ?
                        `, [channel.minutes_disconnected, hourKey, existingAlert[0].alert_id]);

                        console.log(`[NotificationCtrl]   - ${channel.name}: Alerta ${existingAlert[0].alert_id} actualizada (envío #${existingAlert[0].occurrence_count + 1})`);
                    } else {
                        // No existe alerta - Crear nueva (se creará después en el flujo principal)
                        console.log(`[NotificationCtrl]   - ${channel.name}: Nueva alerta de desconexión detectada`);
                    }
                }
            }

            // PASO B: Procesar RECONECTADOS - Detectar y notificar reconexiones
            if (currentlyConnected.length > 0) {
                // Buscar si alguno tiene alerta activa (estaba desconectado antes)
                const [reconnectedAlerts] = await connection.query(`
                    SELECT at.*, c.name as channel_name
                    FROM alert_tracking at
                    INNER JOIN channels_ubibot c ON at.channel_id = c.channel_id
                    WHERE at.channel_id IN (?)
                      AND at.alert_type = 'disconnection'
                      AND at.status IN ('pending', 'acknowledged')
                `, [currentlyConnected.map(ch => ch.channel_id)]);

                if (reconnectedAlerts.length > 0) {
                    console.log(`[NotificationCtrl] ${reconnectedAlerts.length} canales RECONECTADOS detectados`);

                    for (const alert of reconnectedAlerts) {
                        const channel = currentlyConnected.find(ch => ch.channel_id === alert.channel_id);
                        const horaReconexion = moment(channel.last_reading).tz(this.timeZone).format("DD/MM HH:mm:ss");

                        // Agregar a results como CONECTADO
                        results.formattedAlerts.push({
                            name: alert.channel_name,
                            channelId: alert.channel_id,
                            finalStatus: 'CONECTADO',
                            horaDesconexion: alert.alert_timestamp
                                ? moment(alert.alert_timestamp).tz(this.timeZone).format("DD/MM HH:mm:ss")
                                : 'N/A',
                            horaReconexion: horaReconexion,
                            alertId: alert.alert_id
                        });

                        // Marcar alerta como resuelta
                        await connection.query(`
                            UPDATE alert_tracking
                            SET status = 'resolved',
                                resolution_timestamp = NOW(),
                                resolution_time = TIMESTAMPDIFF(MINUTE, alert_timestamp, NOW())
                            WHERE alert_id = ?
                        `, [alert.alert_id]);

                        console.log(`[NotificationCtrl]   - ${alert.channel_name}: Reconectado (alerta ${alert.alert_id} resuelta)`);
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
     * @param {Date|string|moment.Moment|null} checkTime - Fecha a verificar, si es null se usa la fecha actual
     * @returns {Promise<boolean>} - true si la fecha es un feriado, false en caso contrario
     */
    async isHoliday(checkTime = null) {
        // Si no está inicializado o no hay pool de conexiones disponible
        if (!this.initialized || !this.pool) {
            console.error("[NotificationCtrl] isHoliday: Controller not initialized or pool not available");
            return false; // Por defecto asumimos que no es feriado si no podemos verificar
        }

        // Normalizar fecha a objeto moment en zona horaria correcta
        const dateToCheck = checkTime
            ? moment(checkTime).tz(this.timeZone)
            : moment().tz(this.timeZone);

        // Formatear la fecha en formato YYYY-MM-DD para consulta SQL
        const formattedDate = dateToCheck.format('YYYY-MM-DD');

        let connection;
        try {
            connection = await this.pool.getConnection();

            // Consultar si la fecha existe en la tabla de feriados
            const [rows] = await connection.query(
                "SELECT 1 FROM feriados_cl WHERE fecha = ?",
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
        const now = moment().tz(this.timeZone);
        const cutoffHours = 48; // Mantener buffers de las últimas 48 horas (ajustable)
        const cutoffTime = now.clone().subtract(cutoffHours, 'hours');
        let cleanedKeys = 0;

        console.log(`[NotificationCtrl] cleanupOldHourlyAlerts: Limpiando buffers de DESCONEXIÓN anteriores a ${cutoffTime.format()}`);

        // ELIMINADO: Limpieza de temperatureAlertsByHour

        // Limpiar alertas de desconexión
        for (const hourKey in this.disconnectionAlertsByHour) {
            const hourMoment = moment(hourKey, "YYYY-MM-DD-HH").tz(this.timeZone, true);
            if (!hourMoment.isValid() || hourMoment.isBefore(cutoffTime)) {
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



    formatDisconnectionAlertsForSMS(alerts) {
        const count = alerts.length;
        let message = `ALERTA CONEXION: ${count} sensor${count > 1 ? 'es' : ''} reportados. `;
        const maxSizePerBatch = this.appConfig.sms?.queue?.maxSizePerBatch || 3;
        const detailLimit = Math.min(maxSizePerBatch, count);
        for (let i = 0; i < detailLimit; i++) {
            const alert = alerts[i];
            const status = alert.finalStatus === "DESCONECTADO" ? "DESCONECT" : "CONECTADO";
            message += `${alert.name}: ${status}. `;
        }
        if (count > detailLimit) message += `Y ${count - detailLimit} más. `;
        message += `${moment().tz(this.timeZone).format("DD/MM HH:mm")}`;
        return message;
    }

    formatTemperatureAlertsForSMS(alerts) {
        const count = alerts.length;
        let message = `ALERTA TEMPERATURA: ${count} sensor${count > 1 ? 'es' : ''} fuera de rango. `;
        const maxSizePerBatch = this.appConfig.sms?.queue?.maxSizePerBatch || 3;
        const detailLimit = Math.min(maxSizePerBatch, count);
        for (let i = 0; i < detailLimit; i++) {
            const alert = alerts[i];
            // Usar averageTemperature ahora, o mantener el formato anterior?
            // Mantengamos el formato anterior por simplicidad, usando el promedio
            const tempFormatted = alert.averageTemperature?.toFixed(1) ?? 'N/A';
            message += `${alert.channelName}: ${tempFormatted}°C. `; // Usar channelName
        }
        if (count > detailLimit) message += `Y ${count - detailLimit} más. `;
        message += `${moment().tz(this.timeZone).format("DD/MM HH:mm")}`;
        return message;
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
            await connection.query("INSERT INTO process_log (message) VALUES (?)", [message]);
        } catch (error) {
            console.error("Error al registrar en la base de datos (process_log):", error);
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