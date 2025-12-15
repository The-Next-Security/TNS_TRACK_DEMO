/**
 * Alerts Aggregation Service
 * Feature: 004-reportes-base-core (Phase 10 - US7)
 *
 * Calculates alerts KPIs and statistics for report generation
 * Uses alert_tracking table with comprehensive metrics
 */

const mysql = require('mysql2/promise');
const configLoader = require('../../../config/js_files/config-loader');

// Database configuration from unified-config.json
const dbConfigRaw = configLoader.getValue('database');
const dbConfig = {
  host: dbConfigRaw.host,
  port: dbConfigRaw.port,
  user: dbConfigRaw.username,  // Map username -> user for mysql2
  password: dbConfigRaw.password,
  database: dbConfigRaw.database
};

/**
 * Calculate comprehensive alerts KPIs for given devices and date range
 *
 * @param {Array<string>} channelIds - Array of channel IDs to include
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 * @returns {Promise<Object>} KPIs object with 7 key metrics
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
    connection = await mysql.createConnection(dbConfig);

    // Placeholders for channel IDs
    const placeholders = channelIds.map(() => '?').join(',');

    // Main KPIs query
    const query = `
      SELECT
        -- Total alerts
        COUNT(*) AS total_alerts,

        -- Critical alerts (temperature type alerts)
        SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END) AS critical_alerts,

        -- Average response time (acknowledged alerts only)
        AVG(CASE
          WHEN acknowledged_at IS NOT NULL AND response_time_minutes IS NOT NULL
          THEN response_time_minutes
          ELSE NULL
        END) AS avg_response_time_minutes,

        -- Average resolution time (resolved alerts only)
        AVG(CASE
          WHEN resolved_at IS NOT NULL AND resolution_time_minutes IS NOT NULL
          THEN resolution_time_minutes
          ELSE NULL
        END) AS avg_resolution_time_hours,

        -- Resolution rate (resolved / total)
        (SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS resolution_rate,

        -- False alarm rate
        (SUM(CASE WHEN is_false_alarm = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS false_alarm_rate,

        -- Pending alerts
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_alerts

      FROM alert_tracking
      WHERE channel_id IN (${placeholders})
        AND DATE(alert_timestamp) BETWEEN ? AND ?
    `;

    const params = [
      ...channelIds,     // Channel IDs for IN clause
      startDate,         // Date range start
      endDate            // Date range end
    ];

    const [rows] = await connection.execute(query, params);
    const result = rows[0];

    // Convert resolution time from minutes to hours (if available)
    const avgResolutionHours = result.avg_resolution_time_hours != null
      ? result.avg_resolution_time_hours / 60
      : null;

    // Format and return KPIs
    const kpis = {
      totalAlerts: result.total_alerts || 0,
      criticalAlerts: result.critical_alerts || 0,
      avgResponseTime: result.avg_response_time_minutes != null
        ? parseFloat(Number(result.avg_response_time_minutes).toFixed(1))
        : null,
      avgResolutionTime: avgResolutionHours != null
        ? parseFloat(Number(avgResolutionHours).toFixed(1))
        : null,
      resolutionRate: result.resolution_rate != null
        ? parseFloat(Number(result.resolution_rate).toFixed(1))
        : 0,
      falseAlarmRate: result.false_alarm_rate != null
        ? parseFloat(Number(result.false_alarm_rate).toFixed(1))
        : 0,
      pendingAlerts: result.pending_alerts || 0
    };

    console.log('[AlertsAggregation] ✅ KPIs calculated:', kpis);
    return kpis;

  } catch (error) {
    console.error('[AlertsAggregation] ❌ Error calculating KPIs:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get per-device alert statistics
 *
 * @param {Array<string>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of device stats
 */
async function getDeviceStatistics(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        at.channel_id,
        at.channel_name AS device_name,
        'N/A' AS location,
        COUNT(*) AS total_alerts,
        SUM(CASE WHEN at.alert_type = 'temperature' THEN 1 ELSE 0 END) AS critical_count,
        SUM(CASE WHEN at.alert_type = 'disconnection' THEN 1 ELSE 0 END) AS disconnection_count,
        AVG(CASE
          WHEN at.acknowledged_at IS NOT NULL AND at.response_time_minutes IS NOT NULL
          THEN at.response_time_minutes
          ELSE NULL
        END) AS avg_response_minutes,
        (SUM(CASE WHEN at.status = 'resolved' THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS resolution_rate
      FROM alert_tracking at
      WHERE at.channel_id IN (${placeholders})
        AND DATE(at.alert_timestamp) BETWEEN ? AND ?
      GROUP BY at.channel_id, at.channel_name
      ORDER BY total_alerts DESC
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    const deviceStats = rows.map(row => ({
      channelId: row.channel_id,
      deviceName: row.device_name || row.channel_id,
      location: row.location,
      totalAlerts: row.total_alerts || 0,
      criticalCount: row.critical_count || 0,
      disconnectionCount: row.disconnection_count || 0,
      avgResponseTime: row.avg_response_minutes != null
        ? parseFloat(Number(row.avg_response_minutes).toFixed(1))
        : null,
      resolutionRate: row.resolution_rate != null
        ? parseFloat(Number(row.resolution_rate).toFixed(1))
        : 0
    }));

    console.log(`[AlertsAggregation] ✅ Device statistics retrieved: ${deviceStats.length} devices`);
    return deviceStats;

  } catch (error) {
    console.error('[AlertsAggregation] ❌ Error getting device statistics:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get hourly distribution of alerts (for heatmap)
 *
 * @param {Array<string>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of hourly alert counts
 */
async function getHourlyDistribution(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        HOUR(alert_timestamp) AS hour,
        COUNT(*) AS alert_count
      FROM alert_tracking
      WHERE channel_id IN (${placeholders})
        AND DATE(alert_timestamp) BETWEEN ? AND ?
      GROUP BY HOUR(alert_timestamp)
      ORDER BY hour
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    const hourlyData = rows.map(row => ({
      hour: row.hour,
      alertCount: row.alert_count || 0
    }));

    console.log(`[AlertsAggregation] ✅ Hourly distribution retrieved: ${hourlyData.length} hours`);
    return hourlyData;

  } catch (error) {
    console.error('[AlertsAggregation] ❌ Error getting hourly distribution:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get SLA compliance metrics (response time buckets)
 *
 * @param {Array<string>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} SLA compliance metrics
 */
async function getSLAMetrics(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        SUM(CASE WHEN response_time_minutes < 5 THEN 1 ELSE 0 END) AS under_5min,
        SUM(CASE WHEN response_time_minutes >= 5 AND response_time_minutes < 15 THEN 1 ELSE 0 END) AS between_5_15min,
        SUM(CASE WHEN response_time_minutes >= 15 AND response_time_minutes < 30 THEN 1 ELSE 0 END) AS between_15_30min,
        SUM(CASE WHEN response_time_minutes >= 30 THEN 1 ELSE 0 END) AS over_30min,
        COUNT(*) AS total_acknowledged
      FROM alert_tracking
      WHERE channel_id IN (${placeholders})
        AND DATE(alert_timestamp) BETWEEN ? AND ?
        AND acknowledged_at IS NOT NULL
        AND response_time_minutes IS NOT NULL
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);
    const result = rows[0];

    const totalAcknowledged = result.total_acknowledged || 0;

    const slaMetrics = {
      under5Min: result.under_5min || 0,
      between5And15Min: result.between_5_15min || 0,
      between15And30Min: result.between_15_30min || 0,
      over30Min: result.over_30min || 0,
      totalAcknowledged: totalAcknowledged,
      // Calculate percentages
      under5MinPercent: totalAcknowledged > 0
        ? parseFloat(((result.under_5min || 0) / totalAcknowledged * 100).toFixed(1))
        : 0,
      between5And15MinPercent: totalAcknowledged > 0
        ? parseFloat(((result.between_5_15min || 0) / totalAcknowledged * 100).toFixed(1))
        : 0,
      between15And30MinPercent: totalAcknowledged > 0
        ? parseFloat(((result.between_15_30min || 0) / totalAcknowledged * 100).toFixed(1))
        : 0,
      over30MinPercent: totalAcknowledged > 0
        ? parseFloat(((result.over_30min || 0) / totalAcknowledged * 100).toFixed(1))
        : 0
    };

    console.log('[AlertsAggregation] ✅ SLA metrics calculated:', slaMetrics);
    return slaMetrics;

  } catch (error) {
    console.error('[AlertsAggregation] ❌ Error calculating SLA metrics:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get daily alert trend
 *
 * @param {Array<string>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of daily alert counts
 */
async function getDailyTrend(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        DATE(alert_timestamp) AS alert_date,
        COUNT(*) AS alert_count,
        SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END) AS critical_count
      FROM alert_tracking
      WHERE channel_id IN (${placeholders})
        AND DATE(alert_timestamp) BETWEEN ? AND ?
      GROUP BY DATE(alert_timestamp)
      ORDER BY alert_date
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    const dailyTrend = rows.map(row => ({
      date: row.alert_date,
      totalAlerts: row.alert_count || 0,
      criticalAlerts: row.critical_count || 0
    }));

    console.log(`[AlertsAggregation] ✅ Daily trend retrieved: ${dailyTrend.length} days`);
    return dailyTrend;

  } catch (error) {
    console.error('[AlertsAggregation] ❌ Error getting daily trend:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get alert type distribution
 *
 * @param {Array<string>} channelIds - Array of channel IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} Alert type distribution
 */
async function getAlertTypeDistribution(channelIds, startDate, endDate) {
  if (!channelIds || channelIds.length === 0) {
    throw new Error('Channel IDs array cannot be empty');
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const placeholders = channelIds.map(() => '?').join(',');

    const query = `
      SELECT
        alert_type,
        COUNT(*) AS count
      FROM alert_tracking
      WHERE channel_id IN (${placeholders})
        AND DATE(alert_timestamp) BETWEEN ? AND ?
      GROUP BY alert_type
    `;

    const params = [...channelIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    const distribution = {
      temperature: 0,
      disconnection: 0
    };

    rows.forEach(row => {
      if (row.alert_type === 'temperature') {
        distribution.temperature = row.count || 0;
      } else if (row.alert_type === 'disconnection') {
        distribution.disconnection = row.count || 0;
      }
    });

    console.log('[AlertsAggregation] ✅ Alert type distribution calculated:', distribution);
    return distribution;

  } catch (error) {
    console.error('[AlertsAggregation] ❌ Error getting alert type distribution:', error);
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
  getHourlyDistribution,
  getSLAMetrics,
  getDailyTrend,
  getAlertTypeDistribution
};
