CREATE FUNCTION `tns_cool_track`.`fun_should_send_notification`(
    p_id_suscripcion INT,
    p_alert_type VARCHAR(20),
    p_is_critical BOOLEAN
) RETURNS tinyint(1)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE v_dnd_enabled BOOLEAN;
    DECLARE v_dnd_start TIME;
    DECLARE v_dnd_end TIME;
    DECLARE v_dnd_days JSON;
    DECLARE v_allow_critical BOOLEAN;
    DECLARE v_enabled_types JSON;
    DECLARE v_current_time TIME;
    DECLARE v_current_day VARCHAR(20);
    DECLARE v_is_in_dnd_period BOOLEAN DEFAULT FALSE;

    -- Obtener preferencias de la suscripción
    SELECT
        dnd_habilitado,
        hora_inicio_dnd,
        hora_fin_dnd,
        dias_dnd,
        permitir_alertas_criticas,
        tipos_alerta_habilitados
    INTO
        v_dnd_enabled,
        v_dnd_start,
        v_dnd_end,
        v_dnd_days,
        v_allow_critical,
        v_enabled_types
    FROM ale_preferencias_push
    WHERE id_suscripcion = p_id_suscripcion;

    -- Si no hay preferencias configuradas, permitir notificación
    IF v_dnd_enabled IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Verificar si el tipo de alerta está habilitado
    IF v_enabled_types IS NOT NULL THEN
        -- Si el array no contiene el tipo, rechazar
        IF NOT JSON_CONTAINS(v_enabled_types, JSON_QUOTE(p_alert_type)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Si DND no está habilitado, permitir notificación
    IF v_dnd_enabled = FALSE THEN
        RETURN TRUE;
    END IF;

    -- Si es crítica y se permiten críticas, permitir
    IF p_is_critical = TRUE AND v_allow_critical = TRUE THEN
        RETURN TRUE;
    END IF;

    -- Verificar si estamos en horario DND
    SET v_current_time = CURTIME();
    SET v_current_day = DAYNAME(NOW());

    -- Verificar día de la semana
    IF v_dnd_days IS NOT NULL THEN
        IF NOT JSON_CONTAINS(v_dnd_days, JSON_QUOTE(v_current_day)) THEN
            -- Hoy no es un día DND, permitir notificación
            RETURN TRUE;
        END IF;
    END IF;

    -- Verificar horario DND
    -- Caso 1: DND no cruza medianoche (ej: 22:00 - 23:59)
    IF v_dnd_start <= v_dnd_end THEN
        SET v_is_in_dnd_period = (v_current_time BETWEEN v_dnd_start AND v_dnd_end);
    -- Caso 2: DND cruza medianoche (ej: 22:00 - 08:00)
    ELSE
        SET v_is_in_dnd_period = (v_current_time >= v_dnd_start OR v_current_time <= v_dnd_end);
    END IF;

    -- Si estamos en período DND, bloquear notificación
    IF v_is_in_dnd_period THEN
        RETURN FALSE;
    END IF;

    -- En cualquier otro caso, permitir notificación
    RETURN TRUE;
END
