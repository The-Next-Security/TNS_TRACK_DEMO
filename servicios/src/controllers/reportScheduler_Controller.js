/**
 * @fileoverview Report Scheduler Controller - Endpoints para gestión de reportes programados
 * @description Controlador que expone endpoints REST para crear, listar, actualizar y
 * eliminar schedules de reportes automáticos.
 * @feature 004-reportes-base-core (T033, T034, T035, T036)
 * @version 1.0.0
 */

const reportSchedulerService = require('../services/reports/reportScheduler_Service');
const { DateTime } = require('luxon');

const DUPLICATE_SCHEDULE_NAME_CODE = 'DUPLICATE_SCHEDULE_NAME';

/** MySQL 1062 en uk_rep_reportes_programados_nombre */
function isDuplicateScheduleNameError(error) {
  return error.code === 'ER_DUP_ENTRY' &&
    String(error.sqlMessage || '').includes('uk_rep_reportes_programados_nombre');
}

/**
 * POST /api/reportes/programados - Crear un nuevo schedule
 * @param {Object} req.body - Configuración del schedule
 * @param {string} req.body.name - Nombre del schedule
 * @param {string} req.body.reportType - Tipo de reporte
 * @param {string} req.body.frequency - 'daily' o 'weekly'
 * @param {number} req.body.dayOfWeek - 0-6 (solo para weekly)
 * @param {string} req.body.time - 'HH:MM'
 * @param {string} req.body.periodType - 'last_day', 'last_week', 'last_month'
 * @param {Array<number>} req.body.deviceIds - IDs de dispositivos
 * @param {Object} req.body.options - Opciones adicionales
 * @param {boolean} req.body.active - Si debe estar activo
 */
async function createSchedule(req, res) {
  try {
    const {
      name,
      reportType,
      frequency,
      dayOfWeek,
      time,
      periodType,
      deviceIds,
      options,
      active
    } = req.body;

    // Validaciones básicas
    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El nombre del schedule es requerido'
      });
    }

    if (!reportType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El tipo de reporte es requerido'
      });
    }

    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'La frecuencia debe ser "daily" o "weekly"'
      });
    }

    if (frequency === 'weekly' && (dayOfWeek === undefined || dayOfWeek === null)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El día de la semana es requerido para frecuencia semanal'
      });
    }

    if (frequency === 'weekly' && (dayOfWeek < 0 || dayOfWeek > 6)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El día de la semana debe estar entre 0 (Domingo) y 6 (Sábado)'
      });
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'La hora debe estar en formato HH:MM (ej: 08:00)'
      });
    }

    if (!periodType || !['last_day', 'last_week', 'last_month'].includes(periodType)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El tipo de período debe ser "last_day", "last_week" o "last_month"'
      });
    }

    if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Debe seleccionar al menos un dispositivo'
      });
    }

    // Crear el schedule
    const result = await reportSchedulerService.createSchedule({
      name: name.trim(),
      reportType,
      frequency,
      dayOfWeek,
      time,
      parametrosEjecucion: {
        periodType,
        deviceIds,
        options: options || {}
      },
      active: active !== false, // Default true
      createdBy: req.user.userId // Desde el middleware de autenticación
    });

    console.log(`[SchedulerController] Schedule created: #${result.scheduleId} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: 'Schedule creado exitosamente',
      data: {
        scheduleId: result.scheduleId,
        nextExecution: result.nextExecution,
        name: name.trim(),
        frequency,
        active: active !== false
      }
    });
  } catch (error) {
    console.error('[SchedulerController] Error creating schedule:', error);

    if (isDuplicateScheduleNameError(error)) {
      return res.status(409).json({
        error: 'Conflict',
        code: DUPLICATE_SCHEDULE_NAME_CODE,
        message: 'Ya existe un reporte programado con ese nombre. Elige otro nombre o edita el existente.'
      });
    }

    if (error.code === reportSchedulerService.ERR_NO_NEXT_EXECUTION) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        code: error.code,
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al crear el schedule'
    });
  }
}

/**
 * GET /api/reportes/programados - Listar schedules
 * @query {boolean} activeOnly - Solo schedules activos
 */
async function listSchedules(req, res) {
  try {
    const { activeOnly } = req.query;

    // Filtrar por usuario creador (a menos que sea admin)
    const filters = {
      activeOnly: activeOnly === 'true',
      createdBy: req.user.userId // Los usuarios solo ven sus propios schedules
      // TODO: Si el usuario es admin, permitir ver todos (requiere rol en req.user)
    };

    const schedules = await reportSchedulerService.listSchedules(filters);

    // Formatear fechas para mejor legibilidad
    const formattedSchedules = schedules.map(schedule => {
      const parametros = schedule.parametrosEjecucion || {};
      return {
        id: schedule.id,
        name: schedule.name,
        reportType: schedule.reportType,
        frequency: schedule.frequency,
        dayOfWeek: schedule.dayOfWeek,
        executionTime: schedule.executionTime,
        periodType: parametros.periodType || null,
        deviceCount: Array.isArray(parametros.deviceIds) ? parametros.deviceIds.length : 0,
        deviceIds: parametros.deviceIds || [],
        options: parametros.options || {},
        active: schedule.active,
        nextExecution: schedule.nextExecution,
        nextExecutionFormatted: schedule.nextExecution
          ? DateTime.fromJSDate(schedule.nextExecution).setZone('America/Santiago').toFormat('dd/MM/yyyy HH:mm')
          : null,
        lastExecution: schedule.lastExecution,
        lastExecutionFormatted: schedule.lastExecution
          ? DateTime.fromJSDate(schedule.lastExecution).setZone('America/Santiago').toFormat('dd/MM/yyyy HH:mm')
          : null,
        executionCount: schedule.executionCount,
        isRunning: schedule.isRunning,
        createdAt: schedule.createdAt
      };
    });

    res.json({
      success: true,
      data: {
        schedules: formattedSchedules,
        totalCount: formattedSchedules.length
      }
    });
  } catch (error) {
    console.error('[SchedulerController] Error listing schedules:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al obtener schedules'
    });
  }
}

/**
 * PUT /api/reportes/programados/:id - Actualizar un schedule
 * @param {number} req.params.id - ID del schedule
 * @param {Object} req.body - Campos a actualizar
 */
async function updateSchedule(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'ID de schedule inválido'
      });
    }

    const updates = req.body;

    // Validar campos si se proporcionan
    if (updates.frequency && !['daily', 'weekly'].includes(updates.frequency)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'La frecuencia debe ser "daily" o "weekly"'
      });
    }

    if (updates.time && !/^\d{2}:\d{2}$/.test(updates.time)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'La hora debe estar en formato HH:MM'
      });
    }

    if (updates.periodType && !['last_day', 'last_week', 'last_month'].includes(updates.periodType)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El tipo de período debe ser "last_day", "last_week" o "last_month"'
      });
    }

    if (updates.deviceIds && (!Array.isArray(updates.deviceIds) || updates.deviceIds.length === 0)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Debe seleccionar al menos un dispositivo'
      });
    }

    // Verificar ownership antes de actualizar
    const existing = await reportSchedulerService.getScheduleById(scheduleId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Schedule no encontrado' });
    }
    if (existing.id_usuario_creador !== null && existing.id_usuario_creador !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'No puedes modificar un schedule que no creaste' });
    }

    // Traducir campos planos a parametrosEjecucion si el cliente los envía
    if (updates.deviceIds !== undefined || updates.periodType !== undefined || updates.options !== undefined) {
      const existingParametros = reportSchedulerService.parseParametrosEjecucion(existing.parametros_ejecucion);
      updates.parametrosEjecucion = {
        ...existingParametros,
        ...(updates.periodType !== undefined ? { periodType: updates.periodType } : {}),
        ...(updates.deviceIds  !== undefined ? { deviceIds:  updates.deviceIds  } : {}),
        ...(updates.options    !== undefined ? { options:    updates.options    } : {}),
      };
      delete updates.deviceIds;
      delete updates.periodType;
      delete updates.options;
    }

    // Actualizar el schedule
    const result = await reportSchedulerService.updateSchedule(scheduleId, updates);

    console.log(`[SchedulerController] Schedule #${scheduleId} updated by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Schedule actualizado exitosamente',
      data: {
        scheduleId: result.scheduleId,
        name: result.name,
        frequency: result.frequency,
        active: result.active,
        nextExecution: result.nextExecution,
        nextExecutionFormatted: result.nextExecution
          ? DateTime.fromJSDate(result.nextExecution).setZone('America/Santiago').toFormat('dd/MM/yyyy HH:mm')
          : null
      }
    });
  } catch (error) {
    console.error('[SchedulerController] Error updating schedule:', error);

    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    if (isDuplicateScheduleNameError(error)) {
      return res.status(409).json({
        error: 'Conflict',
        code: DUPLICATE_SCHEDULE_NAME_CODE,
        message: 'Ya existe un reporte programado con ese nombre. Elige otro nombre o edita el existente.'
      });
    }

    if (error.code === reportSchedulerService.ERR_NO_NEXT_EXECUTION) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        code: error.code,
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al actualizar el schedule'
    });
  }
}

/**
 * DELETE /api/reportes/programados/:id - Eliminar un schedule
 * @param {number} req.params.id - ID del schedule
 */
async function deleteSchedule(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'ID de schedule inválido'
      });
    }

    // Verificar ownership antes de eliminar
    const existing = await reportSchedulerService.getScheduleById(scheduleId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Schedule no encontrado' });
    }
    if (existing.id_usuario_creador !== null && existing.id_usuario_creador !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden', message: 'No puedes eliminar un schedule que no creaste' });
    }

    await reportSchedulerService.deleteSchedule(scheduleId);

    console.log(`[SchedulerController] Schedule #${scheduleId} deleted by user ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Schedule eliminado exitosamente'
    });
  } catch (error) {
    console.error('[SchedulerController] Error deleting schedule:', error);

    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al eliminar el schedule'
    });
  }
}

/**
 * PATCH /api/reportes/programados/:id/toggle - Activar/desactivar un schedule
 * @param {number} req.params.id - ID del schedule
 * @param {boolean} req.body.active - Estado activo
 */
async function toggleSchedule(req, res) {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    const { active } = req.body;

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'ID de schedule inválido'
      });
    }

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'El campo "active" debe ser un booleano'
      });
    }

    const result = await reportSchedulerService.toggleSchedule(scheduleId, active);

    console.log(`[SchedulerController] Schedule #${scheduleId} toggled to ${active} by user ${req.user.userId}`);

    res.json({
      success: true,
      message: `Schedule ${active ? 'activado' : 'desactivado'} exitosamente`,
      data: {
        scheduleId: result.scheduleId,
        active: result.active
      }
    });
  } catch (error) {
    console.error('[SchedulerController] Error toggling schedule:', error);

    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error al cambiar estado del schedule'
    });
  }
}

/**
 * GET /api/reportes/programados/conteo - Obtener contador de schedules activos
 */
async function getActiveCount(req, res) {
  try {
    const count = await reportSchedulerService.getActiveSchedulesCount();

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('[SchedulerController] Error getting active count:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error al obtener contador de schedules activos'
    });
  }
}

module.exports = {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getActiveCount
};
