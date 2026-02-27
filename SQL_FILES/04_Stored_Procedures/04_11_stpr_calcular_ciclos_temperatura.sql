CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_calcular_ciclos_temperatura`(
    IN p_fecha_objetivo DATE
)
BEGIN
    -- Variables para control de flujo
    DECLARE v_id_canal INT;
    DECLARE v_nombre_channel VARCHAR(50);
    DECLARE v_channels_procesados INT DEFAULT 0;
    DECLARE v_channels_error INT DEFAULT 0;
    DECLARE v_channels_omitidos INT DEFAULT 0;
    DECLARE v_total_channels INT DEFAULT 0;
    
    -- Variables para cálculos
    DECLARE v_numero_ciclos DECIMAL(3,1) DEFAULT 0;
    DECLARE v_tiempo_en_positivo INT DEFAULT 0;
    DECLARE v_porcentaje_tiempo DECIMAL(6,3) DEFAULT 0;
    
    -- Variables para validación de duplicados
    DECLARE v_registro_existe BOOLEAN DEFAULT FALSE;
    DECLARE v_numero_ciclos_existente DECIMAL(3,1);
    DECLARE v_tiempo_positivo_existente INT;
    DECLARE v_porcentaje_existente DECIMAL(6,3);
    
    -- Variables para manejo de errores
    DECLARE v_error_count INT DEFAULT 0;
    DECLARE v_max_reintentos INT DEFAULT 3;
    DECLARE v_error_message TEXT;
    
    -- Variables para fechas
    DECLARE v_fecha_inicio DATETIME;
    DECLARE v_fecha_fin DATETIME;
    DECLARE v_fecha_ciclos TIMESTAMP;
    
    -- Control de cursor
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    
    -- Cursor para channels operativos
    DECLARE channel_cursor CURSOR FOR
        SELECT c.id_canal, c.nombre
        FROM ubi_canal c
        WHERE c.activo = 1
        ORDER BY c.id_canal;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    
    -- Handler para errores específicos de cada channel
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1
            @sqlstate = RETURNED_SQLSTATE,
            @errno = MYSQL_ERRNO,
            @text = MESSAGE_TEXT;
        
        SET v_error_message = CONCAT('Error en id_canal ', v_id_canal, ': ', @errno, ' - ', @text);
        
        INSERT INTO log_proceso (mensaje) 
        VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] ERROR: ', v_error_message));
        
        SET v_error_count = v_error_count + 1;
    END;
    
    -- Inicialización
    SET v_fecha_inicio = TIMESTAMP(p_fecha_objetivo, '00:00:00');
    SET v_fecha_fin = TIMESTAMP(p_fecha_objetivo, '23:59:59');
    SET v_fecha_ciclos = v_fecha_inicio;
    
    -- Log de inicio
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] Iniciando procesamiento para fecha: ', p_fecha_objetivo));
    
    -- Contar total de channels a procesar
    SELECT COUNT(*) INTO v_total_channels
    FROM ubi_canal 
    WHERE activo = 1;
    
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] Total channels a procesar: ', v_total_channels));
    
    -- Iniciar transacción principal
    START TRANSACTION;
    
    -- Abrir cursor
    OPEN channel_cursor;
    
    channel_loop: LOOP
        FETCH channel_cursor INTO v_id_canal, v_nombre_channel;
        
        IF v_done THEN
            LEAVE channel_loop;
        END IF;
        
        -- Reiniciar contador de errores para cada channel
        SET v_error_count = 0;
        
        -- Bucle de reintentos para cada channel
        retry_loop: LOOP
            BEGIN
                -- Reiniciar variables de cálculo
                SET v_numero_ciclos = 0;
                SET v_tiempo_en_positivo = 0;
                SET v_porcentaje_tiempo = 0;
                SET v_registro_existe = FALSE;
                
                -- Verificar si ya existe registro para esta fecha y channel
                SELECT 
                    numero_ciclos, 
                    tiempo_en_positivo, 
                    porcentaje_tiempo,
                    TRUE
                INTO 
                    v_numero_ciclos_existente,
                    v_tiempo_positivo_existente,
                    v_porcentaje_existente,
                    v_registro_existe
                FROM ubi_contador_ciclos 
                WHERE fecha_ciclos = v_fecha_ciclos
                AND id_canal = v_id_canal
                LIMIT 1;
                
                -- Llamar a la función de cálculo
                CALL stpr_calcular_metricas_temperatura(
                    v_id_canal,
                    v_fecha_inicio,
                    v_fecha_fin,
                    v_numero_ciclos,
                    v_tiempo_en_positivo,
                    v_porcentaje_tiempo
                );
                
                -- Si existe registro, validar si necesita actualización
                IF v_registro_existe THEN
                    IF (ABS(v_numero_ciclos - v_numero_ciclos_existente) > 0.01 OR
                        v_tiempo_en_positivo != v_tiempo_positivo_existente OR
                        ABS(v_porcentaje_tiempo - v_porcentaje_existente) > 0.001) THEN
                        
                        -- Actualizar registro existente
                        UPDATE ubi_contador_ciclos 
                        SET 
                            numero_ciclos = v_numero_ciclos,
                            tiempo_en_positivo = v_tiempo_en_positivo,
                            porcentaje_tiempo = v_porcentaje_tiempo
                        WHERE fecha_ciclos = v_fecha_ciclos 
                        AND id_canal = v_id_canal;
                        
                        INSERT INTO log_proceso (mensaje) 
                        VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] ACTUALIZADO - Channel: ', v_id_canal, 
                               ' (', v_nombre_channel, ') - Ciclos: ', v_numero_ciclos, 
                               ' - Tiempo: ', v_tiempo_en_positivo, 'min - Porcentaje: ', v_porcentaje_tiempo, '%'));
                    ELSE
                        INSERT INTO log_proceso (mensaje) 
                        VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] SIN CAMBIOS - Channel: ', v_id_canal, 
                               ' (', v_nombre_channel, ') - Datos correctos'));
                    END IF;
                ELSE
                    -- Insertar nuevo registro
                    INSERT INTO ubi_contador_ciclos (
                        fecha_ciclos,
                        id_canal,
                        numero_ciclos,
                        tiempo_en_positivo,
                        porcentaje_tiempo
                    ) VALUES (
                        v_fecha_ciclos,
                        v_id_canal,
                        v_numero_ciclos,
                        v_tiempo_en_positivo,
                        v_porcentaje_tiempo
                    );
                    
                    INSERT INTO log_proceso (mensaje) 
                    VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] INSERTADO - Channel: ', v_id_canal, 
                           ' (', v_nombre_channel, ') - Ciclos: ', v_numero_ciclos, 
                           ' - Tiempo: ', v_tiempo_en_positivo, 'min - Porcentaje: ', v_porcentaje_tiempo, '%'));
                END IF;
                
                SET v_channels_procesados = v_channels_procesados + 1;
                LEAVE retry_loop; -- Éxito, salir del bucle de reintentos
                
            END;
            
            -- Si llegamos aquí, hubo un error
            SET v_error_count = v_error_count + 1;
            
            IF v_error_count >= v_max_reintentos THEN
                -- Máximo de reintentos alcanzado
                SET v_channels_omitidos = v_channels_omitidos + 1;
                SET v_channels_error = v_channels_error + 1;
                
                INSERT INTO log_proceso (mensaje) 
                VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] OMITIDO - Channel: ', v_id_canal, 
                       ' (', v_nombre_channel, ') - Error después de ', v_max_reintentos, ' reintentos: ', v_error_message));
                
                LEAVE retry_loop;
            ELSE
                -- Reintento
                INSERT INTO log_proceso (mensaje) 
                VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] REINTENTO ', v_error_count, '/', v_max_reintentos, 
                       ' - Channel: ', v_id_canal, ' - Error: ', v_error_message));
            END IF;
            
        END LOOP retry_loop;
        
    END LOOP channel_loop;
    
    -- Cerrar cursor
    CLOSE channel_cursor;
    
    -- Commit de la transacción principal
    COMMIT;
    
    -- Log final
    INSERT INTO log_proceso (mensaje) 
    VALUES (CONCAT('[stpr_calcular_ciclos_temperatura] COMPLETADO - Fecha: ', p_fecha_objetivo, 
           ' - Procesados: ', v_channels_procesados, '/', v_total_channels,
           ' - Errores: ', v_channels_error, 
           ' - Omitidos: ', v_channels_omitidos));

END