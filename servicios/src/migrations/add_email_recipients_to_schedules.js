/**
 * Migration: Add email_recipients column to scheduled_reports table
 * Feature: 004-reportes-base-core Phase 7 (Email Notifications)
 *
 * Adds JSON column to store email recipients for automatic sending when scheduled reports are generated
 */

const mysql = require('mysql2/promise');
const configLoader = require('../config/js_files/config-loader');

async function up() {
  const dbConfig = configLoader.getValue('database');

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database
  });

  try {
    console.log('[Migration] Adding email_recipients column to scheduled_reports...');

    await connection.execute(`
      ALTER TABLE scheduled_reports
      ADD COLUMN email_recipients JSON DEFAULT NULL
      COMMENT 'Array of email addresses to automatically send report to when generated'
      AFTER options
    `);

    console.log('[Migration] ✅ Successfully added email_recipients column');
  } catch (error) {
    console.error('[Migration] ❌ Error adding email_recipients column:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

async function down() {
  const dbConfig = configLoader.getValue('database');

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database
  });

  try {
    console.log('[Migration] Removing email_recipients column from scheduled_reports...');

    await connection.execute(`
      ALTER TABLE scheduled_reports
      DROP COLUMN email_recipients
    `);

    console.log('[Migration] ✅ Successfully removed email_recipients column');
  } catch (error) {
    console.error('[Migration] ❌ Error removing email_recipients column:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run migration if executed directly
if (require.main === module) {
  const action = process.argv[2] || 'up';

  if (action === 'up') {
    up()
      .then(() => {
        console.log('[Migration] Migration completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('[Migration] Migration failed:', error);
        process.exit(1);
      });
  } else if (action === 'down') {
    down()
      .then(() => {
        console.log('[Migration] Rollback completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('[Migration] Rollback failed:', error);
        process.exit(1);
      });
  } else {
    console.error('Usage: node add_email_recipients_to_schedules.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
