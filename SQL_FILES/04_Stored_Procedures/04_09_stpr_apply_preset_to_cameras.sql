CREATE DEFINER=`root`@`localhost` PROCEDURE `teltonika`.`sp_apply_preset_to_cameras`(
    IN p_preset_id INT,
    IN p_camera_ids TEXT, -- Comma-separated channel_ids
    IN p_applied_by VARCHAR(100)
)
BEGIN
    DECLARE v_preset_min DECIMAL(5,2);
    DECLARE v_preset_max DECIMAL(5,2);
    DECLARE v_preset_name VARCHAR(100);
    DECLARE cameras_updated INT DEFAULT 0;

    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error aplicando preset a cámaras';
    END;

    START TRANSACTION;

    -- Obtener valores del preset
    SELECT preset_min, preset_max, preset_name
    INTO v_preset_min, v_preset_max, v_preset_name
    FROM temperature_presets
    WHERE preset_id = p_preset_id AND is_active = 1;

    -- Validar que el preset existe
    IF v_preset_name IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Preset no encontrado o inactivo';
    END IF;

    -- Actualizar cámaras usando FIND_IN_SET con el CSV de IDs
    UPDATE channels_ubibot
    SET threshold_min = v_preset_min,
        threshold_max = v_preset_max,
        threshold_updated_by = p_applied_by
    WHERE FIND_IN_SET(channel_id, p_camera_ids) > 0;

    SET cameras_updated = ROW_COUNT();

    COMMIT;

    SELECT
        CONCAT('Preset "', v_preset_name, '" aplicado a ', cameras_updated, ' cámara(s)') as message,
        cameras_updated,
        v_preset_min as applied_min,
        v_preset_max as applied_max;
END