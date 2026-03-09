const moment = require("moment-timezone");
const config = require("../config/js_files/configLoader_Config");
const alertScheduleConfigService = require("./db/alertScheduleConfigService");

/**
 * Servicio base para el manejo de alertas
 * Contiene toda la funcionalidad común entre los diferentes tipos de alertas
 */
class BaseAlertService {
    constructor() {
        // No leer config en constructor (carga única en boot). Se asigna en initialize() vía loadConfiguration().
        this.config = {};
        this.initialized = false;
        this.timeZone = "America/Santiago";

        // Dynamic configuration cache - loaded from database
        // Falls back to hardcoded defaults if database is unavailable
        this.configCache = {
            weekday_start: '08:30:00',  // Horario laboral L-V: 08:30-18:30 (NO enviar)
            weekday_end: '18:30:00',
            saturday_start: '08:30:00',  // Horario laboral Sábado: 08:30-14:30 (NO enviar)
            saturday_end: '14:30:00',
            sunday_start: '23:59:59',   // start >= end = enviar todo el domingo
            sunday_end: '00:00:00',
            respect_holidays: 'true',    // true = enviar en feriados
            lastLoaded: null
        };

        // Legacy working hours (kept for backward compatibility). Se actualizan en initialize().
        this.workingHours = {
            weekdays: { start: 8.5, end: 18.5 },
            saturday: { start: 8.5, end: 14.5 }
        };

        // Inicializar métricas
        this.metrics = {
            sentAlerts: 0,
            failedAlerts: 0,
            lastError: null,
            lastSuccessTime: null,
            queueStats: {
                added: 0,
                processed: 0,
                failed: 0
            }
        };

        // Inicializar cola de alertas
        this.alertQueue = {
            createdAt: new Date(),
            alerts: [],
            lastProcessed: null
        };

        // Inicializar temporizadores
        this.timers = {
            processing: null,
            cleanup: null
        };
    }

    /**
     * Carga la configuración del sistema de alertas
     */
    loadConfiguration() {
        try {
            const appConfig = config.getConfig();
            return appConfig.alertSystem || {};
        } catch (error) {
            console.error("Error cargando configuración de alertas:", error);
            return {};
        }
    }

    /**
     * Inicializa el servicio base de alertas
     *
     * Carga la configuración de horarios desde la base de datos.
     * Este método debe ser llamado por las clases hijas en su initialize().
     * NO establece this.initialized - las clases hijas deben manejarlo.
     *
     * Feature: 002-configurable-alert-schedules (T025)
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        console.log('[BaseAlertService] Initializing base alert service...');

        try {
            // Cargar config desde config-loader (solo en runtime, tras configLoader.initialize())
            const loaded = this.loadConfiguration();
            this.config = loaded;
            this.timeZone = loaded?.timeZone || "America/Santiago";
            this.workingHours = loaded?.workingHours || this.workingHours;

            // Load dynamic configuration from database
            await this.loadConfigFromDatabase();

            console.log('[BaseAlertService] ✅ Base alert service initialized successfully');
        } catch (error) {
            console.error('[BaseAlertService] ❌ Error during initialization:', error);
            console.warn('[BaseAlertService] ⚠️  Service will continue with default configuration');
            // Don't throw - allow graceful degradation
        }
    }

    /**
     * Carga la configuración de horarios desde la base de datos
     *
     * Lee la configuración dinámica de alert_schedule_config y actualiza configCache.
     * Si falla la carga desde DB, mantiene los valores por defecto (graceful degradation).
     *
     * Feature: 002-configurable-alert-schedules
     *
     * @returns {Promise<Object>} Configuración cargada desde BD o defaults
     */
    async loadConfigFromDatabase() {
        try {
            console.log('[BaseAlertService] Loading configuration from database...');

            const dbConfig = await alertScheduleConfigService.loadAllConfig();

            // Update cache with database values
            this.configCache = {
                weekday_start: dbConfig.weekday_start,
                weekday_end: dbConfig.weekday_end,
                saturday_start: dbConfig.saturday_start,
                saturday_end: dbConfig.saturday_end,
                sunday_start: dbConfig.sunday_start || '00:00:00',
                sunday_end: dbConfig.sunday_end || '00:00:00',
                respect_holidays: dbConfig.respect_holidays,
                lastLoaded: new Date(),
                updated_at: dbConfig.updated_at,
                updated_by: dbConfig.updated_by
            };

            console.log(`[BaseAlertService] ✅ Configuration loaded from database successfully`);
            console.log(`[BaseAlertService]   Weekday hours: ${this.configCache.weekday_start} - ${this.configCache.weekday_end}`);
            console.log(`[BaseAlertService]   Saturday hours: ${this.configCache.saturday_start} - ${this.configCache.saturday_end}`);
            console.log(`[BaseAlertService]   Sunday hours: ${this.configCache.sunday_start} - ${this.configCache.sunday_end}`);
            console.log(`[BaseAlertService]   Respect holidays: ${this.configCache.respect_holidays}`);
            console.log(`[BaseAlertService]   Last updated by: ${this.configCache.updated_by || 'system'}`);

            return this.configCache;
        } catch (error) {
            console.error('[BaseAlertService] ❌ Error loading configuration from database:', error.message);
            console.warn('[BaseAlertService] ⚠️  Graceful degradation: Using hardcoded default configuration');
            console.warn('[BaseAlertService] ⚠️  Default weekday hours: 08:30:00 - 18:30:00');
            console.warn('[BaseAlertService] ⚠️  Default Saturday hours: 08:30:00 - 14:30:00');
            console.warn('[BaseAlertService] ⚠️  Default respect_holidays: true');

            // Keep existing defaults in configCache (already initialized in constructor)
            // This ensures graceful degradation - service continues working with hardcoded values
            return this.configCache;
        }
    }

    /**
     * Convierte tiempo HH:mm:ss a decimal (horas + minutos/60)
     * Helper para comparar tiempos
     *
     * @param {string} timeStr - Tiempo en formato HH:mm:ss
     * @returns {number} Tiempo en formato decimal (ej: 8.5 para 08:30:00)
     * @private
     */
    _timeToDecimal(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + minutes / 60;
    }

    /**
     * Verifica si una fecha específica es un feriado en Chile
     *
     * Consulta la tabla feriados_cl para determinar si la fecha dada es un feriado.
     * En caso de error, retorna false (graceful degradation).
     *
     * Feature: 002-configurable-alert-schedules (T051 - User Story 2)
     *
     * @param {Date|string|moment.Moment|null} [checkTime=null] - Fecha a verificar (null = hoy)
     * @returns {Promise<boolean>} true si la fecha es un feriado
     */
    async isHoliday(checkTime = null) {
        try {
            // Verificar si tenemos acceso a la base de datos
            if (!alertScheduleConfigService.databaseService || !alertScheduleConfigService.databaseService.connected) {
                console.warn('[BaseAlertService] isHoliday: No database connection available');
                return false; // Graceful degradation
            }

            // Normalizar fecha a objeto moment en zona horaria correcta
            const dateToCheck = checkTime
                ? (moment.isMoment(checkTime) ? checkTime.clone() : moment(checkTime))
                : moment();

            const localDate = dateToCheck.tz(this.timeZone);
            const formattedDate = localDate.format('YYYY-MM-DD');

            // Consultar tabla de feriados usando el databaseService
            const [rows] = await alertScheduleConfigService.databaseService.pool.execute(
                "SELECT 1 FROM feriados_cl WHERE fecha = ?",
                [formattedDate]
            );

            const isHolidayResult = rows.length > 0;

            if (isHolidayResult) {
                console.log(`[BaseAlertService] isHoliday: Date ${formattedDate} IS a Chilean holiday`);
            } else {
                console.log(`[BaseAlertService] isHoliday: Date ${formattedDate} is NOT a holiday`);
            }

            return isHolidayResult;

        } catch (error) {
            console.error(`[BaseAlertService] ❌ Error checking holiday status:`, error.message);
            // Graceful degradation: assume not a holiday on error
            return false;
        }
    }

    /**
     * Verifica si estamos dentro del horario laboral
     *
     * MODIFICADO: Feature 002-configurable-alert-schedules
     * Ahora usa configuración dinámica desde base de datos
     *
     * User Story 2 (T052-T054): Añadida lógica de feriados
     * Si respect_holidays='true' y es feriado, se trata como domingo (enviar todo el día). (configCache)
     * en lugar de valores hardcodeados.
     *
     * @param {Date|string|null} [checkTime=null] - Tiempo específico a verificar
     * @returns {Promise<boolean>} true si estamos en horario laboral
     */
    async isWithinWorkingHours(checkTime = null) {
        let timeToCheck;
        if (checkTime) {
            timeToCheck = moment.isMoment(checkTime)
                ? checkTime.clone()
                : moment(checkTime);
        } else {
            timeToCheck = moment();
        }

        const localTime = timeToCheck.tz(this.timeZone);
        const dayOfWeek = localTime.day();
        const hourDecimal = localTime.hour() + localTime.minute() / 60;

        // T052-T054: Check if today is a holiday and respect_holidays is enabled
        // If true, treat as Sunday (send all day = outside working hours)
        if (this.configCache.respect_holidays === 'true') {
            const isHolidayToday = await this.isHoliday(timeToCheck);
            if (isHolidayToday) {
                console.log(`[BaseAlertService] isWithinWorkingHours: Holiday detected (respect_holidays=true) - treating as Sunday (send all day) - OUTSIDE working hours`);
                return false;  // false = fuera de horario laboral = sí enviar alertas
            }
        }

        // Use dynamic configuration from database
        let isWithinHours;

        // Domingo tiene horario especial
        // Por defecto sunday_start=23:59:59, sunday_end=00:00:00 significa: enviar todo el día
        // (start >= end = nunca dentro de horario laboral = siempre enviar)
        if (dayOfWeek === 0) {
            const sundayStart = this._timeToDecimal(this.configCache.sunday_start);
            const sundayEnd = this._timeToDecimal(this.configCache.sunday_end);

            // Si start >= end, significa que NO HAY horario laboral el domingo (enviar todo el día)
            if (sundayStart >= sundayEnd) {
                console.log(`[BaseAlertService] isWithinWorkingHours: Sunday (always send) - OUTSIDE working hours`);
                return false;  // false = fuera de horario laboral = sí enviar alertas
            }

            isWithinHours = (hourDecimal >= sundayStart && hourDecimal <= sundayEnd);

            console.log(`[BaseAlertService] isWithinWorkingHours: Sunday ${localTime.format('HH:mm:ss')} - Range: ${this.configCache.sunday_start} to ${this.configCache.sunday_end} - ${isWithinHours ? 'WITHIN' : 'OUTSIDE'} working hours`);
            return isWithinHours;
        }

        // Sábado tiene horario especial
        if (dayOfWeek === 6) {
            const saturdayStart = this._timeToDecimal(this.configCache.saturday_start);
            const saturdayEnd = this._timeToDecimal(this.configCache.saturday_end);

            isWithinHours = (hourDecimal >= saturdayStart && hourDecimal <= saturdayEnd);

            console.log(`[BaseAlertService] isWithinWorkingHours: Saturday ${localTime.format('HH:mm:ss')} - Range: ${this.configCache.saturday_start} to ${this.configCache.saturday_end} - ${isWithinHours ? 'WITHIN' : 'OUTSIDE'} working hours`);
        } else {
            // Lunes a viernes (días 1-5)
            const weekdayStart = this._timeToDecimal(this.configCache.weekday_start);
            const weekdayEnd = this._timeToDecimal(this.configCache.weekday_end);

            isWithinHours = (hourDecimal >= weekdayStart && hourDecimal <= weekdayEnd);

            console.log(`[BaseAlertService] isWithinWorkingHours: Weekday ${localTime.format('HH:mm:ss')} - Range: ${this.configCache.weekday_start} to ${this.configCache.weekday_end} - ${isWithinHours ? 'WITHIN' : 'OUTSIDE'} working hours`);
        }

        return isWithinHours;
    }

    /**
     * Inicializa los temporizadores del servicio
     */
    initializeTimers() {
        // Limpiar temporizadores existentes
        this.cleanupTimers();

        // Configurar temporizador de procesamiento
        const processingInterval = this.config.intervals?.processing || 60 * 60 * 1000; // 1 hora por defecto
        this.timers.processing = setInterval(
            () => this.processAlertQueue(),
            processingInterval
        );

        // Configurar temporizador de limpieza
        const cleanupInterval = this.config.intervals?.cleanup || 12 * 60 * 60 * 1000; // 12 horas por defecto
        this.timers.cleanup = setInterval(
            () => this.cleanupOldAlerts(),
            cleanupInterval
        );
    }

    /**
     * Limpia los temporizadores del servicio
     */
    cleanupTimers() {
        if (this.hourlyProcessingTimer) {
            clearTimeout(this.hourlyProcessingTimer);
            this.hourlyProcessingTimer = null;
            console.log("Timer de procesamiento inicial de alertas detenido");
        }
        
        if (this.recurringHourlyTimer) {
            clearInterval(this.recurringHourlyTimer);
            this.recurringHourlyTimer = null;
            console.log("Timer recurrente de procesamiento de alertas detenido");
        }
    }

    /**
     * Agrega una alerta a la cola
     * @param {Object} alert - Datos de la alerta
     * @param {string} alert.type - Tipo de alerta
     * @param {Object} alert.data - Datos específicos de la alerta
     * @returns {boolean} true si se agregó correctamente
     */
    addAlertToQueue(alert) {
        if (!alert || !alert.type || !alert.data) {
            console.error("Alerta inválida:", alert);
            return false;
        }

        // Limpiar alertas antiguas
        this.cleanupOldAlerts();

        // Agregar a la cola
        this.alertQueue.alerts.push({
            ...alert,
            queuedAt: new Date()
        });

        // Actualizar métricas
        this.metrics.queueStats.added++;

        console.log(
            `Alerta ${alert.type} agregada a la cola (${this.alertQueue.alerts.length} alertas en cola)`
        );
        return true;
    }

    /**
     * Procesa la cola de alertas
     * @param {boolean} [forceOutsideWorkingHours=false] - Forzar procesamiento en horario laboral
     */
    async processAlertQueue(forceOutsideWorkingHours = false) {
        if (this.alertQueue.alerts.length === 0) {
            return { success: true, processed: 0 };
        }

        // Verificar horario laboral
        if (!forceOutsideWorkingHours && await this.isWithinWorkingHours()) {
            console.log("Dentro de horario laboral. Posponiendo procesamiento de alertas.");
            return { success: false, processed: 0, reason: "working_hours" };
        }

        try {
            // Procesar cada alerta
            const processedAlerts = [];
            const failedAlerts = [];

            for (const alert of this.alertQueue.alerts) {
                try {
                    await this.processAlert(alert);
                    processedAlerts.push(alert);
                } catch (error) {
                    console.error(`Error procesando alerta ${alert.type}:`, error);
                    failedAlerts.push(alert);
                }
            }

            // Actualizar métricas
            this.metrics.queueStats.processed += processedAlerts.length;
            this.metrics.queueStats.failed += failedAlerts.length;
            this.metrics.lastSuccessTime = new Date();

            // Limpiar alertas procesadas
            this.alertQueue.alerts = failedAlerts;
            this.alertQueue.lastProcessed = new Date();

            return {
                success: processedAlerts.length > 0,
                processed: processedAlerts.length,
                failed: failedAlerts.length
            };
        } catch (error) {
            console.error("Error procesando cola de alertas:", error);
            this.metrics.lastError = error.message;
            return { success: false, error: error.message };
        }
    }

    /**
     * Procesa una alerta individual
     * @param {Object} alert - Alerta a procesar
     * @abstract
     */
    async processAlert(alert) {
        throw new Error("processAlert debe ser implementado por las clases hijas");
    }

    /**
     * Limpia alertas antiguas de la cola
     */
    cleanupOldAlerts() {
        const maxAgeHours = this.config.retention?.maxAgeHours || 24;
        const now = new Date();
        const ageLimit = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);

        const initialLength = this.alertQueue.alerts.length;
        this.alertQueue.alerts = this.alertQueue.alerts.filter(
            alert => alert.queuedAt && alert.queuedAt > ageLimit
        );

        const removedCount = initialLength - this.alertQueue.alerts.length;
        if (removedCount > 0) {
            console.log(`Limpieza de cola: ${removedCount} alertas antiguas eliminadas`);
        }
    }

    /**
     * Obtiene el estado actual del servicio
     */
    getStatus() {
        return {
            initialized: this.initialized,
            metrics: this.metrics,
            queue: {
                size: this.alertQueue.alerts.length,
                lastProcessed: this.alertQueue.lastProcessed,
                createdAt: this.alertQueue.createdAt
            },
            config: {
                timeZone: this.timeZone,
                workingHours: this.workingHours
            }
        };
    }
}

module.exports = BaseAlertService; 