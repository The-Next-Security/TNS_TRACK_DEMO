CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_cleanup_old_push_subscriptions`(IN p_dias_inactivo INT)
BEGIN
    UPDATE ale_push_suscripciones
    SET activo = FALSE
    WHERE activo = TRUE
      AND (ultima_conexion IS NULL OR ultima_conexion < DATE_SUB(NOW(), INTERVAL p_dias_inactivo DAY))
      AND (ultima_notificacion_enviada IS NULL OR ultima_notificacion_enviada < DATE_SUB(NOW(), INTERVAL p_dias_inactivo DAY));

    SELECT ROW_COUNT() AS suscripciones_desactivadas;
END