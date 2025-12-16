/**
 * Migration: Add Sunday Schedule Configuration
 *
 * Adds sunday_start and sunday_end configuration parameters
 * to allow independent Sunday schedule configuration.
 *
 * Feature: 002-configurable-alert-schedules (enhancement)
 * Date: 2025-10-21
 */

const configLoader = require('../config/js_files/config-loader');
const mysql = require('mysql2/promise');

let connection = null;

async function up() {
  try {
    console.log('[Migration] Starting: Add Sunday schedule configuration...');

    // Get database configuration
    const dbConfig = configLoader.getConfig().database;

    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    });

    console.log('[Migration] Connected to database');

    // Check if sunday_start already exists
    const [existing] = await connection.execute(
      `SELECT config_key FROM alert_schedule_config WHERE config_key = 'sunday_start'`
    );

    if (existing.length > 0) {
      console.log('[Migration] ⚠️  Sunday configuration already exists, skipping...');
      return;
    }

    // Insert sunday_start configuration
    await connection.execute(
      `INSERT INTO alert_schedule_config
       (config_key, config_value, description, updated_by)
       VALUES
       ('sunday_start', '00:00:00', 'Hora inicio domingo (00:00:00 = sin alertas)', 'system')`
    );
    console.log('[Migration] ✅ Inserted sunday_start configuration');

    // Insert sunday_end configuration
    await connection.execute(
      `INSERT INTO alert_schedule_config
       (config_key, config_value, description, updated_by)
       VALUES
       ('sunday_end', '00:00:00', 'Hora fin domingo (00:00:00 = sin alertas)', 'system')`
    );
    console.log('[Migration] ✅ Inserted sunday_end configuration');

    console.log('[Migration] ✅ Migration completed successfully');

  } catch (error) {
    console.error('[Migration] ❌ Error executing migration:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('[Migration] Connection closed');
    }
  }
}

async function down() {
  try {
    console.log('[Migration] Starting rollback: Remove Sunday schedule configuration...');

    // Get database configuration
    const dbConfig = configLoader.getConfig().database;

    // Create connection
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    });

    console.log('[Migration] Connected to database');

    // Delete sunday configurations
    await connection.execute(
      `DELETE FROM alert_schedule_config WHERE config_key IN ('sunday_start', 'sunday_end')`
    );

    console.log('[Migration] ✅ Rollback completed successfully');

  } catch (error) {
    console.error('[Migration] ❌ Error during rollback:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('[Migration] Connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'up') {
    up().then(() => {
      console.log('[Migration] Exiting...');
      process.exit(0);
    }).catch(error => {
      console.error('[Migration] Failed:', error);
      process.exit(1);
    });
  } else if (command === 'down') {
    down().then(() => {
      console.log('[Migration] Rollback exiting...');
      process.exit(0);
    }).catch(error => {
      console.error('[Migration] Rollback failed:', error);
      process.exit(1);
    });
  } else {
    console.error('[Migration] Usage: node 20251021_add_sunday_schedule.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
