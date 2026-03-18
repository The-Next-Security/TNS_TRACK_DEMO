// src/jobs/metricsAggregation_Job.js
// Job para agregar métricas de alertas cada hora

const cron = require('node-cron');
const databaseService = require('../services/database_Service');

/**
 * Clase para gestionar el job de agregación de métricas de alertas
 *
 * Este job se ejecuta cada hora (minuto 5) y llama al stored procedure
 * sp_calculate_hourly_metrics para calcular y almacenar métricas agregadas
 * en la tabla alert_metrics_summary.
 *
 * Funcionalidad:
 * - Ejecuta a las XX:05 de cada hora
 * - Calcula métricas de la hora anterior
 * - Registra errores y estadísticas
 * - Reintentos automáticos en caso de fallo
 */
class MetricsAggregationJob {
    constructor() {
        this.cronExpression = '5 * * * *'; // Minuto 5 de cada hora
        this.isRunning = false;
        this.jobInstance = null;
        this.lastExecutionTime = null;
        this.lastExecutionStatus = null;
        this.executionCount = 0;
        this.errorCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 60000; // 1 minuto entre reintentos
    }

    /**
     * Inicia el cron job
     * @returns {boolean} True si se inició correctamente
     */
    start() {
        if (this.isRunning) {
            console.log('[MetricsJob] ⚠️  Job ya está en ejecución');
            return false;
        }

        console.log(`[MetricsJob] 🚀 Iniciando job de agregación de métricas...`);
        console.log(`[MetricsJob] 📅 Programación: ${this.cronExpression} (minuto 5 de cada hora)`);

        // Crear y programar el job
        this.jobInstance = cron.schedule(this.cronExpression, async () => {
            await this.executeAggregation();
        }, {
            scheduled: true,
            timezone: "America/Santiago"
        });

        this.isRunning = true;
        console.log(`[MetricsJob] ✅ Job iniciado correctamente`);

        // Ejecutar inmediatamente la primera vez (opcional)
        // this.executeAggregation();

        return true;
    }

    /**
     * Detiene el cron job
     * @returns {boolean} True si se detuvo correctamente
     */
    stop() {
        if (!this.isRunning || !this.jobInstance) {
            console.log('[MetricsJob] ⚠️  Job no está en ejecución');
            return false;
        }

        console.log('[MetricsJob] 🛑 Deteniendo job de agregación...');
        this.jobInstance.stop();
        this.isRunning = false;
        this.jobInstance = null;

        this.printJobStats();
        console.log('[MetricsJob] ✅ Job detenido');
        return true;
    }

    /**
     * Ejecuta la agregación de métricas
     * Llama al stored procedure con reintentos en caso de error
     */
    async executeAggregation() {
        const startTime = Date.now();
        console.log(`\n[MetricsJob] 📊 Iniciando agregación de métricas: ${new Date().toISOString()}`);

        let connection = null;
        let retryCount = 0;
        let success = false;

        while (retryCount <= this.maxRetries && !success) {
            try {
                // Obtener conexión del pool
                connection = await databaseService.getConnection();

                // Calcular fecha y hora de la hora anterior
                const now = new Date();
                const previousHour = new Date(now.getTime() - 60 * 60 * 1000);
                const targetDate = previousHour.toISOString().split('T')[0]; // YYYY-MM-DD
                const targetHour = previousHour.getHours(); // 0-23

                console.log(`[MetricsJob] 🎯 Agregando métricas para: ${targetDate} ${targetHour}:00`);

                // Llamar al stored procedure
                const [results] = await connection.query(
                    'CALL stpr_calculate_hourly_metrics(?, ?)',
                    [targetDate, targetHour]
                );

                // El stored procedure devuelve estadísticas en el primer result set
                const stats = results[0] && results[0][0] ? results[0][0] : null;

                if (stats) {
                    console.log(`[MetricsJob] ✅ Métricas agregadas exitosamente:`);
                    console.log(`   - Total alertas: ${stats.total_alerts || 0}`);
                    console.log(`   - Temperatura: ${stats.temperature_alerts || 0}`);
                    console.log(`   - Desconexión: ${stats.disconnection_alerts || 0}`);
                    console.log(`   - Resueltas: ${stats.resolved_alerts || 0}`);
                    console.log(`   - Tiempo promedio respuesta: ${stats.avg_response_time_minutes ? stats.avg_response_time_minutes.toFixed(2) : 'N/A'} min`);
                } else {
                    console.log(`[MetricsJob] ✅ Agregación completada (sin alertas en este período)`);
                }

                // Actualizar estadísticas del job
                this.lastExecutionTime = new Date();
                this.lastExecutionStatus = 'success';
                this.executionCount++;
                success = true;

                const duration = Date.now() - startTime;
                console.log(`[MetricsJob] ⏱️  Duración: ${duration}ms\n`);

            } catch (error) {
                retryCount++;
                this.errorCount++;
                this.lastExecutionStatus = 'error';

                console.error(`[MetricsJob] ❌ Error en agregación (intento ${retryCount}/${this.maxRetries + 1}):`, error.message);

                if (error.code) {
                    console.error(`[MetricsJob]    Código de error MySQL: ${error.code}`);
                }

                if (retryCount <= this.maxRetries) {
                    console.log(`[MetricsJob] 🔄 Reintentando en ${this.retryDelay / 1000}s...`);
                    await this.sleep(this.retryDelay);
                } else {
                    console.error(`[MetricsJob] ❌ Máximo de reintentos alcanzado. Esperando próxima ejecución programada.`);
                    this.lastExecutionTime = new Date();
                }

            } finally {
                // Liberar conexión
                if (connection) {
                    try {
                        await databaseService.releaseConnection(connection);
                    } catch (releaseError) {
                        console.error('[MetricsJob] ⚠️  Error liberando conexión:', releaseError.message);
                    }
                }
            }
        }
    }

    /**
     * Ejecuta manualmente la agregación (útil para testing)
     * @returns {Promise<boolean>} True si se ejecutó correctamente
     */
    async executeNow() {
        console.log('[MetricsJob] 🔧 Ejecución manual solicitada');
        await this.executeAggregation();
        return this.lastExecutionStatus === 'success';
    }

    /**
     * Obtiene estadísticas del job
     * @returns {Object} Estadísticas del job
     */
    getJobStats() {
        return {
            isRunning: this.isRunning,
            cronExpression: this.cronExpression,
            executionCount: this.executionCount,
            errorCount: this.errorCount,
            successCount: this.executionCount - this.errorCount,
            lastExecutionTime: this.lastExecutionTime,
            lastExecutionStatus: this.lastExecutionStatus,
            successRate: this.executionCount > 0
                ? ((this.executionCount - this.errorCount) / this.executionCount * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Imprime estadísticas del job en consola
     */
    printJobStats() {
        const stats = this.getJobStats();
        console.log('\n[MetricsJob] 📊 Estadísticas del Job:');
        console.log(`  - Estado: ${stats.isRunning ? 'En ejecución' : 'Detenido'}`);
        console.log(`  - Ejecuciones totales: ${stats.executionCount}`);
        console.log(`  - Ejecuciones exitosas: ${stats.successCount}`);
        console.log(`  - Ejecuciones fallidas: ${stats.errorCount}`);
        console.log(`  - Tasa de éxito: ${stats.successRate}`);
        console.log(`  - Última ejecución: ${stats.lastExecutionTime ? stats.lastExecutionTime.toISOString() : 'Nunca'}`);
        console.log(`  - Estado última ejecución: ${stats.lastExecutionStatus || 'N/A'}\n`);
    }

    /**
     * Helper para pausar la ejecución
     * @param {number} ms Milisegundos a esperar
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Crear instancia singleton del job
const metricsAggregationJob = new MetricsAggregationJob();

// Exportar la instancia
module.exports = metricsAggregationJob;

/**
 * ========================================
 * NOTAS DE USO
 * ========================================
 *
 * 1. INICIALIZACIÓN EN SERVER.JS:
 *
 *    const metricsAggregationJob = require('./src/jobs/metricsAggregation_Job');
 *
 *    // Al iniciar el servidor
 *    metricsAggregationJob.start();
 *
 *    // Al cerrar el servidor
 *    process.on('SIGTERM', () => {
 *        metricsAggregationJob.stop();
 *        process.exit(0);
 *    });
 *
 *
 * 2. EJECUCIÓN MANUAL (TESTING):
 *
 *    await metricsAggregationJob.executeNow();
 *
 *
 * 3. OBTENER ESTADÍSTICAS:
 *
 *    const stats = metricsAggregationJob.getJobStats();
 *    console.log(stats);
 *
 *
 * 4. CONFIGURACIÓN CRON:
 *
 *    El job se ejecuta a las XX:05 de cada hora (5 * * * *)
 *    Procesa las métricas de la hora anterior (XX-1:00 a XX-1:59)
 *
 *    Ejemplo:
 *    - A las 14:05 → Procesa métricas de 13:00 a 13:59
 *    - A las 03:05 → Procesa métricas de 02:00 a 02:59
 *
 *
 * 5. STORED PROCEDURE LLAMADO:
 *
 *    sp_calculate_hourly_metrics(target_date DATE, target_hour INT)
 *
 *    Este SP:
 *    - Calcula métricas agregadas por hora
 *    - Inserta/actualiza en alert_metrics_summary
 *    - Devuelve estadísticas de la operación
 *
 *
 * 6. MANEJO DE ERRORES:
 *
 *    - Reintentos automáticos (máx. 3)
 *    - Delay de 1 minuto entre reintentos
 *    - Registro detallado de errores
 *    - Continúa con próxima ejecución programada si falla
 *
 *
 * 7. MONITOREO:
 *
 *    - Logs detallados de cada ejecución
 *    - Métricas de éxito/fallo
 *    - Tiempos de ejecución
 *    - Estadísticas acumuladas
 *
 * ========================================
 */
