/**
 * Migration: Create alert_schedule_config table
 * Feature: 002-configurable-alert-schedules
 * Description: Creates table for storing global alert sending schedule parameters
 * Created: 2025-10-21
 * Issue: https://github.com/TNSTRACK/servicios/issues/19
 */

const mysql = require('mysql2/promise');

/**
 * Run migration - Create alert_schedule_config table
 * @param {mysql.Connection} connection - MySQL connection
 */
async function up(connection) {
  console.log('[Migration UP] Creating alert_schedule_config table...');

  // Create table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`alert_schedule_config\` (
      \`config_id\` INT NOT NULL AUTO_INCREMENT COMMENT 'Identificador único del registro de configuración',
      \`config_key\` VARCHAR(50) NOT NULL COMMENT 'Clave única del parámetro (ej: weekday_start, respect_holidays)',
      \`config_value\` VARCHAR(20) NOT NULL COMMENT 'Valor del parámetro (formato HH:mm:ss para tiempos, true/false para booleanos)',
      \`description\` VARCHAR(255) NULL COMMENT 'Descripción legible del parámetro para administradores',
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp de última modificación',
      \`updated_by\` VARCHAR(100) NULL COMMENT 'Email o username del usuario que modificó el registro',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp de creación del registro',

      PRIMARY KEY (\`config_id\`),
      UNIQUE KEY \`uk_config_key\` (\`config_key\`),
      INDEX \`idx_updated_at\` (\`updated_at\`),
      INDEX \`idx_config_key_value\` (\`config_key\`, \`config_value\`)

    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Configuración dinámica de horarios de envío de alertas de temperatura';
  `);

  console.log('[Migration UP] Table created successfully');

  // Insert initial default configuration
  console.log('[Migration UP] Inserting default configuration records...');

  await connection.execute(`
    INSERT INTO \`alert_schedule_config\`
      (\`config_key\`, \`config_value\`, \`description\`, \`updated_by\`)
    VALUES
      ('weekday_start', '08:30:00', 'Hora inicio horario laboral días lunes a viernes', 'system'),
      ('weekday_end', '18:30:00', 'Hora fin horario laboral días lunes a viernes', 'system'),
      ('saturday_start', '08:30:00', 'Hora inicio horario laboral día sábado', 'system'),
      ('saturday_end', '14:30:00', 'Hora fin horario laboral día sábado', 'system'),
      ('respect_holidays', 'true', 'Si debe respetar feriados chilenos (true=sí enviar en feriados, false=no enviar)', 'system')
    ON DUPLICATE KEY UPDATE \`config_value\`=VALUES(\`config_value\`);
  `);

  console.log('[Migration UP] Default configuration inserted successfully');

  // Verify data
  const [rows] = await connection.execute(`
    SELECT config_key, config_value, description
    FROM alert_schedule_config
    ORDER BY config_id
  `);

  console.log('[Migration UP] Verification - Inserted records:');
  rows.forEach(row => {
    console.log(`  - ${row.config_key}: ${row.config_value} (${row.description})`);
  });

  console.log('[Migration UP] Migration completed successfully ✓');
}

/**
 * Rollback migration - Drop alert_schedule_config table
 * @param {mysql.Connection} connection - MySQL connection
 */
async function down(connection) {
  console.log('[Migration DOWN] Rolling back alert_schedule_config table...');

  await connection.execute(`
    DROP TABLE IF EXISTS \`alert_schedule_config\`;
  `);

  console.log('[Migration DOWN] Table dropped successfully');
  console.log('[Migration DOWN] Rollback completed ✓');
  console.log('[Migration DOWN] Note: Service will gracefully degrade to hardcoded defaults');
}

/**
 * Run migration (if executed directly)
 */
if (require.main === module) {
  const configLoader = require('../config/js_files/config-loader');

  (async () => {
    let connection;
    try {
      const dbConfig = configLoader.getConfig().database;
      connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database
      });
      console.log('Database connection established');

      const operation = process.argv[2];

      if (operation === 'up') {
        await up(connection);
      } else if (operation === 'down') {
        await down(connection);
      } else {
        console.log('Usage: node 20251021_create_alert_schedule_config.js [up|down]');
        process.exit(1);
      }

      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  })();
}

module.exports = { up, down };
