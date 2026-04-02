-- ============================================================
-- Optimizaciones de índices para performance del dashboard
-- Fecha: 2026-03-30
-- Motivo: El dashboard de temperatura hace ROW_NUMBER() OVER
--         (ORDER BY fecha_lectura_externa DESC) sobre ubi_lecturas_sensor.
--         Sin índice en fecha_lectura_externa, esto genera full table scan.
-- ============================================================

-- Índice sobre fecha_lectura_externa para optimizar el ROW_NUMBER() del dashboard
-- Permite al motor MySQL usar range scan en vez de full table scan
ALTER TABLE ubi_lecturas_sensor
  ADD INDEX idx_ubi_lecturas_sensor_fecha_lectura_externa (fecha_lectura_externa);

-- Índice compuesto (id_canal, fecha_lectura_externa) para optimizar aún más
-- el PARTITION BY id_canal ORDER BY fecha_lectura_externa DESC
ALTER TABLE ubi_lecturas_sensor
  ADD INDEX `idx_ubi_lecturas_sensor_id_canal_fecha_lectura_externa` (id_canal, fecha_lectura_externa);
