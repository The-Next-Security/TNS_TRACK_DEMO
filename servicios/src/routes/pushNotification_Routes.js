// src/routes/pushNotificationRoutes.js
// Rutas para gestionar Push Notifications

const express = require('express');
const router = express.Router();
const pushNotificationService = require('../services/push/pushNotification_Service');

/**
 * Helper para asegurar que el servicio esté inicializado antes de usarlo
 * @param {Object} res - Objeto response de Express (opcional, para retornar error HTTP)
 * @returns {Promise<boolean>} true si está inicializado, false si falló
 */
async function ensureInitialized(res = null) {
    if (pushNotificationService.initialized) {
        return true;
    }

    console.warn('[PushRoutes] Servicio no inicializado, intentando inicializar...');
    try {
        await pushNotificationService.initialize();
        if (pushNotificationService.initialized) {
            console.log('[PushRoutes] Servicio inicializado exitosamente.');
            return true;
        } else {
            throw new Error('Servicio no se pudo inicializar (initialized flag sigue siendo false)');
        }
    } catch (error) {
        console.error('[PushRoutes] Error al inicializar servicio:', error.message);
        if (res) {
            res.status(503).json({
                success: false,
                message: 'Servicio de push notifications no disponible',
                error: error.message
            });
        }
        return false;
    }
}

/**
 * GET /api/push/vapid-public-key
 * Obtiene la clave pública VAPID necesaria para suscribirse
 */
router.get('/vapid-public-key', async (req, res) => {
    try {
        // Verificar inicialización (aunque getPublicVapidKey puede funcionar sin ella)
        // Si no está inicializado, intentar inicializar
        if (!pushNotificationService.initialized) {
            const isInitialized = await ensureInitialized(res);
            if (!isInitialized) {
                return; // ensureInitialized ya envió la respuesta HTTP 503
            }
        }

        const publicKey = pushNotificationService.getPublicVapidKey();

        if (!publicKey) {
            return res.status(503).json({
                success: false,
                message: 'Push notifications no configuradas o deshabilitadas'
            });
        }

        res.json({
            success: true,
            publicKey: publicKey
        });

    } catch (error) {
        console.error('[PushRoutes] Error obteniendo clave pública VAPID:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo clave pública',
            error: error.message
        });
    }
});

/**
 * POST /api/push/subscribe
 * Registra una nueva suscripción de push notification
 * Body: { subscription: {...}, userId?, userEmail?, userAgent? }
 */
router.post('/subscribe', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { subscription, userId, userEmail, existingSubscriptionId } = req.body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                success: false,
                message: 'Datos de suscripción inválidos'
            });
        }

        // ✅ NUEVO: Verificar si hay subscriptionId existente válido
        if (existingSubscriptionId) {
            try {
                // Usar método del servicio en lugar de acceso directo al pool
                const allSubs = await pushNotificationService.getActiveSubscriptions();
                const existing = allSubs.find(sub => sub.subscription_id === existingSubscriptionId);

                if (existing && existing.endpoint === subscription.endpoint) {
                    // El método saveSubscription() actualiza last_seen_at automáticamente,
                    // pero como solo queremos actualizar last_seen sin cambiar las keys,
                    // podemos simplemente confirmar que la suscripción existe y está activa
                    console.log(`[PushRoutes] Suscripción existente validada: ${existingSubscriptionId}`);

                    return res.json({
                        success: true,
                        message: 'Suscripción ya existe y está activa',
                        subscriptionId: existingSubscriptionId
                    });
                }
            } catch (error) {
                console.error('[PushRoutes] Error verificando suscripción existente:', error);
                // Continuar con lógica normal si falla la verificación
            }
        }

        // Extraer user agent del header
        const userAgent = req.headers['user-agent'] || null;

        // Guardar suscripción (crea nueva o actualiza existente por endpoint)
        const result = await pushNotificationService.saveSubscription(subscription, {
            userId,
            userEmail,
            userAgent
        });

        console.log(`[PushRoutes] Suscripción guardada: ${result.subscriptionId}`);

        res.json({
            success: true,
            message: result.updated ? 'Suscripción actualizada' : 'Suscripción creada',
            subscriptionId: result.subscriptionId
        });

    } catch (error) {
        console.error('[PushRoutes] Error guardando suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error guardando suscripción',
            error: error.message
        });
    }
});

/**
 * POST /api/push/unsubscribe
 * Elimina o desactiva una suscripción
 * Body: { endpoint: string, hardDelete?: boolean }
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { endpoint, hardDelete = false } = req.body;

        if (!endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Endpoint requerido'
            });
        }

        const removed = await pushNotificationService.removeSubscription(endpoint, hardDelete);

        if (removed) {
            console.log(`[PushRoutes] Suscripción eliminada: ${endpoint.substring(0, 50)}...`);
            res.json({
                success: true,
                message: hardDelete ? 'Suscripción eliminada' : 'Suscripción desactivada'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada'
            });
        }

    } catch (error) {
        console.error('[PushRoutes] Error eliminando suscripción:', error);
        res.status(500).json({
            success: false,
            message: 'Error eliminando suscripción',
            error: error.message
        });
    }
});

/**
 * GET /api/push/stats
 * Obtiene estadísticas del servicio de push notifications
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = pushNotificationService.getStats();

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('[PushRoutes] Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas',
            error: error.message
        });
    }
});

/**
 * POST /api/push/test-notification
 * Envía una notificación de prueba (solo para desarrollo/testing)
 * Body: { title, body, userId? }
 */
router.post('/test-notification', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { title = 'Notificación de Prueba', body = 'Esto es una prueba', userId } = req.body;

        const filters = userId ? { userId } : {};

        const payload = {
            title: title,
            body: body,
            icon: '/TNSTrack/icons/icon-192x192.png',
            badge: '/TNSTrack/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            data: {
                type: 'test',
                url: '/TNSTrack/',
                timestamp: Date.now()
            },
            tag: 'test-notification'
        };

        const result = await pushNotificationService.sendNotificationToAll(payload, filters);

        console.log(`[PushRoutes] Notificación de prueba enviada: ${result.sent}/${result.total}`);

        res.json({
            success: true,
            message: 'Notificación de prueba enviada',
            result: result
        });

    } catch (error) {
        console.error('[PushRoutes] Error enviando notificación de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando notificación de prueba',
            error: error.message
        });
    }
});

/**
 * POST /api/push/cleanup
 * Limpia suscripciones inactivas (admin/cron)
 * Body: { daysInactive?: number }
 */
router.post('/cleanup', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { daysInactive = 90 } = req.body;

        const deactivated = await pushNotificationService.cleanupInactiveSubscriptions(daysInactive);

        console.log(`[PushRoutes] Cleanup ejecutado: ${deactivated} suscripciones desactivadas`);

        res.json({
            success: true,
            message: `${deactivated} suscripciones desactivadas`,
            deactivated: deactivated
        });

    } catch (error) {
        console.error('[PushRoutes] Error en cleanup:', error);
        res.status(500).json({
            success: false,
            message: 'Error ejecutando cleanup',
            error: error.message
        });
    }
});

/**
 * GET /api/push/subscriptions
 * Obtiene lista de suscripciones activas (admin)
 * Query params: userId?, deviceType?
 */
router.get('/subscriptions', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { userId, deviceType } = req.query;

        const filters = {};
        if (userId) filters.userId = parseInt(userId);
        if (deviceType) filters.deviceType = deviceType;

        const subscriptions = await pushNotificationService.getActiveSubscriptions(filters);

        // No exponer claves sensibles
        const sanitized = subscriptions.map(sub => ({
            subscriptionId: sub.subscription_id,
            userId: sub.user_id,
            userEmail: sub.user_email,
            deviceType: sub.device_type,
            browserName: sub.browser_name,
            notificationCount: sub.notification_count,
            lastNotificationSent: sub.last_notification_sent,
            createdAt: sub.created_at,
            lastSeenAt: sub.last_seen_at
        }));

        res.json({
            success: true,
            count: sanitized.length,
            subscriptions: sanitized
        });

    } catch (error) {
        console.error('[PushRoutes] Error obteniendo suscripciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo suscripciones',
            error: error.message
        });
    }
});

/**
 * ======================
 * PREFERENCIAS DND (Do Not Disturb)
 * ======================
 */

/**
 * GET /api/push/preferences/:subscriptionId
 * Obtiene las preferencias de DND de una suscripción
 * Params:
 *   - subscriptionId: number
 */
router.get('/preferences/:subscriptionId', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { subscriptionId } = req.params;

        // Validar subscriptionId
        const parsedId = parseInt(subscriptionId);
        if (isNaN(parsedId)) {
            return res.status(400).json({
                success: false,
                message: 'subscriptionId inválido'
            });
        }

        // Obtener preferencias del servicio
        const preferences = await pushNotificationService.getPreferences(parsedId);

        if (!preferences) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron preferencias para esta suscripción'
            });
        }

        console.log(`[PushRoutes] Preferencias obtenidas para suscripción ${subscriptionId}`);

        res.json({
            success: true,
            preferences: preferences
        });

    } catch (error) {
        console.error('[PushRoutes] Error obteniendo preferencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo preferencias',
            error: error.message
        });
    }
});

/**
 * POST /api/push/preferences/:subscriptionId
 * Actualiza las preferencias de DND de una suscripción
 * Params:
 *   - subscriptionId: number
 * Body: {
 *   dndEnabled?: boolean,
 *   dndStartTime?: string (formato HH:mm),
 *   dndEndTime?: string (formato HH:mm),
 *   dndDays?: string[] (días de la semana: ['monday', 'tuesday', ...]),
 *   allowCriticalAlerts?: boolean,
 *   enabledAlertTypes?: string[] (tipos de alerta habilitados)
 * }
 */
router.post('/preferences/:subscriptionId', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { subscriptionId } = req.params;
        const preferences = req.body;

        // Validar subscriptionId
        const parsedId = parseInt(subscriptionId);
        if (isNaN(parsedId)) {
            return res.status(400).json({
                success: false,
                message: 'subscriptionId inválido'
            });
        }

        // ✅ MEJORADO: Validar y normalizar formato de tiempo (HH:mm → HH:mm:ss)
        if (preferences.dndStartTime) {
            if (!/^\d{2}:\d{2}$/.test(preferences.dndStartTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'dndStartTime debe estar en formato HH:mm'
                });
            }
            // Agregar segundos para compatibilidad con BD
            preferences.dndStartTime = `${preferences.dndStartTime}:00`;
        }

        if (preferences.dndEndTime) {
            if (!/^\d{2}:\d{2}$/.test(preferences.dndEndTime)) {
                return res.status(400).json({
                    success: false,
                    message: 'dndEndTime debe estar en formato HH:mm'
                });
            }
            // Agregar segundos para compatibilidad con BD
            preferences.dndEndTime = `${preferences.dndEndTime}:00`;
        }

        if (preferences.dndDays && !Array.isArray(preferences.dndDays)) {
            return res.status(400).json({
                success: false,
                message: 'dndDays debe ser un array de días de la semana'
            });
        }

        if (preferences.enabledAlertTypes && !Array.isArray(preferences.enabledAlertTypes)) {
            return res.status(400).json({
                success: false,
                message: 'enabledAlertTypes debe ser un array de tipos de alerta'
            });
        }

        // Actualizar preferencias
        const result = await pushNotificationService.updatePreferences(parsedId, preferences);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada'
            });
        }

        console.log(`[PushRoutes] Preferencias actualizadas para suscripción ${subscriptionId}`);

        res.json({
            success: true,
            message: 'Preferencias actualizadas exitosamente',
            preferenceId: result.preferenceId
        });

    } catch (error) {
        console.error('[PushRoutes] Error actualizando preferencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando preferencias',
            error: error.message
        });
    }
});

/**
 * DELETE /api/push/preferences/:subscriptionId
 * Elimina las preferencias de DND de una suscripción (restaura defaults)
 * Params:
 *   - subscriptionId: number
 */
router.delete('/preferences/:subscriptionId', async (req, res) => {
    try {
        // Verificar y asegurar que el servicio esté inicializado
        const isInitialized = await ensureInitialized(res);
        if (!isInitialized) {
            return; // ensureInitialized ya envió la respuesta HTTP 503
        }

        const { subscriptionId } = req.params;

        // Validar subscriptionId
        const parsedId = parseInt(subscriptionId);
        if (isNaN(parsedId)) {
            return res.status(400).json({
                success: false,
                message: 'subscriptionId inválido'
            });
        }

        // Resetear preferencias a valores por defecto
        const defaultPreferences = {
            dndEnabled: false,
            dndStartTime: null,
            dndEndTime: null,
            dndDays: null,
            allowCriticalAlerts: true,
            enabledAlertTypes: ['temperature', 'disconnection'] // Todos los tipos habilitados
        };

        const result = await pushNotificationService.updatePreferences(parsedId, defaultPreferences);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Suscripción no encontrada'
            });
        }

        console.log(`[PushRoutes] Preferencias reseteadas para suscripción ${subscriptionId}`);

        res.json({
            success: true,
            message: 'Preferencias reseteadas a valores por defecto'
        });

    } catch (error) {
        console.error('[PushRoutes] Error reseteando preferencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error reseteando preferencias',
            error: error.message
        });
    }
});

module.exports = router;
