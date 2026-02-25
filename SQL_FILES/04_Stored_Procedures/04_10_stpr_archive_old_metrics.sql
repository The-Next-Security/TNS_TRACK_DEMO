CREATE DEFINER=`root`@`%` PROCEDURE `teltonika`.`sp_archive_old_metrics`(
    IN p_retention_months INT,
    OUT p_rows_deleted INT
)
BEGIN
    DECLARE v_cutoff_date DATE;

    SET v_cutoff_date = DATE_SUB(CURDATE(), INTERVAL p_retention_months MONTH);

    -- Opción 1: Mover a tabla de archivo (recomendado)
    -- INSERT INTO alert_metrics_summary_archive SELECT * FROM alert_metrics_summary WHERE date < v_cutoff_date;

    -- Opción 2: Eliminar directamente
    DELETE FROM alert_metrics_summary
    WHERE date < v_cutoff_date;

    SET p_rows_deleted = ROW_COUNT();

    SELECT CONCAT('Eliminadas ', p_rows_deleted, ' filas anteriores a ', v_cutoff_date) AS message;
END