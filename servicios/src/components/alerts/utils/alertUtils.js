/**
 * @fileoverview Alert Utility Functions
 * @description Reusable utility functions for date formatting, observation parsing, and calculations (Luxon per Decisiones_Tecnicas §10)
 * @version 1.0.0
 * @module alerts/utils
 */

import { DateTime } from "luxon";

const TZ = "America/Santiago";

/**
 * Formats a date-time string to a short format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string (DD/MM/YY HH:mm) or 'N/A'
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return DateTime.fromISO(dateString).setZone(TZ).toFormat('dd/MM/yy HH:mm');
};

/**
 * Formats a date-time string to a detailed format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string (DD/MM/YYYY HH:mm:ss) or 'N/A'
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  return DateTime.fromISO(dateString).setZone(TZ).toFormat("dd/MM/yyyy HH:mm:ss");
};

/**
 * Formats a date-time string to relative time (e.g., "2 hours ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string or empty string
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return "";
  return DateTime.fromISO(dateString).toRelative() || "";
};

/**
 * Formats response time in minutes to human-readable format
 * @param {number} minutes - Response time in minutes
 * @returns {string} Formatted response time (e.g., "2h 30min") or '-'
 * @example
 * formatResponseTime(150) // "2h 30min"
 * formatResponseTime(45) // "45min"
 */
export const formatResponseTime = (minutes) => {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}min`;
};

/**
 * Calculates elapsed time from a given date to now
 * @param {string} createdAt - ISO date string
 * @returns {string} Elapsed time string (e.g., "2d 3h 15min") or "N/A"
 * @example
 * getElapsedTime("2025-10-15T10:30:00Z") // "2d 3h 15min"
 */
export const getElapsedTime = (createdAt) => {
  if (!createdAt) return "N/A";

  const now = DateTime.now();
  const created = DateTime.fromISO(createdAt);
  const diff = now.diff(created, ["days", "hours", "minutes"]);
  const days = Math.floor(diff.days);
  const hours = diff.hours;
  const minutes = Math.floor(diff.minutes);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}min`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} minutos`;
};

/**
 * Parses observations from various formats (JSON array, string, text) to array
 * @param {string|Array|null} observations - Observations in various formats
 * @returns {Array} Parsed observations array with {id, createdAt, userId, text}
 * @example
 * parseObservations('[{"text":"Test","userId":"user@example.com"}]')
 * // [{id: 0, text: "Test", userId: "user@example.com", createdAt: "..."}]
 */
export const parseObservations = (observations) => {
  if (!observations) return [];
  if (Array.isArray(observations)) return observations;

  // Intentar parsear como JSON primero
  try {
    const parsed = JSON.parse(observations);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // Si falla JSON, intentar parsear como texto plano con formato [fecha] email: texto
    if (typeof observations === 'string') {
      // Dividir por líneas si hay múltiples observaciones
      const lines = observations.split('\n').filter(line => line.trim());

      return lines.map((line, index) => {
        // Formato: [2025-10-17 11:31:32] usuario@example.com: texto
        const match = line.match(/\[([^\]]+)\]\s*([^:]+):\s*(.+)/);

        if (match) {
          const [, timestamp, email, text] = match;
          return {
            id: index,
            createdAt: timestamp.trim(),
            userId: email.trim(),
            text: text.trim()
          };
        }

        // Si no coincide el formato, retornar observación simple
        return {
          id: index,
          createdAt: new Date().toISOString(),
          userId: '',
          text: line.trim()
        };
      });
    }

    console.error("[alertUtils] Error parsing observations:", error);
    return [];
  }
};

/**
 * Counts the number of observations from various formats
 * @param {string|Array|null} observations - Observations in various formats
 * @returns {number} Count of observations
 * @example
 * parseObservationCount('[{"text":"Test"}]') // 1
 */
export const parseObservationCount = (observations) => {
  if (!observations) return 0;

  if (Array.isArray(observations)) {
    return observations.length;
  }

  if (typeof observations === 'string') {
    const matches = observations.match(/\[\d{4}-\d{2}-\d{2}/g);
    return matches ? matches.length : 0;
  }

  return 0;
};

/**
 * Extracts a preview (first 15 characters) of the latest observation
 * @param {string|Array|null} observations - Observations in various formats
 * @returns {string|null} Preview string or null
 * @example
 * getLatestObservationPreview('...') // "Latest observa..."
 */
export const getLatestObservationPreview = (observations) => {
  if (!observations || observations === '' || observations === null || observations === undefined) {
    return null;
  }

  // Si es un array, tomar el último elemento
  if (Array.isArray(observations)) {
    if (observations.length === 0) return null;
    const latest = observations[observations.length - 1];
    const text = latest.text || latest.observation || '';
    return text.substring(0, 15) + (text.length > 15 ? '...' : '');
  }

  // Si es string en formato "[fecha] email: texto"
  if (typeof observations === 'string') {
    // Dividir por líneas y tomar la última
    const lines = observations.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    const lastLine = lines[lines.length - 1];

    // Extraer el texto después de "email: " (formato completo: [YYYY-MM-DD HH:mm:ss] email@domain.com: texto)
    // Buscar el patrón: "] email@algo: texto"
    const match = lastLine.match(/\]\s+[^\s]+:\s+(.+)$/);
    if (match && match[1]) {
      const text = match[1].trim();
      return text.substring(0, 15) + (text.length > 15 ? '...' : '');
    }
  }

  return null;
};

/**
 * Calculates statistics from an array of alerts
 * @param {Array} alerts - Array of alert objects
 * @returns {Object} Statistics object with total, pending, resolved, avgResponseTime
 * @example
 * calculateAlertStats(alerts)
 * // { total: 100, pending: 20, resolved: 70, avgResponseTime: 45 }
 */
export const calculateAlertStats = (alerts) => {
  const total = alerts.length;
  const pending = alerts.filter(a => a.status === 'pending').length;
  const resolved = alerts.filter(a => a.status === 'resolved').length;
  const responseTimes = alerts
    .filter(a => a.responseTimeMinutes)
    .map(a => a.responseTimeMinutes);
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  return { total, pending, resolved, avgResponseTime };
};

/**
 * Generates date range parameters for API calls
 * @param {string} rangeType - Type of range ('today', 'week', 'month', 'quarter')
 * @returns {Object} Object with startDate and endDate
 * @example
 * getDateRangeParams('week')
 * // { startDate: "2025-10-10 00:00:00", endDate: "2025-10-17 23:59:59" }
 */
export const getDateRangeParams = (rangeType) => {
  const now = DateTime.now().setZone(TZ);
  let startDate, endDate;

  switch (rangeType) {
    case 'today':
      startDate = now.startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      endDate = now.endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      break;
    case 'week':
      startDate = now.minus({ days: 7 }).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      endDate = now.endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      break;
    case 'month':
      startDate = now.minus({ days: 30 }).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      endDate = now.endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      break;
    case 'quarter':
      startDate = now.minus({ days: 90 }).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      endDate = now.endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      break;
    default:
      startDate = now.minus({ days: 7 }).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
      endDate = now.endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
  }

  return { startDate, endDate };
};

/**
 * Extracts unique sensor names from alerts array
 * @param {Array} alerts - Array of alert objects
 * @returns {Array<string>} Sorted array of unique sensor names
 * @example
 * getUniqueSensors(alerts) // ["Sensor A", "Sensor B", "Sensor C"]
 */
export const getUniqueSensors = (alerts) => {
  return [...new Set(alerts.map(alert => alert.channelName))]
    .filter(Boolean)
    .sort();
};
