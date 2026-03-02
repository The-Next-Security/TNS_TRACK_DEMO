CREATE DEFINER=`root`@`%` FUNCTION `tns_cool_track`.`fun_process_totales_hora`(
    p_hora_local TIMESTAMP
) RETURNS tinyint(1)
    DETERMINISTIC
BEGIN
    DECLARE v_id_totales_hora BIGINT;
    DECLARE v_success BOOLEAN DEFAULT FALSE;
    DECLARE v_precio_kwh DECIMAL(10,2);
    DECLARE v_intervalo_segundos INT DEFAULT 10;
    DECLARE v_registro_existe BOOLEAN;
    DECLARE v_datos_anteriores JSON;
    DECLARE v_siguiente_hora TIMESTAMP;

    -- Definir el intervalo de hora
    SET v_siguiente_hora = DATE_ADD(p_hora_local, INTERVAL 1 HOUR);

    -- Verificar si existe el registro
    SELECT EXISTS(
        SELECT 1
        FROM sem_totales_hora
        WHERE hora_local = p_hora_local
        LIMIT 1
    ) INTO v_registro_existe;

    -- Si existe, obtener el ID
    IF v_registro_existe THEN
        SELECT id_totales_hora INTO v_id_totales_hora
        FROM sem_totales_hora
        WHERE hora_local = p_hora_local
        LIMIT 1;
    END IF;

    -- Obtener precio kWh vigente
    SELECT CAST(valor AS DECIMAL(10,2))
    INTO v_precio_kwh
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'PRECIO_KWH'
    AND c.activo = 1
    AND c.valido_desde <= p_hora_local
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_hora_local)
    LIMIT 1;

    -- Obtener intervalo de recolección configurado (en segundos)
    SELECT CAST(valor AS UNSIGNED)
    INTO v_intervalo_segundos
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'INTERVALO_RECOLECCION'
    AND c.activo = 1
    AND c.valido_desde <= p_hora_local
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_hora_local)
    LIMIT 1;

    -- Si no hay configuración del intervalo, usar valor por defecto (10 segundos)
    IF v_intervalo_segundos IS NULL OR v_intervalo_segundos = 0 THEN
        SET v_intervalo_segundos = 10;
    END IF;

    -- Guardar datos anteriores para auditoría si existe el registro
    IF v_registro_existe THEN
        SELECT JSON_OBJECT(
            'hora_local', hora_local,
            'energia_activa_total', energia_activa_total,
            'energia_reactiva_total', energia_reactiva_total,
            'precio_kwh_periodo', precio_kwh_periodo,
            'costo_total', costo_total,
            'lecturas_validas', lecturas_validas,
            'calidad_datos', calidad_datos
        ) INTO v_datos_anteriores
        FROM sem_totales_hora
        WHERE id_totales_hora = v_id_totales_hora;
    END IF;

    -- Crear o actualizar registro usando UPSERT
    -- La calidad se calcula: (lecturas reales / lecturas esperadas) * 100
    -- Lecturas esperadas por hora = 3600 / intervalo_segundos
    INSERT INTO sem_totales_hora (
        shelly_id,
        hora_local,
        energia_activa_total,
        energia_reactiva_total,
        potencia_maxima,
        potencia_minima,
        precio_kwh_periodo,
        costo_total,
        lecturas_validas,
        calidad_datos
    )
    SELECT
        m.shelly_id,
        p_hora_local,
        -- Cálculo de energía activa en kWh: (potencia * intervalo_segundos) / (3600 * 1000)
        (SUM(m.potencia_activa * v_intervalo_segundos) / (3600 * 1000)) as energia_activa_total,
        -- Cálculo de energía reactiva en kvarh
        (SUM(m.potencia_aparente * v_intervalo_segundos * SQRT(1 - POWER(m.factor_potencia, 2))) / (3600 * 1000)) as energia_reactiva_total,
        MAX(m.potencia_activa) as potencia_maxima,
        MIN(m.potencia_activa) as potencia_minima,
        v_precio_kwh as precio_kwh_periodo,
        -- Cálculo del costo basado en la energía activa
        (SUM(m.potencia_activa * v_intervalo_segundos) / (3600 * 1000)) * v_precio_kwh as costo_total,
        COUNT(*) as lecturas_validas,
        -- Calidad: (lecturas reales / lecturas esperadas) * 100, lecturas esperadas = 3600 / intervalo
        (COUNT(*) * 100.0 / (3600 / v_intervalo_segundos)) as calidad_datos
    FROM sem_mediciones m
    WHERE m.timestamp_local >= p_hora_local
    AND m.timestamp_local < v_siguiente_hora
    AND m.fase = 'TOTAL'
    AND m.calidad_lectura IN ('NORMAL', 'INTERPOLADA')
    GROUP BY m.shelly_id
    ON DUPLICATE KEY UPDATE
        energia_activa_total = VALUES(energia_activa_total),
        energia_reactiva_total = VALUES(energia_reactiva_total),
        potencia_maxima = VALUES(potencia_maxima),
        potencia_minima = VALUES(potencia_minima),
        precio_kwh_periodo = VALUES(precio_kwh_periodo),
        costo_total = VALUES(costo_total),
        lecturas_validas = VALUES(lecturas_validas),
        calidad_datos = VALUES(calidad_datos),
        fecha_actualizacion = CURRENT_TIMESTAMP;

    -- Registrar en log si hubo cambios
    IF ROW_COUNT() > 0 THEN
        INSERT INTO log_stored_procedures (
            sp_nombre,
            tipo_operacion,
            tabla_afectada,
            id_registro,
            datos_anteriores,
            datos_nuevos,
            mensaje
        ) VALUES (
            'fun_process_totales_hora',
            IF(v_registro_existe, 'UPDATE', 'INSERT'),
            'sem_totales_hora',
            COALESCE(v_id_totales_hora, LAST_INSERT_ID()),
            v_datos_anteriores,
            (SELECT JSON_OBJECT(
                'hora_local', hora_local,
                'energia_activa_total', energia_activa_total,
                'energia_reactiva_total', energia_reactiva_total,
                'precio_kwh_periodo', precio_kwh_periodo,
                'costo_total', costo_total,
                'estado_actualizacion', 'EXITOSO'
            ) FROM sem_totales_hora WHERE id_totales_hora = COALESCE(v_id_totales_hora, LAST_INSERT_ID())),
            'Actualización exitosa de totales horarios'
        );
        SET v_success = TRUE;
    END IF;

    RETURN v_success;
END
