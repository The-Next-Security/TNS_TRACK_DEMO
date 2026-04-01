/**
 * Servicio de BD para ale_suscripciones_notificacion (canal push).
 * Gestiona qué usuarios reciben alertas de qué tipo/origen por push.
 * @module services/db/alertSubscription_Service
 */

const databaseService = require('../database_Service');

async function _pool() {
  if (!databaseService.connected) await databaseService.initialize();
  return databaseService.pool;
}

/**
 * Retorna todos los tipos de alerta definidos en el sistema.
 * @returns {Promise<Array>} [{id_tipo_alerta, nombre, descripcion}, ...]
 */
async function getTiposAlerta() {
  const pool = await _pool();
  const [rows] = await pool.execute(
    'SELECT id_tipo_alerta, nombre, descripcion FROM ale_tipo_alerta ORDER BY id_tipo_alerta'
  );
  return rows;
}

/**
 * Retorna los orígenes válidos para suscripción (excluye 'sistema', id=3).
 * @returns {Promise<Array>} [{id_tipo_origen, nombre}, ...]
 */
async function getOrigenesValidos() {
  const pool = await _pool();
  const [rows] = await pool.execute(
    'SELECT id_tipo_origen, nombre FROM gen_tipos_origen WHERE id_tipo_origen != 3 ORDER BY id_tipo_origen'
  );
  return rows;
}

/**
 * Retorna todas las suscripciones push activas e inactivas del usuario.
 * @param {number} idUsuario
 * @returns {Promise<Array>} [{id_suscripcion_notificacion, id_tipo_alerta, id_tipo_origen, activo}, ...]
 */
async function getSuscripcionesUsuario(idUsuario) {
  const pool = await _pool();
  const [rows] = await pool.execute(
    `SELECT id_suscripcion_notificacion, id_tipo_alerta, id_tipo_origen, activo
     FROM ale_suscripciones_notificacion
     WHERE id_usuario = ? AND canal = 'push'
     ORDER BY id_tipo_alerta, id_tipo_origen`,
    [idUsuario]
  );
  return rows;
}

/**
 * Inserta o actualiza una suscripción push para el usuario.
 * Usa ON DUPLICATE KEY para la clave única (id_usuario, id_tipo_alerta, id_tipo_origen, canal).
 * @param {number} idUsuario - Extraído siempre del JWT en el controller
 * @param {object} params
 * @param {number} params.idTipoAlerta
 * @param {number} params.idOrigenTipo
 * @param {boolean} params.activo
 * @returns {Promise<void>}
 */
async function upsertSuscripcion(idUsuario, { idTipoAlerta, idOrigenTipo, activo }) {
  const pool = await _pool();
  await pool.execute(
    `INSERT INTO ale_suscripciones_notificacion (id_usuario, id_tipo_alerta, id_tipo_origen, canal, activo)
     VALUES (?, ?, ?, 'push', ?)
     ON DUPLICATE KEY UPDATE activo = VALUES(activo), fecha_actualizacion = CURRENT_TIMESTAMP`,
    [idUsuario, idTipoAlerta, idOrigenTipo, activo ? 1 : 0]
  );
}

/**
 * Aplica múltiples upserts en secuencia.
 * @param {number} idUsuario
 * @param {Array<{idTipoAlerta, idOrigenTipo, activo}>} items
 * @returns {Promise<void>}
 */
async function batchUpsertSuscripciones(idUsuario, items) {
  for (const item of items) {
    await upsertSuscripcion(idUsuario, item);
  }
}

module.exports = {
  getTiposAlerta,
  getOrigenesValidos,
  getSuscripcionesUsuario,
  upsertSuscripcion,
  batchUpsertSuscripciones
};
