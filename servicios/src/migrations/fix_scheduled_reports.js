/**
 * Fix scheduled_reports table - Change template_id to report_type
 * Run: node servicios/src/migrations/fix_scheduled_reports.js
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Clev2.Thenext',
  database: 'teltonika'
};

async function fix() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('🔧 Conectado a la base de datos\n');

    // 1. Eliminar foreign key primero
    try {
      await conn.execute('ALTER TABLE scheduled_reports DROP FOREIGN KEY scheduled_reports_ibfk_1');
      console.log('✓ Foreign key eliminada');
    } catch (e) {
      console.log('⚠ Foreign key no existía o ya fue eliminada');
    }

    // 2. Eliminar índice template_id si existe
    try {
      await conn.execute('ALTER TABLE scheduled_reports DROP INDEX idx_template_id');
      console.log('✓ Índice idx_template_id eliminado');
    } catch (e) {
      console.log('⚠ Índice idx_template_id no existía');
    }

    // 3. Cambiar template_id a report_type
    await conn.execute(`
      ALTER TABLE scheduled_reports
      CHANGE COLUMN template_id report_type VARCHAR(100) NOT NULL DEFAULT 'executive_temperature'
      COMMENT 'Report type key'
    `);
    console.log('✓ Columna template_id cambiada a report_type');

    // 4. Agregar índice para report_type
    try {
      await conn.execute('ALTER TABLE scheduled_reports ADD INDEX idx_report_type (report_type)');
      console.log('✓ Índice idx_report_type agregado');
    } catch (e) {
      console.log('⚠ Índice idx_report_type ya existe');
    }

    // 5. Verificar cambios
    const [rows] = await conn.execute('DESCRIBE scheduled_reports');
    console.log('\n✅ Estructura actualizada de scheduled_reports:');
    const reportTypeRow = rows.find(r => r.Field === 'report_type');
    if (reportTypeRow) {
      console.log('  ✓ report_type:', reportTypeRow.Type);
      console.log('  ✓ Default:', reportTypeRow.Default);
    }

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('👉 Ahora reinicia el servidor con: npm run start-server\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (conn) {
      await conn.end();
      console.log('Conexión cerrada');
    }
  }
}

fix()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
