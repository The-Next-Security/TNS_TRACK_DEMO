/**
 * Controller para horarios base (admin) y horarios usuario (mis horarios).
 * ale_horarios_alerta_canal, ale_horarios_usuario.
 */

const notificationHorariosService = require('../services/db/notificationHorarios_Service');

// ---------- Horarios base (admin) ----------

async function getHorariosBase(req, res) {
  try {
    const filters = {};
    if (req.query.id_tipo_alerta != null) filters.id_tipo_alerta = parseInt(req.query.id_tipo_alerta, 10);
    if (req.query.canal) filters.canal = req.query.canal;
    if (req.query.dia_semana != null) filters.dia_semana = parseInt(req.query.dia_semana, 10);
    const data = await notificationHorariosService.getHorariosBase(filters);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[NotificationHorariosController] getHorariosBase:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

async function postHorariosBase(req, res) {
  try {
    const body = req.body || {};
    const record = {
      id_tipo_alerta: body.id_tipo_alerta,
      canal: body.canal,
      dia_semana: body.dia_semana != null ? body.dia_semana : 1,
      hora_inicio: body.hora_inicio || '00:00:00',
      hora_fin: body.hora_fin || '23:59:59',
      activo: body.activo !== false,
      respeta_horario_operacional: body.respeta_horario_operacional !== false,
      respeta_feriados: body.respeta_feriados !== false
    };
    const created = await notificationHorariosService.upsertHorarioBase(record);
    res.status(200).json({ success: true, data: created });
  } catch (err) {
    console.error('[NotificationHorariosController] postHorariosBase:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

async function putHorariosBase(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: { message: 'id requerido' } });
    const body = req.body || {};
    const record = {
      hora_inicio: body.hora_inicio || '00:00:00',
      hora_fin: body.hora_fin || '23:59:59',
      activo: body.activo !== false,
      respeta_horario_operacional: body.respeta_horario_operacional !== false,
      respeta_feriados: body.respeta_feriados !== false
    };
    const updated = await notificationHorariosService.updateHorarioBaseById(id, record);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('[NotificationHorariosController] putHorariosBase:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

async function deleteHorariosBase(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: { message: 'id requerido' } });
    const deleted = await notificationHorariosService.deleteHorarioBase(id);
    res.status(200).json({ success: true, deleted: deleted > 0 });
  } catch (err) {
    console.error('[NotificationHorariosController] deleteHorariosBase:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

// ---------- Mis horarios (usuario autenticado) ----------

async function getMisHorarios(req, res) {
  try {
    const idUsuario = req.user?.id_usuario || req.user?.id;
    if (!idUsuario) return res.status(401).json({ success: false, error: { message: 'No autenticado' } });
    const filters = {};
    if (req.query.id_tipo_alerta != null) filters.id_tipo_alerta = parseInt(req.query.id_tipo_alerta, 10);
    if (req.query.canal) filters.canal = req.query.canal;
    const data = await notificationHorariosService.getHorariosUsuario(idUsuario, filters);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[NotificationHorariosController] getMisHorarios:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

async function postMisHorarios(req, res) {
  try {
    const idUsuario = req.user?.id_usuario || req.user?.id;
    if (!idUsuario) return res.status(401).json({ success: false, error: { message: 'No autenticado' } });
    const body = req.body || {};
    const record = {
      id_tipo_alerta: body.id_tipo_alerta,
      canal: body.canal,
      dia_semana: body.dia_semana != null ? body.dia_semana : 1,
      hora_inicio: body.hora_inicio || '00:00:00',
      hora_fin: body.hora_fin || '23:59:59',
      activo: body.activo !== false,
      respeta_horario_operacional: body.respeta_horario_operacional !== false,
      respeta_feriados: body.respeta_feriados !== false
    };
    const created = await notificationHorariosService.upsertHorarioUsuario(idUsuario, record);
    res.status(200).json({ success: true, data: created });
  } catch (err) {
    console.error('[NotificationHorariosController] postMisHorarios:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

async function deleteMisHorarios(req, res) {
  try {
    const idUsuario = req.user?.id_usuario || req.user?.id;
    if (!idUsuario) return res.status(401).json({ success: false, error: { message: 'No autenticado' } });
    const idHorarioUsuario = parseInt(req.params.id, 10);
    if (!idHorarioUsuario) return res.status(400).json({ success: false, error: { message: 'id requerido' } });
    const deleted = await notificationHorariosService.deleteHorarioUsuario(idUsuario, idHorarioUsuario);
    res.status(200).json({ success: true, deleted: deleted > 0 });
  } catch (err) {
    console.error('[NotificationHorariosController] deleteMisHorarios:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

module.exports = {
  getHorariosBase,
  postHorariosBase,
  putHorariosBase,
  deleteHorariosBase,
  getMisHorarios,
  postMisHorarios,
  deleteMisHorarios
};
