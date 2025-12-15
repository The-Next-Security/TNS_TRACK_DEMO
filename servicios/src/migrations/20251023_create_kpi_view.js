/**
 * Database Migration: Create KPI Aggregation View
 *
 * Creates view: v_daily_temperature_kpis
 * Pre-calculates daily temperature statistics per device for faster report generation
 *
 * Tables used:
 * - sensor_readings_ubibot: Temperature readings data
 * - channels_ubibot: Device configuration and thresholds
 *
 * Columns:
 * - channel_id: Device identifier (from channels_ubibot)
 * - device_name: Device name
 * - date: Aggregation date
 * - avg_temp: Average external_temperature for the day
 * - min_temp: Minimum external_temperature recorded
 * - max_temp: Maximum external_temperature recorded
 * - stddev_temp: Standard deviation (temperature variability)
 * - readings_total: Total number of measurements
 * - readings_out_of_range: Count of measurements outside threshold_min/threshold_max
 * - threshold_min: Device minimum threshold
 * - threshold_max: Device maximum threshold
 *
 * Run: node servicios/src/migrations/20251023_create_kpi_view.js up
 * Rollback: node servicios/src/migrations/20251023_create_kpi_view.js down
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'storage_camaras',
  port: process.env.DB_PORT || 3306
};

/**
 * UP Migration - Create view
 */
async function up() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Drop view if exists (for idempotency)
    await connection.execute('DROP VIEW IF EXISTS v_daily_temperature_kpis');

    // Create aggregated view for daily KPIs
    // Uses actual schema: sensor_readings_ubibot + channels_ubibot
    await connection.execute(`
      CREATE VIEW v_daily_temperature_kpis AS
      SELECT
        sr.channel_id,
        ch.name AS device_name,
        DATE(sr.timestamp) AS date,
        AVG(sr.external_temperature) AS avg_temp,
        MIN(sr.external_temperature) AS min_temp,
        MAX(sr.external_temperature) AS max_temp,
        STDDEV(sr.external_temperature) AS stddev_temp,
        COUNT(*) AS readings_total,
        SUM(CASE
          WHEN sr.external_temperature < ch.threshold_min
            OR sr.external_temperature > ch.threshold_max
          THEN 1
          ELSE 0
        END) AS readings_out_of_range,
        ch.threshold_min,
        ch.threshold_max
      FROM
        sensor_readings_ubibot sr
      INNER JOIN
        channels_ubibot ch ON sr.channel_id = ch.channel_id
      WHERE
        sr.external_temperature IS NOT NULL
        AND ch.esOperativa = 1
      GROUP BY
        sr.channel_id,
        ch.name,
        DATE(sr.timestamp),
        ch.threshold_min,
        ch.threshold_max
      ORDER BY
        sr.channel_id, date DESC;
    `);
    console.log('✓ Created view: v_daily_temperature_kpis');

    console.log('\n✅ Migration UP completed successfully');
    console.log('\nView details:');
    console.log('- Source tables: sensor_readings_ubibot + channels_ubibot');
    console.log('- Aggregation: Daily statistics per channel_id');
    console.log('- Filters: Only operational devices (esOperativa = 1)');
    console.log('- Thresholds: Uses individual channel threshold_min/threshold_max');
  } catch (error) {
    console.error('❌ Migration UP failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify sensor_readings_ubibot table exists');
    console.error('2. Verify columns: channel_id, timestamp, external_temperature');
    console.error('3. Verify channels_ubibot table exists with threshold_min, threshold_max columns');
    console.error('4. Verify FK constraint: sensor_readings_ubibot.channel_id -> channels_ubibot.channel_id');
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

/**
 * DOWN Migration - Drop view (rollback)
 */
async function down() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    await connection.execute('DROP VIEW IF EXISTS v_daily_temperature_kpis');
    console.log('✓ Dropped view: v_daily_temperature_kpis');

    console.log('\n✅ Migration DOWN completed successfully');
  } catch (error) {
    console.error('❌ Migration DOWN failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// CLI Execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'up') {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (command === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    console.error('Usage: node 20251023_create_kpi_view.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
