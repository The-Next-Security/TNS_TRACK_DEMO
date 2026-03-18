CREATE PROCEDURE `tns_cool_track`.`stpr_cleanup_old_alerts`(IN p_dias_a_mantener INT)
BEGIN
    DECLARE v_eliminados INT DEFAULT 0;

    DELETE FROM ale_seguimiento
    WHERE estado IN ('resuelto', 'falsa_alarma')
    AND fecha_resolucion < DATE_SUB(NOW(), INTERVAL p_dias_a_mantener DAY);

    SET v_eliminados = ROW_COUNT();

    SELECT v_eliminados AS alertas_eliminadas;
END
