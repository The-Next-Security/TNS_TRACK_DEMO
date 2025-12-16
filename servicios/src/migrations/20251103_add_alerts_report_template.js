/**
 * Migration: Add Alerts Report Template
 * Feature: 004-reportes-base-core (Phase 10 - US7)
 * Date: 2025-11-03
 *
 * Adds the 'executive_alerts' template to the report_templates table
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
    console.log('[Migration] Adding executive_alerts report template...');

    // Insert the alerts report template
    await connection.execute(`
      INSERT INTO report_templates
        (template_key, name, description, report_type, estimated_time_seconds,
         max_devices, max_days, supports_comparative, active)
      VALUES
        ('executive_alerts',
         'Reporte Ejecutivo de Alertas',
         'Análisis completo de alertas del sistema con métricas de respuesta, SLA y distribución temporal',
         'alerts',
         8,
         20,
         90,
         0,
         1)
    `);

    console.log('✓ Successfully added executive_alerts report template');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
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
    console.log('[Migration Rollback] Removing executive_alerts report template...');

    await connection.execute(`
      DELETE FROM report_templates WHERE template_key = 'executive_alerts'
    `);

    console.log('✓ Successfully removed executive_alerts report template');

  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

module.exports = { up, down };

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
