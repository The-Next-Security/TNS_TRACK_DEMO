/**
 * @fileoverview Report Scheduler Service - Gestión de Reportes Programados
 * @description Servicio que maneja la programación automática de reportes usando node-cron.
 * Permite crear, actualizar, eliminar y ejecutar schedules de reportes de forma automática.
 *
 * Diseño expandible:
 * - Los parámetros de ejecución se almacenan en `parametros_ejecucion` (JSON libre).
 * - `entityIds` es el nombre genérico para cualquier colección de entidades, agnóstico
 *   al tipo de origen (deviceIds, sensorIds, zoneIds...).
 * - Agregar un nuevo tipo de reporte no requiere cambiar el schema de BD.
 * - `rep_plantillas.id_tipo_origen` indica qué fuente de datos consume cada plantilla.
 *
 * @feature 004-reportes-base-core
 * @version 3.0.0
 */

const cron = require('node-cron');
const { CronExpressionParser } = require('cron-parser');
const mysql = require('mysql2/promise');
const configLoader = require('../../config/js_files/configLoader_Config');
const reportGenerationService = require('./reportGeneration_Service');
const { DateTime } = require('luxon');

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Código de error para que el controller responda 422 */
const ERR_NO_NEXT_EXECUTION = 'NO_NEXT_EXECUTION';

/**
 * Normaliza `parametros_ejecucion` desde mysql2: columna JSON puede llegar como objeto o string.
 * @param {unknown} raw
 * @returns {Object}
 */
function parseParametrosEjecucion(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return { ...raw };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      console.error('[Scheduler] parametros_ejecucion JSON inválido:', e.message);
      return {};
    }
  }
  return {};
}

/**
 * Serializa parámetros para guardar en columna JSON (siempre string JSON para consistencia).
 * @param {Object} obj
 * @returns {string|null}
 */
function stringifyParametrosEjecucion(obj) {
  if (obj == null) return null;
  return JSON.stringify(obj);
}

/**
 * Calcula la próxima ejecución de una expresión cron (cron-parser v5).
 * @param {string} cronExpression
 * @returns {Date|null}
 */
function calculateNextExecution(cronExpression) {
  try {
    const expr = CronExpressionParser.parse(cronExpression, { tz: TIMEZONE });
    return expr.next().toDate();
  } catch (error) {
    console.error(`[Scheduler] Expresión cron inválida "${cronExpression}":`, error.message);
    return null;
  }
}

/**
 * Construye expresión cron desde parámetros de negocio.
 * @param {'daily'|'weekly'} frequency
 * @param {number|null} dayOfWeek  - 0 (Dom) a 6 (Sáb), requerido si weekly
 * @param {string} time            - 'HH:MM'
 * @returns {string} expresión cron válida
 */
function buildCronExpression(frequency, dayOfWeek, time) {
  const [hours, minutes] = time.split(':');
  if (frequency === 'daily') {
    return `${parseInt(minutes, 10)} ${parseInt(hours, 10)} * * *`;
  }
  return `${parseInt(minutes, 10)} ${parseInt(hours, 10)} * * ${dayOfWeek}`;
}

/**
 * Parsea una expresión cron de vuelta a parámetros de negocio.
 * Formato esperado: 'mm HH * * DOW' (node-cron con 5 campos)
 * @param {string} cronExpression
 * @returns {{ frequency: string, dayOfWeek: number|null, executionTime: string }}
 */
function parseCronExpression(cronExpression) {
  const parts = cronExpression.split(' ');
  const minutes = parts[0].padStart(2, '0');
  const hours   = parts[1].padStart(2, '0');
  const dowPart = parts[4];
  const isDaily = dowPart === '*';
  return {
    frequency:     isDaily ? 'daily' : 'weekly',
    dayOfWeek:     isDaily ? null : parseInt(dowPart, 10),
    executionTime: `${hours}:${minutes}`
  };
}

/**
 * Calcula startDate y endDate desde un periodType relativo a ahora.
 * @param {'last_day'|'last_week'|'last_month'} periodType
 * @returns {{ startDate: string, endDate: string }} fechas en 'YYYY-MM-DD'
 */
function calcDateRange(periodType) {
  const now = DateTime.now().setZone(TIMEZONE);
  const endDate = now.toISODate();
  let startDate;
  if (periodType === 'last_day') {
    startDate = now.minus({ days: 1 }).toISODate();
  } else if (periodType === 'last_week') {
    startDate = now.minus({ weeks: 1 }).toISODate();
  } else {
    startDate = now.minus({ months: 1 }).toISODate();
  }
  return { startDate, endDate };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD de schedules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crear un nuevo schedule de reporte.
 *
 * @param {Object}  config
 * @param {string}  config.name               - Nombre descriptivo del schedule
 * @param {string}  config.reportType          - clave_plantilla (ej: 'executive_temperature')
 * @param {'daily'|'weekly'} config.frequency
 * @param {number}  [config.dayOfWeek]         - 0-6, requerido si weekly
 * @param {string}  config.time                - 'HH:MM'
 * @param {Object}  config.parametrosEjecucion - JSON libre: {periodType, entityIds, ...}
 * @param {boolean} [config.active=true]
 * @param {number}  [config.createdBy]         - id_usuario del creador
 * @returns {Promise<{ scheduleId: number, nextExecution: Date|null }>}
 */
async function createSchedule({ name, reportType, frequency, dayOfWeek, time, parametrosEjecucion, active = true, createdBy }) {
  // Resolver id_plantilla desde clave_plantilla
  const [[template]] = await getPool().execute(
    'SELECT id_plantilla FROM rep_plantillas WHERE clave_plantilla = ? AND activo = 1',
    [reportType]
  );
  if (!template) throw new Error(`Plantilla no encontrada: ${reportType}`);

  const expresion_cron = buildCronExpression(frequency, dayOfWeek ?? null, time);

  if (!cron.validate(expresion_cron)) {
    throw new Error(`Expresión cron inválida generada: ${expresion_cron}`);
  }

  const proxima_ejecucion = calculateNextExecution(expresion_cron);
  if (active && !proxima_ejecucion) {
    const err = new Error('No se pudo calcular la próxima ejecución con la expresión cron indicada.');
    err.code = ERR_NO_NEXT_EXECUTION;
    throw err;
  }

  const parametrosJson = parametrosEjecucion ? JSON.stringify(parametrosEjecucion) : null;

  const connection = await getPool().getConnection();
  try {
    const [result] = await connection.execute(
      `INSERT INTO rep_reportes_programados
         (id_plantilla, nombre, descripcion, expresion_cron, parametros_ejecucion,
          id_usuario_creador, activo, proxima_ejecucion)
       VALUES (?, ?, '', ?, ?, ?, ?, ?)`,
      [template.id_plantilla, name, expresion_cron, parametrosJson,
       createdBy ?? null, active ? 1 : 0, proxima_ejecucion]
    );

    const scheduleId = result.insertId;

    if (active) {
      startCronJob(scheduleId, expresion_cron, {
        nombre: name,
        id_plantilla: template.id_plantilla,
        parametros_ejecucion: parametrosJson
      });
    }

    console.log(`[Scheduler] Schedule #${scheduleId} creado: "${name}" (${expresion_cron})`);
    return { scheduleId, nextExecution: proxima_ejecucion };
  } finally {
    connection.release();
  }
}

/**
 * Actualizar un schedule existente (patch semántico — solo los campos que lleguen).
 *
 * @param {number} id - id_reporte_programado
 * @param {Object} updates
 * @param {string}  [updates.name]
 * @param {string}  [updates.reportType]         - clave_plantilla nueva
 * @param {string}  [updates.frequency]
 * @param {number}  [updates.dayOfWeek]
 * @param {string}  [updates.time]               - 'HH:MM'
 * @param {Object}  [updates.parametrosEjecucion]
 * @param {boolean} [updates.active]
 * @returns {Promise<Object>}
 */
async function updateSchedule(id, updates) {
  const connection = await getPool().getConnection();
  try {
    // Cargar estado actual con JOIN para tener clave_plantilla
    const [rows] = await connection.execute(
      `SELECT r.*, p.clave_plantilla
       FROM rep_reportes_programados r
       JOIN rep_plantillas p ON r.id_plantilla = p.id_plantilla
       WHERE r.id_reporte_programado = ?`,
      [id]
    );
    if (rows.length === 0) throw new Error(`Schedule #${id} no encontrado`);
    const current = rows[0];

    // Resolver id_plantilla si cambia reportType
    let nuevaIdPlantilla = current.id_plantilla;
    if (updates.reportType && updates.reportType !== current.clave_plantilla) {
      const [[template]] = await connection.execute(
        'SELECT id_plantilla FROM rep_plantillas WHERE clave_plantilla = ? AND activo = 1',
        [updates.reportType]
      );
      if (!template) throw new Error(`Plantilla no encontrada: ${updates.reportType}`);
      nuevaIdPlantilla = template.id_plantilla;
    }

    // Reconstruir cron si cambia frequency/time/dayOfWeek
    let nuevaCron = current.expresion_cron;
    if (updates.frequency || updates.time || updates.dayOfWeek !== undefined) {
      const { frequency: curFreq, dayOfWeek: curDow, executionTime: curTime } = parseCronExpression(current.expresion_cron);
      const freq = updates.frequency  ?? curFreq;
      const dow  = updates.dayOfWeek  !== undefined ? updates.dayOfWeek : curDow;
      const time = updates.time       ?? curTime;
      nuevaCron = buildCronExpression(freq, dow, time);
      if (!cron.validate(nuevaCron)) throw new Error(`Expresión cron inválida: ${nuevaCron}`);
    }

    const nuevoNombre     = updates.name              ?? current.nombre;
    const nuevoActivo     = updates.active             !== undefined ? updates.active : Boolean(current.activo);
    const nuevosParametros = updates.parametrosEjecucion != null
      ? JSON.stringify(updates.parametrosEjecucion)
      : stringifyParametrosEjecucion(parseParametrosEjecucion(current.parametros_ejecucion));

    const proxima_ejecucion = calculateNextExecution(nuevaCron);
    if (nuevoActivo && !proxima_ejecucion) {
      const err = new Error('No se pudo calcular la próxima ejecución con la expresión cron indicada.');
      err.code = ERR_NO_NEXT_EXECUTION;
      throw err;
    }

    await connection.execute(
      `UPDATE rep_reportes_programados
       SET id_plantilla = ?, nombre = ?, expresion_cron = ?,
           parametros_ejecucion = ?, activo = ?, proxima_ejecucion = ?
       WHERE id_reporte_programado = ?`,
      [nuevaIdPlantilla, nuevoNombre, nuevaCron, nuevosParametros,
       nuevoActivo ? 1 : 0, proxima_ejecucion, id]
    );

    stopCronJob(id);
    if (nuevoActivo) {
      startCronJob(id, nuevaCron, {
        nombre: nuevoNombre,
        id_plantilla: nuevaIdPlantilla,
        parametros_ejecucion: nuevosParametros
      });
    }

    console.log(`[Scheduler] Schedule #${id} actualizado: "${nuevoNombre}"`);
    return { scheduleId: id, name: nuevoNombre, frequency: updates.frequency, active: nuevoActivo, nextExecution: proxima_ejecucion };
  } finally {
    connection.release();
  }
}

/**
 * Eliminar un schedule.
 * @param {number} id
 */
async function deleteSchedule(id) {
  const connection = await getPool().getConnection();
  try {
    stopCronJob(id);
    const [result] = await connection.execute(
      'DELETE FROM rep_reportes_programados WHERE id_reporte_programado = ?',
      [id]
    );
    if (result.affectedRows === 0) throw new Error(`Schedule #${id} no encontrado`);
    console.log(`[Scheduler] Schedule #${id} eliminado`);
    return true;
  } finally {
    connection.release();
  }
}

/**
 * Activar/desactivar un schedule.
 * @param {number} id
 * @param {boolean} active
 */
async function toggleSchedule(id, active) {
  return updateSchedule(id, { active });
}

/**
 * Obtener un schedule por ID (con JOIN a plantilla).
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getScheduleById(id) {
  const [[row]] = await getPool().execute(
    `SELECT r.*, p.clave_plantilla, p.id_tipo_origen
     FROM rep_reportes_programados r
     JOIN rep_plantillas p ON r.id_plantilla = p.id_plantilla
     WHERE r.id_reporte_programado = ?`,
    [id]
  );
  return row || null;
}

/**
 * Listar schedules con contrato completo para el controller.
 * @param {Object} [filters]
 * @param {boolean} [filters.activeOnly]
 * @param {number}  [filters.createdBy]
 * @returns {Promise<Array>}
 */
async function listSchedules(filters = {}) {
  const connection = await getPool().getConnection();
  try {
    let query = `
      SELECT r.*, p.clave_plantilla, p.id_tipo_origen
      FROM rep_reportes_programados r
      JOIN rep_plantillas p ON r.id_plantilla = p.id_plantilla
      WHERE 1=1
    `;
    const params = [];

    if (filters.activeOnly) {
      query += ' AND r.activo = 1';
    }
    if (filters.createdBy) {
      query += ' AND r.id_usuario_creador = ?';
      params.push(filters.createdBy);
    }

    query += ' ORDER BY r.fecha_creacion DESC';

    const [schedules] = await connection.execute(query, params);

    return schedules.map(s => {
      const { frequency, dayOfWeek, executionTime } = parseCronExpression(s.expresion_cron);
      const parametros = parseParametrosEjecucion(s.parametros_ejecucion);

      return {
        id:              s.id_reporte_programado,
        name:            s.nombre,
        reportType:      s.clave_plantilla,
        tipoOrigen:      s.id_tipo_origen,
        frequency,
        dayOfWeek,
        executionTime,
        parametrosEjecucion: parametros,
        active:          Boolean(s.activo),
        nextExecution:   s.proxima_ejecucion,
        lastExecution:   s.ultima_ejecucion,
        lastExecutionStatus: s.ultima_ejecucion_estado,
        executionCount:  s.conteo_ejecuciones ?? 0,
        isRunning:       activeJobs.has(s.id_reporte_programado),
        createdBy:       s.id_usuario_creador,
        createdAt:       s.fecha_creacion
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Obtener el contador de schedules activos.
 * @returns {Promise<number>}
 */
async function getActiveSchedulesCount() {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM rep_reportes_programados WHERE activo = 1'
    );
    return rows[0].count;
  } finally {
    connection.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ejecución de cron jobs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Iniciar un cron job para un schedule.
 * @param {number} id
 * @param {string} cronExpression
 * @param {Object} options - { nombre, id_plantilla, parametros_ejecucion }
 */
function startCronJob(id, cronExpression, options) {
  if (activeJobs.has(id)) stopCronJob(id);

  console.log(`[Scheduler] Iniciando cron job #${id}: "${options.nombre}" (${cronExpression})`);

  const job = cron.schedule(cronExpression, async () => {
    console.log(`[Scheduler] Ejecutando reporte programado #${id}: "${options.nombre}"`);
    await executeScheduledReport(id, options);
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });

  activeJobs.set(id, job);
  console.log(`[Scheduler] Cron job #${id} iniciado exitosamente`);
}

/**
 * Detener un cron job.
 * @param {number} id
 */
function stopCronJob(id) {
  if (activeJobs.has(id)) {
    activeJobs.get(id).stop();
    activeJobs.delete(id);
    console.log(`[Scheduler] Cron job #${id} detenido`);
  }
}

/**
 * Actualizar estado de última ejecución en BD.
 * @param {number} id
 * @param {Object} datos
 * @param {Date}   datos.ultima_ejecucion
 * @param {string} datos.estado              - 'exitoso' | 'fallido'
 * @param {Date|null} datos.proxima_ejecucion
 * @param {boolean} [datos.incrementarConteo=false]
 */
async function updateEjecucion(id, { ultima_ejecucion, estado, proxima_ejecucion, incrementarConteo = false }) {
  const connection = await getPool().getConnection();
  try {
    await connection.execute(
      `UPDATE rep_reportes_programados
       SET ultima_ejecucion = ?,
           ultima_ejecucion_estado = ?,
           proxima_ejecucion = ?,
           conteo_ejecuciones = conteo_ejecuciones + IF(?, 1, 0)
       WHERE id_reporte_programado = ?`,
      [ultima_ejecucion, estado, proxima_ejecucion, incrementarConteo ? 1 : 0, id]
    );
  } catch (error) {
    console.error(`[Scheduler] Error al actualizar ejecución #${id}:`, error);
  } finally {
    connection.release();
  }
}

/**
 * Ejecutar un reporte programado usando la configuración almacenada en BD.
 * @param {number} id - id_reporte_programado
 * @param {Object} options - { nombre, id_plantilla, parametros_ejecucion }
 */
async function executeScheduledReport(id, options) {
  const ahora = new Date();

  try {
    // Obtener config completa desde BD (fuente de verdad)
    const schedule = await getScheduleById(id);
    if (!schedule) throw new Error(`Schedule #${id} no encontrado en BD`);

    const parametros = parseParametrosEjecucion(schedule.parametros_ejecucion);

    const periodType = parametros.periodType ?? 'last_day';
    const { startDate, endDate } = calcDateRange(periodType);

    console.log(`[Scheduler] Generando reporte #${id} "${schedule.nombre}" | plantilla: ${schedule.clave_plantilla} | período: ${startDate} → ${endDate}`);

    const result = await reportGenerationService.generateReport(
      schedule.clave_plantilla,
      {
        startDate,
        endDate,
        ...parametros,
        scheduleId: id,
        scheduleName: schedule.nombre
      },
      schedule.id_usuario_creador ?? null
    );

    const proxima_ejecucion = calculateNextExecution(schedule.expresion_cron);

    await updateEjecucion(id, {
      ultima_ejecucion: ahora,
      estado: 'exitoso',
      proxima_ejecucion,
      incrementarConteo: true
    });

    console.log(`[Scheduler] Reporte #${id} generado exitosamente. Próxima ejecución: ${proxima_ejecucion ? DateTime.fromJSDate(proxima_ejecucion).setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm') : 'N/A'}`);
    return result;
  } catch (error) {
    console.error(`[Scheduler] Error al ejecutar reporte programado #${id}:`, error);
    await updateEjecucion(id, {
      ultima_ejecucion: ahora,
      estado: 'fallido',
      proxima_ejecucion: null,
      incrementarConteo: false
    });
    // No re-lanzar: evita doble log en node-cron; el fallo ya quedó en BD y en consola arriba
  }
}

/**
 * Cargar schedules activos desde BD y reiniciar cron jobs.
 * Llamar al iniciar el servidor.
 */
async function loadActiveSchedules() {
  const connection = await getPool().getConnection();
  try {
    const [schedules] = await connection.execute(
      `SELECT r.id_reporte_programado, r.nombre, r.id_plantilla,
              r.expresion_cron, r.parametros_ejecucion, r.proxima_ejecucion
       FROM rep_reportes_programados r
       WHERE r.activo = 1`
    );

    console.log(`[Scheduler] Cargando ${schedules.length} schedules activos...`);

    for (const s of schedules) {
      try {
        let proxima = s.proxima_ejecucion;
        if (!proxima && s.expresion_cron) {
          const calculated = calculateNextExecution(s.expresion_cron);
          if (calculated) {
            await connection.execute(
              'UPDATE rep_reportes_programados SET proxima_ejecucion = ? WHERE id_reporte_programado = ?',
              [calculated, s.id_reporte_programado]
            );
            proxima = calculated;
            console.log(`[Scheduler] Reconciliada proxima_ejecucion para #${s.id_reporte_programado}`);
          } else {
            console.error(
              `[Scheduler] Omitiendo job #${s.id_reporte_programado}: no se pudo calcular proxima_ejecucion para "${s.expresion_cron}"`
            );
            continue;
          }
        }

        const parametrosStr = stringifyParametrosEjecucion(parseParametrosEjecucion(s.parametros_ejecucion));

        startCronJob(s.id_reporte_programado, s.expresion_cron, {
          nombre:               s.nombre,
          id_plantilla:         s.id_plantilla,
          parametros_ejecucion: parametrosStr
        });
      } catch (error) {
        console.error(`[Scheduler] Error al cargar schedule #${s.id_reporte_programado}:`, error);
      }
    }

    console.log(`[Scheduler] ${activeJobs.size} cron jobs activos cargados exitosamente`);
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
  getScheduleById,
  loadActiveSchedules,
  listSchedules,
  getActiveSchedulesCount,
  calculateNextExecution,
  executeScheduledReport,
  updateEjecucion,
  startCronJob,
  stopCronJob,
  parseParametrosEjecucion,
  ERR_NO_NEXT_EXECUTION
};
