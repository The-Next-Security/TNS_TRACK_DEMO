/**
 * Controller para gestión de suscripciones de alerta por canal push.
 * Tabla: ale_suscripciones_notificacion (canal = 'push')
 */

const alertSubscriptionService = require('../services/db/alertSubscription_Service');

/**
 * GET /api/alerts/subscriptions/lookups
 * Retorna tipos de alerta y orígenes válidos (sin 'sistema') para construir la matriz en UI.
 */
async function getLookups(req, res) {
  try {
    const [tiposAlerta, origenes] = await Promise.all([
      alertSubscriptionService.getTiposAlerta(),
      alertSubscriptionService.getOrigenesValidos()
    ]);
    res.status(200).json({ success: true, data: { tiposAlerta, origenes } });
  } catch (err) {
    console.error('[AlertSubscriptionController] getLookups:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * GET /api/alerts/subscriptions
 * Retorna las suscripciones push del usuario autenticado.
 */
async function getMisSuscripciones(req, res) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario) return res.status(401).json({ success: false, error: { message: 'No autenticado' } });
    const data = await alertSubscriptionService.getSuscripcionesUsuario(idUsuario);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[AlertSubscriptionController] getMisSuscripciones:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * POST /api/alerts/subscriptions/toggle
 * Body: { idTipoAlerta, idOrigenTipo, activo }
 * Activa o desactiva una suscripción push específica.
 */
async function toggleSuscripcion(req, res) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario) return res.status(401).json({ success: false, error: { message: 'No autenticado' } });

    const { idTipoAlerta, idOrigenTipo, activo } = req.body;

    if (!idTipoAlerta || !idOrigenTipo) {
      return res.status(400).json({ success: false, error: { message: 'idTipoAlerta e idOrigenTipo son requeridos' } });
    }

    const tipoOrigen = parseInt(idOrigenTipo, 10);
    if (tipoOrigen === 3) {
      return res.status(400).json({ success: false, error: { message: 'No se puede suscribir al origen sistema' } });
    }

    await alertSubscriptionService.upsertSuscripcion(idUsuario, {
      idTipoAlerta: parseInt(idTipoAlerta, 10),
      idOrigenTipo: tipoOrigen,
      activo: activo !== false
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[AlertSubscriptionController] toggleSuscripcion:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

/**
 * POST /api/alerts/subscriptions/batch
 * Body: { items: [{idTipoAlerta, idOrigenTipo, activo}, ...] }
 * Guarda toda la matriz de suscripciones de una vez.
 */
async function batchSuscripciones(req, res) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario) return res.status(401).json({ success: false, error: { message: 'No autenticado' } });

    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'items debe ser un arreglo no vacío' } });
    }

    // Filtrar origen sistema (id=3) y validar tipos
    const filtrados = items
      .filter(item => parseInt(item.idOrigenTipo, 10) !== 3)
      .map(item => ({
        idTipoAlerta: parseInt(item.idTipoAlerta, 10),
        idOrigenTipo: parseInt(item.idOrigenTipo, 10),
        activo: item.activo !== false
      }))
      .filter(item => !isNaN(item.idTipoAlerta) && !isNaN(item.idOrigenTipo));

    await alertSubscriptionService.batchUpsertSuscripciones(idUsuario, filtrados);

    res.status(200).json({ success: true, processed: filtrados.length });
  } catch (err) {
    console.error('[AlertSubscriptionController] batchSuscripciones:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
}

module.exports = {
  getLookups,
  getMisSuscripciones,
  toggleSuscripcion,
  batchSuscripciones
};
