/**
 * Notification Schedule Service
 *
 * Servicio único de decisión: determina si se debe enviar una notificación (email o push)
 * según suscripción activa, horario efectivo (base o custom), ventana, feriados y DND (solo push).
 *
 * Usa: ale_suscripciones_notificacion, ale_horarios_alerta_canal, ale_horarios_usuario,
 * gen_horario_operacional, gen_feriados_cl, ale_preferencias_push (para DND push).
 *
 * @module services/notificationSchedule_Service
 */

const { DateTime } = require('luxon');
const databaseService = require('./database_Service');
const alertScheduleConfigService = require('./db/alertScheduleConfig_Service');

const TIMEZONE = 'America/Santiago';

/**
 * Determina si se debe enviar una notificación para el tipo/canal/usuario en el momento dado.
 *
 * Pasos: (1) Suscripción activa (2) Horario efectivo usuario o base (3) Ventana + horario operacional
 * (4) Feriados (5) Para push: DND por dispositivo.
 *
 * @param {Object} opts
 * @param {number} opts.idTipoAlerta - FK ale_tipo_alerta
 * @param {number} opts.idOrigenTipo - FK gen_tipos_origen (origen de la alerta)
 * @param {string} opts.canal - 'email' | 'push'
 * @param {number} opts.idUsuario - FK gen_usuario
 * @param {import('luxon').DateTime|Date|string} [opts.fechaHora] - Momento a evaluar (default now)
 * @param {number} [opts.idSuscripcionPush] - id_suscripcion en ale_push_suscripciones (solo para DND push)
 * @returns {Promise<{ allowed: boolean, motivo: string }>}
 */
async function shouldSendNotification({ idTipoAlerta, idOrigenTipo, canal, idUsuario, fechaHora = null, idSuscripcionPush = null }) {
  const now = fechaHora
    ? (fechaHora instanceof DateTime ? fechaHora : DateTime.fromJSDate(fechaHora instanceof Date ? fechaHora : new Date(fechaHora))).setZone(TIMEZONE)
    : DateTime.now().setZone(TIMEZONE);

  try {
    if (!databaseService.connected) {
      await databaseService.initialize();
    }
    const pool = databaseService.pool;
    if (!pool) {
      return { allowed: false, motivo: 'Servicio de BD no disponible' };
    }

    // 1. Suscripción activa
    const [subRows] = await pool.execute(
      `SELECT 1 FROM ale_suscripciones_notificacion
       WHERE id_usuario = ? AND id_tipo_alerta = ? AND id_origen_tipo = ? AND canal = ? AND activo = 1`,
      [idUsuario, idTipoAlerta, idOrigenTipo, canal]
    );
    if (!subRows || subRows.length === 0) {
      return { allowed: false, motivo: 'No hay suscripción activa para este usuario/tipo/origen/canal' };
    }

    const esFeriado = await _isHoliday(pool, now);
    const diaSemana = esFeriado ? 0 : now.weekday; // Luxon 1=Lu..7=Do; 0 = feriado

    // 2. Horario efectivo: ale_horarios_usuario si existe para este usuario/tipo/canal, si no base
    const [userHorarios] = await pool.execute(
      `SELECT dia_semana, hora_inicio, hora_fin, activo, respeta_horario_operacional, respeta_feriados
       FROM ale_horarios_usuario
       WHERE id_usuario = ? AND id_tipo_alerta = ? AND canal = ? AND dia_semana = ?`,
      [idUsuario, idTipoAlerta, canal, diaSemana]
    );

    let filaHorario = null;
    if (userHorarios && userHorarios.length > 0) {
      filaHorario = userHorarios[0];
    } else {
      const [baseRows] = await pool.execute(
        `SELECT dia_semana, hora_inicio, hora_fin, activo, respeta_horario_operacional, respeta_feriados
         FROM ale_horarios_alerta_canal
         WHERE id_tipo_alerta = ? AND canal = ? AND dia_semana = ?`,
        [idTipoAlerta, canal, diaSemana]
      );
      if (baseRows && baseRows.length > 0) {
        filaHorario = baseRows[0];
      }
    }

    if (!filaHorario || filaHorario.activo !== 1) {
      return { allowed: false, motivo: `No hay horario configurado o activo para tipo=${idTipoAlerta} canal=${canal} dia=${diaSemana}` };
    }

    // 3. Ventana: hora actual dentro de (hora_inicio, hora_fin)
    const horaActual = now.toFormat('HH:mm:ss');
    if (horaActual < filaHorario.hora_inicio || horaActual > filaHorario.hora_fin) {
      return { allowed: false, motivo: `Fuera de ventana de envío (${filaHorario.hora_inicio} - ${filaHorario.hora_fin})` };
    }

    // Si respeta_horario_operacional: solo enviar fuera del horario laboral (intersección)
    if (filaHorario.respeta_horario_operacional === 1) {
      const resultado = await alertScheduleConfigService.isWithinOperationalHours(now);
      if (resultado.enHorario) {
        return { allowed: false, motivo: `Dentro de horario laboral; no enviar (${resultado.motivo})` };
      }
    }

    // 4. Feriados: si hoy es feriado y la regla respeta_feriados y global respetar_feriados → no enviar
    if (esFeriado && filaHorario.respeta_feriados === 1) {
      const config = alertScheduleConfigService.configCache || await alertScheduleConfigService.loadAllConfig();
      if (config.respetar_feriados) {
        return { allowed: false, motivo: 'Hoy es feriado y la regla respeta feriados' };
      }
    }

    // 5. Email: no DND. Listo.
    if (canal === 'email') {
      return { allowed: true, motivo: 'Dentro de ventana y reglas; email sin DND' };
    }

    // 6. Push: evaluar DND por dispositivo (fun_should_send_notification)
    if (canal === 'push' && idSuscripcionPush != null) {
      const pushService = require('./push/pushNotification_Service');
      const subscription = { id_suscripcion: idSuscripcionPush };
      const alertType = idTipoAlerta === 1 ? 'temperature' : idTipoAlerta === 2 ? 'disconnection' : 'unknown';
      const sendToSub = await pushService.shouldSendToSubscription(subscription, alertType, false);
      if (!sendToSub) {
        return { allowed: false, motivo: 'Push bloqueado por DND o preferencias del dispositivo' };
      }
    }

    return { allowed: true, motivo: 'Dentro de ventana y reglas; push DND OK' };
  } catch (err) {
    console.error('[NotificationScheduleService] shouldSendNotification error:', err.message);
    return { allowed: false, motivo: `Error: ${err.message}` };
  }
}

async function _isHoliday(pool, dateTime) {
  const formattedDate = dateTime.toFormat('yyyy-MM-dd');
  const [rows] = await pool.execute(
    'SELECT 1 FROM gen_feriados_cl WHERE fecha = ?',
    [formattedDate]
  );
  return rows && rows.length > 0;
}

module.exports = {
  shouldSendNotification,
  TIMEZONE
};
