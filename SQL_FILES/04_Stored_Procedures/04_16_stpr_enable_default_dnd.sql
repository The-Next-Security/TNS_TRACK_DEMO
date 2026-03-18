CREATE PROCEDURE `tns_cool_track`.`stpr_enable_default_dnd`(
    IN p_id_suscripcion INT
)
BEGIN
    CALL stpr_upsert_notification_preferences(
        p_id_suscripcion,
        TRUE,                                                                           -- dnd_habilitado
        '22:00:00',                                                                     -- hora_inicio_dnd
        '08:00:00',                                                                     -- hora_fin_dnd
        JSON_ARRAY('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), -- todos los días
        TRUE,                                                                           -- permitir_alertas_criticas
        NULL                                                                            -- tipos_alerta_habilitados (todos)
    );

    SELECT 'DND habilitado: 22:00-08:00, todos los días, permitir alertas críticas' AS mensaje;
END
