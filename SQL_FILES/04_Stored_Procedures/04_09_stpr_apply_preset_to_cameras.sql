CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_apply_preset_to_cameras`(
    IN p_id_preset INT,
    IN p_ids_canales TEXT, -- IDs de canales separados por coma
    IN p_aplicado_por VARCHAR(100)
)
BEGIN
    DECLARE v_temp_minima DECIMAL(5,2);
    DECLARE v_temp_maxima DECIMAL(5,2);
    DECLARE v_nombre_preset VARCHAR(100);
    DECLARE v_canales_actualizados INT DEFAULT 0;

    DECLARE exit handler for sqlexception
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error aplicando preset a canales';
    END;

    START TRANSACTION;

    -- Obtener valores del preset
    SELECT temperatura_minima, temperatura_maxima, nombre_preset
    INTO v_temp_minima, v_temp_maxima, v_nombre_preset
    FROM ubi_presets_temperatura
    WHERE id_preset = p_id_preset AND activo = 1;

    -- Validar que el preset existe
    IF v_nombre_preset IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Preset no encontrado o inactivo';
    END IF;

    -- Actualizar canales usando FIND_IN_SET con el CSV de IDs
    UPDATE ubi_canal
    SET temperatura_minima_umbral = v_temp_minima,
        temperatura_maxima_umbral = v_temp_maxima,
        usuario_actualizacion_umbral = p_aplicado_por,
        fecha_actualizacion_umbral = NOW()
    WHERE FIND_IN_SET(id_canal, p_ids_canales) > 0;

    SET v_canales_actualizados = ROW_COUNT();

    COMMIT;

    SELECT
        CONCAT('Preset "', v_nombre_preset, '" aplicado a ', v_canales_actualizados, ' canal(es)') AS mensaje,
        v_canales_actualizados AS canales_actualizados,
        v_temp_minima AS temperatura_minima_aplicada,
        v_temp_maxima AS temperatura_maxima_aplicada;
END