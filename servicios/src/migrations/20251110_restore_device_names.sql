/**
 * Migration: Restore Real Device Names
 * Feature: 004-reportes-base-core Phase 9
 * Date: 2025-11-10
 *
 * Restores the real names of Shelly devices based on their location
 * Replaces "Dummy #" names with actual location names (Camara 1, Camara 2, Reefer A, etc.)
 */

USE teltonika;

-- Update device names based on their location
-- This will set the device name to match the location name (e.g., "Camara 1", "Reefer A")
UPDATE sem_dispositivos sd
INNER JOIN catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
SET sd.nombre = cur.nombre_ubicacion,
    sd.descripcion = CONCAT('Medidor de energía eléctrica - ', cur.nombre_ubicacion),
    sd.fecha_actualizacion = NOW()
WHERE sd.nombre LIKE 'Dummy%'
  AND sd.activo = 1;

-- Verify the updates
SELECT 
    sd.shelly_id,
    sd.nombre as device_name,
    cur.nombre_ubicacion as location_name,
    sd.activo
FROM sem_dispositivos sd
INNER JOIN catalogo_ubicaciones_reales cur ON sd.ubicacion = cur.idcatalogo_ubicaciones_reales
WHERE sd.activo = 1
ORDER BY cur.nombre_ubicacion, sd.nombre;

