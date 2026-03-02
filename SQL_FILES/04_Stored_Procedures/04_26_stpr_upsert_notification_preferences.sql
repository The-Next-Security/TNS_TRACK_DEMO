CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_upsert_notification_preferences`(
    IN p_id_suscripcion INT,
    IN p_dnd_habilitado BOOLEAN,
    IN p_hora_inicio_dnd TIME,
    IN p_hora_fin_dnd TIME,
    IN p_dias_dnd JSON,
    IN p_permitir_alertas_criticas BOOLEAN,
    IN p_tipos_alerta_habilitados JSON
)
BEGIN
    -- MySQL 8.0: ON DUPLICATE KEY UPDATE para UPSERT
    INSERT INTO ale_preferencias_push (
        id_suscripcion,
        dnd_habilitado,
        hora_inicio_dnd,
        hora_fin_dnd,
        dias_dnd,
        permitir_alertas_criticas,
        tipos_alerta_habilitados
    ) VALUES (
        p_id_suscripcion,
        p_dnd_habilitado,
        p_hora_inicio_dnd,
        p_hora_fin_dnd,
        p_dias_dnd,
        p_permitir_alertas_criticas,
        p_tipos_alerta_habilitados
    )
    ON DUPLICATE KEY UPDATE
        dnd_habilitado = VALUES(dnd_habilitado),
        hora_inicio_dnd = VALUES(hora_inicio_dnd),
        hora_fin_dnd = VALUES(hora_fin_dnd),
        dias_dnd = VALUES(dias_dnd),
        permitir_alertas_criticas = VALUES(permitir_alertas_criticas),
        tipos_alerta_habilitados = VALUES(tipos_alerta_habilitados),
        fecha_actualizacion = CURRENT_TIMESTAMP;

    SELECT 'Preferencias actualizadas correctamente' AS mensaje;
END
