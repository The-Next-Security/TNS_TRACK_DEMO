-- =============================================================================
-- EVENTO: evn_recalcular_cuartiles_consumo
-- Base de datos: tns_cool_track
-- Descripción: Recalcula trimestralmente los cuartiles de consumo eléctrico
--              (CONSUMO BAJO, CONSUMO MEDIO, CONSUMO ALTO) por grupo de dispositivos.
--              Llama al SP stpr_calcular_cuartiles_consumo con p_primera_ejecucion=FALSE,
--              lo que hace que el SP analice el trimestre anterior al momento de ejecución.
-- Frecuencia: Cada 3 meses, a las 03:00 del primer día del trimestre.
-- Primera ejecución: 2026-04-01 03:00:00 (inicio Q2 2026 — primer trimestre completo disponible).
-- Referencia: SQL_FILES/04_Stored_Procedures/04_12_stpr_calcular_cuartiles_consumo.sql
-- =============================================================================

CREATE EVENT IF NOT EXISTS `tns_cool_track`.`evn_recalcular_cuartiles_consumo`
ON SCHEDULE EVERY 3 MONTH
STARTS '2026-04-01 03:00:00'
ON COMPLETION PRESERVE
ENABLE
COMMENT 'Recalcula cuartiles de consumo eléctrico por grupo cada trimestre'
DO
  CALL tns_cool_track.stpr_calcular_cuartiles_consumo(FALSE);

-- =============================================================================
-- INICIALIZACIÓN MANUAL (ejecutar UNA SOLA VEZ en producción):
-- Calcula cuartiles con todo el histórico disponible (p_primera_ejecucion = TRUE).
-- El evento trimestral solo analizará el trimestre anterior en cada ejecución futura.
--
-- CALL tns_cool_track.stpr_calcular_cuartiles_consumo(TRUE);
--
-- VERIFICACIÓN post-inicialización:
-- SELECT stp.nombre, LEFT(sc.valor, 200) AS valor, sc.valido_desde
-- FROM sem_tipos_parametros stp
-- JOIN sem_configuracion sc ON sc.id_tipo_parametro = stp.id_tipo_parametro
-- WHERE stp.nombre IN ('CONSUMO BAJO', 'CONSUMO MEDIO', 'CONSUMO ALTO')
--   AND sc.activo = 1
-- ORDER BY stp.nombre;
-- =============================================================================
