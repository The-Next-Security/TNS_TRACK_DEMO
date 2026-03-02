CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_restore_default_presets`(
    IN p_restored_by VARCHAR(100)
)
BEGIN
    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error restaurando presets por defecto';
    END;

    START TRANSACTION;

    -- Desactivar presets personalizados (no eliminar para mantener historial)
    UPDATE ubi_presets_temperatura
    SET activo = 0,
        actualizado_por = p_restored_by
    WHERE es_predeterminado = 0;

    -- Reactivar presets por defecto
    UPDATE ubi_presets_temperatura
    SET activo = 1,
        actualizado_por = p_restored_by
    WHERE es_predeterminado = 1;

    -- Registrar en log del SP (los triggers ya capturan cada fila en log_ubi_presets_temperatura)
    INSERT INTO log_stored_procedures (sp_nombre, tipo_operacion, tabla_afectada, mensaje)
    VALUES (
        'stpr_restore_default_presets',
        'UPDATE',
        'ubi_presets_temperatura',
        CONCAT('Presets restaurados a valores por defecto por: ', p_restored_by)
    );

    COMMIT;

    SELECT 'Presets restaurados exitosamente' AS mensaje,
           (SELECT COUNT(*) FROM ubi_presets_temperatura WHERE activo = 1) AS presets_activos;
END
