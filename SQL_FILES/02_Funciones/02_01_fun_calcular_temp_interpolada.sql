CREATE DEFINER=`root`@`%` FUNCTION `tns_cool_track`.`fun_calcular_temp_interpolada`(
    p_registro_id INT,
    p_id_canal INT,
    p_timestamp DATETIME
) RETURNS decimal(6,4)
    READS SQL DATA
    DETERMINISTIC
BEGIN
    DECLARE v_temp_anterior DECIMAL(6,4) DEFAULT NULL;
    DECLARE v_temp_posterior DECIMAL(6,4) DEFAULT NULL;
    DECLARE v_timestamp_anterior DATETIME DEFAULT NULL;
    DECLARE v_timestamp_posterior DATETIME DEFAULT NULL;
    DECLARE v_temp_interpolada DECIMAL(6,4) DEFAULT 0;
    DECLARE v_proporcion DECIMAL(10,6);
    DECLARE v_diferencia_tiempo BIGINT;
    DECLARE v_tiempo_transcurrido BIGINT;
    
    -- Buscar la temperatura anterior más cercana (no NULL) dentro de una ventana razonable
    SELECT temperatura, fecha_lectura
    INTO v_temp_anterior, v_timestamp_anterior
    FROM ubi_lecturas_sensor
    WHERE id_canal = p_id_canal
    AND fecha_lectura < p_timestamp
    AND fecha_lectura >= DATE_SUB(p_timestamp, INTERVAL 2 HOUR)  -- Ventana de 2 horas máximo
    AND temperatura IS NOT NULL
    ORDER BY fecha_lectura DESC
    LIMIT 1;
    
    -- Buscar la temperatura posterior más cercana (no NULL) dentro de una ventana razonable
    SELECT temperatura, fecha_lectura  
    INTO v_temp_posterior, v_timestamp_posterior
    FROM ubi_lecturas_sensor
    WHERE id_canal = p_id_canal
    AND fecha_lectura > p_timestamp
    AND fecha_lectura <= DATE_ADD(p_timestamp, INTERVAL 2 HOUR)  -- Ventana de 2 horas máximo
    AND temperatura IS NOT NULL
    ORDER BY fecha_lectura ASC
    LIMIT 1;
    
    -- Lógica de interpolación mejorada
    IF v_temp_anterior IS NULL AND v_temp_posterior IS NULL THEN
        -- Sin datos cercanos, buscar el valor más cercano en el día sin restricción de tiempo
        SELECT temperatura INTO v_temp_interpolada
        FROM ubi_lecturas_sensor
        WHERE id_canal = p_id_canal
        AND DATE(fecha_lectura) = DATE(p_timestamp)
        AND temperatura IS NOT NULL
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, fecha_lectura, p_timestamp)) ASC
        LIMIT 1;
        
        -- Si aún no hay datos, usar 0
        SET v_temp_interpolada = COALESCE(v_temp_interpolada, 0);
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[calcular_temp_interpolada] Sin datos cercanos - ID: ', p_registro_id, 
               ' - Usando valor más cercano: ', v_temp_interpolada));
        
    ELSEIF v_temp_anterior IS NULL THEN
        -- Solo hay dato posterior, usar ese valor
        SET v_temp_interpolada = v_temp_posterior;
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[calcular_temp_interpolada] Solo posterior - ID: ', p_registro_id, 
               ' - Valor: ', v_temp_interpolada));
               
    ELSEIF v_temp_posterior IS NULL THEN
        -- Solo hay dato anterior, usar ese valor
        SET v_temp_interpolada = v_temp_anterior;
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[calcular_temp_interpolada] Solo anterior - ID: ', p_registro_id, 
               ' - Valor: ', v_temp_interpolada));
    ELSE
        -- Interpolación lineal entre ambos valores
        SET v_diferencia_tiempo = TIMESTAMPDIFF(SECOND, v_timestamp_anterior, v_timestamp_posterior);
        SET v_tiempo_transcurrido = TIMESTAMPDIFF(SECOND, v_timestamp_anterior, p_timestamp);
        
        -- Evitar división por cero y casos extremos
        IF v_diferencia_tiempo = 0 OR v_diferencia_tiempo > 7200 THEN  -- Más de 2 horas es sospechoso
            SET v_temp_interpolada = v_temp_anterior;  -- Usar el anterior por defecto
        ELSE
            SET v_proporcion = v_tiempo_transcurrido / v_diferencia_tiempo;
            -- Limitar proporción entre 0 y 1
            SET v_proporcion = GREATEST(0, LEAST(1, v_proporcion));
            SET v_temp_interpolada = v_temp_anterior + (v_proporcion * (v_temp_posterior - v_temp_anterior));
        END IF;
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[calcular_temp_interpolada] Interpolación lineal - ID: ', p_registro_id, 
               ' - Anterior: ', v_temp_anterior, '°C (', v_timestamp_anterior, ')',
               ' - Posterior: ', v_temp_posterior, '°C (', v_timestamp_posterior, ')',
               ' - Interpolada: ', v_temp_interpolada, '°C',
               ' - Proporción: ', v_proporcion));
    END IF;
    
    -- Validación final del resultado
    IF v_temp_interpolada IS NULL THEN
        SET v_temp_interpolada = 0;
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[calcular_temp_interpolada] ERROR - Resultado NULL - ID: ', p_registro_id, 
               ' - Forzando a 0'));
    END IF;
    
    -- Validar rango razonable (-50°C a +50°C)
    IF v_temp_interpolada < -50 OR v_temp_interpolada > 50 THEN
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[calcular_temp_interpolada] ADVERTENCIA - Valor fuera de rango - ID: ', p_registro_id, 
               ' - Valor: ', v_temp_interpolada, '°C'));
    END IF;
    
    RETURN v_temp_interpolada;
    
END