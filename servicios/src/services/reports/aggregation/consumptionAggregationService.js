/**
 * Consumption Aggregation Service
 * Feature: 004-reportes-base-core Phase 9 (T089-T094)
 *
 * Calculates electrical consumption KPIs and statistics for report generation
 * Uses sem_mediciones table for Shelly device power consumption data
 * Works with sem_dispositivos table for device metadata
 * 
 * Note: sem_mediciones columns:
 *   - shelly_id: Device identifier (VARCHAR(12))
 *   - energia_activa: Energy in kWh (DECIMAL(15,3))
 *   - potencia_activa: Power in W (DECIMAL(10,2)) - convert to kW by dividing by 1000
 *   - timestamp_local: Timestamp (TIMESTAMP(6))
 *   - fase: Phase ('A', 'B', 'C', 'TOTAL') - use 'TOTAL' for aggregate data
 */

const mysql = require('mysql2/promise');
const configLoader = require('../../../config/js_files/configLoader_Config');
const moment = require('moment-timezone');

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

// Timezone for calculations
const TIMEZONE = 'America/Santiago';

// Default tariff rates (CLP/kWh) if not provided
const DEFAULT_TARIFFS = {
  punta: 150,      // Peak hours: 18:00-23:00
  valle: 80,       // Valley hours: 23:00-06:00
  fuera_punta: 100 // Off-peak hours: 06:00-18:00
};

// Tariff time ranges (24-hour format)
const TARIFF_HOURS = {
  punta: { start: 18, end: 23 },
  valle: { start: 23, end: 6 },
  fuera_punta: { start: 6, end: 18 }
};

/**
 * Calculate comprehensive electrical consumption KPIs for given devices and date range
 *
 * @param {Array<number>} deviceIds - Array of device IDs to include (Shelly devices)
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 * @param {Object} tariffs - Optional tariff rates {punta, valle, fuera_punta} in CLP/kWh
 * @returns {Promise<Object>} KPIs object with electrical metrics
 */
async function calculateKPIs(deviceIds, startDate, endDate, tariffs = DEFAULT_TARIFFS) {
  if (!deviceIds || deviceIds.length === 0) {
    throw new Error('Device IDs array cannot be empty');
  }

  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }

  // Ensure tariffs object has all required fields
  const finalTariffs = { ...DEFAULT_TARIFFS, ...tariffs };

  let connection;
  try {
    connection = await mysql.createConnection(getDbConfig());

    // Placeholders for device IDs
    const placeholders = deviceIds.map(() => '?').join(',');

    // Calculate date range in days
    const start = moment.tz(startDate, TIMEZONE);
    const end = moment.tz(endDate, TIMEZONE);
    const daysDiff = end.diff(start, 'days') + 1;

    // Query to calculate comprehensive consumption KPIs
    // Using sem_mediciones table with formula: (potencia_activa * intervalo_segundos) / (3600 * 1000)
    const query = `
      SELECT
        -- Total energy consumption (kWh) - calculated from potencia_activa and intervalo_segundos
        SUM(potencia_activa * COALESCE(intervalo_segundos, 60)) / (3600 * 1000) as totalKWh,
        
        -- Maximum demand (kW) - potencia_activa is in W, convert to kW
        MAX(potencia_activa / 1000) as maxDemandKW,
        
        -- Average power demand (kW)
        AVG(potencia_activa / 1000) as avgDemandKW,
        
        -- Total number of readings
        COUNT(*) as totalReadings,
        
        -- Readings count per hour for peak hour calculation
        COUNT(CASE WHEN HOUR(timestamp_local) BETWEEN 18 AND 22 THEN 1 END) as peakHourReadings,
        
        -- Sum of power during peak hours for analysis
        SUM(CASE WHEN HOUR(timestamp_local) BETWEEN 18 AND 22 
            THEN (potencia_activa * COALESCE(intervalo_segundos, 60)) / (3600 * 1000)
            ELSE 0 END) as peakHourKWh
        
      FROM sem_mediciones
      WHERE shelly_id IN (${placeholders})
        AND fase = 'TOTAL'
        AND DATE(timestamp_local) BETWEEN ? AND ?
        AND potencia_activa IS NOT NULL
        AND calidad_lectura IN ('NORMAL', 'INTERPOLADA')
    `;

    const params = [...deviceIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    if (!rows || rows.length === 0 || !rows[0].totalKWh) {
      return {
        totalKWh: 0,
        maxDemandKW: 0,
        loadFactor: 0,
        estimatedCost: 0,
        avgDailyKWh: 0,
        peakHours: 0,
        totalReadings: 0,
        message: 'No consumption data available for the selected period'
      };
    }

    const data = rows[0];

    // Convert MySQL Decimal values to numbers
    const totalKWh = Number(data.totalKWh) || 0;
    const maxDemandKW = Number(data.maxDemandKW) || 0;
    const avgDemandKW = Number(data.avgDemandKW) || 0;
    const totalReadings = Number(data.totalReadings) || 0;
    const peakHourReadings = Number(data.peakHourReadings) || 0;

    // Calculate load factor: (avgDemandKW / maxDemandKW) * 100
    const loadFactor = calculateLoadFactor(avgDemandKW, maxDemandKW);

    // Calculate estimated cost based on tariffs
    const estimatedCost = await calculateCost(deviceIds, startDate, endDate, finalTariffs, connection);

    // Average daily consumption
    const avgDailyKWh = daysDiff > 0 ? totalKWh / daysDiff : 0;

    // Peak hours (percentage of total readings in peak period)
    const peakHours = totalReadings > 0 
      ? (peakHourReadings / totalReadings) * 100 
      : 0;

    return {
      totalKWh: parseFloat(totalKWh.toFixed(2)),
      maxDemandKW: parseFloat(maxDemandKW.toFixed(3)),
      loadFactor: parseFloat(loadFactor.toFixed(2)),
      estimatedCost: Math.round(estimatedCost),
      avgDailyKWh: parseFloat(avgDailyKWh.toFixed(2)),
      peakHours: parseFloat(peakHours.toFixed(2)),
      totalReadings: parseInt(totalReadings),
      avgDemandKW: parseFloat(avgDemandKW.toFixed(3))
    };

  } catch (error) {
    console.error('Error calculating consumption KPIs:', error);
    throw new Error(`Failed to calculate consumption KPIs: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get detailed statistics per device for consumption analysis
 *
 * @param {Array<number>} deviceIds - Array of device IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} tariffs - Tariff rates
 * @returns {Promise<Array>} Array of device statistics
 */
async function getDeviceStatistics(deviceIds, startDate, endDate, tariffs = DEFAULT_TARIFFS) {
  if (!deviceIds || deviceIds.length === 0) {
    throw new Error('Device IDs array cannot be empty');
  }

  const finalTariffs = { ...DEFAULT_TARIFFS, ...tariffs };
  let connection;

  try {
    connection = await mysql.createConnection(getDbConfig());

    const placeholders = deviceIds.map(() => '?').join(',');

    const query = `
      SELECT
        sd.shelly_id as device_id,
        sd.nombre as device_name,
        cur.nombre_ubicacion as location,
        
        SUM(m.potencia_activa * COALESCE(m.intervalo_segundos, 60)) / (3600 * 1000) as totalKWh,
        MAX(m.potencia_activa / 1000) as maxDemandKW,
        AVG(m.potencia_activa / 1000) as avgPowerKW,
        COUNT(*) as readingsCount,
        
        MAX(m.timestamp_local) as peakDemandTimestamp
        
      FROM sem_dispositivos sd
      INNER JOIN sem_mediciones m ON sd.shelly_id = m.shelly_id
      LEFT JOIN catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
      WHERE sd.shelly_id IN (${placeholders})
        AND m.fase = 'TOTAL'
        AND DATE(m.timestamp_local) BETWEEN ? AND ?
        AND m.potencia_activa IS NOT NULL
        AND m.calidad_lectura IN ('NORMAL', 'INTERPOLADA')
      GROUP BY sd.shelly_id, sd.nombre, cur.nombre_ubicacion
      ORDER BY totalKWh DESC
    `;

    const params = [...deviceIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    // Calculate cost per device
    const devicesWithCost = [];
    for (const row of rows) {
      const deviceCost = await calculateCost([row.device_id], startDate, endDate, finalTariffs, connection);
      
      // Convert MySQL Decimal values to numbers
      const totalKWh = Number(row.totalKWh) || 0;
      const maxDemandKW = Number(row.maxDemandKW) || 0;
      const avgPowerKW = Number(row.avgPowerKW) || 0;
      const readingsCount = Number(row.readingsCount) || 0;
      
      devicesWithCost.push({
        device_id: row.device_id,
        device_name: row.device_name,
        location: row.location || 'Sin ubicación',
        totalKWh: parseFloat(totalKWh.toFixed(2)),
        maxDemandKW: parseFloat(maxDemandKW.toFixed(3)),
        avgPowerKW: parseFloat(avgPowerKW.toFixed(3)),
        costEstimated: Math.round(deviceCost),
        readingsCount: parseInt(readingsCount),
        peakDemandTimestamp: row.peakDemandTimestamp
      });
    }

    return devicesWithCost;

  } catch (error) {
    console.error('Error getting device statistics:', error);
    throw new Error(`Failed to get device statistics: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get hourly consumption for load profile chart (0-23 hours)
 *
 * @param {Array<number>} deviceIds - Array of device IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of hourly consumption data
 */
async function getHourlyConsumption(deviceIds, startDate, endDate) {
  if (!deviceIds || deviceIds.length === 0) {
    throw new Error('Device IDs array cannot be empty');
  }

  let connection;

  try {
    connection = await mysql.createConnection(getDbConfig());

    const placeholders = deviceIds.map(() => '?').join(',');

    const query = `
      SELECT
        HOUR(timestamp_local) as hour,
        AVG(potencia_activa / 1000) as avgKW,
        SUM(potencia_activa * COALESCE(intervalo_segundos, 60)) / (3600 * 1000) as totalKWh,
        COUNT(*) as readingsCount
      FROM sem_mediciones
      WHERE shelly_id IN (${placeholders})
        AND fase = 'TOTAL'
        AND DATE(timestamp_local) BETWEEN ? AND ?
        AND potencia_activa IS NOT NULL
        AND calidad_lectura IN ('NORMAL', 'INTERPOLADA')
      GROUP BY HOUR(timestamp_local)
      ORDER BY hour
    `;

    const params = [...deviceIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    // Ensure all 24 hours are present (fill missing hours with 0)
    const hourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
      const found = rows.find(r => r.hour === hour);
      if (found) {
        // Convert MySQL Decimal values to numbers
        const avgKW = Number(found.avgKW) || 0;
        const totalKWh = Number(found.totalKWh) || 0;
        const readingsCount = Number(found.readingsCount) || 0;
        
        hourlyData.push({
          hour,
          avgKW: parseFloat(avgKW.toFixed(3)),
          totalKWh: parseFloat(totalKWh.toFixed(2)),
          readingsCount: parseInt(readingsCount)
        });
      } else {
        hourlyData.push({
          hour,
          avgKW: 0,
          totalKWh: 0,
          readingsCount: 0
        });
      }
    }

    return hourlyData;

  } catch (error) {
    console.error('Error getting hourly consumption:', error);
    throw new Error(`Failed to get hourly consumption: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Get daily consumption for trend chart
 *
 * @param {Array<number>} deviceIds - Array of device IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of daily consumption data
 */
async function getDailyConsumption(deviceIds, startDate, endDate) {
  if (!deviceIds || deviceIds.length === 0) {
    throw new Error('Device IDs array cannot be empty');
  }

  let connection;

  try {
    connection = await mysql.createConnection(getDbConfig());

    const placeholders = deviceIds.map(() => '?').join(',');

    const query = `
      SELECT
        DATE(timestamp_local) as date,
        SUM(potencia_activa * COALESCE(intervalo_segundos, 60)) / (3600 * 1000) as totalKWh,
        MAX(potencia_activa / 1000) as maxDemandKW,
        AVG(potencia_activa / 1000) as avgDemandKW
      FROM sem_mediciones
      WHERE shelly_id IN (${placeholders})
        AND fase = 'TOTAL'
        AND DATE(timestamp_local) BETWEEN ? AND ?
        AND potencia_activa IS NOT NULL
        AND calidad_lectura IN ('NORMAL', 'INTERPOLADA')
      GROUP BY DATE(timestamp_local)
      ORDER BY date
    `;

    const params = [...deviceIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    return rows.map(row => {
      // Convert MySQL Decimal values to numbers
      const totalKWh = Number(row.totalKWh) || 0;
      const maxDemandKW = Number(row.maxDemandKW) || 0;
      const avgDemandKW = Number(row.avgDemandKW) || 0;
      
      return {
        date: moment(row.date).format('YYYY-MM-DD'),
        totalKWh: parseFloat(totalKWh.toFixed(2)),
        maxDemandKW: parseFloat(maxDemandKW.toFixed(3)),
        avgLoadFactor: calculateLoadFactor(avgDemandKW, maxDemandKW)
      };
    });

  } catch (error) {
    console.error('Error getting daily consumption:', error);
    throw new Error(`Failed to get daily consumption: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Calculate estimated cost based on consumption and tariff rates
 *
 * @param {Array<number>} deviceIds - Array of device IDs
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} tariffs - Tariff rates {punta, valle, fuera_punta} in CLP/kWh
 * @param {Object} connection - MySQL connection (optional, creates new if not provided)
 * @returns {Promise<number>} Total estimated cost in CLP
 */
async function calculateCost(deviceIds, startDate, endDate, tariffs = DEFAULT_TARIFFS, connection = null) {
  const shouldCloseConnection = !connection;
  
  try {
    if (!connection) {
      connection = await mysql.createConnection(getDbConfig());
    }

    const placeholders = deviceIds.map(() => '?').join(',');

    // Query to get hourly consumption grouped by tariff periods
    const query = `
      SELECT
        HOUR(timestamp_local) as hour,
        SUM(potencia_activa * COALESCE(intervalo_segundos, 60)) / (3600 * 1000) as kWh
      FROM sem_mediciones
      WHERE shelly_id IN (${placeholders})
        AND fase = 'TOTAL'
        AND DATE(timestamp_local) BETWEEN ? AND ?
        AND potencia_activa IS NOT NULL
        AND calidad_lectura IN ('NORMAL', 'INTERPOLADA')
      GROUP BY HOUR(timestamp_local)
    `;

    const params = [...deviceIds, startDate, endDate];
    const [rows] = await connection.execute(query, params);

    let totalCost = 0;

    // Calculate cost for each hour based on tariff
    for (const row of rows) {
      const hour = Number(row.hour) || 0;
      const kWh = Number(row.kWh) || 0; // Convert MySQL Decimal to number

      // Determine which tariff applies
      let rate;
      if (hour >= TARIFF_HOURS.punta.start && hour <= TARIFF_HOURS.punta.end) {
        rate = tariffs.punta;
      } else if ((hour >= TARIFF_HOURS.valle.start) || (hour < TARIFF_HOURS.valle.end)) {
        // Valle is from 23:00 to 06:00 (crosses midnight)
        rate = tariffs.valle;
      } else {
        rate = tariffs.fuera_punta;
      }

      totalCost += kWh * rate;
    }

    return totalCost;

  } catch (error) {
    console.error('Error calculating cost:', error);
    throw new Error(`Failed to calculate cost: ${error.message}`);
  } finally {
    if (shouldCloseConnection && connection) {
      await connection.end();
    }
  }
}

/**
 * Calculate load factor percentage
 *
 * @param {number} avgDemandKW - Average demand in kW
 * @param {number} maxDemandKW - Maximum demand in kW
 * @returns {number} Load factor as percentage (0-100)
 */
function calculateLoadFactor(avgDemandKW, maxDemandKW) {
  if (!maxDemandKW || maxDemandKW === 0) {
    return 0;
  }
  
  const loadFactor = (avgDemandKW / maxDemandKW) * 100;
  return Math.min(100, Math.max(0, loadFactor)); // Clamp between 0-100
}

module.exports = {
  calculateKPIs,
  getDeviceStatistics,
  getHourlyConsumption,
  getDailyConsumption,
  calculateCost,
  calculateLoadFactor,
  DEFAULT_TARIFFS,
  TARIFF_HOURS
};

