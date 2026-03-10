/**
 * alertTrackingController.js
 * Controller para gestionar el sistema de tracking de alertas
 * Integra con alertTrackingService para operaciones CRUD y métricas
 */

const alertTrackingService = require('../services/alertTracking_Service');

class AlertTrackingController {
    /**
     * Constructor del controller
     */
    constructor() {
        console.log('[AlertTrackingController] Instancia creada');
    }

    /**
     * Reconoce/atiende una alerta
     * @route POST /api/alerts/acknowledge
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async acknowledgeAlert(req, res) {
        try {
            // Validar inputs requeridos
            const { alertId, userId, deviceInfo } = req.body;

            if (!alertId) {
                return res.status(400).json({
                    success: false,
                    message: 'alertId es requerido'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId es requerido'
                });
            }

            // Llamar al servicio
            console.log(`[AlertTrackingController] acknowledgeAlert: Procesando alertId=${alertId}, userId=${userId}`);
            const result = await alertTrackingService.acknowledgeAlert(
                parseInt(alertId),
                userId,
                deviceInfo || {}
            );

            console.log(`[AlertTrackingController] acknowledgeAlert: Alerta ${alertId} reconocida exitosamente`);

            res.json({
                success: true,
                responseTimeMinutes: result.responseTimeMinutes,
                message: result.message || 'Alerta reconocida correctamente'
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en acknowledgeAlert:', error);

            // Manejar errores específicos
            if (error.message && error.message.includes('no encontrada')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error reconociendo alerta',
                error: error.message
            });
        }
    }

    /**
     * Agrega una observación a una alerta
     * @route POST /api/alerts/observation
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async addObservation(req, res) {
        try {
            // Validar inputs requeridos
            const { alertId, observation, userId } = req.body;

            if (!alertId) {
                return res.status(400).json({
                    success: false,
                    message: 'alertId es requerido'
                });
            }

            if (!observation || observation.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'observation es requerida y no puede estar vacía'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId es requerido'
                });
            }

            // Llamar al servicio
            console.log(`[AlertTrackingController] addObservation: Agregando observación a alertId=${alertId}`);
            const result = await alertTrackingService.addObservation(
                parseInt(alertId),
                observation.trim(),
                userId
            );

            console.log(`[AlertTrackingController] addObservation: Observación agregada a alerta ${alertId}`);

            res.json({
                success: true,
                message: result.message || 'Observación agregada exitosamente'
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en addObservation:', error);

            // Manejar errores específicos
            if (error.message && error.message.includes('no encontrada')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error agregando observación',
                error: error.message
            });
        }
    }

    /**
     * Resuelve una alerta
     * @route POST /api/alerts/resolve
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async resolveAlert(req, res) {
        try {
            // Validar inputs requeridos
            const { alertId, resolutionNotes, userId } = req.body;

            if (!alertId) {
                return res.status(400).json({
                    success: false,
                    message: 'alertId es requerido'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId es requerido'
                });
            }

            // resolutionNotes es opcional
            const notes = resolutionNotes ? resolutionNotes.trim() : '';

            // Llamar al servicio
            console.log(`[AlertTrackingController] resolveAlert: Resolviendo alertId=${alertId}`);
            const result = await alertTrackingService.resolveAlert(
                parseInt(alertId),
                notes,
                userId
            );

            console.log(`[AlertTrackingController] resolveAlert: Alerta ${alertId} resuelta exitosamente`);

            res.json({
                success: true,
                resolutionTimeMinutes: result.resolutionTimeMinutes,
                message: result.message || 'Alerta resuelta exitosamente'
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en resolveAlert:', error);

            // Manejar errores específicos
            if (error.message && error.message.includes('no encontrada')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error resolviendo alerta',
                error: error.message
            });
        }
    }

    /**
     * Marca una alerta como falsa alarma
     * @route POST /api/alerts/false-alarm
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async markAsFalseAlarm(req, res) {
        try {
            // Validar inputs requeridos
            const { alertId, userId, reason } = req.body;

            if (!alertId) {
                return res.status(400).json({
                    success: false,
                    message: 'alertId es requerido'
                });
            }

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId es requerido'
                });
            }

            // reason es opcional
            const reasonText = reason ? reason.trim() : '';

            // Llamar al servicio
            console.log(`[AlertTrackingController] markAsFalseAlarm: Marcando alertId=${alertId} como falsa alarma`);
            const result = await alertTrackingService.markAsFalseAlarm(
                parseInt(alertId),
                userId,
                reasonText
            );

            console.log(`[AlertTrackingController] markAsFalseAlarm: Alerta ${alertId} marcada como falsa alarma`);

            res.json({
                success: true,
                message: result.message || 'Alerta marcada como falsa alarma exitosamente'
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en markAsFalseAlarm:', error);

            // Manejar errores específicos
            if (error.message && error.message.includes('no encontrada')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error marcando como falsa alarma',
                error: error.message
            });
        }
    }

    /**
     * Obtiene los detalles de una alerta específica
     * @route GET /api/alerts/:alertId
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAlertDetails(req, res) {
        try {
            const { alertId } = req.params;

            if (!alertId || isNaN(alertId)) {
                return res.status(400).json({
                    success: false,
                    message: 'alertId inválido'
                });
            }

            // Llamar al servicio
            console.log(`[AlertTrackingController] getAlertDetails: Obteniendo detalles de alertId=${alertId}`);
            const result = await alertTrackingService.getAlertDetails(parseInt(alertId));

            if (!result.success || !result.alert) {
                return res.status(404).json({
                    success: false,
                    message: result.message || `Alerta con ID ${alertId} no encontrada`
                });
            }

            console.log(`[AlertTrackingController] getAlertDetails: Detalles obtenidos para alerta ${alertId}`);

            res.json({
                success: true,
                data: result.alert
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en getAlertDetails:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo detalles de alerta',
                error: error.message
            });
        }
    }

    /**
     * Obtiene una lista de alertas con filtros opcionales
     * @route GET /api/alerts/list
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getAlertsList(req, res) {
        try {
            // Parsear y validar query params
            const {
                startDate,
                endDate,
                status,
                type,        // Cambiado de 'alertType' a 'type' para coincidir con frontend
                channelId,
                limit,
                offset,
                orderBy,     // Agregado: frontend lo envía
                order        // Agregado: frontend lo envía
            } = req.query;

            // Construir objeto de filtros
            const filters = {};

            // Validar y agregar fechas
            if (startDate) {
                const parsedStart = new Date(startDate);
                if (isNaN(parsedStart.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'startDate inválido'
                    });
                }
                filters.startDate = parsedStart;
            }

            if (endDate) {
                const parsedEnd = new Date(endDate);
                if (isNaN(parsedEnd.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'endDate inválido'
                    });
                }
                filters.endDate = parsedEnd;
            }

            // Procesar status (puede ser string o array separado por comas)
            if (status) {
                const statusArray = status.includes(',') ?
                    status.split(',').map(s => s.trim()) :
                    [status.trim()];

                // Validar valores de status
                const validStatuses = ['pending', 'acknowledged', 'resolved', 'false_alarm'];
                const invalidStatuses = statusArray.filter(s => !validStatuses.includes(s));

                if (invalidStatuses.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Estado(s) inválido(s): ${invalidStatuses.join(', ')}. Estados válidos: ${validStatuses.join(', ')}`
                    });
                }

                filters.status = statusArray;
            }

            // Validar tipo de alerta
            if (type) {
                const validTypes = ['temperature', 'disconnection'];
                if (!validTypes.includes(type)) {
                    return res.status(400).json({
                        success: false,
                        message: `Tipo de alerta inválido: ${type}. Tipos válidos: ${validTypes.join(', ')}`
                    });
                }
                filters.alertType = type;  // Mapear 'type' a 'alertType' para el servicio
            }

            // Agregar channelId si existe
            if (channelId) {
                filters.channelId = channelId;
            }

            // Validar y agregar paginación
            if (limit) {
                const parsedLimit = parseInt(limit);
                if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
                    return res.status(400).json({
                        success: false,
                        message: 'limit debe ser un número entre 1 y 1000'
                    });
                }
                filters.limit = parsedLimit;
            }

            if (offset) {
                const parsedOffset = parseInt(offset);
                if (isNaN(parsedOffset) || parsedOffset < 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'offset debe ser un número mayor o igual a 0'
                    });
                }
                filters.offset = parsedOffset;
            }

            // Procesar orderBy y order (agregado para soporte de frontend)
            if (orderBy) {
                filters.orderBy = orderBy;
            }

            if (order) {
                filters.order = order;
            }

            // Llamar al servicio
            console.log(`[AlertTrackingController] getAlertsList: Obteniendo lista con filtros:`, filters);
            const result = await alertTrackingService.getAlertsList(filters);

            console.log(`[AlertTrackingController] getAlertsList: ${result.alerts.length} alertas obtenidas de ${result.total} totales`);

            res.json({
                success: true,
                data: result.alerts,  // Cambiado de 'alerts' a 'data' para consistencia con frontend
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: result.totalPages
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en getAlertsList:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo lista de alertas',
                error: error.message
            });
        }
    }

    /**
     * Obtiene métricas resumidas de alertas
     * @route GET /api/alerts/metrics/summary
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getMetricsSummary(req, res) {
        try {
            const { startDate, endDate, type } = req.query;

            // Validar fechas si se proporcionan
            let parsedStart, parsedEnd;

            if (startDate) {
                parsedStart = new Date(startDate);
                if (isNaN(parsedStart.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'startDate inválido'
                    });
                }
            }

            if (endDate) {
                parsedEnd = new Date(endDate);
                if (isNaN(parsedEnd.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'endDate inválido'
                    });
                }
            }

            // Validar tipo de alerta si se proporciona
            let alertType = null;
            if (type && type !== 'all') {
                const validTypes = ['temperature', 'disconnection'];
                if (!validTypes.includes(type)) {
                    return res.status(400).json({
                        success: false,
                        message: `Tipo de alerta inválido: ${type}. Tipos válidos: ${validTypes.join(', ')}, 'all'`
                    });
                }
                alertType = type;
            }

            // Llamar al servicio
            console.log(`[AlertTrackingController] getMetricsSummary: Obteniendo métricas para período ${startDate || 'default'} a ${endDate || 'default'}, tipo=${alertType || 'all'}`);
            const result = await alertTrackingService.getMetricsSummary(parsedStart, parsedEnd, alertType);

            console.log(`[AlertTrackingController] getMetricsSummary: Métricas obtenidas exitosamente`);

            res.json({
                success: true,
                data: result.metrics,  // Cambiado de 'metrics' a 'data' para consistencia con frontend
                period: result.period
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en getMetricsSummary:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo métricas',
                error: error.message
            });
        }
    }

    /**
     * Obtiene datos para gráficos
     * @route GET /api/alerts/metrics/chart-data
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getChartData(req, res) {
        try {
            const { type, startDate, endDate, alertType } = req.query;

            // Validar tipo de gráfico
            if (!type) {
                return res.status(400).json({
                    success: false,
                    message: 'type es requerido'
                });
            }

            const validTypes = ['hourly', 'daily', 'by_channel', 'by_type'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo de gráfico inválido: ${type}. Tipos válidos: ${validTypes.join(', ')}`
                });
            }

            // Validar fechas si se proporcionan
            let parsedStart, parsedEnd;

            if (startDate) {
                parsedStart = new Date(startDate);
                if (isNaN(parsedStart.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'startDate inválido'
                    });
                }
            }

            if (endDate) {
                parsedEnd = new Date(endDate);
                if (isNaN(parsedEnd.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'endDate inválido'
                    });
                }
            }

            // Validar tipo de alerta si se proporciona
            let alertTypeFilter = null;
            if (alertType && alertType !== 'all') {
                const validAlertTypes = ['temperature', 'disconnection'];
                if (!validAlertTypes.includes(alertType)) {
                    return res.status(400).json({
                        success: false,
                        message: `Tipo de alerta inválido: ${alertType}. Tipos válidos: ${validAlertTypes.join(', ')}, 'all'`
                    });
                }
                alertTypeFilter = alertType;
            }

            // Llamar al servicio
            console.log(`[AlertTrackingController] getChartData: Obteniendo datos tipo=${type} para período ${startDate || 'default'} a ${endDate || 'default'}, alertType=${alertTypeFilter || 'all'}`);
            const result = await alertTrackingService.getChartData(type, parsedStart, parsedEnd, alertTypeFilter);

            console.log(`[AlertTrackingController] getChartData: ${result.data.length} puntos de datos obtenidos`);

            res.json({
                success: true,
                type: result.type,
                data: result.data,
                period: result.period
            });

        } catch (error) {
            console.error('[AlertTrackingController] Error en getChartData:', error);
            res.status(500).json({
                success: false,
                message: 'Error obteniendo datos de gráfico',
                error: error.message
            });
        }
    }
}

// Crear y exportar instancia singleton del controller
module.exports = new AlertTrackingController();