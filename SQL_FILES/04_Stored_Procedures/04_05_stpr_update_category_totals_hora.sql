CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_update_category_totals_hora`(
    p_inicio TIMESTAMP,
    p_fin TIMESTAMP
)
BEGIN
    -- Variables esenciales obtenidas dinámicamente
    DECLARE v_intervalo_recoleccion INT DEFAULT 10;
    DECLARE v_precio_kwh DECIMAL(10,2) DEFAULT 151.85;
    DECLARE v_lecturas_esperadas INT DEFAULT 360;
    DECLARE v_registros_actualizados INT DEFAULT 0;
    DECLARE v_registros_creados INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_registros_anomalos_eliminados INT DEFAULT 0;
    
    -- Control de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            @sqlstate = RETURNED_SQLSTATE,
            @errno = MYSQL_ERRNO,
            @text = MESSAGE_TEXT;
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('ERROR CRÍTICO en stpr_update_category_totals_hora: ', 
                      @errno, ' - ', @text, ' - ROLLBACK ejecutado'));
        RESIGNAL;
    END;
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Registro de inicio
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('Iniciando stpr_update_category_totals_hora MULTI-GRUPO: ', p_inicio, ' a ', p_fin));
    
    -- ✅ 0. LIMPIAR REGISTROS ANÓMALOS PRIMERO (registros con timestamps exactos en lugar de horas cerradas)
    DELETE FROM sem_totales_hora 
    WHERE hora_local BETWEEN p_inicio AND p_fin
      AND (MINUTE(hora_local) != 0 OR SECOND(hora_local) != 0)
      AND (lecturas_validas <= 5 OR cantidad_datos <= 5 OR cantidad_datos IS NULL);
    
    SET v_registros_anomalos_eliminados = ROW_COUNT();
    
    IF v_registros_anomalos_eliminados > 0 THEN
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('🧹 LIMPIEZA: Eliminados ', v_registros_anomalos_eliminados, 
                      ' registros anómalos con timestamps no redondeados'));
    END IF;
    
    -- ✅ 1. Obtener configuración dinámica por nombre
    SELECT CAST(c.valor AS UNSIGNED)
    INTO v_intervalo_recoleccion
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.tipo_parametro_id = tp.id
    WHERE tp.nombre = 'INTERVALO_RECOLECCION'
    AND c.activo = 1
    AND c.valido_desde <= p_inicio
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_inicio)
    ORDER BY c.valido_desde DESC
    LIMIT 1;
    
    SELECT CAST(c.valor AS DECIMAL(10,2))
    INTO v_precio_kwh
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.tipo_parametro_id = tp.id
    WHERE tp.nombre = 'PRECIO_KWH'
    AND c.activo = 1
    AND c.valido_desde <= p_inicio
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_inicio)
    ORDER BY c.valido_desde DESC
    LIMIT 1;
    
    SET v_lecturas_esperadas = 3600 / COALESCE(v_intervalo_recoleccion, 10);
    
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('Configuración: Intervalo=', v_intervalo_recoleccion, 
                  's, Precio=', v_precio_kwh, ' CLP/kWh'));
    
    -- ✅ 2. ACTUALIZAR registros existentes por grupo específico
    BEGIN
        DECLARE done INT DEFAULT FALSE;
        DECLARE v_grupo_id INT;
        DECLARE v_thresholds JSON;
        DECLARE v_limite_apagado DECIMAL(10,2);
        DECLARE v_cuartil_bajo DECIMAL(10,2);
        DECLARE v_cuartil_medio DECIMAL(10,2);
        DECLARE v_cuartil_alto DECIMAL(10,2);
        
        DECLARE grupos_cursor CURSOR FOR 
            SELECT DISTINCT g.id
            FROM sem_grupos g
            JOIN sem_dispositivos d ON d.grupo_id = g.id
            JOIN sem_totales_hora th ON th.shelly_id = d.shelly_id
            WHERE th.hora_local BETWEEN p_inicio AND p_fin
            AND g.activo = 1
            AND d.activo = 1
            -- ✅ SOLO registros con horas cerradas válidas
            AND MINUTE(th.hora_local) = 0 
            AND SECOND(th.hora_local) = 0;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
        
        OPEN grupos_cursor;
        
        grupo_update_loop: LOOP
            FETCH grupos_cursor INTO v_grupo_id;
            
            IF done THEN
                LEAVE grupo_update_loop;
            END IF;
            
            -- Obtener umbrales específicos para este grupo
            SET v_thresholds = fun_get_consumption_thresholds(v_grupo_id, p_inicio);
            SET v_limite_apagado = CAST(JSON_EXTRACT(v_thresholds, '$.limite_apagado') AS DECIMAL(10,2));
            SET v_cuartil_bajo = CAST(JSON_EXTRACT(v_thresholds, '$.cuartil_bajo') AS DECIMAL(10,2));
            SET v_cuartil_medio = CAST(JSON_EXTRACT(v_thresholds, '$.cuartil_medio') AS DECIMAL(10,2));
            SET v_cuartil_alto = CAST(JSON_EXTRACT(v_thresholds, '$.cuartil_alto') AS DECIMAL(10,2));
            
            -- ✅ ACTUALIZAR dispositivos de este grupo específico
            UPDATE sem_totales_hora th
            JOIN sem_dispositivos d ON th.shelly_id = d.shelly_id
            JOIN (
                SELECT 
                    m.shelly_id,
                    -- ✅ FORZAR QUE SIEMPRE SEA HORA CERRADA
                    TIMESTAMP(DATE_FORMAT(m.timestamp_local, '%Y-%m-%d %H:00:00')) AS hora_formateada,
                    -- ✅ CÁLCULO CORRECTO DE ENERGÍA
                    ROUND(SUM(m.potencia_activa * v_intervalo_recoleccion) / 3600000.0, 3) AS energia_activa_kwh,
                    -- ✅ CÁLCULO CORRECTO DE COSTO
                    ROUND((SUM(m.potencia_activa * v_intervalo_recoleccion) / 3600000.0) * v_precio_kwh, 0) AS costo_total,
                    MAX(m.potencia_activa) AS potencia_max,
                    MIN(m.potencia_activa) AS potencia_min,
                    COUNT(*) AS cantidad_total,
                    -- ✅ Categorización con umbrales específicos del grupo
                    SUM(IF(m.potencia_activa < v_limite_apagado, 1, 0)) AS limite_apagado,
                    SUM(IF(m.potencia_activa >= v_limite_apagado AND m.potencia_activa < v_cuartil_bajo, 1, 0)) AS consumo_bajo,
                    SUM(IF(m.potencia_activa >= v_cuartil_bajo AND m.potencia_activa < v_cuartil_alto, 1, 0)) AS consumo_medio,
                    SUM(IF(m.potencia_activa >= v_cuartil_alto, 1, 0)) AS consumo_alto
                FROM sem_mediciones m
                JOIN sem_dispositivos d ON m.shelly_id = d.shelly_id
                WHERE m.timestamp_local BETWEEN p_inicio AND p_fin
                  AND m.fase = 'TOTAL'
                  AND d.grupo_id = v_grupo_id
                GROUP BY m.shelly_id, hora_formateada
            ) AS stats ON th.shelly_id = stats.shelly_id AND th.hora_local = stats.hora_formateada
            SET 
                th.energia_activa_total = GREATEST(0, stats.energia_activa_kwh),
                th.costo_total = GREATEST(0, stats.costo_total),
                th.potencia_maxima = stats.potencia_max,
                th.potencia_minima = stats.potencia_min,
                th.precio_kwh_periodo = v_precio_kwh,
                th.lecturas_validas = stats.cantidad_total,
                th.calidad_datos = ROUND((stats.cantidad_total * 100.0) / v_lecturas_esperadas, 2),
                th.lecturas_limite_apagado = stats.limite_apagado,
                th.lecturas_consumo_bajo = stats.consumo_bajo,
                th.lecturas_consumo_medio = stats.consumo_medio,
                th.lecturas_consumo_alto = stats.consumo_alto,
                th.cantidad_datos = stats.cantidad_total,
                th.fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE th.hora_local BETWEEN p_inicio AND p_fin
              AND d.grupo_id = v_grupo_id
              -- ✅ SOLO actualizar registros con horas cerradas válidas
              AND MINUTE(th.hora_local) = 0 
              AND SECOND(th.hora_local) = 0;
            
            SET v_registros_actualizados = v_registros_actualizados + ROW_COUNT();
        END LOOP;
        
        CLOSE grupos_cursor;
    END;
    
    -- ✅ 3. INSERTAR registros nuevos POR GRUPO (COMPLETAMENTE CORREGIDO)
    BEGIN
        DECLARE done2 INT DEFAULT FALSE;
        DECLARE v_grupo_id INT;
        DECLARE v_thresholds JSON;
        DECLARE v_limite_apagado DECIMAL(10,2);
        DECLARE v_cuartil_bajo DECIMAL(10,2);
        DECLARE v_cuartil_medio DECIMAL(10,2);
        DECLARE v_cuartil_alto DECIMAL(10,2);
        
        -- Cursor para grupos que tienen mediciones nuevas (sin registros en totales_hora)
        DECLARE grupos_insert_cursor CURSOR FOR 
            SELECT DISTINCT d.grupo_id
            FROM sem_mediciones m
            JOIN sem_dispositivos d ON m.shelly_id = d.shelly_id
            JOIN sem_grupos g ON d.grupo_id = g.id
            WHERE m.timestamp_local BETWEEN p_inicio AND p_fin
              AND m.fase = 'TOTAL'
              AND g.activo = 1
              AND d.activo = 1
              AND NOT EXISTS (
                  SELECT 1 
                  FROM sem_totales_hora th 
                  WHERE th.shelly_id = m.shelly_id 
                    -- ✅ COMPARAR CON LA HORA FORMATEADA CORRECTAMENTE
                    AND th.hora_local = TIMESTAMP(DATE_FORMAT(m.timestamp_local, '%Y-%m-%d %H:00:00'))
              );
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done2 = TRUE;
        
        OPEN grupos_insert_cursor;
        
        grupo_insert_loop: LOOP
            FETCH grupos_insert_cursor INTO v_grupo_id;
            
            IF done2 THEN
                LEAVE grupo_insert_loop;
            END IF;
            
            -- Obtener umbrales específicos para este grupo
            SET v_thresholds = fun_get_consumption_thresholds(v_grupo_id, p_inicio);
            SET v_limite_apagado = CAST(JSON_EXTRACT(v_thresholds, '$.limite_apagado') AS DECIMAL(10,2));
            SET v_cuartil_bajo = CAST(JSON_EXTRACT(v_thresholds, '$.cuartil_bajo') AS DECIMAL(10,2));
            SET v_cuartil_medio = CAST(JSON_EXTRACT(v_thresholds, '$.cuartil_medio') AS DECIMAL(10,2));
            SET v_cuartil_alto = CAST(JSON_EXTRACT(v_thresholds, '$.cuartil_alto') AS DECIMAL(10,2));
            
            -- ✅ INSERTAR CORREGIDO - SIEMPRE CON HORAS CERRADAS
            INSERT IGNORE INTO sem_totales_hora (
                shelly_id, 
                hora_local, 
                energia_activa_total,
                energia_reactiva_total, 
                potencia_maxima, 
                potencia_minima, 
                precio_kwh_periodo, 
                costo_total, 
                lecturas_validas,
                calidad_datos,
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
                -- ✅ GARANTIZAR QUE SIEMPRE ES HORA CERRADA
                stats.hora_formateada,
                GREATEST(0, ROUND(stats.energia_activa_kwh, 3)) AS energia_activa_total,
                0 AS energia_reactiva_total,
                stats.potencia_max,
                stats.potencia_min,
                v_precio_kwh,
                GREATEST(0, ROUND(stats.costo_total, 0)) AS costo_total,
                stats.cantidad_total,
                ROUND((stats.cantidad_total * 100.0) / v_lecturas_esperadas, 2) AS calidad_datos,
                stats.limite_apagado,
                stats.consumo_bajo,
                stats.consumo_medio,
                stats.consumo_alto,
                stats.cantidad_total,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM (
                SELECT 
                    m.shelly_id,
                    -- ✅ CLAVE: SIEMPRE REDONDEAR A LA HORA EXACTA
                    TIMESTAMP(DATE_FORMAT(m.timestamp_local, '%Y-%m-%d %H:00:00')) AS hora_formateada,
                    -- ✅ CÁLCULO CORRECTO por dispositivo
                    SUM(m.potencia_activa * v_intervalo_recoleccion) / 3600000.0 AS energia_activa_kwh,
                    (SUM(m.potencia_activa * v_intervalo_recoleccion) / 3600000.0) * v_precio_kwh AS costo_total,
                    MAX(m.potencia_activa) AS potencia_max,
                    MIN(m.potencia_activa) AS potencia_min,
                    COUNT(*) AS cantidad_total,
                    -- ✅ Categorización con umbrales específicos del grupo actual
                    SUM(IF(m.potencia_activa < v_limite_apagado, 1, 0)) AS limite_apagado,
                    SUM(IF(m.potencia_activa >= v_limite_apagado AND m.potencia_activa < v_cuartil_bajo, 1, 0)) AS consumo_bajo,
                    SUM(IF(m.potencia_activa >= v_cuartil_bajo AND m.potencia_activa < v_cuartil_alto, 1, 0)) AS consumo_medio,
                    SUM(IF(m.potencia_activa >= v_cuartil_alto, 1, 0)) AS consumo_alto
                FROM sem_mediciones m
                JOIN sem_dispositivos d ON m.shelly_id = d.shelly_id
                WHERE m.timestamp_local BETWEEN p_inicio AND p_fin
                  AND m.fase = 'TOTAL'
                  AND d.grupo_id = v_grupo_id  -- ✅ Solo dispositivos de este grupo
                GROUP BY m.shelly_id, hora_formateada
                -- ✅ VALIDACIÓN ADICIONAL: Solo considerar si hay suficientes mediciones
                HAVING COUNT(*) >= 10  -- Al menos 10 mediciones para considerar válida la hora
            ) AS stats;
            
            SET v_registros_creados = v_registros_creados + ROW_COUNT();
        END LOOP;
        
        CLOSE grupos_insert_cursor;
    END;
    
    -- ✅ 4. VALIDACIÓN FINAL: Verificar que NO hay registros anómalos después del proceso
    SELECT COUNT(*) INTO v_error_count
    FROM sem_totales_hora
    WHERE hora_local BETWEEN p_inicio AND p_fin
      AND (MINUTE(hora_local) != 0 OR SECOND(hora_local) != 0);
    
    IF v_error_count > 0 THEN
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('🚨 ERROR CRÍTICO: ', v_error_count, 
                       ' registros SIGUEN teniendo horarios no redondeados después del procesamiento'));
        
        -- Eliminar automáticamente estos registros problemáticos
        DELETE FROM sem_totales_hora 
        WHERE hora_local BETWEEN p_inicio AND p_fin
          AND (MINUTE(hora_local) != 0 OR SECOND(hora_local) != 0);
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('🧹 ELIMINADOS automáticamente ', ROW_COUNT(), ' registros anómalos residuales'));
    END IF;
    
    -- ✅ 5. Validación de resultados anómalos en valores
    SELECT COUNT(*) INTO v_error_count
    FROM sem_totales_hora
    WHERE hora_local BETWEEN p_inicio AND p_fin
      AND (energia_activa_total < 0 OR energia_activa_total > 100 OR costo_total < 0);
    
    IF v_error_count > 0 THEN
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('ADVERTENCIA: ', v_error_count, ' registros con valores de energía/costo anómalos'));
    END IF;
    
    -- ✅ 6. Validación de integridad de categorización
    SELECT COUNT(*) INTO v_error_count
    FROM sem_totales_hora
    WHERE hora_local BETWEEN p_inicio AND p_fin
      AND (lecturas_limite_apagado + lecturas_consumo_bajo + lecturas_consumo_medio + lecturas_consumo_alto) != cantidad_datos
      AND cantidad_datos > 0;
    
    IF v_error_count > 0 THEN
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('ADVERTENCIA: ', v_error_count, ' registros con categorización inconsistente'));
    END IF;
    
    -- Commit de la transacción
    COMMIT;
    
    -- Log de finalización exitosa
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('✅ stpr_update_category_totals_hora MULTI-GRUPO COMPLETADA: ',
                  'Anomalías eliminadas=', v_registros_anomalos_eliminados, ', ',
                  'Actualizados=', v_registros_actualizados, ', ',
                  'Creados=', v_registros_creados));
END