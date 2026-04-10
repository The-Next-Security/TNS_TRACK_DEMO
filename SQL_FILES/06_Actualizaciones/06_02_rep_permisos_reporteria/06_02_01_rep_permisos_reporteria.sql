-- =============================================================================
-- 06_02_01_rep_permisos_reporteria.sql
-- Actualización: Permisos granulares del módulo de reportería
-- =============================================================================
-- Propósito: Agregar el permiso manage_reports que el middleware
--            reportPermissions_Middleware.js verifica para generar, programar
--            y enviar reportes. Asignarlo a todos los usuarios activos.
--
-- Diseño (2 permisos del módulo):
--   view_temperature_reports (ID 9, ya existe) → acceso de lectura al módulo
--   manage_reports (nuevo)                     → generar + programar + enviar
--
-- INSERT IGNORE hace la migración idempotente (seguro de correr más de una vez).
-- gen_permiso tiene UNIQUE KEY (nombre) y gen_usuario_permisos tiene PK compuesta
-- (id_usuario, id_permiso), por lo que INSERT IGNORE falla silenciosamente si
-- el registro ya existe.
--
-- Ejecutar desde SQL_FILES/:
--   mysql -u root -p tns_cool_track < 06_Actualizaciones/06_02_rep_permisos_reporteria/06_02_01_rep_permisos_reporteria.sql
-- =============================================================================

INSERT IGNORE INTO gen_permiso (nombre, descripcion, activo) VALUES
  ('manage_reports', 'Permiso para generar, programar y enviar reportes', 1);

-- Asignar manage_reports a todos los usuarios activos.
-- JOIN por nombre — robusto ante cambios de autoincrement.
-- INSERT IGNORE evita error si ya existe la asignación.
INSERT IGNORE INTO gen_usuario_permisos (id_usuario, id_permiso)
SELECT u.id_usuario, p.id_permiso
FROM gen_usuario u
CROSS JOIN gen_permiso p
WHERE p.nombre = 'manage_reports'
  AND u.activo = 1;
