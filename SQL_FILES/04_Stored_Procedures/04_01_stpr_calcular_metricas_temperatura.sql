CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_calcular_metricas_temperatura`(
    IN p_id_canal INT,
    IN p_fecha_inicio DATETIME,
    IN p_fecha_fin DATETIME,
    OUT p_numero_ciclos DECIMAL(3,1),
    OUT p_tiempo_en_positivo INT,
    OUT p_porcentaje_tiempo DECIMAL(6,3)
)
BEGIN
    -- Variables para el procesamiento de datos
    DECLARE v_temp_actual DECIMAL(6,4);
    DECLARE v_timestamp_actual DATETIME;
    DECLARE v_temp_anterior DECIMAL(6,4) DEFAULT NULL;
    DECLARE v_timestamp_anterior DATETIME DEFAULT NULL;
    
    -- Variables para cálculo de ciclos
    DECLARE v_esta_en_positivo BOOLEAN DEFAULT FALSE;
    DECLARE v_empezó_en_positivo BOOLEAN DEFAULT FALSE;
    DECLARE v_terminó_en_positivo BOOLEAN DEFAULT FALSE;
    DECLARE v_ciclos_completos DECIMAL(3,1) DEFAULT 0;
    DECLARE v_primera_lectura BOOLEAN DEFAULT TRUE;
    DECLARE v_hubo_transicion_positiva BOOLEAN DEFAULT FALSE;
    
    -- Variables para cálculo de tiempo
    DECLARE v_tiempo_total_segundos BIGINT DEFAULT 0;
    DECLARE v_tiempo_cruce DATETIME;
    DECLARE v_segundos_segmento BIGINT;
    DECLARE v_segundos_parcial BIGINT;
    
    -- Variables para depuración
    DECLARE v_total_registros INT DEFAULT 0;
    DECLARE v_registros_procesados INT DEFAULT 0;
    DECLARE v_transiciones_detectadas INT DEFAULT 0;
    
    -- Variables adicionales para el cursor mejorado
    DECLARE v_registro_id INT;
    DECLARE v_temp_interpolada DECIMAL(6,4);
    
    -- Control de cursor
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    
    -- Cursor simplificado para obtener TODOS los registros cronológicamente
    DECLARE temp_cursor CURSOR FOR
        SELECT
            id_lectura_sensor,
            temperatura,
            fecha_lectura
        FROM ubi_lecturas_sensor
        WHERE id_canal = p_id_canal
        AND fecha_lectura BETWEEN p_fecha_inicio AND p_fecha_fin
        AND fecha_lectura IS NOT NULL
        ORDER BY fecha_lectura ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    
    -- Inicializar valores de salida
    SET p_numero_ciclos = 0;
    SET p_tiempo_en_positivo = 0;
    SET p_porcentaje_tiempo = 0;
    
    -- Verificar si hay datos para este channel y fecha
    SELECT COUNT(*) INTO v_total_registros
    FROM ubi_lecturas_sensor
    WHERE id_canal = p_id_canal
    AND fecha_lectura BETWEEN p_fecha_inicio AND p_fecha_fin
    AND fecha_lectura IS NOT NULL;
    
    -- Log inicial
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('[stpr_calcular_metricas_temperatura] Channel: ', p_id_canal, 
           ' - Fecha: ', DATE(p_fecha_inicio), ' - Registros encontrados: ', v_total_registros));
    
    -- Si no hay datos, salir con valores en 0
    IF v_total_registros = 0 THEN
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[stpr_calcular_metricas_temperatura] Sin datos para channel_id: ', p_id_canal, 
               ' en fecha: ', DATE(p_fecha_inicio)));
        -- Salir del procedimiento sin procesamiento
        SELECT 0 INTO p_numero_ciclos;
        SELECT 0 INTO p_tiempo_en_positivo;
        SELECT 0 INTO p_porcentaje_tiempo;
        -- No se puede usar LEAVE aquí, simplemente no ejecutar el resto
    ELSE
        
        calcular_proc: BEGIN
            
            -- Abrir cursor
            OPEN temp_cursor;
            
            temp_loop: LOOP
                FETCH temp_cursor INTO v_registro_id, v_temp_actual, v_timestamp_actual;
                
                IF v_done THEN
                    LEAVE temp_loop;
                END IF;
                
                SET v_registros_procesados = v_registros_procesados + 1;
                
                -- Manejar valores NULL con interpolación
                IF v_temp_actual IS NULL THEN
                    SELECT fun_calcular_temp_interpolada(v_registro_id, p_id_canal, v_timestamp_actual) 
                    INTO v_temp_interpolada;
                    SET v_temp_actual = v_temp_interpolada;
                    
                    INSERT INTO log_proceso (mensaje) 
                    VALUES (CONCAT('[stpr_calcular_metricas_temperatura] Interpolación - Channel: ', p_id_canal,
                           ' - Timestamp: ', v_timestamp_actual, ' - Valor: ', v_temp_actual));
                END IF;
                
                -- Procesar primera lectura
                IF v_primera_lectura THEN
                    SET v_primera_lectura = FALSE;
                    
                    -- Verificar si empezó en positivo
                    IF v_temp_actual > 0 THEN
                        SET v_empezó_en_positivo = TRUE;
                        SET v_esta_en_positivo = TRUE;
                        
                        INSERT INTO log_proceso (mensaje) 
                        VALUES (CONCAT('[stpr_calcular_metricas_temperatura] Empezó en POSITIVO - Channel: ', p_id_canal,
                               ' - Temp: ', v_temp_actual, '°C'));
                    ELSE
                        SET v_esta_en_positivo = FALSE;
                        INSERT INTO log_proceso (mensaje) 
                        VALUES (CONCAT('[stpr_calcular_metricas_temperatura] Empezó en NEGATIVO - Channel: ', p_id_canal,
                               ' - Temp: ', v_temp_actual, '°C'));
                    END IF;
                    
                ELSE
                    -- Procesar transiciones entre lecturas
                    IF v_temp_anterior IS NOT NULL THEN
                        
                        -- Calcular tiempo de este segmento en segundos para mayor precisión
                        SET v_segundos_segmento = TIMESTAMPDIFF(SECOND, v_timestamp_anterior, v_timestamp_actual);
                        
                        -- Caso 1: Ambas temperaturas son positivas
                        IF v_temp_anterior > 0 AND v_temp_actual > 0 THEN
                            SET v_tiempo_total_segundos = v_tiempo_total_segundos + v_segundos_segmento;
                            SET v_esta_en_positivo = TRUE;
                            
                        -- Caso 2: Ambas temperaturas son negativas o cero
                        ELSEIF v_temp_anterior <= 0 AND v_temp_actual <= 0 THEN
                            SET v_esta_en_positivo = FALSE;
                            
                        -- Caso 3: Transición de negativo/cero a positivo (INICIO de ciclo potencial)
                        ELSEIF v_temp_anterior <= 0 AND v_temp_actual > 0 THEN
                            
                            -- Calcular momento exacto del cruce usando interpolación lineal
                            IF v_temp_actual != v_temp_anterior THEN
                                SET v_segundos_parcial = ROUND(
                                    ((0 - v_temp_anterior) / (v_temp_actual - v_temp_anterior)) * v_segundos_segmento
                                );
                                SET v_tiempo_cruce = TIMESTAMPADD(SECOND, v_segundos_parcial, v_timestamp_anterior);
                            ELSE
                                SET v_tiempo_cruce = v_timestamp_anterior;
                            END IF;
                            
                            -- Sumar tiempo desde el cruce hasta el timestamp actual
                            SET v_segundos_parcial = TIMESTAMPDIFF(SECOND, v_tiempo_cruce, v_timestamp_actual);
                            SET v_tiempo_total_segundos = v_tiempo_total_segundos + v_segundos_parcial;
                            
                            SET v_esta_en_positivo = TRUE;
                            SET v_hubo_transicion_positiva = TRUE;
                            SET v_transiciones_detectadas = v_transiciones_detectadas + 1;
                            
                            INSERT INTO log_proceso (mensaje) 
                            VALUES (CONCAT('[stpr_calcular_metricas_temperatura] TRANSICIÓN NEG→POS - Channel: ', p_id_canal,
                                   ' - De: ', v_temp_anterior, '°C a ', v_temp_actual, '°C',
                                   ' - Cruce en: ', v_tiempo_cruce));
                            
                        -- Caso 4: Transición de positivo a negativo/cero (FIN de ciclo)
                        ELSEIF v_temp_anterior > 0 AND v_temp_actual <= 0 THEN
                            
                            -- Calcular momento exacto del cruce
                            IF v_temp_actual != v_temp_anterior THEN
                                SET v_segundos_parcial = ROUND(
                                    ((0 - v_temp_anterior) / (v_temp_actual - v_temp_anterior)) * v_segundos_segmento
                                );
                                SET v_tiempo_cruce = TIMESTAMPADD(SECOND, v_segundos_parcial, v_timestamp_anterior);
                            ELSE
                                SET v_tiempo_cruce = v_timestamp_actual;
                            END IF;
                            
                            -- Sumar tiempo desde timestamp anterior hasta el cruce
                            SET v_segundos_parcial = TIMESTAMPDIFF(SECOND, v_timestamp_anterior, v_tiempo_cruce);
                            SET v_tiempo_total_segundos = v_tiempo_total_segundos + v_segundos_parcial;
                            
                            -- Solo incrementar ciclos si hubo una transición positiva previa
                            IF v_hubo_transicion_positiva THEN
                                SET v_ciclos_completos = v_ciclos_completos + 1;
                                SET v_transiciones_detectadas = v_transiciones_detectadas + 1;
                                
                                INSERT INTO log_proceso (mensaje) 
                                VALUES (CONCAT('[stpr_calcular_metricas_temperatura] CICLO COMPLETO #', v_ciclos_completos, 
                                       ' - Channel: ', p_id_canal, ' - De: ', v_temp_anterior, '°C a ', v_temp_actual, '°C',
                                       ' - Cruce en: ', v_tiempo_cruce));
                            END IF;
                            
                            SET v_esta_en_positivo = FALSE;
                        END IF;
                    END IF;
                END IF;
                
                -- Actualizar variables para siguiente iteración
                SET v_temp_anterior = v_temp_actual;
                SET v_timestamp_anterior = v_timestamp_actual;
                
            END LOOP temp_loop;
            
            -- Cerrar cursor
            CLOSE temp_cursor;
            
            -- Verificar si terminó en positivo
            IF v_temp_actual > 0 THEN
                SET v_terminó_en_positivo = TRUE;
                
                INSERT INTO log_proceso (mensaje) 
                VALUES (CONCAT('[stpr_calcular_metricas_temperatura] Terminó en POSITIVO - Channel: ', p_id_canal,
                       ' - Temp final: ', v_temp_actual, '°C'));
            END IF;
            
            -- Calcular número de ciclos final
            SET p_numero_ciclos = v_ciclos_completos;
            
            -- Agregar medios ciclos según las reglas específicas
            IF v_empezó_en_positivo THEN
                SET p_numero_ciclos = p_numero_ciclos + 0.5;
                
                INSERT INTO log_proceso (mensaje) 
                VALUES (CONCAT('[stpr_calcular_metricas_temperatura] +0.5 ciclos (empezó positivo) - Channel: ', p_id_canal));
            END IF;
            
            IF v_terminó_en_positivo AND NOT v_empezó_en_positivo AND v_hubo_transicion_positiva THEN
                SET p_numero_ciclos = p_numero_ciclos + 0.5;
                
                INSERT INTO log_proceso (mensaje) 
                VALUES (CONCAT('[stpr_calcular_metricas_temperatura] +0.5 ciclos (terminó positivo) - Channel: ', p_id_canal));
            END IF;
            
            -- Convertir segundos a minutos y calcular porcentaje
            SET p_tiempo_en_positivo = ROUND(v_tiempo_total_segundos / 60);
            SET p_porcentaje_tiempo = ROUND((v_tiempo_total_segundos / 86400.0) * 100, 3);
            
            -- Log final con resumen completo
            INSERT INTO log_proceso (mensaje) 
            VALUES (CONCAT('[stpr_calcular_metricas_temperatura] RESUMEN - Channel: ', p_id_canal,
                   ' - Registros: ', v_registros_procesados, '/', v_total_registros,
                   ' - Transiciones: ', v_transiciones_detectadas,
                   ' - Ciclos: ', p_numero_ciclos,
                   ' - Tiempo positivo: ', p_tiempo_en_positivo, ' min (', p_porcentaje_tiempo, '%)',
                   ' - Empezó positivo: ', v_empezó_en_positivo,
                   ' - Terminó positivo: ', v_terminó_en_positivo));
            
        END calcular_proc;
        
    END IF; -- Fin del IF para verificar datos

END