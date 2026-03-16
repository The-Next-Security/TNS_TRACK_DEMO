const databaseService = require('./database_Service');
const { DateTime } = require('luxon');

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

    const startDateTime = DateTime.fromISO(String(startDate)).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
    const endDateTime = DateTime.fromISO(String(endDate)).endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');

    // Calculate days difference to decide if aggregation is needed
    const daysDiff = DateTime.fromISO(String(endDate)).diff(DateTime.fromISO(String(startDate)), 'days').days;
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
    
    // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor; channels_ubibot → ubi_canal;
    // parametrizaciones → ubi_presets_temperatura
    // SUPUESTO #3: threshold_min/max provienen del preset del grupo (ubi_presets_temperatura)
    // chamberIds son API IDs (canal_id) → resueltos via subquery a id_canal
    const query = `
      SELECT
        sr.id_lectura_sensor AS id,
        c.canal_id AS channel_id,
        sr.temperatura_externa AS temperature,
        sr.fecha_lectura_externa AS timestamp,
        c.nombre AS chamber_name,
        p.temperatura_minima AS threshold_min,
        p.temperatura_maxima AS threshold_max,
        'group' AS threshold_type,
        'ubibot' AS sensor_type
      FROM ubi_lecturas_sensor sr
      JOIN ubi_canal c ON sr.id_canal = c.id_canal
      LEFT JOIN ubi_presets_temperatura p ON c.id_preset = p.id_preset
      WHERE sr.id_canal IN (SELECT id_canal FROM ubi_canal WHERE canal_id IN (${placeholders}))
        AND sr.fecha_lectura_externa BETWEEN ? AND ?
        AND sr.temperatura_externa IS NOT NULL
      ORDER BY c.canal_id, sr.fecha_lectura_externa ASC
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
    
    // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor; channels_ubibot → ubi_canal;
    // parametrizaciones → ubi_presets_temperatura
    // SUPUESTO #3: threshold_min/max del preset del grupo
    const query = `
      SELECT
        DATE(sr.fecha_lectura_externa) AS date,
        c.canal_id AS channel_id,
        c.nombre AS chamber_name,
        AVG(sr.temperatura_externa) AS avg_temp,
        MIN(sr.temperatura_externa) AS min_temp,
        MAX(sr.temperatura_externa) AS max_temp,
        STDDEV(sr.temperatura_externa) AS std_dev,
        COUNT(*) AS reading_count,
        p.temperatura_minima AS threshold_min,
        p.temperatura_maxima AS threshold_max,
        SUM(CASE
          WHEN sr.temperatura_externa < p.temperatura_minima
            OR sr.temperatura_externa > p.temperatura_maxima
          THEN 1 ELSE 0
        END) AS breach_count,
        'group' AS threshold_type,
        'ubibot' AS sensor_type
      FROM ubi_lecturas_sensor sr
      JOIN ubi_canal c ON sr.id_canal = c.id_canal
      LEFT JOIN ubi_presets_temperatura p ON c.id_preset = p.id_preset
      WHERE sr.id_canal IN (SELECT id_canal FROM ubi_canal WHERE canal_id IN (${placeholders}))
        AND sr.fecha_lectura_externa BETWEEN ? AND ?
        AND sr.temperatura_externa IS NOT NULL
      GROUP BY DATE(sr.fecha_lectura_externa), c.canal_id, c.nombre,
               p.temperatura_minima, p.temperatura_maxima
      ORDER BY c.canal_id, date ASC
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
    const start1 = DateTime.fromISO(`${year1}-${month.toString().padStart(2, '0')}-01`).startOf('month');
    const end1 = start1.endOf('month');
    const start2 = DateTime.fromISO(`${year2}-${month.toString().padStart(2, '0')}-01`).startOf('month');
    const end2 = start2.endOf('month');

    const [year1Data, year2Data] = await Promise.all([
      this.fetchChamberDataAggregated(
        [chamberId],
        start1.toFormat('yyyy-MM-dd HH:mm:ss'),
        end1.toFormat('yyyy-MM-dd HH:mm:ss')
      ),
      this.fetchChamberDataAggregated(
        [chamberId],
        start2.toFormat('yyyy-MM-dd HH:mm:ss'),
        end2.toFormat('yyyy-MM-dd HH:mm:ss')
      )
    ]);

    return {
      year1: year1Data,
      year2: year2Data,
      period1: { start: start1.toFormat('yyyy-MM-dd'), end: end1.toFormat('yyyy-MM-dd') },
      period2: { start: start2.toFormat('yyyy-MM-dd'), end: end2.toFormat('yyyy-MM-dd') }
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
    const startDateTime = DateTime.fromISO(String(startDate)).startOf('day').toFormat('yyyy-MM-dd HH:mm:ss');
    const endDateTime = DateTime.fromISO(String(endDate)).endOf('day').toFormat('yyyy-MM-dd HH:mm:ss');

    // Migrado: sensor_readings_ubibot → ubi_lecturas_sensor
    // chamberId es API canal_id → resuelto a id_canal via subquery
    const query = `
      SELECT
        fecha_lectura_externa AS timestamp,
        LAG(fecha_lectura_externa) OVER (ORDER BY fecha_lectura_externa) AS prev_timestamp
      FROM ubi_lecturas_sensor
      WHERE id_canal = (SELECT id_canal FROM ubi_canal WHERE canal_id = ?)
        AND fecha_lectura_externa BETWEEN ? AND ?
      ORDER BY fecha_lectura_externa
    `;

    const rows = await databaseService.query(query, [chamberId, startDateTime, endDateTime]);
    
    const gaps = [];
    for (let i = 1; i < rows.length; i++) {
      const current = DateTime.fromISO(String(rows[i].timestamp));
      const previous = DateTime.fromISO(String(rows[i - 1].timestamp));
      const diffMinutes = current.diff(previous, 'minutes').minutes;

      if (diffMinutes > 15) {
        gaps.push({
          start: previous.toFormat('yyyy-MM-dd HH:mm:ss'),
          end: current.toFormat('yyyy-MM-dd HH:mm:ss'),
          duration_minutes: diffMinutes
        });
      }
    }

    return gaps;
  }
}

module.exports = new AIDataService();


