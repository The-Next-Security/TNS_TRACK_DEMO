// ========================================
// REPORT CLEANUP JOB
// ========================================
// Automatic TTL cleanup for expired reports
// Runs daily at 2:00 AM (America/Santiago timezone)
// Deletes PDF files older than retention period (default: 90 days)
// Keeps database records for audit trail with status='expired'
// ========================================

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const databaseService = require('../services/database-service');
const configLoader = require('../config/js_files/configLoader_Config');

class ReportCleanupJob {
    constructor() {
        this.cronExpression = '0 2 * * *';
        this.timezone = 'America/Santiago';
        this.isRunning = false;
        this.jobInstance = null;
        this.retentionDays = 90;
        this.storagePath = '../storage/reports';
        this.lastExecutionTime = null;
        this.lastExecutionStatus = null;
        this.lastExecutionDuration = null;
        this.executionCount = 0;
        this.successCount = 0;
        this.errorCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 60000;
    }

    /**
     * Carga config. Llamar desde boot() tras configLoader.initialize(), antes de start().
     */
    init() {
        this.retentionDays = configLoader.getValue('reports_module_config.report_retention_days') || 90;
        this.storagePath = configLoader.getValue('reports_module_config.reports_storage_path') || '../storage/reports';
        console.log(`[ReportCleanup] 🔧 Job configurado: retención ${this.retentionDays} días, cron: ${this.cronExpression}`);
    }

    /**
     * Start the cron job
     */
    start() {
        if (this.jobInstance) {
            console.warn('[ReportCleanup] ⚠️ Job ya está iniciado.');
            return;
        }

        try {
            this.jobInstance = cron.schedule(
                this.cronExpression,
                async () => {
                    await this.executeCleanup();
                },
                {
                    scheduled: true,
                    timezone: this.timezone
                }
            );

            console.log(`[ReportCleanup] ✅ Job iniciado exitosamente (${this.cronExpression}, ${this.timezone})`);
            console.log(`[ReportCleanup] 📅 Próxima ejecución: Diario a las 02:00 AM`);
        } catch (error) {
            console.error('[ReportCleanup] ❌ Error al iniciar el job:', error);
            throw error;
        }
    }

    /**
     * Stop the cron job
     */
    stop() {
        if (!this.jobInstance) {
            console.warn('[ReportCleanup] ⚠️ Job no está iniciado.');
            return;
        }

        try {
            this.jobInstance.stop();
            this.jobInstance = null;
            console.log('[ReportCleanup] 🛑 Job detenido.');
            this.printJobStats();
        } catch (error) {
            console.error('[ReportCleanup] ❌ Error al detener el job:', error);
        }
    }

    /**
     * Main cleanup execution logic
     */
    async executeCleanup() {
        if (this.isRunning) {
            console.warn('[ReportCleanup] ⚠️ Ya hay una ejecución en curso. Saltando esta ejecución.');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();
        let connection = null;
        let retryCount = 0;

        console.log(`[ReportCleanup] 🔄 Iniciando limpieza de reportes (retención: ${this.retentionDays} días)...`);

        while (retryCount < this.maxRetries) {
            try {
                // Get database connection
                connection = await databaseService.getConnection();

                // Calculate cutoff date
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
                const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

                console.log(`[ReportCleanup] 📅 Buscando reportes anteriores a: ${cutoffDateStr}`);

                // Query expired reports
                const [expiredReports] = await connection.query(
                    `SELECT id, file_path, report_name, created_at
                     FROM generated_reports
                     WHERE generation_status = 'completed'
                       AND created_at < ?
                       AND expired_at IS NULL
                     ORDER BY created_at ASC`,
                    [cutoffDate]
                );

                if (expiredReports.length === 0) {
                    console.log('[ReportCleanup] ✅ No hay reportes para limpiar.');
                    this.lastExecutionStatus = 'success';
                    this.lastExecutionTime = new Date();
                    this.lastExecutionDuration = Date.now() - startTime;
                    this.executionCount++;
                    this.successCount++;
                    return;
                }

                console.log(`[ReportCleanup] 📊 Encontrados ${expiredReports.length} reportes para limpiar.`);

                // Process each expired report
                let deletedCount = 0;
                let failedCount = 0;
                let freedBytes = 0;

                for (const report of expiredReports) {
                    try {
                        // Validate file path (prevent path traversal)
                        if (report.file_path.includes('..')) {
                            console.error(`[ReportCleanup] 🚨 Path traversal detectado: ${report.file_path}. Saltando.`);
                            failedCount++;
                            continue;
                        }

                        // Construct full file path
                        const storagePathResolved = path.resolve(__dirname, '../../..', this.storagePath);
                        const fullPath = path.join(storagePathResolved, report.file_path);

                        // Try to get file size before deleting
                        let fileSize = 0;
                        try {
                            const stats = await fs.stat(fullPath);
                            fileSize = stats.size;
                        } catch (statError) {
                            if (statError.code === 'ENOENT') {
                                console.warn(`[ReportCleanup] ⚠️ Archivo ya no existe: ${report.file_path}`);
                            } else {
                                console.warn(`[ReportCleanup] ⚠️ Error al obtener stats del archivo: ${statError.message}`);
                            }
                        }

                        // Try to delete file
                        try {
                            await fs.unlink(fullPath);
                            freedBytes += fileSize;
                            console.log(`[ReportCleanup] 🗑️ Eliminado: ${report.file_path} (${this.formatBytes(fileSize)})`);
                        } catch (unlinkError) {
                            if (unlinkError.code === 'ENOENT') {
                                console.warn(`[ReportCleanup] ⚠️ Archivo ya fue eliminado: ${report.file_path}`);
                            } else {
                                console.error(`[ReportCleanup] ❌ Error al eliminar archivo ${report.file_path}:`, unlinkError.message);
                            }
                        }

                        // Update database record (always, even if file deletion failed)
                        await connection.query(
                            `UPDATE generated_reports
                             SET generation_status = 'expired',
                                 expired_at = NOW()
                             WHERE id = ?`,
                            [report.id]
                        );

                        deletedCount++;

                    } catch (reportError) {
                        console.error(`[ReportCleanup] ❌ Error procesando reporte ID ${report.id}:`, reportError.message);
                        failedCount++;
                    }
                }

                // Log final statistics
                const duration = Date.now() - startTime;
                console.log(`[ReportCleanup] ✅ Limpieza completada en ${duration}ms:`);
                console.log(`[ReportCleanup] 📊 Eliminados: ${deletedCount} reportes`);
                console.log(`[ReportCleanup] 📊 Fallidos: ${failedCount} reportes`);
                console.log(`[ReportCleanup] 📊 Espacio liberado: ${this.formatBytes(freedBytes)}`);

                // Update job statistics
                this.lastExecutionStatus = failedCount > 0 ? 'partial' : 'success';
                this.lastExecutionTime = new Date();
                this.lastExecutionDuration = duration;
                this.executionCount++;
                this.successCount++;

                return; // Success - exit retry loop

            } catch (error) {
                retryCount++;
                this.errorCount++;

                console.error(`[ReportCleanup] ❌ Error en ejecución (intento ${retryCount}/${this.maxRetries}):`, error.message);

                if (error.code) {
                    console.error(`[ReportCleanup] 📝 Código de error: ${error.code}`);
                }

                if (retryCount < this.maxRetries) {
                    console.log(`[ReportCleanup] 🔄 Reintentando en ${this.retryDelay / 1000} segundos...`);
                    await this.sleep(this.retryDelay);
                } else {
                    console.error(`[ReportCleanup] ❌ Máximo de reintentos alcanzado. Job fallido.`);
                    this.lastExecutionStatus = 'error';
                    this.lastExecutionTime = new Date();
                    this.lastExecutionDuration = Date.now() - startTime;
                }

            } finally {
                // Always release connection
                if (connection) {
                    await databaseService.releaseConnection(connection);
                }
            }
        }

        this.isRunning = false;
    }

    /**
     * Execute cleanup immediately (for manual testing)
     */
    async executeNow() {
        console.log('[ReportCleanup] 🚀 Ejecutando limpieza manual...');
        await this.executeCleanup();
        this.isRunning = false; // Reset flag in case it got stuck
    }

    /**
     * Get job statistics
     */
    getJobStats() {
        return {
            cronExpression: this.cronExpression,
            timezone: this.timezone,
            retentionDays: this.retentionDays,
            isRunning: this.isRunning,
            lastExecutionTime: this.lastExecutionTime,
            lastExecutionStatus: this.lastExecutionStatus,
            lastExecutionDuration: this.lastExecutionDuration,
            executionCount: this.executionCount,
            successCount: this.successCount,
            errorCount: this.errorCount,
            successRate: this.executionCount > 0
                ? ((this.successCount / this.executionCount) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Print job statistics to console
     */
    printJobStats() {
        const stats = this.getJobStats();
        console.log('\n========================================');
        console.log('📊 REPORT CLEANUP JOB - ESTADÍSTICAS');
        console.log('========================================');
        console.log(`Cron: ${stats.cronExpression} (${stats.timezone})`);
        console.log(`Retención: ${stats.retentionDays} días`);
        console.log(`Estado actual: ${stats.isRunning ? '🔄 En ejecución' : '⏸️ Inactivo'}`);
        console.log(`Última ejecución: ${stats.lastExecutionTime || 'Nunca'}`);
        console.log(`Estado última ejecución: ${stats.lastExecutionStatus || 'N/A'}`);
        console.log(`Duración última ejecución: ${stats.lastExecutionDuration ? stats.lastExecutionDuration + 'ms' : 'N/A'}`);
        console.log(`Total ejecuciones: ${stats.executionCount}`);
        console.log(`Exitosas: ${stats.successCount}`);
        console.log(`Errores: ${stats.errorCount}`);
        console.log(`Tasa de éxito: ${stats.successRate}`);
        console.log('========================================\n');
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Sleep helper for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
const reportCleanupJob = new ReportCleanupJob();

module.exports = reportCleanupJob;

// ========================================
// NOTAS DE USO
// ========================================
//
// 1. INICIALIZACIÓN EN SERVER.JS
//    const reportCleanupJob = require('./src/jobs/reportCleanup_Job');
//    reportCleanupJob.start();
//
// 2. EJECUCIÓN MANUAL (TESTING)
//    await reportCleanupJob.executeNow();
//    reportCleanupJob.printJobStats();
//
// 3. CONFIGURACIÓN CRON
//    - Expresión: '0 2 * * *' (diario a las 2:00 AM)
//    - Timezone: America/Santiago
//    - Modificable en constructor si necesario
//
// 4. RETENTION POLICY
//    - Default: 90 días (configurable en unified-config.json)
//    - Parámetro: reports_module_config.report_retention_days
//    - Los registros DB se mantienen para auditoría
//    - Solo se eliminan archivos PDF físicos
//
// 5. MANEJO DE ERRORES
//    - Retry automático (max 3 intentos)
//    - Delay entre reintentos: 1 minuto
//    - Continúa con siguiente reporte si uno falla
//    - Actualiza DB incluso si archivo no se puede eliminar
//
// 6. MONITOREO
//    - Logs detallados con prefijo [ReportCleanup]
//    - Estadísticas de ejecución trackeadas
//    - Espacio liberado reportado en cada ejecución
//    - Success rate calculado automáticamente
//
// 7. SEGURIDAD
//    - Validación de path traversal (..)
//    - Parameterized queries (SQL injection prevention)
//    - Conexiones de DB release en finally block
//
// 8. TESTING (T057)
//    -- Crear reporte de prueba antiguo
//    INSERT INTO generated_reports (created_at, generation_status, file_path, report_name)
//    VALUES (DATE_SUB(NOW(), INTERVAL 91 DAY), 'completed', 'test_old_report.pdf', 'Test Report');
//
//    -- Ejecutar manualmente
//    const reportCleanupJob = require('./src/jobs/reportCleanup_Job');
//    await reportCleanupJob.executeNow();
//
//    -- Verificar resultado
//    SELECT id, generation_status, expired_at FROM generated_reports
//    WHERE report_name = 'Test Report';
//    -- Esperado: status='expired', expired_at=<timestamp>
//
// ========================================
