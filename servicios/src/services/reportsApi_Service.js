/**
 * @fileoverview Reports API Service - Cliente para endpoints de reportes
 * @description Servicio que encapsula todas las llamadas HTTP a la API de reportes.
 * Usa axios global con interceptores (prefijo /TNSTrack, JWT, refresh en 401).
 * @feature 004-reportes-base-core (T022)
 * @version 1.0.0
 */

import axios from 'axios';

const API_BASE = '/api/reportes';

function mapAxiosError(err) {
  if (err.response) {
    const status = err.response.status;
    const d = err.response.data;

    if (status === 409 && d && typeof d === 'object' && (d.message || d.error)) {
      const e = new Error(d.message || d.error);
      if (d.code) e.apiCode = d.code;
      return e;
    }
    if (status === 422 && d && typeof d === 'object' && (d.message || d.error)) {
      const e = new Error(d.message || d.error);
      if (d.code) e.apiCode = d.code;
      return e;
    }

    const msg =
      d && typeof d === 'object' && (d.message || d.error)
        ? d.message || d.error
        : null;
    if (msg) return new Error(msg);
    if (status === 401) {
      return new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
    }
    if (status === 403) {
      return new Error('No tienes permisos para realizar esta acción.');
    }
    if (status === 404) {
      return new Error('Recurso no encontrado.');
    }
    if (status >= 500) {
      return new Error('Error en el servidor. Intenta nuevamente más tarde.');
    }
  }
  return new Error(err.message || 'Error en la operación');
}

/**
 * Servicio de API de Reportes
 */
const reportsApiService = {
  /**
   * Obtener templates de reportes disponibles
   * @returns {Promise<Object>} - { templates: [...] }
   */
  async getTemplates() {
    try {
      const { data } = await axios.get(`${API_BASE}/plantillas`);
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Generar un nuevo reporte
   * @param {Object} config - Configuración del reporte
   * @returns {Promise<Object>}
   */
  async generateReport(config) {
    const candidate = config.reportType || config.templateKey;
    const safeReportType =
      !candidate || candidate === 'undefined' || candidate === 'null'
        ? 'executive_temperature'
        : candidate;

    const payload = {
      ...config,
      reportType: safeReportType
    };

    console.log('[ReportsAPI] Sending payload:', payload);

    try {
      const { data } = await axios.post(`${API_BASE}/generar`, payload);
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Obtener historial de reportes con filtros y paginación
   * @param {Object} filters
   * @returns {Promise<Object>}
   */
  async getHistory(filters = {}) {
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    try {
      const { data } = await axios.get(`${API_BASE}/historial`, { params });
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Descargar un reporte por ID
   * @param {number|string} reportId
   * @returns {Promise<Blob>}
   */
  async downloadReport(reportId) {
    try {
      const response = await axios.get(`${API_BASE}/descargar/${reportId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (err) {
      if (err.response?.status === 404) {
        throw new Error('Reporte no encontrado o ha expirado.');
      }
      throw mapAxiosError(err);
    }
  },

  /**
   * Descargar reporte y activar descarga en navegador
   */
  async downloadReportFile(reportId, fileName = null) {
    try {
      const blob = await this.downloadReport(reportId);

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `reporte_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('[ReportsAPI] Error downloading report:', error);
      throw error;
    }
  },

  /**
   * Enviar reporte por email
   */
  async sendEmail(data) {
    try {
      const { data: res } = await axios.post(`${API_BASE}/enviar-email`, data);
      return res;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Obtener reportes programados
   */
  async getSchedules() {
    try {
      const { data } = await axios.get(`${API_BASE}/programados`);
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Crear un reporte programado
   */
  async createSchedule(schedule) {
    try {
      const { data } = await axios.post(`${API_BASE}/programados`, schedule);
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Actualizar un reporte programado
   */
  async updateSchedule(scheduleId, updates) {
    try {
      const { data } = await axios.put(
        `${API_BASE}/programados/${scheduleId}`,
        updates
      );
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Eliminar un reporte programado
   */
  async deleteSchedule(scheduleId) {
    try {
      const { data } = await axios.delete(
        `${API_BASE}/programados/${scheduleId}`
      );
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Obtener dispositivos eléctricos (Shelly) para reportes de consumo
   */
  async getElectricDevices() {
    try {
      const { data } = await axios.get('/api/energia/dispositivos/activos');
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  },

  /**
   * Obtener configuración de tarifas eléctricas
   */
  async getTariffConfig() {
    try {
      const { data } = await axios.get('/api/config/tariffs');
      return data;
    } catch (err) {
      throw mapAxiosError(err);
    }
  }
};

export default reportsApiService;
