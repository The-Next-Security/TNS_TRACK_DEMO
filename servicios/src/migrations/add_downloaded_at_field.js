/**
 * Migration: Add downloaded_at field to generated_reports table
 * Date: 2025-10-29
 * Description: Adds a timestamp field to track when a report was first downloaded
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
    console.log('Adding downloaded_at field to generated_reports table...');

    await connection.execute(`
      ALTER TABLE generated_reports
      ADD COLUMN downloaded_at TIMESTAMP NULL DEFAULT NULL
      AFTER created_at
    `);

    console.log('✅ Field downloaded_at added successfully');

    await connection.end();
  } catch (error) {
    await connection.end();
    throw error;
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
    console.log('Removing downloaded_at field from generated_reports table...');

    await connection.execute(`
      ALTER TABLE generated_reports
      DROP COLUMN downloaded_at
    `);

    console.log('✅ Field downloaded_at removed successfully');

    await connection.end();
  } catch (error) {
    await connection.end();
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
