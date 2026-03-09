/**
 * @fileoverview Report Scheduler Service - Gestión de Reportes Programados
 * @description Servicio que maneja la programación automática de reportes usando node-cron.
 * Permite crear, actualizar, eliminar y ejecutar schedules de reportes de forma automática.
 * @feature 004-reportes-base-core (T029, T030, T031, T032)
 * @version 1.0.0
 */

const cron = require('node-cron');
const cronParser = require('cron-parser');
const mysql = require('mysql2/promise');
const configLoader = require('../../config/js_files/configLoader_Config');
const reportGenerationService = require('./reportGenerationService');
const emailService = require('../email/emailService');
const moment = require('moment-timezone');

// Pool creado en init() tras configLoader.initialize()
let pool = null;

function getPool() {
  if (!pool) throw new Error('ReportSchedulerService no inicializado. Llamar init() desde boot().');
  return pool;
}

/**
 * Inicializa el servicio (config y pool). Llamar desde boot() tras configLoader.initialize().
 */
function init() {
  if (pool) return;
  const dbConfigRaw = configLoader.getValue('database');
  const dbConfig = {
    host: dbConfigRaw.host,
    port: dbConfigRaw.port,
    user: dbConfigRaw.username,
    password: dbConfigRaw.password,
    database: dbConfigRaw.database
  };
  pool = mysql.createPool(dbConfig);
}

// Mapa de trabajos cron activos: scheduleId -> cronJob
const activeJobs = new Map();

// Timezone para Chile
const TIMEZONE = 'America/Santiago';

/**
 * Calcula la próxima ejecución basada en frecuencia y configuración
 * @param {string} frequency - 'daily' o 'weekly'
 * @param {number} dayOfWeek - 0-6 (Domingo=0, Lunes=1, etc.) - solo para weekly
 * @param {string} time - Hora en formato 'HH:MM' (ej: '08:00')
 * @returns {Date} - Próxima fecha de ejecución
 */
function calculateNextExecution(frequency, dayOfWeek, time) {
  const [hour, minute] = time.split(':').map(Number);
  const now = moment.tz(TIMEZONE);

  let nextExecution;

  if (frequency === 'daily') {
    // Ejecutar diariamente a la hora especificada
    nextExecution = moment.tz(TIMEZONE).hour(hour).minute(minute).second(0);

    // Si ya pasó la hora de hoy, programar para mañana
    if (nextExecution.isSameOrBefore(now)) {
      nextExecution.add(1, 'day');
    }
  } else if (frequency === 'weekly') {
    // Ejecutar semanalmente en el día especificado
    nextExecution = moment.tz(TIMEZONE);
    nextExecution.day(dayOfWeek); // 0=Sunday, 1=Monday, etc.
    nextExecution.hour(hour);
    nextExecution.minute(minute);
    nextExecution.second(0);

    // Si ya pasó esta semana, programar para la siguiente
    if (nextExecution.isSameOrBefore(now)) {
      nextExecution.add(1, 'week');
    }
  } else {
    throw new Error(`Frecuencia no soportada: ${frequency}`);
  }

  return nextExecution.toDate();
}

/**
 * Convierte configuración de schedule a expresión cron
 * @param {string} frequency - 'daily' o 'weekly'
 * @param {number} dayOfWeek - 0-6 (solo para weekly)
 * @param {string} time - 'HH:MM'
 * @returns {string} - Expresión cron (ej: '0 8 * * 1' para Lunes 8:00 AM)
 */
function buildCronExpression(frequency, dayOfWeek, time) {
  const [hour, minute] = time.split(':').map(Number);

  if (frequency === 'daily') {
    // Ejecutar diariamente a la hora especificada
    // Formato: minuto hora * * *
    return `${minute} ${hour} * * *`;
  } else if (frequency === 'weekly') {
    // Ejecutar semanalmente en día específico
    // Formato: minuto hora * * día_semana
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  throw new Error(`Frecuencia no soportada: ${frequency}`);
}

/**
 * Calcula período dinámico basado en period_type
 * @param {string} periodType - 'last_day', 'last_week', 'last_month'
 * @returns {Object} - { startDate, endDate }
 */
function calculateDynamicPeriod(periodType) {
  const now = moment.tz(TIMEZONE);

  if (periodType === 'last_day') {
    // Ayer completo (00:00:00 a 23:59:59)
    const startDate = now.clone().subtract(1, 'day').startOf('day').toDate();
    const endDate = now.clone().subtract(1, 'day').endOf('day').toDate();
    return { startDate, endDate };
  } else if (periodType === 'last_week') {
    // Semana completa anterior (Lunes a Domingo)
    const startDate = now.clone().subtract(1, 'week').startOf('isoWeek').toDate();
    const endDate = now.clone().subtract(1, 'week').endOf('isoWeek').toDate();
    return { startDate, endDate };
  } else if (periodType === 'last_month') {
    // Mes completo anterior
    const startDate = now.clone().subtract(1, 'month').startOf('month').toDate();
    const endDate = now.clone().subtract(1, 'month').endOf('month').toDate();
    return { startDate, endDate };
  }

  throw new Error(`Tipo de período no soportado: ${periodType}`);
}

/**
 * Crear un nuevo schedule de reporte
 * @param {Object} config - Configuración del schedule
 * @param {string} config.name - Nombre descriptivo del schedule
 * @param {string} config.reportType - Tipo de reporte (ej: 'executive_temperature')
 * @param {string} config.frequency - 'daily' o 'weekly'
 * @param {number} config.dayOfWeek - 0-6 (solo para weekly)
 * @param {string} config.time - Hora en formato 'HH:MM'
 * @param {string} config.periodType - 'last_day', 'last_week', 'last_month'
 * @param {Array<number>} config.deviceIds - IDs de dispositivos
 * @param {Object} config.options - Opciones adicionales (includeComparative, etc.)
 * @param {boolean} config.active - Si el schedule debe estar activo
 * @param {number} config.createdBy - User ID del creador
 * @returns {Promise<Object>} - { scheduleId, nextExecution }
 */
async function createSchedule(config) {
  const connection = await getPool().getConnection();

  try {
    const {
      name,
      reportType,
      frequency,
      dayOfWeek,
      time,
      periodType,
      deviceIds,
      options = {},
      active = true,
      createdBy
    } = config;

    // Validaciones
    if (!name || !reportType || !frequency || !time || !periodType || !deviceIds || !createdBy) {
      throw new Error('Campos requeridos: name, reportType, frequency, time, periodType, deviceIds, createdBy');
    }

    if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek === null)) {
      throw new Error('dayOfWeek es requerido para frecuencia weekly');
    }

    if (!['daily', 'weekly'].includes(frequency)) {
      throw new Error('frequency debe ser "daily" o "weekly"');
    }

    if (!['last_day', 'last_week', 'last_month'].includes(periodType)) {
      throw new Error('periodType debe ser "last_day", "last_week" o "last_month"');
    }

    // Calcular próxima ejecución
    const nextExecution = calculateNextExecution(frequency, dayOfWeek, time);

    // Insertar en base de datos
    const [result] = await connection.execute(
      `INSERT INTO scheduled_reports
       (name, report_type, frequency, day_of_week, execution_time, period_type,
        device_ids, options, active, next_execution, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        reportType,
        frequency,
        dayOfWeek || null,
        time,
        periodType,
        JSON.stringify(deviceIds),
        JSON.stringify(options),
        active,
        nextExecution,
        createdBy
      ]
    );

    const scheduleId = result.insertId;

    // Si está activo, crear el cron job
    if (active) {
      startCronJob(scheduleId, frequency, dayOfWeek, time, {
        name,
        reportType,
        periodType,
        deviceIds,
        options,
        createdBy
      });
    }

    console.log(`[Scheduler] Created schedule #${scheduleId}: "${name}" (${frequency} at ${time})`);

    return {
      scheduleId,
      nextExecution
    };
  } catch (error) {
    console.error('[Scheduler] Error creating schedule:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Actualizar un schedule existente
 * @param {number} scheduleId - ID del schedule
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} - Schedule actualizado
 */
async function updateSchedule(scheduleId, updates) {
  const connection = await getPool().getConnection();

  try {
    // Obtener schedule actual
    const [schedules] = await connection.execute(
      'SELECT * FROM scheduled_reports WHERE id = ?',
      [scheduleId]
    );

    if (schedules.length === 0) {
      throw new Error(`Schedule #${scheduleId} no encontrado`);
    }

    const currentSchedule = schedules[0];

    // Mergear updates con valores actuales
    const updatedConfig = {
      name: updates.name || currentSchedule.name,
      reportType: updates.reportType || currentSchedule.report_type,
      frequency: updates.frequency || currentSchedule.frequency,
      dayOfWeek: updates.dayOfWeek !== undefined ? updates.dayOfWeek : currentSchedule.day_of_week,
      time: updates.time || currentSchedule.execution_time,
      periodType: updates.periodType || currentSchedule.period_type,
      deviceIds: updates.deviceIds || (typeof currentSchedule.device_ids === 'string' ? JSON.parse(currentSchedule.device_ids) : currentSchedule.device_ids),
      options: updates.options || (typeof currentSchedule.options === 'string' ? JSON.parse(currentSchedule.options || '{}') : (currentSchedule.options || {})),
      active: updates.active !== undefined ? updates.active : currentSchedule.active
    };

    // Recalcular próxima ejecución si cambió frecuencia o tiempo
    let nextExecution = currentSchedule.next_execution;
    if (updates.frequency || updates.dayOfWeek !== undefined || updates.time) {
      nextExecution = calculateNextExecution(
        updatedConfig.frequency,
        updatedConfig.dayOfWeek,
        updatedConfig.time
      );
    }

    // Actualizar en base de datos
    await connection.execute(
      `UPDATE scheduled_reports
       SET name = ?, report_type = ?, frequency = ?, day_of_week = ?, execution_time = ?,
           period_type = ?, device_ids = ?, options = ?, active = ?, next_execution = ?
       WHERE id = ?`,
      [
        updatedConfig.name,
        updatedConfig.reportType,
        updatedConfig.frequency,
        updatedConfig.dayOfWeek,
        updatedConfig.time,
        updatedConfig.periodType,
        JSON.stringify(updatedConfig.deviceIds),
        JSON.stringify(updatedConfig.options),
        updatedConfig.active,
        nextExecution,
        scheduleId
      ]
    );

    // Detener cron job anterior si existía
    stopCronJob(scheduleId);

    // Iniciar nuevo cron job si está activo
    if (updatedConfig.active) {
      startCronJob(scheduleId, updatedConfig.frequency, updatedConfig.dayOfWeek, updatedConfig.time, {
        name: updatedConfig.name,
        reportType: updatedConfig.reportType,
        periodType: updatedConfig.periodType,
        deviceIds: updatedConfig.deviceIds,
        options: updatedConfig.options,
        createdBy: currentSchedule.created_by
      });
    }

    console.log(`[Scheduler] Updated schedule #${scheduleId}: "${updatedConfig.name}"`);

    return {
      scheduleId,
      ...updatedConfig,
      nextExecution
    };
  } catch (error) {
    console.error('[Scheduler] Error updating schedule:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Eliminar un schedule
 * @param {number} scheduleId - ID del schedule
 * @returns {Promise<boolean>} - true si se eliminó exitosamente
 */
async function deleteSchedule(scheduleId) {
  const connection = await getPool().getConnection();

  try {
    // Detener cron job si existe
    stopCronJob(scheduleId);

    // Eliminar de base de datos
    const [result] = await connection.execute(
      'DELETE FROM scheduled_reports WHERE id = ?',
      [scheduleId]
    );

    if (result.affectedRows === 0) {
      throw new Error(`Schedule #${scheduleId} no encontrado`);
    }

    console.log(`[Scheduler] Deleted schedule #${scheduleId}`);
    return true;
  } catch (error) {
    console.error('[Scheduler] Error deleting schedule:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Activar/desactivar un schedule
 * @param {number} scheduleId - ID del schedule
 * @param {boolean} active - true para activar, false para desactivar
 * @returns {Promise<boolean>} - Estado actualizado
 */
async function toggleSchedule(scheduleId, active) {
  return updateSchedule(scheduleId, { active });
}

/**
 * Iniciar un cron job para un schedule
 * @param {number} scheduleId - ID del schedule
 * @param {string} frequency - 'daily' o 'weekly'
 * @param {number} dayOfWeek - 0-6
 * @param {string} time - 'HH:MM'
 * @param {Object} config - Configuración del reporte
 */
function startCronJob(scheduleId, frequency, dayOfWeek, time, config) {
  try {
    // Si ya existe un job para este schedule, detenerlo primero
    if (activeJobs.has(scheduleId)) {
      stopCronJob(scheduleId);
    }

    // Construir expresión cron
    const cronExpression = buildCronExpression(frequency, dayOfWeek, time);

    console.log(`[Scheduler] Starting cron job #${scheduleId}: "${config.name}" with expression: ${cronExpression}`);

    // Crear y programar el cron job
    const job = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Executing scheduled report #${scheduleId}: "${config.name}"`);
      await executeScheduledReport(scheduleId, config);
    }, {
      scheduled: true,
      timezone: TIMEZONE
    });

    // Guardar referencia al job
    activeJobs.set(scheduleId, job);

    console.log(`[Scheduler] Cron job #${scheduleId} started successfully`);
  } catch (error) {
    console.error(`[Scheduler] Error starting cron job #${scheduleId}:`, error);
    throw error;
  }
}

/**
 * Detener un cron job
 * @param {number} scheduleId - ID del schedule
 */
function stopCronJob(scheduleId) {
  if (activeJobs.has(scheduleId)) {
    const job = activeJobs.get(scheduleId);
    job.stop();
    activeJobs.delete(scheduleId);
    console.log(`[Scheduler] Stopped cron job #${scheduleId}`);
  }
}

/**
 * Ejecutar un reporte programado
 * @param {number} scheduleId - ID del schedule
 * @param {Object} config - Configuración del reporte
 */
async function executeScheduledReport(scheduleId, config) {
  const connection = await getPool().getConnection();

  try {
    const { name, reportType, periodType, deviceIds, options, createdBy } = config;

    // Calcular período dinámico
    const { startDate, endDate } = calculateDynamicPeriod(periodType);

    console.log(`[Scheduler] Generating report for schedule #${scheduleId}:`, {
      reportType,
      periodType,
      startDate: moment(startDate).format('YYYY-MM-DD'),
      endDate: moment(endDate).format('YYYY-MM-DD'),
      deviceIds: deviceIds.length
    });

    // Generar el reporte
    const reportConfig = {
      reportType,
      startDate: moment(startDate).format('YYYY-MM-DD'),
      endDate: moment(endDate).format('YYYY-MM-DD'),
      deviceIds,
      includeComparative: options.includeComparative || false,
      scheduleName: name, // Tag para identificar reportes automáticos
      scheduleId
    };

    const result = await reportGenerationService.generateReport(
      reportType,
      reportConfig,
      createdBy
    );

    // Actualizar schedule: incrementar execution_count, actualizar last_execution, calcular next_execution
    const nextExecution = calculateNextExecution(
      config.frequency || 'weekly',
      config.dayOfWeek,
      config.time || '08:00'
    );

    await connection.execute(
      `UPDATE scheduled_reports
       SET last_execution = NOW(),
           execution_count = execution_count + 1,
           next_execution = ?
       WHERE id = ?`,
      [nextExecution, scheduleId]
    );

    console.log(`[Scheduler] Successfully generated report for schedule #${scheduleId}. Next execution: ${moment(nextExecution).format('YYYY-MM-DD HH:mm')}`);

    // AUTO-SEND EMAIL (Phase 7: Email Notifications)
    // Si el schedule tiene email_recipients configurado, enviar automáticamente
    if (config.emailRecipients && Array.isArray(config.emailRecipients) && config.emailRecipients.length > 0) {
      console.log(`[Scheduler] Sending email notification to ${config.emailRecipients.length} recipient(s) for schedule #${scheduleId}`);

      try {
        const emailSubject = `Reporte Programado: ${name}`;
        const emailMessage = `Se ha generado automáticamente el reporte programado "${name}" para el período ${moment(startDate).format('DD/MM/YYYY')} a ${moment(endDate).format('DD/MM/YYYY')}.`;

        // Prepare metadata for enhanced email template
        const reportMetadata = {
          reportName: name,
          periodStart: moment(startDate).format('DD/MM/YYYY'),
          periodEnd: moment(endDate).format('DD/MM/YYYY'),
          reportType: reportType
        };

        const emailSent = await emailService.sendReportEmail(
          config.emailRecipients,
          emailSubject,
          emailMessage,
          result.filePath,
          reportMetadata
        );

        if (emailSent) {
          console.log(`[Scheduler] ✅ Email notification sent successfully for schedule #${scheduleId}`);
        } else {
          console.error(`[Scheduler] ❌ Failed to send email notification for schedule #${scheduleId}`);
        }
      } catch (emailError) {
        console.error(`[Scheduler] Error sending email for schedule #${scheduleId}:`, emailError.message);
        // No fallar la generación del reporte si falla el envío de email
      }
    } else {
      console.log(`[Scheduler] No email recipients configured for schedule #${scheduleId}, skipping email notification`);
    }

    return result;
  } catch (error) {
    console.error(`[Scheduler] Error executing scheduled report #${scheduleId}:`, error);

    // Log error en tabla de ejecuciones (opcional - si existe la tabla)
    try {
      await connection.execute(
        `INSERT INTO schedule_execution_log (schedule_id, execution_time, execution_status, error_message)
         VALUES (?, NOW(), 'failed', ?)`,
        [scheduleId, error.message]
      );
    } catch (logError) {
      console.error('[Scheduler] Error logging execution error:', logError);
    }

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Cargar schedules activos desde la base de datos y reiniciar cron jobs
 * Debe llamarse al iniciar el servidor
 */
async function loadActiveSchedules() {
  const connection = await getPool().getConnection();

  try {
    // Obtener todos los schedules activos (including email_recipients)
    const [schedules] = await connection.execute(
      `SELECT id, name, report_type, frequency, day_of_week, execution_time,
              period_type, device_ids, options, email_recipients, created_by
       FROM scheduled_reports
       WHERE active = 1`
    );

    console.log(`[Scheduler] Loading ${schedules.length} active schedules...`);

    for (const schedule of schedules) {
      try {
        startCronJob(schedule.id, schedule.frequency, schedule.day_of_week, schedule.execution_time, {
          name: schedule.name,
          reportType: schedule.report_type,
          periodType: schedule.period_type,
          deviceIds: typeof schedule.device_ids === 'string' ? JSON.parse(schedule.device_ids) : schedule.device_ids,
          options: typeof schedule.options === 'string' ? JSON.parse(schedule.options || '{}') : (schedule.options || {}),
          emailRecipients: typeof schedule.email_recipients === 'string' ? JSON.parse(schedule.email_recipients) : schedule.email_recipients,
          createdBy: schedule.created_by,
          frequency: schedule.frequency,
          dayOfWeek: schedule.day_of_week,
          time: schedule.execution_time
        });
      } catch (error) {
        console.error(`[Scheduler] Error loading schedule #${schedule.id}:`, error);
      }
    }

    console.log(`[Scheduler] Successfully loaded ${activeJobs.size} active cron jobs`);
  } catch (error) {
    console.error('[Scheduler] Error loading active schedules:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtener lista de schedules (con filtros opcionales)
 * @param {Object} filters - Filtros opcionales
 * @param {number} filters.createdBy - Filtrar por usuario creador
 * @param {boolean} filters.activeOnly - Solo schedules activos
 * @returns {Promise<Array>} - Lista de schedules
 */
async function listSchedules(filters = {}) {
  const connection = await getPool().getConnection();

  try {
    let query = `
      SELECT id, name, report_type, frequency, day_of_week, execution_time,
             period_type, device_ids, options, active,
             next_execution, last_execution, execution_count,
             created_by, created_at
      FROM scheduled_reports
      WHERE 1=1
    `;
    const params = [];

    if (filters.createdBy) {
      query += ' AND created_by = ?';
      params.push(filters.createdBy);
    }

    if (filters.activeOnly) {
      query += ' AND active = 1';
    }

    query += ' ORDER BY created_at DESC';

    const [schedules] = await connection.execute(query, params);

    // Parsear JSON fields y formatear fechas
    // Nota: mysql2 ya parsea automáticamente los campos JSON a objetos
    return schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      reportType: schedule.report_type,
      frequency: schedule.frequency,
      dayOfWeek: schedule.day_of_week,
      executionTime: schedule.execution_time,
      periodType: schedule.period_type,
      deviceIds: typeof schedule.device_ids === 'string' ? JSON.parse(schedule.device_ids) : schedule.device_ids,
      options: typeof schedule.options === 'string' ? JSON.parse(schedule.options || '{}') : (schedule.options || {}),
      active: Boolean(schedule.active),
      nextExecution: schedule.next_execution,
      lastExecution: schedule.last_execution,
      executionCount: schedule.execution_count,
      createdBy: schedule.created_by,
      createdAt: schedule.created_at,
      isRunning: activeJobs.has(schedule.id) // Indicar si el cron job está activo
    }));
  } catch (error) {
    console.error('[Scheduler] Error listing schedules:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtener el contador de schedules activos
 * @returns {Promise<number>} Cantidad de schedules activos
 */
async function getActiveSchedulesCount() {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count
       FROM scheduled_reports
       WHERE active = 1`
    );

    return rows[0].count;
  } catch (error) {
    console.error('[Scheduler] Error counting active schedules:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  init,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  loadActiveSchedules,
  listSchedules,
  getActiveSchedulesCount,
  calculateNextExecution,
  executeScheduledReport,
  startCronJob,
  stopCronJob
};
