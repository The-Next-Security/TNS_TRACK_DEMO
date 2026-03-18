CREATE PROCEDURE `tns_cool_track`.`stpr_update_category_totals_dia`(
    p_inicio DATE,
    p_fin DATE
)
BEGIN
    -- Variables esenciales obtenidas dinámicamente
    DECLARE v_precio_kwh DECIMAL(10,2) DEFAULT 151.85;
    DECLARE v_registros_actualizados INT DEFAULT 0;
    DECLARE v_registros_creados INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    
    -- Control de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            @sqlstate = RETURNED_SQLSTATE,
            @errno = MYSQL_ERRNO,
            @text = MESSAGE_TEXT;
        
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_dia', CONCAT('ERROR CRÍTICO en stpr_update_category_totals_dia: ', 
                      @errno, ' - ', @text, ' - ROLLBACK ejecutado'));
        RESIGNAL;
    END;
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Registro de inicio
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_dia', CONCAT('Iniciando stpr_update_category_totals_dia MULTI-GRUPO: ', p_inicio, ' a ', p_fin));
    
    -- ✅ 1. Obtener configuración dinámica por nombre
    SELECT CAST(c.valor AS DECIMAL(10,2))
    INTO v_precio_kwh
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'PRECIO_KWH'
    AND c.activo = 1
    AND c.valido_desde <= p_inicio
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_inicio)
    ORDER BY c.valido_desde DESC
    LIMIT 1;
    
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_dia', CONCAT('Configuración DIA: Precio=', v_precio_kwh, ' CLP/kWh'));
    
    -- ✅ 2. ACTUALIZAR registros existentes por grupo específico
    BEGIN
        DECLARE done INT DEFAULT FALSE;
        DECLARE v_grupo_id INT;
        
        DECLARE grupos_cursor CURSOR FOR 
            SELECT DISTINCT g.id_grupo
            FROM sem_grupos g
            JOIN sem_dispositivos d ON d.id_grupo = g.id_grupo
            JOIN sem_totales_dia td ON td.shelly_id = d.shelly_id
            WHERE td.fecha_local BETWEEN p_inicio AND p_fin
            AND g.activo = 1
            AND d.activo = 1;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
        
        OPEN grupos_cursor;
        
        grupo_update_loop: LOOP
            FETCH grupos_cursor INTO v_grupo_id;
            
            IF done THEN
                LEAVE grupo_update_loop;
            END IF;
            
            -- ✅ ACTUALIZAR dispositivos de este grupo desde sem_totales_hora
            UPDATE sem_totales_dia td
            JOIN sem_dispositivos d ON td.shelly_id = d.shelly_id
            JOIN (
                SELECT 
                    th.shelly_id,
                    DATE(th.hora_local) AS fecha_formateada,
                    -- ✅ SUMAR datos de todas las horas del día
                    ROUND(SUM(th.energia_activa_total), 3) AS energia_activa_total,
                    ROUND(SUM(th.costo_total), 0) AS costo_total,
                    MAX(th.potencia_maxima) AS potencia_max,
                    MIN(th.potencia_minima) AS potencia_min,
                    -- ✅ Promedio ponderado del precio
                    ROUND(SUM(th.costo_total) / NULLIF(SUM(th.energia_activa_total), 0), 2) AS precio_promedio,
                    -- ✅ Sumar categorización de todas las horas
                    SUM(th.lecturas_limite_apagado) AS limite_apagado,
                    SUM(th.lecturas_consumo_bajo) AS consumo_bajo,
                    SUM(th.lecturas_consumo_medio) AS consumo_medio,
                    SUM(th.lecturas_consumo_alto) AS consumo_alto,
                    SUM(th.cantidad_datos) AS cantidad_total,
                    COUNT(DISTINCT HOUR(th.hora_local)) AS horas_con_datos
                FROM sem_totales_hora th
                JOIN sem_dispositivos d ON th.shelly_id = d.shelly_id
                WHERE DATE(th.hora_local) BETWEEN p_inicio AND p_fin
                  AND d.id_grupo = v_grupo_id
                GROUP BY th.shelly_id, fecha_formateada
            ) AS stats ON td.shelly_id = stats.shelly_id AND td.fecha_local = stats.fecha_formateada
            SET 
                -- ✅ Campos principales desde totales_hora
                td.energia_activa_total = GREATEST(0, stats.energia_activa_total),
                td.costo_total = GREATEST(0, stats.costo_total),
                td.potencia_maxima = stats.potencia_max,
                td.potencia_minima = stats.potencia_min,
                td.precio_kwh_promedio = COALESCE(stats.precio_promedio, v_precio_kwh),
                td.horas_con_datos = stats.horas_con_datos,
                -- ✅ Campos de categorización sumados
                td.lecturas_limite_apagado = stats.limite_apagado,
                td.lecturas_consumo_bajo = stats.consumo_bajo,
                td.lecturas_consumo_medio = stats.consumo_medio,
                td.lecturas_consumo_alto = stats.consumo_alto,
                td.cantidad_datos = stats.cantidad_total,
                -- ✅ Auditoría
                td.fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE td.fecha_local BETWEEN p_inicio AND p_fin
              AND d.id_grupo = v_grupo_id;
            
            SET v_registros_actualizados = v_registros_actualizados + ROW_COUNT();
        END LOOP;
        
        CLOSE grupos_cursor;
    END;
    
    -- ✅ 3. INSERTAR registros nuevos POR GRUPO desde sem_totales_hora
    BEGIN
        DECLARE done2 INT DEFAULT FALSE;
        DECLARE v_grupo_id INT;
        
        -- Cursor para grupos que tienen datos en totales_hora pero no en totales_dia
        DECLARE grupos_insert_cursor CURSOR FOR 
            SELECT DISTINCT d.id_grupo
            FROM sem_totales_hora th
            JOIN sem_dispositivos d ON th.shelly_id = d.shelly_id
            JOIN sem_grupos g ON d.id_grupo = g.id_grupo
            WHERE DATE(th.hora_local) BETWEEN p_inicio AND p_fin
              AND g.activo = 1
              AND d.activo = 1
              AND NOT EXISTS (
                  SELECT 1 
                  FROM sem_totales_dia td 
                  WHERE td.shelly_id = th.shelly_id 
                    AND td.fecha_local = DATE(th.hora_local)
              );
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done2 = TRUE;
        
        OPEN grupos_insert_cursor;
        
        grupo_insert_loop: LOOP
            FETCH grupos_insert_cursor INTO v_grupo_id;
            
            IF done2 THEN
                LEAVE grupo_insert_loop;
            END IF;
            
            -- ✅ INSERTAR solo dispositivos de este grupo específico
            INSERT INTO sem_totales_dia (
                shelly_id, 
                fecha_local, 
                energia_activa_total,
                energia_reactiva_total, 
                potencia_maxima, 
                potencia_minima, 
                precio_kwh_promedio, 
                costo_total, 
                horas_con_datos,
                lecturas_limite_apagado,
                lecturas_consumo_bajo,
                lecturas_consumo_medio,
                lecturas_consumo_alto,
                cantidad_datos,
                fecha_creacion,
                fecha_actualizacion
            )
            SELECT 
                stats.shelly_id,
                stats.fecha_formateada,
                GREATEST(0, ROUND(stats.energia_activa_total, 3)) AS energia_activa_total,
                0 AS energia_reactiva_total,
                stats.potencia_max,
                stats.potencia_min,
                COALESCE(stats.precio_promedio, v_precio_kwh) AS precio_kwh_promedio,
                GREATEST(0, ROUND(stats.costo_total, 0)) AS costo_total,
                stats.horas_con_datos,
                stats.limite_apagado,
                stats.consumo_bajo,
                stats.consumo_medio,
                stats.consumo_alto,
                stats.cantidad_total,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM (
                SELECT 
                    th.shelly_id,
                    DATE(th.hora_local) AS fecha_formateada,
                    -- ✅ SUMAR todas las horas del día por dispositivo
                    SUM(th.energia_activa_total) AS energia_activa_total,
                    SUM(th.costo_total) AS costo_total,
                    MAX(th.potencia_maxima) AS potencia_max,
                    MIN(th.potencia_minima) AS potencia_min,
                    -- Precio promedio ponderado
                    SUM(th.costo_total) / NULLIF(SUM(th.energia_activa_total), 0) AS precio_promedio,
                    -- ✅ Sumar categorización
                    SUM(th.lecturas_limite_apagado) AS limite_apagado,
                    SUM(th.lecturas_consumo_bajo) AS consumo_bajo,
                    SUM(th.lecturas_consumo_medio) AS consumo_medio,
                    SUM(th.lecturas_consumo_alto) AS consumo_alto,
                    SUM(th.cantidad_datos) AS cantidad_total,
                    COUNT(DISTINCT HOUR(th.hora_local)) AS horas_con_datos
                FROM sem_totales_hora th
                JOIN sem_dispositivos d ON th.shelly_id = d.shelly_id
                WHERE DATE(th.hora_local) BETWEEN p_inicio AND p_fin
                  AND d.id_grupo = v_grupo_id  -- ✅ Solo dispositivos de este grupo
                GROUP BY th.shelly_id, fecha_formateada
            ) AS stats
            WHERE NOT EXISTS (
                SELECT 1 
                FROM sem_totales_dia td 
                WHERE td.shelly_id = stats.shelly_id 
                  AND td.fecha_local = stats.fecha_formateada
            );
            
            SET v_registros_creados = v_registros_creados + ROW_COUNT();
        END LOOP;
        
        CLOSE grupos_insert_cursor;
    END;
    
    -- ✅ 4. Validación de coherencia día vs suma de horas
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_dia', 'Validando coherencia entre totales_dia y suma de totales_hora...');
    
    SELECT COUNT(*) INTO v_error_count
    FROM (
        SELECT 
            td.shelly_id,
            td.fecha_local,
            td.energia_activa_total as dia_energia,
            SUM(th.energia_activa_total) as suma_horas_energia,
            ABS(td.energia_activa_total - SUM(th.energia_activa_total)) as diferencia
        FROM sem_totales_dia td
        JOIN sem_totales_hora th ON td.shelly_id = th.shelly_id 
                                 AND td.fecha_local = DATE(th.hora_local)
        WHERE td.fecha_local BETWEEN p_inicio AND p_fin
        GROUP BY td.shelly_id, td.fecha_local, td.energia_activa_total
        HAVING diferencia > 0.001  -- Tolerancia de 1 Wh
    ) AS validation;
    
    IF v_error_count > 0 THEN
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_dia', CONCAT('ADVERTENCIA: ', v_error_count, ' registros con incoherencia día vs horas'));
    END IF;
    
    -- ✅ 5. Validación de resultados anómalos
    SELECT COUNT(*) INTO v_error_count
    FROM sem_totales_dia
    WHERE fecha_local BETWEEN p_inicio AND p_fin
      AND (energia_activa_total < 0 OR energia_activa_total > 2400 OR costo_total < 0);
    
    IF v_error_count > 0 THEN
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_dia', CONCAT('ADVERTENCIA: ', v_error_count, ' registros diarios con valores anómalos'));
    END IF;
    
    -- Commit de la transacción
    COMMIT;
    
    -- Log de finalización exitosa
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_dia', CONCAT('✅ stpr_update_category_totals_dia MULTI-GRUPO COMPLETADA: Actualizados=', 
                  v_registros_actualizados, ', Creados=', v_registros_creados));
END