/**
 * @fileoverview Reports API Service - Cliente para endpoints de reportes
 * @description Servicio que encapsula todas las llamadas HTTP a la API de reportes.
 * Maneja autenticación automática y errores de manera centralizada.
 * @feature 004-reportes-base-core (T022)
 * @version 1.0.0
 */

const API_BASE = '/api/reports';

// Helper para incluir Authorization header en cada request
const _authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Manejo centralizado de errores HTTP
 * @param {Response} response - Response object de fetch
 * @returns {Promise<Object>} - Response JSON parseado
 * @throws {Error} - Error con mensaje user-friendly
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = 'Error en la operación';

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Si no puede parsear JSON, usar mensaje genérico
      if (response.status === 401) {
        errorMessage = 'Sesión expirada. Por favor inicia sesión nuevamente.';
      } else if (response.status === 403) {
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (response.status === 404) {
        errorMessage = 'Recurso no encontrado.';
      } else if (response.status >= 500) {
        errorMessage = 'Error en el servidor. Intenta nuevamente más tarde.';
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

/**
 * Servicio de API de Reportes
 */
const reportsApiService = {
  /**
   * Obtener templates de reportes disponibles
   * @returns {Promise<Object>} - { templates: [...] }
   */
  async getTemplates() {
    const response = await fetch(`${API_BASE}/templates`, {
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      }
    });

    return handleResponse(response);
  },

  /**
   * Generar un nuevo reporte
   * @param {Object} config - Configuración del reporte
   * @param {string} config.reportType - Tipo de reporte (ej: 'executive_temperature')
   * @param {string} config.startDate - Fecha inicio (YYYY-MM-DD)
   * @param {string} config.endDate - Fecha fin (YYYY-MM-DD)
   * @param {Array<number>} config.deviceIds - IDs de dispositivos/channels
   * @param {boolean} config.includeComparative - Incluir análisis comparativo
   * @returns {Promise<Object>} - { reportId, fileUrl, generatedAt, ... }
   */
  async generateReport(config) {
    // Asegurar que reportType se envíe (backend lo espera) y limpiar valores inválidos
    const candidate = config.reportType || config.templateKey;
    const safeReportType = (!candidate || candidate === 'undefined' || candidate === 'null')
      ? 'executive_temperature'
      : candidate;

    const payload = {
      ...config,
      reportType: safeReportType
    };

    console.log('[ReportsAPI] Sending payload:', payload);

    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      },
      body: JSON.stringify(payload)
    });

    return handleResponse(response);
  },

  /**
   * Obtener historial de reportes con filtros y paginación
   * @param {Object} filters - Filtros de búsqueda
   * @param {string} filters.type - Tipo de reporte
   * @param {string} filters.startDate - Fecha inicio del filtro
   * @param {string} filters.endDate - Fecha fin del filtro
   * @param {number} filters.page - Página actual (default: 1)
   * @param {number} filters.limit - Reportes por página (default: 20)
   * @returns {Promise<Object>} - { reports: [...], totalCount, totalPages }
   */
  async getHistory(filters = {}) {
    const queryParams = new URLSearchParams();

    if (filters.type) queryParams.append('type', filters.type);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

    const response = await fetch(`${API_BASE}/history?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      }
    });

    return handleResponse(response);
  },

  /**
   * Descargar un reporte por ID
   * @param {number|string} reportId - ID del reporte
   * @returns {Promise<Blob>} - Archivo PDF como Blob
   */
  async downloadReport(reportId) {
    const response = await fetch(`${API_BASE}/download/${reportId}`, {
      headers: { ..._authHeaders() }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Reporte no encontrado o ha expirado.');
      }
      throw new Error('Error al descargar el reporte.');
    }

    return response.blob();
  },

  /**
   * Descargar reporte y activar descarga en navegador
   * @param {number|string} reportId - ID del reporte
   * @param {string} fileName - Nombre del archivo (opcional)
   */
  async downloadReportFile(reportId, fileName = null) {
    try {
      const blob = await this.downloadReport(reportId);

      // Crear URL temporal para el blob
      const url = window.URL.createObjectURL(blob);

      // Crear elemento <a> temporal para forzar descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `reporte_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('[ReportsAPI] Error downloading report:', error);
      throw error;
    }
  },

  /**
   * Enviar reporte por email
   * @param {Object} data - Datos del email
   * @param {number|string} data.reportId - ID del reporte
   * @param {Array<string>} data.recipients - Array de emails destinatarios
   * @param {string} data.subject - Asunto del email
   * @param {string} data.message - Mensaje opcional
   * @returns {Promise<Object>} - { success, sentCount }
   */
  async sendEmail(data) {
    const response = await fetch(`${API_BASE}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      },
      body: JSON.stringify(data)
    });

    return handleResponse(response);
  },

  /**
   * Obtener reportes programados (Phase 4)
   * @returns {Promise<Object>} - { schedules: [...] }
   */
  async getSchedules() {
    const response = await fetch(`${API_BASE}/scheduled`, {
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      }
    });

    return handleResponse(response);
  },

  /**
   * Crear un reporte programado (Phase 4)
   * @param {Object} schedule - Configuración del schedule
   * @returns {Promise<Object>} - { scheduleId, nextExecution }
   */
  async createSchedule(schedule) {
    const response = await fetch(`${API_BASE}/scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      },
      body: JSON.stringify(schedule)
    });

    return handleResponse(response);
  },

  /**
   * Actualizar un reporte programado (Phase 4)
   * @param {number|string} scheduleId - ID del schedule
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<Object>} - Schedule actualizado
   */
  async updateSchedule(scheduleId, updates) {
    const response = await fetch(`${API_BASE}/scheduled/${scheduleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      },
      body: JSON.stringify(updates)
    });

    return handleResponse(response);
  },

  /**
   * Eliminar un reporte programado (Phase 4)
   * @param {number|string} scheduleId - ID del schedule
   * @returns {Promise<Object>} - Confirmación de eliminación
   */
  async deleteSchedule(scheduleId) {
    const response = await fetch(`${API_BASE}/scheduled/${scheduleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      }
    });

    return handleResponse(response);
  },

  /**
   * Obtener dispositivos eléctricos (Shelly) para reportes de consumo (Phase 9 - T102)
   * @returns {Promise<Object>} - { success: true, data: [{ shelly_id, dispositivo_nombre, nombre, ... }] }
   */
  async getElectricDevices() {
    const response = await fetch('/api/energia/dispositivos/activos', {
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      }
    });

    return handleResponse(response);
  },

  /**
   * Obtener configuración de tarifas eléctricas (Phase 9 - T102)
   * @returns {Promise<Object>} - { punta, valle, fuera_punta }
   */
  async getTariffConfig() {
    const response = await fetch('/api/config/tariffs', {
      headers: {
        'Content-Type': 'application/json',
        ..._authHeaders()
      }
    });

    return handleResponse(response);
  }
};

export default reportsApiService;
