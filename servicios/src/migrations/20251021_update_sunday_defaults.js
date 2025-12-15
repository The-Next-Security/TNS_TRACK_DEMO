/**
 * Migration: Update Sunday Schedule to Default (Send All Day)
 *
 * Updates sunday_start and sunday_end to default values:
 * - sunday_start: 23:59:59 (start >= end = send all day)
 * - sunday_end: 00:00:00
 *
 * Feature: 002-configurable-alert-schedules
 * Date: 2025-10-21
 */

const configLoader = require('../config/js_files/config-loader');
const mysql = require('mysql2/promise');

let connection = null;

async function up() {
  try {
    console.log('[Migration] Starting: Update Sunday defaults...');

    const dbConfig = configLoader.getConfig().database;

    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    });

    console.log('[Migration] Connected to database');

    // Update sunday_start to 23:59:59
    await connection.execute(
      `UPDATE alert_schedule_config
       SET config_value = '23:59:59', updated_by = 'system'
       WHERE config_key = 'sunday_start'`
    );
    console.log('[Migration] ✅ Updated sunday_start to 23:59:59');

    // Update sunday_end to 00:00:00 (already is, but for consistency)
    await connection.execute(
      `UPDATE alert_schedule_config
       SET config_value = '00:00:00', updated_by = 'system'
       WHERE config_key = 'sunday_end'`
    );
    console.log('[Migration] ✅ Updated sunday_end to 00:00:00');

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
    console.log('[Migration] Starting rollback: Revert Sunday to 00:00-00:00...');

    const dbConfig = configLoader.getConfig().database;

    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database
    });

    console.log('[Migration] Connected to database');

    await connection.execute(
      `UPDATE alert_schedule_config
       SET config_value = '00:00:00', updated_by = 'system'
       WHERE config_key = 'sunday_start'`
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
    console.error('[Migration] Usage: node 20251021_update_sunday_defaults.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
