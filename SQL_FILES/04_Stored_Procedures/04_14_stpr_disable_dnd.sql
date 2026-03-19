CREATE PROCEDURE `tns_cool_track`.`stpr_disable_dnd`(
    IN p_id_suscripcion INT
)
BEGIN
    UPDATE ale_preferencias_push
    SET dnd_habilitado = FALSE,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id_suscripcion = p_id_suscripcion;

    SELECT 'DND deshabilitado' AS mensaje;
END