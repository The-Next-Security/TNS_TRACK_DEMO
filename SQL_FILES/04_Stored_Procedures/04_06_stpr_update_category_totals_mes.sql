CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_update_category_totals_mes`(
    p_inicio_anio INT,
    p_inicio_mes INT,
    p_fin_anio INT,
    p_fin_mes INT
)
BEGIN
    -- Variables esenciales obtenidas dinámicamente
    DECLARE v_precio_kwh DECIMAL(10,2) DEFAULT 151.85;
    DECLARE v_registros_actualizados INT DEFAULT 0;
    DECLARE v_registros_creados INT DEFAULT 0;
    DECLARE v_error_count INT DEFAULT 0;
    
    -- Variables para fechas límite
    DECLARE v_fecha_inicio DATE;
    DECLARE v_fecha_fin DATE;
    
    -- Control de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1
            @sqlstate = RETURNED_SQLSTATE,
            @errno = MYSQL_ERRNO,
            @text = MESSAGE_TEXT;
        
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_mes', CONCAT('ERROR CRÍTICO en stpr_update_category_totals_mes: ', 
                      @errno, ' - ', @text, ' - ROLLBACK ejecutado'));
        RESIGNAL;
    END;
    
    -- Construir fechas completas a partir de los parámetros
    SET v_fecha_inicio = DATE(CONCAT(p_inicio_anio, '-', LPAD(p_inicio_mes, 2, '0'), '-01'));
    SET v_fecha_fin = LAST_DAY(DATE(CONCAT(p_fin_anio, '-', LPAD(p_fin_mes, 2, '0'), '-01')));
    
    -- Iniciar transacción
    START TRANSACTION;
    
    -- Registro de inicio
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_mes', CONCAT('Iniciando stpr_update_category_totals_mes MULTI-GRUPO: ', 
                   p_inicio_anio, '-', p_inicio_mes, ' a ', p_fin_anio, '-', p_fin_mes));
    
    -- ✅ 1. Obtener configuración dinámica por nombre
    SELECT CAST(c.valor AS DECIMAL(10,2))
    INTO v_precio_kwh
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.tipo_parametro_id = tp.id
    WHERE tp.nombre = 'PRECIO_KWH'
    AND c.activo = 1
    AND c.valido_desde <= v_fecha_inicio
    AND (c.valido_hasta IS NULL OR c.valido_hasta > v_fecha_inicio)
    ORDER BY c.valido_desde DESC
    LIMIT 1;
    
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_mes', CONCAT('Configuración MES: Precio=', v_precio_kwh, ' CLP/kWh, Rango: ', 
                   v_fecha_inicio, ' al ', v_fecha_fin));
    
    -- ✅ 2. ACTUALIZAR registros existentes por grupo específico
    BEGIN
        DECLARE done INT DEFAULT FALSE;
        DECLARE v_grupo_id INT;
        
        DECLARE grupos_cursor CURSOR FOR 
            SELECT DISTINCT g.id
            FROM sem_grupos g
            JOIN sem_dispositivos d ON d.grupo_id = g.id
            JOIN sem_totales_mes tm ON tm.shelly_id = d.shelly_id
            WHERE (tm.año > p_inicio_anio OR (tm.año = p_inicio_anio AND tm.mes >= p_inicio_mes))
              AND (tm.año < p_fin_anio OR (tm.año = p_fin_anio AND tm.mes <= p_fin_mes))
            AND g.activo = 1
            AND d.activo = 1;
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
        
        OPEN grupos_cursor;
        
        grupo_update_loop: LOOP
            FETCH grupos_cursor INTO v_grupo_id;
            
            IF done THEN
                LEAVE grupo_update_loop;
            END IF;
            
            -- ✅ ACTUALIZAR dispositivos de este grupo desde sem_totales_dia
            UPDATE sem_totales_mes tm
            JOIN sem_dispositivos d ON tm.shelly_id = d.shelly_id
            JOIN (
                SELECT 
                    td.shelly_id,
                    YEAR(td.fecha_local) AS anio,
                    MONTH(td.fecha_local) AS mes,
                    -- ✅ SUMAR datos de todos los días del mes
                    ROUND(SUM(td.energia_activa_total), 3) AS energia_activa_total,
                    ROUND(SUM(td.costo_total), 0) AS costo_total,
                    MAX(td.potencia_maxima) AS potencia_max,
                    MIN(td.potencia_minima) AS potencia_min,
                    -- ✅ Precio promedio ponderado del mes
                    ROUND(SUM(td.costo_total) / NULLIF(SUM(td.energia_activa_total), 0), 2) AS precio_promedio,
                    -- ✅ Sumar categorización de todos los días
                    SUM(td.lecturas_limite_apagado) AS limite_apagado,
                    SUM(td.lecturas_consumo_bajo) AS consumo_bajo,
                    SUM(td.lecturas_consumo_medio) AS consumo_medio,
                    SUM(td.lecturas_consumo_alto) AS consumo_alto,
                    SUM(td.cantidad_datos) AS cantidad_total,
                    COUNT(DISTINCT td.fecha_local) AS dias_con_datos,
                    SUM(td.horas_con_datos) AS horas_con_datos
                FROM sem_totales_dia td
                JOIN sem_dispositivos d ON td.shelly_id = d.shelly_id
                WHERE td.fecha_local BETWEEN v_fecha_inicio AND v_fecha_fin
                  AND d.grupo_id = v_grupo_id
                GROUP BY td.shelly_id, anio, mes
            ) AS stats ON tm.shelly_id = stats.shelly_id 
                       AND tm.año = stats.anio 
                       AND tm.mes = stats.mes
            SET 
                -- ✅ Campos principales desde totales_dia
                tm.energia_activa_total = GREATEST(0, stats.energia_activa_total),
                tm.costo_total = GREATEST(0, stats.costo_total),
                tm.potencia_maxima = stats.potencia_max,
                tm.potencia_minima = stats.potencia_min,
                tm.precio_kwh_promedio = COALESCE(stats.precio_promedio, v_precio_kwh),
                tm.dias_con_datos = stats.dias_con_datos,
                tm.horas_con_datos = stats.horas_con_datos,
                -- ✅ Campos de categorización sumados
                tm.lecturas_limite_apagado = stats.limite_apagado,
                tm.lecturas_consumo_bajo = stats.consumo_bajo,
                tm.lecturas_consumo_medio = stats.consumo_medio,
                tm.lecturas_consumo_alto = stats.consumo_alto,
                tm.cantidad_datos = stats.cantidad_total,
                -- ✅ Auditoría
                tm.fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE (tm.año > p_inicio_anio OR (tm.año = p_inicio_anio AND tm.mes >= p_inicio_mes))
              AND (tm.año < p_fin_anio OR (tm.año = p_fin_anio AND tm.mes <= p_fin_mes))
              AND d.grupo_id = v_grupo_id;
            
            SET v_registros_actualizados = v_registros_actualizados + ROW_COUNT();
        END LOOP;
        
        CLOSE grupos_cursor;
    END;
    
    -- ✅ 3. INSERTAR registros nuevos POR GRUPO desde sem_totales_dia
    BEGIN
        DECLARE done2 INT DEFAULT FALSE;
        DECLARE v_grupo_id INT;
        
        -- Cursor para grupos que tienen datos en totales_dia pero no en totales_mes
        DECLARE grupos_insert_cursor CURSOR FOR 
            SELECT DISTINCT d.grupo_id
            FROM sem_totales_dia td
            JOIN sem_dispositivos d ON td.shelly_id = d.shelly_id
            JOIN sem_grupos g ON d.grupo_id = g.id
            WHERE td.fecha_local BETWEEN v_fecha_inicio AND v_fecha_fin
              AND g.activo = 1
              AND d.activo = 1
              AND NOT EXISTS (
                  SELECT 1 
                  FROM sem_totales_mes tm 
                  WHERE tm.shelly_id = td.shelly_id 
                    AND tm.año = YEAR(td.fecha_local)
                    AND tm.mes = MONTH(td.fecha_local)
              );
        DECLARE CONTINUE HANDLER FOR NOT FOUND SET done2 = TRUE;
        
        OPEN grupos_insert_cursor;
        
        grupo_insert_loop: LOOP
            FETCH grupos_insert_cursor INTO v_grupo_id;
            
            IF done2 THEN
                LEAVE grupo_insert_loop;
            END IF;
            
            -- ✅ INSERTAR solo dispositivos de este grupo específico
            INSERT INTO sem_totales_mes (
                shelly_id, 
                año,
                mes,
                energia_activa_total, 
                energia_reactiva_total,
                potencia_maxima, 
                potencia_minima, 
                precio_kwh_promedio, 
                costo_total, 
                dias_con_datos,
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
                stats.anio,
                stats.mes,
                GREATEST(0, ROUND(stats.energia_activa_total, 3)) AS energia_activa_total,
                0 AS energia_reactiva_total,
                stats.potencia_max,
                stats.potencia_min,
                COALESCE(stats.precio_promedio, v_precio_kwh) AS precio_kwh_promedio,
                GREATEST(0, ROUND(stats.costo_total, 0)) AS costo_total,
                stats.dias_con_datos,
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
                    td.shelly_id,
                    YEAR(td.fecha_local) AS anio,
                    MONTH(td.fecha_local) AS mes,
                    -- ✅ SUMAR todos los días del mes por dispositivo
                    SUM(td.energia_activa_total) AS energia_activa_total,
                    SUM(td.costo_total) AS costo_total,
                    MAX(td.potencia_maxima) AS potencia_max,
                    MIN(td.potencia_minima) AS potencia_min,
                    -- Precio promedio ponderado
                    SUM(td.costo_total) / NULLIF(SUM(td.energia_activa_total), 0) AS precio_promedio,
                    -- ✅ Sumar categorización
                    SUM(td.lecturas_limite_apagado) AS limite_apagado,
                    SUM(td.lecturas_consumo_bajo) AS consumo_bajo,
                    SUM(td.lecturas_consumo_medio) AS consumo_medio,
                    SUM(td.lecturas_consumo_alto) AS consumo_alto,
                    SUM(td.cantidad_datos) AS cantidad_total,
                    COUNT(DISTINCT td.fecha_local) AS dias_con_datos,
                    SUM(td.horas_con_datos) AS horas_con_datos
                FROM sem_totales_dia td
                JOIN sem_dispositivos d ON td.shelly_id = d.shelly_id
                WHERE td.fecha_local BETWEEN v_fecha_inicio AND v_fecha_fin
                  AND d.grupo_id = v_grupo_id  -- ✅ Solo dispositivos de este grupo
                GROUP BY td.shelly_id, anio, mes
            ) AS stats
            WHERE NOT EXISTS (
                SELECT 1 
                FROM sem_totales_mes tm 
                WHERE tm.shelly_id = stats.shelly_id 
                  AND tm.año = stats.anio 
                  AND tm.mes = stats.mes
            );
            
            SET v_registros_creados = v_registros_creados + ROW_COUNT();
        END LOOP;
        
        CLOSE grupos_insert_cursor;
    END;
    
    -- ✅ 4. Validación de coherencia mes vs suma de días
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_mes', 'Validando coherencia entre totales_mes y suma de totales_dia...');
    
    SELECT COUNT(*) INTO v_error_count
    FROM (
        SELECT 
            tm.shelly_id,
            tm.año,
            tm.mes,
            tm.energia_activa_total as mes_energia,
            SUM(td.energia_activa_total) as suma_dias_energia,
            ABS(tm.energia_activa_total - SUM(td.energia_activa_total)) as diferencia
        FROM sem_totales_mes tm
        JOIN sem_totales_dia td ON tm.shelly_id = td.shelly_id 
                                AND tm.año = YEAR(td.fecha_local)
                                AND tm.mes = MONTH(td.fecha_local)
        WHERE td.fecha_local BETWEEN v_fecha_inicio AND v_fecha_fin
        GROUP BY tm.shelly_id, tm.año, tm.mes, tm.energia_activa_total
        HAVING diferencia > 0.001  -- Tolerancia de 1 Wh
    ) AS validation;
    
    IF v_error_count > 0 THEN
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_mes', CONCAT('ADVERTENCIA: ', v_error_count, ' registros con incoherencia mes vs días'));
    END IF;
    
    -- ✅ 5. Validación de resultados anómalos mensuales
    SELECT COUNT(*) INTO v_error_count
    FROM sem_totales_mes
    WHERE ((año > p_inicio_anio OR (año = p_inicio_anio AND mes >= p_inicio_mes))
           AND (año < p_fin_anio OR (año = p_fin_anio AND mes <= p_fin_mes)))
      AND (energia_activa_total < 0 OR energia_activa_total > 74400 OR costo_total < 0);
    
    IF v_error_count > 0 THEN
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_mes', CONCAT('ADVERTENCIA: ', v_error_count, ' registros mensuales con valores anómalos'));
    END IF;
    
    -- ✅ 6. Validación de días esperados vs días con datos
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_mes', 'Validando completitud de datos mensuales...');
    
    SELECT COUNT(*) INTO v_error_count
    FROM (
        SELECT 
            tm.shelly_id,
            tm.año,
            tm.mes,
            tm.dias_con_datos,
            DAY(LAST_DAY(DATE(CONCAT(tm.año, '-', tm.mes, '-01')))) as dias_esperados,
            CASE 
                WHEN tm.dias_con_datos < DAY(LAST_DAY(DATE(CONCAT(tm.año, '-', tm.mes, '-01')))) * 0.8 
                THEN 1 ELSE 0 
            END as datos_insuficientes
        FROM sem_totales_mes tm
        WHERE ((tm.año > p_inicio_anio OR (tm.año = p_inicio_anio AND tm.mes >= p_inicio_mes))
               AND (tm.año < p_fin_anio OR (tm.año = p_fin_anio AND tm.mes <= p_fin_mes)))
        HAVING datos_insuficientes = 1
    ) AS completeness;
    
    IF v_error_count > 0 THEN
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('stpr_update_category_totals_mes', CONCAT('ADVERTENCIA: ', v_error_count, ' meses con menos del 80% de días con datos'));
    END IF;
    
    -- Commit de la transacción
    COMMIT;
    
    -- Log de finalización exitosa
    INSERT INTO log_general (origen, mensaje) 
    VALUES ('stpr_update_category_totals_mes', CONCAT('✅ stpr_update_category_totals_mes MULTI-GRUPO COMPLETADA: Actualizados=', 
                  v_registros_actualizados, ', Creados=', v_registros_creados,
                  ', Período: ', p_inicio_anio, '-', p_inicio_mes, ' a ', p_fin_anio, '-', p_fin_mes));
END