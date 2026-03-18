const { DateTime } = require('luxon');
const config = require("../config/js_files/configLoader_Config");
const alertScheduleConfigService = require("./db/alertScheduleConfig_Service");

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

        // Cache de configuración dinámica — cargada desde gen_horario_operacional
        // Estructura: { horarios: [...], respetar_feriados: bool, criticas_ignoran_horario: bool, lastLoaded: Date }
        this.configCache = null;

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
     * Lee la configuración dinámica de gen_horario_operacional y actualiza configCache.
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

            // Actualizar cache con la estructura nativa del nuevo modelo
            this.configCache = {
                horarios: dbConfig.horarios,
                respetar_feriados: dbConfig.respetar_feriados,
                criticas_ignoran_horario: dbConfig.criticas_ignoran_horario,
                lastLoaded: new Date()
            };

            console.log(`[BaseAlertService] ✅ Configuration loaded from database successfully`);
            console.log(`[BaseAlertService]   Horarios cargados: ${dbConfig.horarios.length} días`);
            console.log(`[BaseAlertService]   Respetar feriados: ${dbConfig.respetar_feriados}`);
            console.log(`[BaseAlertService]   Críticas ignoran horario: ${dbConfig.criticas_ignoran_horario}`);

            return this.configCache;
        } catch (error) {
            console.error('[BaseAlertService] ❌ Error loading configuration from database:', error.message);
            console.warn('[BaseAlertService] ⚠️  Graceful degradation: alertScheduleConfigService usará valores por defecto');

            // configCache queda null — alertScheduleConfigService manejará el fallback en isWithinOperationalHours()
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
     * @param {Date|string|DateTime|null} [checkTime=null] - Fecha a verificar (null = hoy)
     * @returns {Promise<boolean>} true si la fecha es un feriado
     */
    async isHoliday(checkTime = null) {
        try {
            // Verificar si tenemos acceso a la base de datos
            if (!alertScheduleConfigService.databaseService || !alertScheduleConfigService.databaseService.connected) {
                console.warn('[BaseAlertService] isHoliday: No database connection available');
                return false; // Graceful degradation
            }

            // Normalizar fecha a objeto DateTime en zona horaria correcta
            let dateToCheck;
            if (!checkTime) {
                dateToCheck = DateTime.now();
            } else if (checkTime instanceof DateTime) {
                dateToCheck = checkTime;
            } else {
                dateToCheck = DateTime.fromJSDate(checkTime instanceof Date ? checkTime : new Date(checkTime));
            }

            const localDate = dateToCheck.setZone(this.timeZone);
            const formattedDate = localDate.toFormat('yyyy-MM-dd');

            // Consultar tabla de feriados usando el databaseService
            const [rows] = await alertScheduleConfigService.databaseService.pool.execute(
                "SELECT 1 FROM gen_feriados_cl WHERE fecha = ?", // Migrado: feriados_cl → gen_feriados_cl
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
     * Verifica si estamos dentro del horario operacional del sistema (Nivel 1 - global).
     *
     * Delega a alertScheduleConfigService.isWithinOperationalHours() que es la única
     * fuente de verdad sobre el horario global. También evalúa feriados si respetar_feriados=true.
     *
     * Nota: El Nivel 2 (DND por usuario) lo gestiona MySQL vía fun_should_send_notification().
     *
     * @param {Date|string|DateTime|null} [checkTime=null] - Tiempo a verificar (null = ahora)
     * @returns {Promise<boolean>} true si estamos en horario operacional (NO enviar alertas)
     */
    async isWithinWorkingHours(checkTime = null) {
        let timeToCheck;
        if (checkTime) {
            if (checkTime instanceof DateTime) {
                timeToCheck = checkTime;
            } else {
                timeToCheck = DateTime.fromJSDate(checkTime instanceof Date ? checkTime : new Date(checkTime));
            }
        } else {
            timeToCheck = DateTime.now();
        }

        const localTime = timeToCheck.setZone(this.timeZone);

        // Verificar feriados si respetar_feriados está habilitado
        if (this.configCache?.respetar_feriados) {
            const isHolidayToday = await this.isHoliday(timeToCheck);
            if (isHolidayToday) {
                console.log(`[BaseAlertService] isWithinWorkingHours: Feriado detectado (respetar_feriados=true) - fuera de horario operacional`);
                return false;  // false = fuera de horario = SÍ enviar alertas
            }
        }

        // Delegar evaluación de horario operacional al servicio (Nivel 1)
        const resultado = await alertScheduleConfigService.isWithinOperationalHours(localTime);

        console.log(`[BaseAlertService] isWithinWorkingHours: ${resultado.motivo}`);

        return resultado.enHorario;  // true = EN horario = NO enviar; false = FUERA = SÍ enviar
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
                horariosCargados: this.configCache?.horarios?.length || 0
            }
        };
    }
}

module.exports = BaseAlertService; 