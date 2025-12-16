/**
 * Database Migration: Add Consumption Report Template
 * Feature: 004-reportes-base-core Phase 9 (T098)
 *
 * Adds the 'executive_consumption' report template to the report_templates table
 * Enables electrical consumption reports in the reporting system
 *
 * Usage:
 *   node servicios/src/migrations/20251104_add_consumption_report_template.js up
 *   node servicios/src/migrations/20251104_add_consumption_report_template.js down
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
 * Inserts the consumption report template
 */
async function up() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if template already exists
    const [existing] = await connection.execute(
      'SELECT id FROM report_templates WHERE template_key = ?',
      ['executive_consumption']
    );

    if (existing.length > 0) {
      console.log('⚠️  Consumption report template already exists. Skipping insertion.');
      return;
    }

    // Insert consumption report template
    const query = `
      INSERT INTO report_templates (
        template_key,
        name,
        description,
        report_type,
        estimated_time_seconds,
        max_devices,
        supports_comparative,
        active,
        created_at
      ) VALUES (
        'executive_consumption',
        'Reporte Ejecutivo Consumo Eléctrico',
        'Análisis de consumo, demanda máxima, factor de carga y costos eléctricos con KPIs operacionales, gráficos de tendencias y ranking de dispositivos',
        'consumption',
        45,
        50,
        1,
        1,
        NOW()
      )
    `;

    await connection.execute(query);
    console.log('✅ Successfully inserted consumption report template');

    // Verify insertion
    const [inserted] = await connection.execute(
      'SELECT * FROM report_templates WHERE template_key = ?',
      ['executive_consumption']
    );

    if (inserted.length > 0) {
      console.log('✅ Verification successful. Template details:');
      console.log('   ID:', inserted[0].id);
      console.log('   Name:', inserted[0].name);
      console.log('   Type:', inserted[0].report_type);
      console.log('   Estimated time:', inserted[0].estimated_time_seconds, 'seconds');
      console.log('   Max devices:', inserted[0].max_devices);
      console.log('   Supports comparative:', inserted[0].supports_comparative ? 'Yes' : 'No');
      console.log('   Active:', inserted[0].active ? 'Yes' : 'No');
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
 * Removes the consumption report template
 */
async function down() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check if template exists
    const [existing] = await connection.execute(
      'SELECT id FROM report_templates WHERE template_key = ?',
      ['executive_consumption']
    );

    if (existing.length === 0) {
      console.log('⚠️  Consumption report template does not exist. Nothing to rollback.');
      return;
    }

    // Check if there are any generated reports using this template
    const [reports] = await connection.execute(
      'SELECT COUNT(*) as count FROM generated_reports WHERE template_key = ?',
      ['executive_consumption']
    );

    if (reports[0].count > 0) {
      console.log(`⚠️  Warning: ${reports[0].count} generated reports exist using this template.`);
      console.log('   These reports will become orphaned if you proceed.');
      console.log('   Consider backing up generated_reports table before rollback.');
    }

    // Delete template
    await connection.execute(
      'DELETE FROM report_templates WHERE template_key = ?',
      ['executive_consumption']
    );

    console.log('✅ Successfully removed consumption report template');

    // Verify deletion
    const [check] = await connection.execute(
      'SELECT id FROM report_templates WHERE template_key = ?',
      ['executive_consumption']
    );

    if (check.length === 0) {
      console.log('✅ Verification successful. Template removed.');
    } else {
      console.log('❌ Verification failed. Template still exists.');
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
  console.log('🚀 Running migration UP: Add consumption report template');
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
  console.log('🔄 Running migration DOWN: Remove consumption report template');
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
  console.log('Usage: node 20251104_add_consumption_report_template.js [up|down]');
  console.log('  up   - Add consumption report template');
  console.log('  down - Remove consumption report template');
  process.exit(1);
}

module.exports = { up, down };

