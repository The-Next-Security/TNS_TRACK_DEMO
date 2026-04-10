-- =============================================================================
-- 06_01_01_rep_reporteria_foundation.sql
-- Actualización: Fundación del módulo de reportería expandible
-- =============================================================================
-- Propósito: Dos ALTER TABLE que completan el diseño base del módulo de
--            reportería para que sea expandible a futuros tipos de reporte
--            sin cambiar el schema de BD.
--
-- Cambios:
--   1. rep_plantillas      → agrega id_tipo_origen (FK a gen_tipos_origen)
--   2. rep_reportes_programados → agrega parametros_ejecucion, id_usuario_creador,
--                                  conteo_ejecuciones
--
-- Ejecutar desde SQL_FILES/:
--   mysql -u root -p tns_cool_track < 06_Actualizaciones/06_01_rep_reporteria_foundation/06_01_01_rep_reporteria_foundation.sql
-- =============================================================================


-- =============================================================================
-- PARTE 1: rep_plantillas — vincular al origen de datos
-- =============================================================================
-- Cada plantilla declara explícitamente qué fuente de datos consume
-- (ubibot, shelly, sistema...). El frontend y el scheduler pueden saber
-- automáticamente qué tipo de entidades seleccionar sin hardcoding.
-- Agregar una plantilla futura solo requiere un INSERT con id_tipo_origen
-- correcto — este schema no cambiará.

ALTER TABLE rep_plantillas
  ADD COLUMN id_tipo_origen TINYINT UNSIGNED NULL
      COMMENT 'FK a gen_tipos_origen — fuente de datos que consume esta plantilla (ubibot, shelly, sistema...)'
      AFTER id_tipo_reporte,
  ADD INDEX idx_rep_plantillas_id_tipo_origen (id_tipo_origen),
  ADD CONSTRAINT fk_plantillas_id_tipo_origen_tipos_origen_id_tipo_origen
      FOREIGN KEY (id_tipo_origen)
      REFERENCES gen_tipos_origen(id_tipo_origen)
      ON DELETE RESTRICT ON UPDATE CASCADE;

-- Poblar datos existentes por nombre (robusto ante cambios de autoincrement)
UPDATE rep_plantillas p
  JOIN gen_tipos_origen g ON g.nombre = 'ubibot'
  SET p.id_tipo_origen = g.id_tipo_origen
  WHERE p.clave_plantilla = 'executive_temperature';

UPDATE rep_plantillas p
  JOIN gen_tipos_origen g ON g.nombre = 'shelly'
  SET p.id_tipo_origen = g.id_tipo_origen
  WHERE p.clave_plantilla = 'executive_consumption';

UPDATE rep_plantillas p
  JOIN gen_tipos_origen g ON g.nombre = 'sistema'
  SET p.id_tipo_origen = g.id_tipo_origen
  WHERE p.clave_plantilla = 'executive_alerts';


-- =============================================================================
-- PARTE 2: rep_reportes_programados — columnas de configuración de ejecución
-- =============================================================================
-- parametros_ejecucion: JSON libre por plantilla. Usa 'entityIds' (genérico)
--   en lugar de deviceIds/sensorIds/zoneIds para ser agnóstico al origen.
--   Ej actual:  {"periodType":"last_week","entityIds":[1,2,3],"includeComparative":true}
--   Ej futuro:  {"periodType":"last_month","zoneIds":[5,6],"granularity":"hourly"}
--
-- id_usuario_creador: permite ownership checks en la API (PUT/DELETE).
-- conteo_ejecuciones: contador de ejecuciones exitosas completadas.

ALTER TABLE rep_reportes_programados
  ADD COLUMN parametros_ejecucion JSON NULL
      COMMENT 'Parámetros de ejecución según plantilla. Estructura libre por origen: {periodType, entityIds, ...}. entityIds es agnóstico al tipo de entidad.'
      AFTER expresion_cron,
  ADD COLUMN id_usuario_creador INT UNSIGNED NULL
      COMMENT 'FK a gen_usuario — quién creó el schedule'
      AFTER parametros_ejecucion,
  ADD COLUMN conteo_ejecuciones INT UNSIGNED NOT NULL DEFAULT 0
      COMMENT 'Número de ejecuciones completadas exitosamente'
      AFTER id_usuario_creador,
  ADD INDEX idx_rep_reportes_programados_id_usuario_creador (id_usuario_creador),
  ADD CONSTRAINT fk_rep_prog_id_usuario_creador_gen_usuario_id_usuario
      FOREIGN KEY (id_usuario_creador)
      REFERENCES gen_usuario(id_usuario)
      ON DELETE SET NULL ON UPDATE CASCADE;
