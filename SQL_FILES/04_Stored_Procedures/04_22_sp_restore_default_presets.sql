DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_restore_default_presets`(
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
    UPDATE temperature_presets
    SET is_active = 0,
        updated_by = p_restored_by
    WHERE is_default = 0;

    -- Reactivar presets por defecto
    UPDATE temperature_presets
    SET is_active = 1,
        updated_by = p_restored_by
    WHERE is_default = 1;

    -- Registrar en historial
    INSERT INTO preset_change_history (
        action_type,
        new_values,
        changed_by,
        change_reason
    ) VALUES (
        'RESTORE_DEFAULTS',
        JSON_OBJECT('action', 'Presets restaurados a valores por defecto'),
        p_restored_by,
        'Restauración de presets del sistema'
    );

    COMMIT;

    SELECT 'Presets restaurados exitosamente' as message,
           (SELECT COUNT(*) FROM temperature_presets WHERE is_active = 1) as active_presets;
END ;;

DELIMITER ;
