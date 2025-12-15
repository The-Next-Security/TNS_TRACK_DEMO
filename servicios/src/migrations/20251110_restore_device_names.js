/**
 * Migration: Restore Real Device Names
 * Feature: 004-reportes-base-core Phase 9
 * Date: 2025-11-10
 *
 * Restores the real names of Shelly devices based on their location
 * Replaces "Dummy #" names with actual location names (Camara 1, Camara 2, Reefer A, etc.)
 *
 * Usage: node servicios/src/migrations/20251110_restore_device_names.js
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

async function restoreDeviceNames() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Update device names based on their location
    // This includes devices with "Dummy" names and also ensures all devices match their location
    // Using COLLATE to handle different collations
    const updateQuery = `
      UPDATE sem_dispositivos sd
      INNER JOIN catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
      SET sd.nombre = cur.nombre_ubicacion,
          sd.descripcion = CONCAT('Medidor de energía eléctrica - ', cur.nombre_ubicacion),
          sd.fecha_actualizacion = NOW()
      WHERE (sd.nombre LIKE 'Dummy%' COLLATE utf8mb4_unicode_ci 
             OR BINARY sd.nombre != BINARY cur.nombre_ubicacion)
        AND sd.activo = 1
    `;

    const [result] = await connection.execute(updateQuery);
    console.log(`✅ Updated ${result.affectedRows} device(s)`);

    // Verify the updates
    const verifyQuery = `
      SELECT 
          sd.shelly_id,
          sd.nombre as device_name,
          cur.nombre_ubicacion as location_name,
          sd.activo
      FROM sem_dispositivos sd
      INNER JOIN catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
      WHERE sd.activo = 1
      ORDER BY cur.nombre_ubicacion, sd.nombre
    `;

    const [devices] = await connection.execute(verifyQuery);
    
    console.log('\n📋 Verification - Active devices:');
    console.log('─'.repeat(60));
    devices.forEach(device => {
      const match = device.device_name === device.location_name ? '✅' : '⚠️';
      console.log(`${match} ${device.device_name.padEnd(20)} (${device.shelly_id}) -> ${device.location_name}`);
    });
    console.log('─'.repeat(60));
    console.log(`\n✅ Total: ${devices.length} active device(s)`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run migration
console.log('🚀 Restoring device names from locations...\n');
restoreDeviceNames()
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed');
    process.exit(1);
  });

module.exports = { restoreDeviceNames };

