/**
 * @fileoverview Report Scheduler Service - Gestión de Reportes Programados
 * @description Servicio que maneja la programación automática de reportes usando node-cron.
 * Permite crear, actualizar, eliminar y ejecutar schedules de reportes de forma automática.
 *
 * La tabla rep_reportes_programados almacena la expresión cron directamente (expresion_cron),
 * eliminando la necesidad de convertir frequency/dayOfWeek/time a formato cron.
 *
 * @feature 004-reportes-base-core
 * Issue: #12 — migración de scheduled_reports a rep_reportes_programados
 * @version 2.0.0
 */

const cron = require('node-cron');
const cronParser = require('cron-parser');
const mysql = require('mysql2/promise');
const configLoader = require('../../config/js_files/configLoader_Config');
const reportGenerationService = require('./reportGeneration_Service');
const emailService = require('../email/email_Service');
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

// Mapa de trabajos cron activos: id_reporte_programado -> cronJob
const activeJobs = new Map();

// Timezone para Chile
const TIMEZONE = 'America/Santiago';

/**
 * Calcula la próxima ejecución de una expresión cron
 * @param {string} cronExpression - Expresión cron (ej: '0 8 * * 1')
 * @returns {Date|null} Próxima fecha de ejecución, o null si la expresión es inválida
 */
function calculateNextExecution(cronExpression) {
  try {
    const interval = cronParser.parseExpression(cronExpression, { tz: TIMEZONE });
    return interval.next().toDate();
  } catch (error) {
    console.error(`[Scheduler] Expresión cron inválida "${cronExpression}":`, error.message);
    return null;
  }
}

/**
 * Crear un nuevo schedule de reporte
 * @param {Object} config - Configuración del schedule
 * @param {number} config.id_plantilla - ID de la plantilla de reporte
 * @param {string} config.nombre - Nombre descriptivo del schedule
 * @param {string} [config.descripcion] - Descripción opcional
 * @param {string} config.expresion_cron - Expresión cron (ej: '0 8 * * 1' para Lunes 8:00)
 * @returns {Promise<Object>} - { id_reporte_programado, proxima_ejecucion }
 */
async function createSchedule({ id_plantilla, nombre, descripcion = null, expresion_cron }) {
  if (!id_plantilla || !nombre || !expresion_cron) {
    throw new Error('Campos requeridos: id_plantilla, nombre, expresion_cron');
  }

  if (!cron.validate(expresion_cron)) {
    throw new Error(`Expresión cron inválida: ${expresion_cron}`);
  }

  const proxima_ejecucion = calculateNextExecution(expresion_cron);

  const connection = await getPool().getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO rep_reportes_programados (id_plantilla, nombre, descripcion, expresion_cron, activo, proxima_ejecucion)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [id_plantilla, nombre, descripcion, expresion_cron, proxima_ejecucion]
    );

    const id_reporte_programado = result.insertId;

    // Iniciar cron job
    startCronJob(id_reporte_programado, expresion_cron, { nombre, id_plantilla });

    console.log(`[Scheduler] Schedule #${id_reporte_programado} creado: "${nombre}" (${expresion_cron})`);

    return { id_reporte_programado, proxima_ejecucion };
  } catch (error) {
    console.error('[Scheduler] Error al crear schedule:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Actualizar un schedule existente
 * @param {number} id - ID del schedule (id_reporte_programado)
 * @param {Object} updates - Campos a actualizar
 * @param {string} [updates.nombre]
 * @param {string} [updates.descripcion]
 * @param {string} [updates.expresion_cron]
 * @param {boolean} [updates.activo]
 * @returns {Promise<Object>} - Schedule actualizado
 */
async function updateSchedule(id, { nombre, descripcion, expresion_cron, activo }) {
  const connection = await getPool().getConnection();

  try {
    // Verificar que existe
    const [rows] = await connection.execute(
      'SELECT * FROM rep_reportes_programados WHERE id_reporte_programado = ?',
      [id]
    );

    if (rows.length === 0) {
      throw new Error(`Schedule #${id} no encontrado`);
    }

    const current = rows[0];

    const nuevoNombre = nombre ?? current.nombre;
    const nuevaDescripcion = descripcion ?? current.descripcion;
    const nuevaCron = expresion_cron ?? current.expresion_cron;
    const nuevoActivo = activo !== undefined ? activo : Boolean(current.activo);

    if (expresion_cron && !cron.validate(expresion_cron)) {
      throw new Error(`Expresión cron inválida: ${expresion_cron}`);
    }

    const proxima_ejecucion = calculateNextExecution(nuevaCron);

    await connection.execute(
      `UPDATE rep_reportes_programados
       SET nombre = ?, descripcion = ?, expresion_cron = ?, activo = ?, proxima_ejecucion = ?
       WHERE id_reporte_programado = ?`,
      [nuevoNombre, nuevaDescripcion, nuevaCron, nuevoActivo ? 1 : 0, proxima_ejecucion, id]
    );

    // Reiniciar cron job con nueva configuración
    stopCronJob(id);
    if (nuevoActivo) {
      startCronJob(id, nuevaCron, { nombre: nuevoNombre, id_plantilla: current.id_plantilla });
    }

    console.log(`[Scheduler] Schedule #${id} actualizado: "${nuevoNombre}"`);

    return { id_reporte_programado: id, nombre: nuevoNombre, expresion_cron: nuevaCron, activo: nuevoActivo, proxima_ejecucion };
  } catch (error) {
    console.error('[Scheduler] Error al actualizar schedule:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Eliminar un schedule
 * @param {number} id - ID del schedule (id_reporte_programado)
 * @returns {Promise<boolean>}
 */
async function deleteSchedule(id) {
  const connection = await getPool().getConnection();
  try {
    stopCronJob(id);

    const [result] = await connection.execute(
      'DELETE FROM rep_reportes_programados WHERE id_reporte_programado = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error(`Schedule #${id} no encontrado`);
    }

    console.log(`[Scheduler] Schedule #${id} eliminado`);
    return true;
  } catch (error) {
    console.error('[Scheduler] Error al eliminar schedule:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Activar/desactivar un schedule
 * @param {number} id - ID del schedule
 * @param {boolean} activo
 */
async function toggleSchedule(id, activo) {
  return updateSchedule(id, { activo });
}

/**
 * Iniciar un cron job para un schedule
 * @param {number} id - ID del schedule (id_reporte_programado)
 * @param {string} cronExpression - Expresión cron almacenada en BD
 * @param {Object} options - { nombre, id_plantilla }
 */
function startCronJob(id, cronExpression, options) {
  try {
    if (activeJobs.has(id)) {
      stopCronJob(id);
    }

    console.log(`[Scheduler] Iniciando cron job #${id}: "${options.nombre}" con expresión: ${cronExpression}`);

    const job = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Ejecutando reporte programado #${id}: "${options.nombre}"`);
      await executeScheduledReport(id, options);
    }, {
      scheduled: true,
      timezone: TIMEZONE
    });

    activeJobs.set(id, job);
    console.log(`[Scheduler] Cron job #${id} iniciado exitosamente`);
  } catch (error) {
    console.error(`[Scheduler] Error al iniciar cron job #${id}:`, error);
    throw error;
  }
}

/**
 * Detener un cron job
 * @param {number} id - ID del schedule
 */
function stopCronJob(id) {
  if (activeJobs.has(id)) {
    const job = activeJobs.get(id);
    job.stop();
    activeJobs.delete(id);
    console.log(`[Scheduler] Cron job #${id} detenido`);
  }
}

/**
 * Actualizar estado de última ejecución en BD
 * @param {number} id - ID del schedule (id_reporte_programado)
 * @param {Object} datos
 * @param {Date} datos.ultima_ejecucion
 * @param {string} datos.estado - 'exitoso' | 'fallido'
 * @param {Date|null} datos.proxima_ejecucion
 */
async function updateEjecucion(id, { ultima_ejecucion, estado, proxima_ejecucion }) {
  const connection = await getPool().getConnection();
  try {
    await connection.execute(
      `UPDATE rep_reportes_programados
       SET ultima_ejecucion = ?, ultima_ejecucion_estado = ?, proxima_ejecucion = ?
       WHERE id_reporte_programado = ?`,
      [ultima_ejecucion, estado, proxima_ejecucion, id]
    );
  } catch (error) {
    console.error(`[Scheduler] Error al actualizar ejecución #${id}:`, error);
  } finally {
    connection.release();
  }
}

/**
 * Ejecutar un reporte programado
 * @param {number} id - ID del schedule
 * @param {Object} options - { nombre, id_plantilla }
 */
async function executeScheduledReport(id, options) {
  const { nombre, id_plantilla } = options;
  const ahora = new Date();

  try {
    console.log(`[Scheduler] Generando reporte para schedule #${id} (plantilla ${id_plantilla})`);

    // Generar el reporte usando la plantilla configurada
    const result = await reportGenerationService.generateReport(id_plantilla, { scheduleId: id, scheduleName: nombre });

    // Calcular próxima ejecución basada en la expresión cron del schedule
    const [rows] = await getPool().execute(
      'SELECT expresion_cron FROM rep_reportes_programados WHERE id_reporte_programado = ?',
      [id]
    );
    const proxima_ejecucion = rows.length > 0 ? calculateNextExecution(rows[0].expresion_cron) : null;

    // Actualizar estado en BD
    await updateEjecucion(id, { ultima_ejecucion: ahora, estado: 'exitoso', proxima_ejecucion });

    console.log(`[Scheduler] Reporte #${id} generado exitosamente. Próxima ejecución: ${proxima_ejecucion ? moment(proxima_ejecucion).format('YYYY-MM-DD HH:mm') : 'N/A'}`);

    return result;
  } catch (error) {
    console.error(`[Scheduler] Error al ejecutar reporte programado #${id}:`, error);

    // Registrar el fallo en BD
    await updateEjecucion(id, { ultima_ejecucion: ahora, estado: 'fallido', proxima_ejecucion: null });

    throw error;
  }
}

/**
 * Cargar schedules activos desde la base de datos y reiniciar cron jobs.
 * Debe llamarse al iniciar el servidor.
 */
async function loadActiveSchedules() {
  const connection = await getPool().getConnection();

  try {
    const [schedules] = await connection.execute(
      `SELECT id_reporte_programado, nombre, descripcion, id_plantilla,
              expresion_cron, activo, proxima_ejecucion, ultima_ejecucion
       FROM rep_reportes_programados
       WHERE activo = 1`
    );

    console.log(`[Scheduler] Cargando ${schedules.length} schedules activos...`);

    for (const schedule of schedules) {
      try {
        startCronJob(schedule.id_reporte_programado, schedule.expresion_cron, {
          nombre: schedule.nombre,
          id_plantilla: schedule.id_plantilla
        });
      } catch (error) {
        console.error(`[Scheduler] Error al cargar schedule #${schedule.id_reporte_programado}:`, error);
      }
    }

    console.log(`[Scheduler] ${activeJobs.size} cron jobs activos cargados exitosamente`);
  } catch (error) {
    console.error('[Scheduler] Error al cargar schedules activos:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtener lista de schedules
 * @param {Object} filters - Filtros opcionales
 * @param {boolean} [filters.activeOnly] - Solo schedules activos
 * @returns {Promise<Array>}
 */
async function listSchedules(filters = {}) {
  const connection = await getPool().getConnection();

  try {
    let query = `
      SELECT id_reporte_programado, nombre, descripcion, id_plantilla,
             expresion_cron, activo, proxima_ejecucion, ultima_ejecucion,
             ultima_ejecucion_estado, fecha_creacion
      FROM rep_reportes_programados
      WHERE 1=1
    `;
    const params = [];

    if (filters.activeOnly) {
      query += ' AND activo = 1';
    }

    query += ' ORDER BY fecha_creacion DESC';

    const [schedules] = await connection.execute(query, params);

    return schedules.map(schedule => ({
      id: schedule.id_reporte_programado,
      nombre: schedule.nombre,
      descripcion: schedule.descripcion,
      id_plantilla: schedule.id_plantilla,
      expresion_cron: schedule.expresion_cron,
      activo: Boolean(schedule.activo),
      proxima_ejecucion: schedule.proxima_ejecucion,
      ultima_ejecucion: schedule.ultima_ejecucion,
      ultima_ejecucion_estado: schedule.ultima_ejecucion_estado,
      fecha_creacion: schedule.fecha_creacion,
      isRunning: activeJobs.has(schedule.id_reporte_programado)
    }));
  } catch (error) {
    console.error('[Scheduler] Error al listar schedules:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtener el contador de schedules activos
 * @returns {Promise<number>}
 */
async function getActiveSchedulesCount() {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM rep_reportes_programados WHERE activo = 1'
    );
    return rows[0].count;
  } catch (error) {
    console.error('[Scheduler] Error al contar schedules activos:', error);
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
  updateEjecucion,
  startCronJob,
  stopCronJob
};
