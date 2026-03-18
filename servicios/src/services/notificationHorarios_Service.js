/**
 * Cliente API para horarios base (admin) y mis horarios (usuario).
 * Endpoints: /api/config/notification-schedule-base, /api/config/my-notification-schedules
 */

import axios from 'axios';

const API_BASE = '/api/config';

/**
 * Horarios base (ale_horarios_alerta_canal) - solo admin
 */
export const notificationHorariosBase = {
  list: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const url = q ? `${API_BASE}/notification-schedule-base?${q}` : `${API_BASE}/notification-schedule-base`;
    const res = await axios.get(url);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al listar');
    return res.data.data;
  },
  create: async (body) => {
    const res = await axios.post(`${API_BASE}/notification-schedule-base`, body);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al crear');
    return res.data.data;
  },
  update: async (id, body) => {
    const res = await axios.put(`${API_BASE}/notification-schedule-base/${id}`, body);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al actualizar');
    return res.data.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_BASE}/notification-schedule-base/${id}`);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al eliminar');
    return res.data.deleted;
  }
};

/**
 * Mis horarios (ale_horarios_usuario) - usuario autenticado
 */
export const myNotificationHorarios = {
  list: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const url = q ? `${API_BASE}/my-notification-schedules?${q}` : `${API_BASE}/my-notification-schedules`;
    const res = await axios.get(url);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al listar');
    return res.data.data;
  },
  create: async (body) => {
    const res = await axios.post(`${API_BASE}/my-notification-schedules`, body);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al crear');
    return res.data.data;
  },
  delete: async (id) => {
    const res = await axios.delete(`${API_BASE}/my-notification-schedules/${id}`);
    if (!res.data.success) throw new Error(res.data.error?.message || 'Error al eliminar');
    return res.data.deleted;
  }
};

export default { notificationHorariosBase, myNotificationHorarios };
