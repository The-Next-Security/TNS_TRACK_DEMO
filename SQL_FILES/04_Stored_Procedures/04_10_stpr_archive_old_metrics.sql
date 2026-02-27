CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_archive_old_metrics`(
    IN p_meses_retencion INT,
    OUT p_filas_eliminadas INT
)
BEGIN
    DECLARE v_fecha_corte DATE;

    SET v_fecha_corte = DATE_SUB(CURDATE(), INTERVAL p_meses_retencion MONTH);

    -- Opción 1: Mover a tabla de archivo (recomendado)
    -- INSERT INTO ale_metricas_resumen_archivo SELECT * FROM ale_metricas_resumen WHERE fecha < v_fecha_corte;

    -- Opción 2: Eliminar directamente
    DELETE FROM ale_metricas_resumen
    WHERE fecha < v_fecha_corte;

    SET p_filas_eliminadas = ROW_COUNT();

    SELECT CONCAT('Eliminadas ', p_filas_eliminadas, ' filas anteriores a ', v_fecha_corte) AS mensaje;
END