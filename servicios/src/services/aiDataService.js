const databaseService = require('./database-service');
const moment = require('moment');

class AIDataService {
  /**
   * Fetch historical temperature data for specified chambers and date range
   * @param {Array<number>} chamberIds - Array of channel_ids or beacon_ids
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {boolean} useDailyAggregation - If true, aggregate by day (for large datasets)
   * @returns {Promise<Array>} Historical data with thresholds
   */
  async fetchChamberData(chamberIds, startDate, endDate, useDailyAggregation = false) {
    if (!chamberIds || chamberIds.length === 0) {
      throw new Error('At least one chamber ID is required');
    }

    const startDateTime = moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const endDateTime = moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

    // Calculate days difference to decide if aggregation is needed
    const daysDiff = moment(endDate).diff(moment(startDate), 'days');
    const shouldAggregate = useDailyAggregation || daysDiff > 30;

    if (shouldAggregate) {
      return this.fetchChamberDataAggregated(chamberIds, startDateTime, endDateTime);
    } else {
      return this.fetchChamberDataRaw(chamberIds, startDateTime, endDateTime);
    }
  }

  /**
   * Fetch raw temperature readings (for small date ranges)
   */
  async fetchChamberDataRaw(chamberIds, startDateTime, endDateTime) {
    const placeholders = chamberIds.map(() => '?').join(',');
    
    const query = `
      SELECT
        sr.id,
        sr.channel_id,
        sr.external_temperature as temperature,
        sr.external_temperature_timestamp as timestamp,
        c.name as chamber_name,
        c.channel_id,
        COALESCE(c.threshold_min, p.minimo) as threshold_min,
        COALESCE(c.threshold_max, p.maximo) as threshold_max,
        CASE
          WHEN c.threshold_min IS NOT NULL THEN 'individual'
          ELSE 'group'
        END as threshold_type,
        'ubibot' as sensor_type
      FROM sensor_readings_ubibot sr
      JOIN channels_ubibot c ON sr.channel_id = c.channel_id
      LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
      WHERE sr.channel_id IN (${placeholders})
        AND sr.external_temperature_timestamp BETWEEN ? AND ?
        AND sr.external_temperature IS NOT NULL
      ORDER BY sr.channel_id, sr.external_temperature_timestamp ASC
    `;

    const params = [...chamberIds, startDateTime, endDateTime];
    const rows = await databaseService.query(query, params);

    // Also fetch beacon data if any chamber IDs match beacons
    // TODO: Add beacon data fetching if needed

    return rows;
  }

  /**
   * Fetch aggregated daily data (for large date ranges >30 days)
   */
  async fetchChamberDataAggregated(chamberIds, startDateTime, endDateTime) {
    const placeholders = chamberIds.map(() => '?').join(',');
    
    const query = `
      SELECT
        DATE(sr.external_temperature_timestamp) as date,
        sr.channel_id,
        c.name as chamber_name,
        AVG(sr.external_temperature) as avg_temp,
        MIN(sr.external_temperature) as min_temp,
        MAX(sr.external_temperature) as max_temp,
        STDDEV(sr.external_temperature) as std_dev,
        COUNT(*) as reading_count,
        COALESCE(c.threshold_min, p.minimo) as threshold_min,
        COALESCE(c.threshold_max, p.maximo) as threshold_max,
        SUM(CASE 
          WHEN sr.external_temperature < COALESCE(c.threshold_min, p.minimo) 
            OR sr.external_temperature > COALESCE(c.threshold_max, p.maximo) 
          THEN 1 ELSE 0 
        END) as breach_count,
        CASE
          WHEN c.threshold_min IS NOT NULL THEN 'individual'
          ELSE 'group'
        END as threshold_type,
        'ubibot' as sensor_type
      FROM sensor_readings_ubibot sr
      JOIN channels_ubibot c ON sr.channel_id = c.channel_id
      LEFT JOIN parametrizaciones p ON c.id_parametrizacion = p.param_id
      WHERE sr.channel_id IN (${placeholders})
        AND sr.external_temperature_timestamp BETWEEN ? AND ?
        AND sr.external_temperature IS NOT NULL
      GROUP BY DATE(sr.external_temperature_timestamp), sr.channel_id, c.name, 
               c.threshold_min, c.threshold_max, p.minimo, p.maximo
      ORDER BY sr.channel_id, date ASC
    `;

    const params = [...chamberIds, startDateTime, endDateTime];
    const rows = await databaseService.query(query, params);

    return rows;
  }

  /**
   * Fetch data for interannual comparison (same month, different years)
   * @param {number} chamberId - Chamber channel_id
   * @param {number} month - Month (1-12)
   * @param {number} year1 - First year
   * @param {number} year2 - Second year
   * @returns {Promise<Object>} { year1: [...], year2: [...] }
   */
  async fetchInterannualComparison(chamberId, month, year1, year2) {
    const start1 = moment(`${year1}-${month.toString().padStart(2, '0')}-01`).startOf('month');
    const end1 = start1.clone().endOf('month');
    const start2 = moment(`${year2}-${month.toString().padStart(2, '0')}-01`).startOf('month');
    const end2 = start2.clone().endOf('month');

    const [year1Data, year2Data] = await Promise.all([
      this.fetchChamberDataAggregated(
        [chamberId],
        start1.format('YYYY-MM-DD HH:mm:ss'),
        end1.format('YYYY-MM-DD HH:mm:ss')
      ),
      this.fetchChamberDataAggregated(
        [chamberId],
        start2.format('YYYY-MM-DD HH:mm:ss'),
        end2.format('YYYY-MM-DD HH:mm:ss')
      )
    ]);

    return {
      year1: year1Data,
      year2: year2Data,
      period1: { start: start1.format('YYYY-MM-DD'), end: end1.format('YYYY-MM-DD') },
      period2: { start: start2.format('YYYY-MM-DD'), end: end2.format('YYYY-MM-DD') }
    };
  }

  /**
   * Detect data gaps (periods >15 minutes without readings)
   * @param {number} chamberId - Chamber channel_id
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Array of gap objects { start, end, duration_minutes }
   */
  async detectDataGaps(chamberId, startDate, endDate) {
    const startDateTime = moment(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const endDateTime = moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');

    // This is a simplified gap detection - for production, might need more sophisticated logic
    const query = `
      SELECT 
        external_temperature_timestamp as timestamp,
        LAG(external_temperature_timestamp) OVER (ORDER BY external_temperature_timestamp) as prev_timestamp
      FROM sensor_readings_ubibot
      WHERE channel_id = ?
        AND external_temperature_timestamp BETWEEN ? AND ?
      ORDER BY external_temperature_timestamp
    `;

    const rows = await databaseService.query(query, [chamberId, startDateTime, endDateTime]);
    
    const gaps = [];
    for (let i = 1; i < rows.length; i++) {
      const current = moment(rows[i].timestamp);
      const previous = moment(rows[i - 1].timestamp);
      const diffMinutes = current.diff(previous, 'minutes');
      
      if (diffMinutes > 15) {
        gaps.push({
          start: previous.format('YYYY-MM-DD HH:mm:ss'),
          end: current.format('YYYY-MM-DD HH:mm:ss'),
          duration_minutes: diffMinutes
        });
      }
    }

    return gaps;
  }
}

module.exports = new AIDataService();


