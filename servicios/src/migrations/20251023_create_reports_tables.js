/**
 * Database Migration: Create Reports Tables
 *
 * Creates 4 core tables for the Reports module:
 * 1. report_templates - Report type definitions and metadata
 * 2. generated_reports - Historical record of all generated reports
 * 3. scheduled_reports - Scheduled report configurations
 * 4. schedule_execution_log - Audit log of schedule executions
 *
 * Run: node servicios/src/migrations/20251023_create_reports_tables.js up
 * Rollback: node servicios/src/migrations/20251023_create_reports_tables.js down
 */

const mysql = require('mysql2/promise');
const configLoader = require('../config/js_files/config-loader');

// Database configuration from unified-config.json
const config = configLoader.getConfig();
const dbConfig = {
  host: config.database.host,
  user: config.database.username,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port
};

/**
 * UP Migration - Create tables
 */
async function up() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // 1. Create report_templates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'Unique identifier (e.g., executive_temperature)',
        name VARCHAR(255) NOT NULL COMMENT 'Display name (e.g., Reporte Ejecutivo de Temperaturas)',
        description TEXT COMMENT 'Detailed description for users',
        report_type ENUM('temperature', 'uptime', 'alerts', 'performance') NOT NULL DEFAULT 'temperature',
        estimated_time_seconds INT DEFAULT 30 COMMENT 'Estimated generation time',
        max_devices INT DEFAULT 50 COMMENT 'Maximum devices per report',
        max_days INT DEFAULT 365 COMMENT 'Maximum day range per report',
        supports_comparative BOOLEAN DEFAULT false COMMENT 'Supports period comparison',
        active BOOLEAN DEFAULT true COMMENT 'Template is available for use',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_template_key (template_key),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Available report templates and their metadata';
    `);
    console.log('✓ Created table: report_templates');

    // 2. Create generated_reports table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS generated_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL COMMENT 'FK to report_templates.id',
        report_name VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., Reporte Semanal Cámaras Frío)',
        file_path VARCHAR(500) NOT NULL COMMENT 'Relative path to PDF file',
        file_size_bytes BIGINT COMMENT 'File size in bytes',
        report_config JSON NOT NULL COMMENT 'Generation config (deviceIds, dates, options)',
        period_start_date DATE NOT NULL COMMENT 'Report period start',
        period_end_date DATE NOT NULL COMMENT 'Report period end',
        device_ids JSON NOT NULL COMMENT 'Array of device IDs included in report',
        generation_status ENUM('pending', 'generating', 'completed', 'failed', 'expired') DEFAULT 'pending',
        generation_time_seconds INT COMMENT 'Actual generation time',
        generation_error TEXT COMMENT 'Error message if failed',
        created_by INT NOT NULL COMMENT 'FK to users.id',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expired_at TIMESTAMP NULL COMMENT 'Auto-set when TTL cleanup deletes file',
        source VARCHAR(50) DEFAULT 'manual' COMMENT 'manual, scheduled, api',
        schedule_id INT NULL COMMENT 'FK to scheduled_reports.id if auto-generated',
        FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE RESTRICT,
        INDEX idx_created_by (created_by),
        INDEX idx_created_at (created_at),
        INDEX idx_template_id (template_id),
        INDEX idx_generation_status (generation_status),
        INDEX idx_period_dates (period_start_date, period_end_date),
        INDEX idx_schedule_id (schedule_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Historical record of all generated reports';
    `);
    console.log('✓ Created table: generated_reports');

    // 3. Create scheduled_reports table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL COMMENT 'User-defined schedule name',
        report_type VARCHAR(100) NOT NULL DEFAULT 'executive_temperature' COMMENT 'Report type key',
        frequency ENUM('daily', 'weekly', 'monthly') NOT NULL DEFAULT 'weekly',
        day_of_week INT NULL COMMENT '0=Sunday, 6=Saturday (for weekly)',
        day_of_month INT NULL COMMENT '1-31 (for monthly)',
        execution_time TIME NOT NULL DEFAULT '08:00:00' COMMENT 'Time to execute (HH:MM:SS)',
        timezone VARCHAR(50) DEFAULT 'America/Santiago' COMMENT 'Timezone for execution time',
        period_type ENUM('last_day', 'last_week', 'last_month', 'custom') NOT NULL DEFAULT 'last_week' COMMENT 'Dynamic period calculation',
        custom_period_days INT NULL COMMENT 'Number of days for custom period',
        device_ids JSON NOT NULL COMMENT 'Array of device IDs to include',
        options JSON COMMENT 'Report options (includeComparative, etc)',
        active BOOLEAN DEFAULT true COMMENT 'Schedule is enabled',
        last_execution TIMESTAMP NULL COMMENT 'Last successful execution timestamp',
        next_execution TIMESTAMP NULL COMMENT 'Calculated next execution time',
        execution_count INT DEFAULT 0 COMMENT 'Total number of executions',
        created_by INT NOT NULL COMMENT 'FK to users.id',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active_next_execution (active, next_execution),
        INDEX idx_created_by (created_by),
        INDEX idx_report_type (report_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Scheduled report configurations';
    `);
    console.log('✓ Created table: scheduled_reports');

    // 4. Create schedule_execution_log table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schedule_execution_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL COMMENT 'FK to scheduled_reports.id',
        report_id INT NULL COMMENT 'FK to generated_reports.id if successful',
        execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Actual execution timestamp',
        execution_status ENUM('success', 'failed', 'skipped') NOT NULL,
        execution_duration_seconds INT COMMENT 'Time taken to generate report',
        error_message TEXT COMMENT 'Error details if failed',
        FOREIGN KEY (schedule_id) REFERENCES scheduled_reports(id) ON DELETE CASCADE,
        FOREIGN KEY (report_id) REFERENCES generated_reports(id) ON DELETE SET NULL,
        INDEX idx_schedule_id (schedule_id),
        INDEX idx_execution_time (execution_time),
        INDEX idx_execution_status (execution_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='Audit log of scheduled report executions';
    `);
    console.log('✓ Created table: schedule_execution_log');

    // Insert default report template
    await connection.execute(`
      INSERT INTO report_templates
        (template_key, name, description, report_type, estimated_time_seconds, max_devices, max_days, supports_comparative, active)
      VALUES
        ('executive_temperature',
         'Reporte Ejecutivo de Temperaturas',
         'Reporte completo con KPIs consolidados, gráficos de tendencias, heatmaps y análisis comparativo de temperaturas',
         'temperature',
         30,
         50,
         365,
         true,
         true)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
    `);
    console.log('✓ Inserted default report template: executive_temperature');

    console.log('\n✅ Migration UP completed successfully');
  } catch (error) {
    console.error('❌ Migration UP failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

/**
 * DOWN Migration - Drop tables (rollback)
 */
async function down() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Drop tables in reverse order to respect foreign key constraints
    await connection.execute('DROP TABLE IF EXISTS schedule_execution_log');
    console.log('✓ Dropped table: schedule_execution_log');

    await connection.execute('DROP TABLE IF EXISTS scheduled_reports');
    console.log('✓ Dropped table: scheduled_reports');

    await connection.execute('DROP TABLE IF EXISTS generated_reports');
    console.log('✓ Dropped table: generated_reports');

    await connection.execute('DROP TABLE IF EXISTS report_templates');
    console.log('✓ Dropped table: report_templates');

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
    console.error('Usage: node 20251023_create_reports_tables.js [up|down]');
    process.exit(1);
  }
}

module.exports = { up, down };
