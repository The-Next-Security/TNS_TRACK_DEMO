DELIMITER ;;

CREATE DEFINER=`root`@`%` PROCEDURE `sp_procesar_channels_faltantes`()
BEGIN
    -- Variables para channels
    DECLARE v_channel_id INT;
    DECLARE v_channel_name VARCHAR(50);
    DECLARE v_done_channels BOOLEAN DEFAULT FALSE;

    -- Variables para fechas
    DECLARE v_fecha_actual DATE;
    DECLARE v_done_fechas BOOLEAN DEFAULT FALSE;
    DECLARE v_tiempo_inicio TIMESTAMP;
    DECLARE v_tiempo_fin TIMESTAMP;
    DECLARE v_fechas_channel INT DEFAULT 0;
    DECLARE v_errores_channel INT DEFAULT 0;

    -- Cursor para channels sin procesar
    DECLARE channels_cursor CURSOR FOR
        SELECT DISTINCT c.channel_id, c.name
        FROM channels_ubibot c
        JOIN sensor_readings_ubibot sr ON c.channel_id = sr.channel_id
        WHERE c.esOperativa = 1
        AND sr.external_temperature IS NOT NULL
        AND c.channel_id NOT IN (SELECT DISTINCT channel_id FROM contador_ciclos)
        ORDER BY c.channel_id;

    -- Cursor para fechas de un channel específico
    DECLARE fechas_cursor CURSOR FOR
        SELECT DISTINCT DATE(external_temperature_timestamp) as fecha
        FROM sensor_readings_ubibot
        WHERE channel_id = v_channel_id
        AND external_temperature IS NOT NULL
        ORDER BY DATE(external_temperature_timestamp);

    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        IF v_done_channels = FALSE THEN
            SET v_done_fechas = TRUE;
        ELSE
            SET v_done_channels = TRUE;
        END IF;
    END;

    INSERT INTO process_log (message)
    VALUES ('[CHANNELS_FALTANTES] Iniciando procesamiento...');

    -- Abrir cursor de channels
    OPEN channels_cursor;

    channels_loop: LOOP
        FETCH channels_cursor INTO v_channel_id, v_channel_name;

        IF v_done_channels THEN
            LEAVE channels_loop;
        END IF;

        SET v_fechas_channel = 0;
        SET v_errores_channel = 0;
        SET v_done_fechas = FALSE;

        INSERT INTO process_log (message)
        VALUES (CONCAT('[CHANNELS_FALTANTES] Procesando channel: ', v_channel_id, ' (', v_channel_name, ')'));

        -- Abrir cursor de fechas para este channel
        OPEN fechas_cursor;

        fechas_loop: LOOP
            FETCH fechas_cursor INTO v_fecha_actual;

            IF v_done_fechas THEN
                LEAVE fechas_loop;
            END IF;

            SET v_tiempo_inicio = NOW();

            -- Procesar esta fecha para este channel
            BEGIN
                DECLARE EXIT HANDLER FOR SQLEXCEPTION
                BEGIN
                    GET DIAGNOSTICS CONDITION 1
                        @sqlstate = RETURNED_SQLSTATE,
                        @errno = MYSQL_ERRNO,
                        @text = MESSAGE_TEXT;

                    SET v_errores_channel = v_errores_channel + 1;
                    SET @fechas_con_error = @fechas_con_error + 1;

                    INSERT INTO process_log (message)
                    VALUES (CONCAT('[CHANNELS_FALTANTES] ERROR channel ', v_channel_id, ' fecha ', v_fecha_actual, ': ',
                                   @errno, ' - ', @text));
                END;

                -- Llamar al stored procedure principal
                CALL sp_calcular_ciclos_temperatura(v_fecha_actual);

                SET v_fechas_channel = v_fechas_channel + 1;
                SET @fechas_procesadas = @fechas_procesadas + 1;

                -- Log cada 20 fechas por channel
                IF v_fechas_channel % 20 = 0 THEN
                    INSERT INTO process_log (message)
                    VALUES (CONCAT('[CHANNELS_FALTANTES] Channel ', v_channel_id, ' - ', v_fechas_channel, ' fechas procesadas'));
                END IF;

            END;

        END LOOP fechas_loop;

        CLOSE fechas_cursor;
        SET v_done_fechas = FALSE; -- Reset para el siguiente channel

        SET @channels_procesados = @channels_procesados + 1;

        INSERT INTO process_log (message)
        VALUES (CONCAT('[CHANNELS_FALTANTES] Channel COMPLETADO: ', v_channel_id, ' (', v_channel_name, ') - ',
                       v_fechas_channel, ' fechas procesadas, ', v_errores_channel, ' errores'));

    END LOOP channels_loop;

    CLOSE channels_cursor;

    INSERT INTO process_log (message)
    VALUES (CONCAT('[CHANNELS_FALTANTES] Procesamiento completado - Channels: ', @channels_procesados,
                   ' - Fechas totales: ', @fechas_procesadas, ' - Errores: ', @fechas_con_error));

END ;;

DELIMITER ;
