const databaseService = require('./database_Service');
const aiDataService = require('./aiData_Service');
const { DateTime } = require('../utils/date_Utils');

// Tool definitions en formato OpenAI function calling (compatible con Gemini)
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_energy_history',
      description: 'Obtiene el historial de consumo eléctrico diario de dispositivos Shelly. Usa esta herramienta cuando necesites datos de consumo eléctrico (kWh), costos de energía, o patrones de consumo históricos para análisis o proyecciones.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'integer',
            description: 'Cantidad de días hacia atrás desde hoy (1-180)',
            minimum: 1,
            maximum: 180
          },
          shelly_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs de dispositivos Shelly específicos. Si no se proporciona, retorna todos los dispositivos activos.'
          }
        },
        required: ['days']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_active_devices',
      description: 'Lista todos los dispositivos Shelly de medición eléctrica activos, con su nombre y ubicación. Usa esta herramienta cuando necesites saber qué dispositivos existen antes de filtrar por uno específico.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_weather_forecast',
      description: 'Obtiene el pronóstico meteorológico futuro (temperatura, precipitación). Usa esta herramienta para preguntas sobre consumo futuro o proyecciones que dependan del clima.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'integer',
            description: 'Días de pronóstico hacia adelante (1-14)',
            minimum: 1,
            maximum: 14
          },
          location: {
            type: 'string',
            description: 'Nombre de la ciudad. Default: Santiago'
          }
        },
        required: ['days']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_historical_weather',
      description: 'Obtiene datos meteorológicos históricos (temperatura exterior pasada). Usa esta herramienta para correlacionar temperatura exterior histórica con consumo eléctrico pasado.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'integer',
            description: 'Días hacia atrás desde hoy (1-60)',
            minimum: 1,
            maximum: 60
          },
          location: {
            type: 'string',
            description: 'Nombre de la ciudad. Default: Santiago'
          }
        },
        required: ['days']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_energy_stats_summary',
      description: 'Obtiene un resumen estadístico semanal de consumo eléctrico: total semanal, promedio diario y tendencia (% variación). Usa esta herramienta para tener contexto estadístico general antes de hacer proyecciones o comparaciones.',
      parameters: {
        type: 'object',
        properties: {
          weeks: {
            type: 'integer',
            description: 'Cantidad de semanas hacia atrás (1-12, default 4)',
            minimum: 1,
            maximum: 12
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_temperature_chamber_data',
      description: 'Obtiene datos de temperatura de cámaras frigoríficas (promedio, mínimo, máximo, brechas de umbral por día). Usa esta herramienta cuando la pregunta involucra temperatura de cámaras o brechas de umbral.',
      parameters: {
        type: 'object',
        properties: {
          chamber_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs de canales de cámara (canal_id de Ubibot)'
          },
          days: {
            type: 'integer',
            description: 'Días hacia atrás desde hoy (1-90)',
            minimum: 1,
            maximum: 90
          }
        },
        required: ['chamber_ids', 'days']
      }
    }
  }
];

// Coordenadas por defecto: Santiago de Chile
const DEFAULT_COORDS = { lat: -33.4489, lon: -70.6693 };
const OPEN_METEO_TIMEOUT = 10000;

class AIToolsService {

  async execute(toolName, args) {
    try {
      switch (toolName) {
        case 'get_energy_history':
          return await this.getEnergyHistory(args);
        case 'get_active_devices':
          return await this.getActiveDevices();
        case 'get_weather_forecast':
          return await this.getWeatherForecast(args);
        case 'get_historical_weather':
          return await this.getHistoricalWeather(args);
        case 'get_energy_stats_summary':
          return await this.getEnergyStatsSummary(args);
        case 'get_temperature_chamber_data':
          return await this.getTemperatureChamberData(args);
        default:
          return { error: true, message: `Tool no disponible: ${toolName}` };
      }
    } catch (err) {
      console.error(`[AIToolsService] Error executing tool ${toolName}:`, err.message);
      return { error: true, message: err.message, tool: toolName };
    }
  }

  // ─── Tool 1: get_energy_history ───
  async getEnergyHistory({ days, shelly_ids }) {
    const startDate = DateTime.now().setZone('America/Santiago').minus({ days }).toFormat('yyyy-MM-dd');
    const endDate = DateTime.now().setZone('America/Santiago').toFormat('yyyy-MM-dd');

    let deviceFilter = '';
    const params = [startDate, endDate];

    if (shelly_ids && shelly_ids.length > 0) {
      const placeholders = shelly_ids.map(() => '?').join(',');
      deviceFilter = `AND td.shelly_id IN (${placeholders})`;
      params.push(...shelly_ids);
    }

    // Resumen global diario
    const globalQuery = `
      SELECT
        td.fecha_local AS fecha,
        SUM(td.energia_activa_total) AS kwh_total,
        SUM(td.costo_total) AS costo_total
      FROM sem_totales_dia td
      WHERE td.fecha_local BETWEEN ? AND ?
        ${deviceFilter}
      GROUP BY td.fecha_local
      ORDER BY td.fecha_local ASC
    `;
    const globalRows = await databaseService.query(globalQuery, params);

    // Detalle por dispositivo
    const detailQuery = `
      SELECT
        td.fecha_local AS fecha,
        td.shelly_id,
        d.nombre AS dispositivo,
        u.nombre_ubicacion AS ubicacion,
        td.energia_activa_total AS kwh,
        td.costo_total AS costo
      FROM sem_totales_dia td
      JOIN sem_dispositivos d ON td.shelly_id = d.shelly_id
      LEFT JOIN gen_ubicaciones_reales u ON d.id_ubicacion_real = u.id_ubicacion_real
      WHERE td.fecha_local BETWEEN ? AND ?
        ${deviceFilter}
      ORDER BY td.fecha_local ASC, d.nombre
    `;
    const detailRows = await databaseService.query(detailQuery, params);

    return {
      periodo: { inicio: startDate, fin: endDate, dias: days },
      resumen_diario: globalRows,
      detalle_dispositivo: detailRows
    };
  }

  // ─── Tool 2: get_active_devices ───
  async getActiveDevices() {
    const query = `
      SELECT
        d.shelly_id,
        d.nombre,
        u.nombre_ubicacion AS ubicacion
      FROM sem_dispositivos d
      LEFT JOIN gen_ubicaciones_reales u ON d.id_ubicacion_real = u.id_ubicacion_real
      WHERE d.activo = 1
      ORDER BY d.nombre
    `;
    const rows = await databaseService.query(query);
    return { dispositivos: rows };
  }

  // ─── Tool 3: get_weather_forecast ───
  async getWeatherForecast({ days, location }) {
    const coords = await this._resolveCoords(location || 'Santiago');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum&timezone=America/Santiago&forecast_days=${days}`;

    const data = await this._fetchJson(url, OPEN_METEO_TIMEOUT);

    if (!data.daily) {
      return { error: true, message: 'Respuesta de Open-Meteo sin datos diarios' };
    }

    const forecast = data.daily.time.map((date, i) => ({
      fecha: date,
      temp_max_c: data.daily.temperature_2m_max[i],
      temp_min_c: data.daily.temperature_2m_min[i],
      temp_media_c: data.daily.temperature_2m_mean[i],
      precipitacion_mm: data.daily.precipitation_sum[i]
    }));

    return { ubicacion: location || 'Santiago', dias: days, pronostico: forecast };
  }

  // ─── Tool 4: get_historical_weather ───
  async getHistoricalWeather({ days, location }) {
    const coords = await this._resolveCoords(location || 'Santiago');
    const endDate = DateTime.now().setZone('America/Santiago').minus({ days: 1 }).toFormat('yyyy-MM-dd');
    const startDate = DateTime.now().setZone('America/Santiago').minus({ days }).toFormat('yyyy-MM-dd');

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean&timezone=America/Santiago`;

    const data = await this._fetchJson(url, OPEN_METEO_TIMEOUT);

    if (!data.daily) {
      return { error: true, message: 'Respuesta de Open-Meteo Archive sin datos diarios' };
    }

    const history = data.daily.time.map((date, i) => ({
      fecha: date,
      temp_max_c: data.daily.temperature_2m_max[i],
      temp_min_c: data.daily.temperature_2m_min[i],
      temp_media_c: data.daily.temperature_2m_mean[i]
    }));

    return { ubicacion: location || 'Santiago', periodo: { inicio: startDate, fin: endDate }, historico: history };
  }

  // ─── Tool 5: get_energy_stats_summary ───
  async getEnergyStatsSummary({ weeks } = {}) {
    const numWeeks = weeks || 4;
    const startDate = DateTime.now().setZone('America/Santiago').minus({ weeks: numWeeks }).toFormat('yyyy-MM-dd');

    const query = `
      SELECT
        YEARWEEK(td.fecha_local, 1) AS semana,
        MIN(td.fecha_local) AS inicio_semana,
        MAX(td.fecha_local) AS fin_semana,
        SUM(td.energia_activa_total) AS energia_semana_kwh,
        AVG(td.energia_activa_total) AS promedio_dia_kwh,
        SUM(td.costo_total) AS costo_semana,
        COUNT(DISTINCT td.fecha_local) AS dias_con_datos
      FROM sem_totales_dia td
      WHERE td.fecha_local >= ?
      GROUP BY YEARWEEK(td.fecha_local, 1)
      ORDER BY semana ASC
    `;
    const rows = await databaseService.query(query, [startDate]);

    // Calcular tendencia (% variación entre última y penúltima semana)
    let tendencia = null;
    if (rows.length >= 2) {
      const prev = parseFloat(rows[rows.length - 2].energia_semana_kwh) || 0;
      const last = parseFloat(rows[rows.length - 1].energia_semana_kwh) || 0;
      if (prev > 0) {
        tendencia = ((last - prev) / prev * 100).toFixed(1) + '%';
      }
    }

    return { semanas: numWeeks, resumen_semanal: rows, tendencia_reciente: tendencia };
  }

  // ─── Tool 6: get_temperature_chamber_data ───
  async getTemperatureChamberData({ chamber_ids, days }) {
    const endDate = DateTime.now().setZone('America/Santiago').toFormat('yyyy-MM-dd');
    const startDate = DateTime.now().setZone('America/Santiago').minus({ days }).toFormat('yyyy-MM-dd');

    // Reutilizar lógica existente de aiData_Service
    const data = await aiDataService.fetchChamberData(chamber_ids, startDate, endDate, true);

    return {
      periodo: { inicio: startDate, fin: endDate, dias: days },
      camaras: chamber_ids,
      datos: data
    };
  }

  // ─── Helpers privados ───

  async _resolveCoords(location) {
    if (!location || location.toLowerCase() === 'santiago') {
      return DEFAULT_COORDS;
    }
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=es`;
      const data = await this._fetchJson(url, 5000);
      if (data.results && data.results.length > 0) {
        return { lat: data.results[0].latitude, lon: data.results[0].longitude };
      }
      console.warn(`[AIToolsService] Geocoding failed for "${location}", using Santiago as fallback`);
      return DEFAULT_COORDS;
    } catch (err) {
      console.warn(`[AIToolsService] Geocoding error for "${location}": ${err.message}, using Santiago as fallback`);
      return DEFAULT_COORDS;
    }
  }

  async _fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Timeout after ${timeoutMs}ms fetching ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = new AIToolsService();
module.exports.TOOL_DEFINITIONS = TOOL_DEFINITIONS;
