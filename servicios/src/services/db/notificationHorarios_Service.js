/**
 * Servicio de BD para ale_horarios_alerta_canal (base, admin) y ale_horarios_usuario (custom).
 * @module services/db/notificationHorarios_Service
 */

const databaseService = require('../database_Service');

async function _pool() {
  if (!databaseService.connected) await databaseService.initialize();
  return databaseService.pool;
}

// ---------- Horarios base (ale_horarios_alerta_canal) ----------

async function getHorariosBase(filters = {}) {
  const pool = await _pool();
  let query = `
    SELECT id_horario_alerta_canal, id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo,
           respeta_horario_operacional, respeta_feriados, fecha_creacion, fecha_actualizacion
    FROM ale_horarios_alerta_canal
    WHERE 1=1
  `;
  const params = [];
  if (filters.id_tipo_alerta != null) { query += ' AND id_tipo_alerta = ?'; params.push(filters.id_tipo_alerta); }
  if (filters.canal) { query += ' AND canal = ?'; params.push(filters.canal); }
  if (filters.dia_semana != null) { query += ' AND dia_semana = ?'; params.push(filters.dia_semana); }
  query += ' ORDER BY id_tipo_alerta, canal, dia_semana';
  const [rows] = await pool.execute(query, params);
  return rows;
}

async function getHorarioBaseById(id) {
  const pool = await _pool();
  const [rows] = await pool.execute(
    'SELECT * FROM ale_horarios_alerta_canal WHERE id_horario_alerta_canal = ?',
    [id]
  );
  return rows[0] || null;
}

async function upsertHorarioBase(record) {
  const pool = await _pool();
  const { id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo = 1, respeta_horario_operacional = 1, respeta_feriados = 1 } = record;
  await pool.execute(
    `INSERT INTO ale_horarios_alerta_canal (id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo, respeta_horario_operacional, respeta_feriados)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE hora_inicio = VALUES(hora_inicio), hora_fin = VALUES(hora_fin), activo = VALUES(activo),
       respeta_horario_operacional = VALUES(respeta_horario_operacional), respeta_feriados = VALUES(respeta_feriados),
       fecha_actualizacion = CURRENT_TIMESTAMP`,
    [id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo ? 1 : 0, respeta_horario_operacional ? 1 : 0, respeta_feriados ? 1 : 0]
  );
  const [rows] = await pool.execute(
    'SELECT * FROM ale_horarios_alerta_canal WHERE id_tipo_alerta = ? AND canal = ? AND dia_semana = ?',
    [id_tipo_alerta, canal, dia_semana]
  );
  return rows[0];
}

async function updateHorarioBaseById(id, record) {
  const pool = await _pool();
  const { hora_inicio, hora_fin, activo, respeta_horario_operacional, respeta_feriados } = record;
  await pool.execute(
    `UPDATE ale_horarios_alerta_canal SET hora_inicio = ?, hora_fin = ?, activo = ?, respeta_horario_operacional = ?, respeta_feriados = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_horario_alerta_canal = ?`,
    [hora_inicio || '00:00:00', hora_fin || '23:59:59', activo !== false ? 1 : 0, respeta_horario_operacional !== false ? 1 : 0, respeta_feriados !== false ? 1 : 0, id]
  );
  return getHorarioBaseById(id);
}

async function deleteHorarioBase(id) {
  const pool = await _pool();
  const [r] = await pool.execute('DELETE FROM ale_horarios_alerta_canal WHERE id_horario_alerta_canal = ?', [id]);
  return r.affectedRows;
}

// ---------- Horarios usuario (ale_horarios_usuario) ----------

async function getHorariosUsuario(idUsuario, filters = {}) {
  const pool = await _pool();
  let query = `
    SELECT id_horario_usuario, id_usuario, id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo,
           respeta_horario_operacional, respeta_feriados, fecha_creacion, fecha_actualizacion
    FROM ale_horarios_usuario
    WHERE id_usuario = ?
  `;
  const params = [idUsuario];
  if (filters.id_tipo_alerta != null) { query += ' AND id_tipo_alerta = ?'; params.push(filters.id_tipo_alerta); }
  if (filters.canal) { query += ' AND canal = ?'; params.push(filters.canal); }
  query += ' ORDER BY id_tipo_alerta, canal, dia_semana';
  const [rows] = await pool.execute(query, params);
  return rows;
}

async function upsertHorarioUsuario(idUsuario, record) {
  const pool = await _pool();
  const { id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo = 1, respeta_horario_operacional = 1, respeta_feriados = 1 } = record;
  await pool.execute(
    `INSERT INTO ale_horarios_usuario (id_usuario, id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo, respeta_horario_operacional, respeta_feriados)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE hora_inicio = VALUES(hora_inicio), hora_fin = VALUES(hora_fin), activo = VALUES(activo),
       respeta_horario_operacional = VALUES(respeta_horario_operacional), respeta_feriados = VALUES(respeta_feriados),
       fecha_actualizacion = CURRENT_TIMESTAMP`,
    [idUsuario, id_tipo_alerta, canal, dia_semana, hora_inicio, hora_fin, activo ? 1 : 0, respeta_horario_operacional ? 1 : 0, respeta_feriados ? 1 : 0]
  );
  const [rows] = await pool.execute(
    'SELECT * FROM ale_horarios_usuario WHERE id_usuario = ? AND id_tipo_alerta = ? AND canal = ? AND dia_semana = ?',
    [idUsuario, id_tipo_alerta, canal, dia_semana]
  );
  return rows[0];
}

async function deleteHorarioUsuario(idUsuario, idHorarioUsuario) {
  const pool = await _pool();
  const [r] = await pool.execute('DELETE FROM ale_horarios_usuario WHERE id_horario_usuario = ? AND id_usuario = ?', [idHorarioUsuario, idUsuario]);
  return r.affectedRows;
}

module.exports = {
  getHorariosBase,
  getHorarioBaseById,
  upsertHorarioBase,
  updateHorarioBaseById,
  deleteHorarioBase,
  getHorariosUsuario,
  upsertHorarioUsuario,
  deleteHorarioUsuario
};
