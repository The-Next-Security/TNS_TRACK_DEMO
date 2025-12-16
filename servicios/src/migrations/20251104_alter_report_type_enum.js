/**
 * Database Migration: Alter report_type ENUM
 * Feature: 004-reportes-base-core Phase 9
 *
 * Adds 'consumption' to the report_type ENUM in report_templates table
 * Required before adding the consumption report template
 *
 * Usage:
 *   node servicios/src/migrations/20251104_alter_report_type_enum.js up
 *   node servicios/src/migrations/20251104_alter_report_type_enum.js down
 */

const mysql = require('mysql2/promise');
const configLoader = require('../config/js_files/config-loader');

// Database configuration
const dbConfigRaw = configLoader.getValue('database');
const dbConfig = {
  host: dbConfigRaw.host,
  port: dbConfigRaw.port,
  user: dbConfigRaw.username,
  password: dbConfigRaw.password,
  database: dbConfigRaw.database
};

/**
 * Run migration (UP)
 * Adds 'consumption' to report_type ENUM
 */
async function up() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check current ENUM values
    const [columns] = await connection.execute(
      `SHOW COLUMNS FROM report_templates WHERE Field = 'report_type'`
    );

    if (columns.length > 0) {
      console.log('Current report_type definition:', columns[0].Type);
      
      // Check if 'consumption' already exists
      if (columns[0].Type.includes('consumption')) {
        console.log('⚠️  ENUM already includes "consumption". Skipping alteration.');
        return;
      }
    }

    // Alter table to add 'consumption' to ENUM
    const query = `
      ALTER TABLE report_templates
      MODIFY COLUMN report_type ENUM('temperature', 'uptime', 'alerts', 'performance', 'consumption')
      NOT NULL DEFAULT 'temperature'
    `;

    await connection.execute(query);
    console.log('✅ Successfully added "consumption" to report_type ENUM');

    // Verify alteration
    const [updated] = await connection.execute(
      `SHOW COLUMNS FROM report_templates WHERE Field = 'report_type'`
    );

    if (updated.length > 0) {
      console.log('✅ Verification successful. New definition:', updated[0].Type);
    }

  } catch (error) {
    console.error('❌ Migration UP failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

/**
 * Rollback migration (DOWN)
 * Removes 'consumption' from report_type ENUM
 */
async function down() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if any rows use 'consumption'
    const [usageCheck] = await connection.execute(
      `SELECT COUNT(*) as count FROM report_templates WHERE report_type = 'consumption'`
    );

    if (usageCheck[0].count > 0) {
      console.log(`⚠️  Warning: ${usageCheck[0].count} template(s) use report_type='consumption'.`);
      console.log('   These templates will become invalid if you proceed.');
      console.log('   Consider deleting or updating these templates before rollback.');
    }

    // Alter table to remove 'consumption' from ENUM
    const query = `
      ALTER TABLE report_templates
      MODIFY COLUMN report_type ENUM('temperature', 'uptime', 'alerts', 'performance')
      NOT NULL DEFAULT 'temperature'
    `;

    await connection.execute(query);
    console.log('✅ Successfully removed "consumption" from report_type ENUM');

    // Verify alteration
    const [updated] = await connection.execute(
      `SHOW COLUMNS FROM report_templates WHERE Field = 'report_type'`
    );

    if (updated.length > 0) {
      console.log('✅ Verification successful. New definition:', updated[0].Type);
    }

  } catch (error) {
    console.error('❌ Migration DOWN failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'up') {
  console.log('🚀 Running migration UP: Add "consumption" to report_type ENUM');
  up()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration failed');
      process.exit(1);
    });
} else if (command === 'down') {
  console.log('🔄 Running migration DOWN: Remove "consumption" from report_type ENUM');
  down()
    .then(() => {
      console.log('✅ Rollback completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Rollback failed');
      process.exit(1);
    });
} else {
  console.log('Usage: node 20251104_alter_report_type_enum.js [up|down]');
  console.log('  up   - Add "consumption" to report_type ENUM');
  console.log('  down - Remove "consumption" from report_type ENUM');
  process.exit(1);
}

module.exports = { up, down };

