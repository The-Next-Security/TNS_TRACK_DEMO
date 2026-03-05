/**
 * Temperature Aggregation Service
 * Feature: 004-reportes-base-core (T012)
 *
 * Calculates temperature KPIs and statistics for report generation
 * Uses sensor_readings_ubibot table and v_daily_temperature_kpis view
 * Works with channels_ubibot for device metadata and thresholds
 */

const mysql = require('mysql2/promise');
const configLoader = require('../../../config/js_files/config-loader');

let _dbConfig = null;
function getDbConfig() {
  if (!_dbConfig) {
    const raw = configLoader.getValue('database');
    _dbConfig = {
      host: raw.host,
      port: raw.port,
      user: raw.username,
      password: raw.password,
      database: raw.database
    };
  }
  return _dbConfig;
}

/**
 * Calculate comprehensive temperature KPIs for given devices and date range
 *
 * @param {Array<number>} channelIds - Array of channel IDs to include
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 * @returns {Promise<Object>} KPIs object with metrics
 */
async function calculateKPIs(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }

  let connection;
  try {
    connection = await mysql.createConnection(getDbConfig());

    // Placeholders for channel IDs
    const placeholders = channelIds.map(() => '?').join(',');

    // Query to calculate comprehensive KPIs
    const query = `
      SELECT
        -- Overall averages
        AVG(sr.external_temperature) AS avg_temp,
        MIN(sr.external_temperature) AS min_temp,
        MAX(sr.external_temperature) AS max_temp,
        STDDEV(sr.external_temperature) AS stddev_temp,

        -- Total readings
        COUNT(*) AS total_readings,

        -- Calculate data coverage (days with data / total days)
        -- This measures if cameras have data each day, independent of reading frequency
        -- Formula: (distinct days with data / total days in range) * 100
        (COUNT(DISTINCT DATE(sr.timestamp)) / (DATEDIFF(?, ?) + 1)) * 100 AS uptime_percentage

      FROM sensor_readings_ubibot sr
      INNER JOIN channels_ubibot ch ON sr.channel_id = ch.channel_id
      WHERE sr.channel_id IN (${placeholders})
        AND DATE(sr.timestamp) BETWEEN ? AND ?
        AND sr.external_temperature IS NOT NULL
        AND ch.esOperativa = 1
    `;

    const params = [
      endDate,           // For DATEDIFF calculation (data coverage)
      startDate,         // For DATEDIFF calculation (data coverage)
      ...channelIds,     // Channel IDs for IN clause
      startDate,         // Date range start
      endDate            // Date range end
    ];

    const [rows] = await connection.execute(query, params);
    const result = rows[0];

    // Query alert_tracking table for actual alerts sent (consistent with dashboard methodology)
    const alertsQuery = `
      SELECT COUNT(*) AS alerts_count
      FROM alert_tracking
      WHERE channel_id IN (${placeholders})
        AND DATE(alert_timestamp) BETWEEN ? AND ?
    `;

    const alertsParams = [...channelIds, startDate, endDate];
    const [alertsRows] = await connection.execute(alertsQuery, alertsParams);
    const alertsCount = alertsRows[0].alerts_count || 0;

    // Format and return KPIs
    const kpis = {
      avg: result.avg_temp != null && !isNaN(result.avg_temp) ? parseFloat(Number(result.avg_temp).toFixed(2)) : null,
      min: result.min_temp != null && !isNaN(result.min_temp) ? parseFloat(Number(result.min_temp).toFixed(2)) : null,
      max: result.max_temp != null && !isNaN(result.max_temp) ? parseFloat(Number(result.max_temp).toFixed(2)) : null,
      stddev: result.stddev_temp != null && !isNaN(result.stddev_temp) ? parseFloat(Number(result.stddev_temp).toFixed(2)) : null,
      uptime: result.uptime_percentage != null && !isNaN(result.uptime_percentage) ? parseFloat(Number(result.uptime_percentage).toFixed(2)) : 0,
      alertsCount: alertsCount, // Now using actual alerts from alert_tracking table
      totalReadings: result.total_readings || 0,
      dateRange: {
        start: startDate,
        end: endDate
      },
      deviceCount: channelIds.length
    };

    console.log(`[TemperatureAggregation] Calculated KPIs for ${channelIds.length} channels (${startDate} to ${endDate}):`, kpis);
    console.log(`[TemperatureAggregation] Alerts count from alert_tracking: ${alertsCount}`);

    return kpis;

  } catch (error) {
    console.error('[TemperatureAggregation] Error calculating KPIs:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get per-device statistics for detailed breakdown
 *
 * @param {Array<number>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of device statistics
 */
async function getDeviceStatistics(channelIds, startDate, endDate) {
  let connection;
  try {
    connection = await mysql.createConnection(getDbConfig());

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        sr.channel_id,
        ch.name AS device_name,
        loc.nombre_ubicacion AS device_location,
        AVG(sr.external_temperature) AS avg_temp,
        MIN(sr.external_temperature) AS min_temp,
        MAX(sr.external_temperature) AS max_temp,
        STDDEV(sr.external_temperature) AS stddev_temp,
        COUNT(*) AS total_readings,
        SUM(CASE
          WHEN sr.external_temperature < ch.threshold_min
            OR sr.external_temperature > ch.threshold_max
          THEN 1
          ELSE 0
        END) AS readings_out_of_range,
        ch.threshold_min,
        ch.threshold_max
      FROM sensor_readings_ubibot sr
      INNER JOIN channels_ubibot ch ON sr.channel_id = ch.channel_id
      LEFT JOIN catalogo_ubicaciones_reales loc ON ch.ubicacion_real = loc.idcatalogo_ubicaciones_reales
      WHERE sr.channel_id IN (${placeholders})
        AND DATE(sr.timestamp) BETWEEN ? AND ?
        AND sr.external_temperature IS NOT NULL
        AND ch.esOperativa = 1
      GROUP BY
        sr.channel_id,
        ch.name,
        loc.nombre_ubicacion,
        ch.threshold_min,
        ch.threshold_max
      ORDER BY ch.name ASC, sr.channel_id ASC
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    return rows.map(row => ({
      deviceId: row.channel_id,
      deviceName: row.device_name || `Channel ${row.channel_id}`,
      location: row.device_location || 'N/A',
      avgTemp: row.avg_temp != null && !isNaN(row.avg_temp) ? parseFloat(Number(row.avg_temp).toFixed(2)) : null,
      minTemp: row.min_temp != null && !isNaN(row.min_temp) ? parseFloat(Number(row.min_temp).toFixed(2)) : null,
      maxTemp: row.max_temp != null && !isNaN(row.max_temp) ? parseFloat(Number(row.max_temp).toFixed(2)) : null,
      stddevTemp: row.stddev_temp != null && !isNaN(row.stddev_temp) ? parseFloat(Number(row.stddev_temp).toFixed(2)) : null,
      totalReadings: row.total_readings || 0,
      readingsOutOfRange: row.readings_out_of_range || 0,
      outOfRangePercentage: row.total_readings > 0
        ? parseFloat(((row.readings_out_of_range / row.total_readings) * 100).toFixed(2))
        : 0,
      thresholds: {
        min: row.threshold_min,
        max: row.threshold_max
      }
    }));

  } catch (error) {
    console.error('[TemperatureAggregation] Error getting device statistics:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get hourly temperature data for heatmap visualization
 *
 * @param {Array<number>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Hourly temperature data
 */
async function getHourlyTemperatures(channelIds, startDate, endDate) {
  let connection;
  try {
    connection = await mysql.createConnection(getDbConfig());

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        DATE(sr.timestamp) AS date,
        HOUR(sr.timestamp) AS hour,
        AVG(sr.external_temperature) AS avg_temp
      FROM sensor_readings_ubibot sr
      INNER JOIN channels_ubibot ch ON sr.channel_id = ch.channel_id
      WHERE sr.channel_id IN (${placeholders})
        AND DATE(sr.timestamp) BETWEEN ? AND ?
        AND sr.external_temperature IS NOT NULL
        AND ch.esOperativa = 1
      GROUP BY DATE(sr.timestamp), HOUR(sr.timestamp)
      ORDER BY date, hour
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    return rows.map(row => ({
      date: row.date,
      hour: row.hour,
      avgTemp: row.avg_temp != null && !isNaN(row.avg_temp) ? parseFloat(Number(row.avg_temp).toFixed(2)) : null
    }));

  } catch (error) {
    console.error('[TemperatureAggregation] Error getting hourly temperatures:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Calculate percentage of time with temperature above 0°C for each device
 * Used for PDF reports - does NOT affect existing functions or /storage/temperatura-camaras
 *
 * @param {Array<number>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Map of channelId -> percentage (or null for camera 5)
 */
async function calculateTimeAboveZeroPercentage(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }

  let connection;
  try {
    connection = await mysql.createConnection(getDbConfig());

    const placeholders = channelIds.map(() => '?').join(',');

    // Calculate minutes with temp >= 0°C using a subquery approach
    // This avoids the window function limitation inside SUM()
    const query = `
      SELECT
        channel_id,
        SUM(
          CASE
            WHEN external_temperature >= 0 THEN time_diff_minutes
            ELSE 0
          END
        ) AS minutes_above_zero
      FROM (
        SELECT
          sr.channel_id,
          sr.external_temperature,
          COALESCE(
            TIMESTAMPDIFF(MINUTE,
              sr.timestamp,
              LEAD(sr.timestamp) OVER (PARTITION BY sr.channel_id ORDER BY sr.timestamp)
            ),
            TIMESTAMPDIFF(MINUTE, sr.timestamp, CONCAT(?, ' 23:59:59'))
          ) AS time_diff_minutes
        FROM sensor_readings_ubibot sr
        INNER JOIN channels_ubibot ch ON sr.channel_id = ch.channel_id
        WHERE sr.channel_id IN (${placeholders})
          AND DATE(sr.timestamp) BETWEEN ? AND ?
          AND sr.external_temperature IS NOT NULL
          AND ch.esOperativa = 1
      ) AS temp_intervals
      GROUP BY channel_id
    `;

    const params = [endDate, ...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    // Calculate total minutes in the date range
    const totalDays = Math.floor(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    ) + 1;
    const totalDayMinutes = totalDays * 24 * 60;

    // Build result map
    const result = {};
    rows.forEach(row => {
      // Camera 5 (channel_id 92431) returns null -> displays as "--"
      if (row.channel_id === 92431) {
        result[row.channel_id] = null;
      } else {
        const minutesAbove = row.minutes_above_zero || 0;
        const percentage = (minutesAbove / totalDayMinutes) * 100;
        result[row.channel_id] = parseFloat(percentage.toFixed(1));
      }
    });

    // Fill in null for any channels that had no data
    channelIds.forEach(id => {
      if (result[id] === undefined) {
        result[id] = id === 92431 ? null : 0;
      }
    });

    console.log(`[TemperatureAggregation] Calculated % Temp > 0°C for ${channelIds.length} devices`);

    return result;

  } catch (error) {
    console.error('[TemperatureAggregation] Error calculating time above zero:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = {
  calculateKPIs,
  getDeviceStatistics,
  getHourlyTemperatures,
  calculateTimeAboveZeroPercentage
};
