CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_procesar_channels_faltantes`()
BEGIN
    -- Variables para channels
    DECLARE v_id_canal INT;
    DECLARE v_nombre_canal VARCHAR(50);
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
        SELECT DISTINCT c.id_canal, c.nombre
        FROM ubi_canal c
        JOIN ubi_lecturas_sensor sr ON c.id_canal = sr.id_canal
        WHERE c.activo = 1
        AND sr.temperatura IS NOT NULL
        AND c.id_canal NOT IN (SELECT DISTINCT id_canal FROM ubi_contador_ciclos)
        ORDER BY c.id_canal;

    -- Cursor para fechas de un channel específico
    DECLARE fechas_cursor CURSOR FOR
        SELECT DISTINCT DATE(fecha_lectura) as fecha
        FROM ubi_lecturas_sensor
        WHERE id_canal = v_id_canal
        AND temperatura IS NOT NULL
        ORDER BY DATE(fecha_lectura);

    DECLARE CONTINUE HANDLER FOR NOT FOUND
    BEGIN
        IF v_done_channels = FALSE THEN
            SET v_done_fechas = TRUE;
        ELSE
            SET v_done_channels = TRUE;
        END IF;
    END;

    INSERT INTO log_proceso (mensaje)
    VALUES ('[CHANNELS_FALTANTES] Iniciando procesamiento...');

    -- Abrir cursor de channels
    OPEN channels_cursor;

    channels_loop: LOOP
        FETCH channels_cursor INTO v_id_canal, v_nombre_canal;

        IF v_done_channels THEN
            LEAVE channels_loop;
        END IF;

        SET v_fechas_channel = 0;
        SET v_errores_channel = 0;
        SET v_done_fechas = FALSE;

        INSERT INTO log_proceso (mensaje)
        VALUES (CONCAT('[CHANNELS_FALTANTES] Procesando channel: ', v_id_canal, ' (', v_nombre_canal, ')'));

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

                    INSERT INTO log_proceso (mensaje)
                    VALUES (CONCAT('[CHANNELS_FALTANTES] ERROR channel ', v_id_canal, ' fecha ', v_fecha_actual, ': ',
                                   @errno, ' - ', @text));
                END;

                -- Llamar al stored procedure principal
                CALL stpr_calcular_ciclos_temperatura(v_fecha_actual);

                SET v_fechas_channel = v_fechas_channel + 1;
                SET @fechas_procesadas = @fechas_procesadas + 1;

                -- Log cada 20 fechas por channel
                IF v_fechas_channel % 20 = 0 THEN
                    INSERT INTO log_proceso (mensaje)
                    VALUES (CONCAT('[CHANNELS_FALTANTES] Channel ', v_id_canal, ' - ', v_fechas_channel, ' fechas procesadas'));
                END IF;

            END;

        END LOOP fechas_loop;

        CLOSE fechas_cursor;
        SET v_done_fechas = FALSE; -- Reset para el siguiente channel

        SET @channels_procesados = @channels_procesados + 1;

        INSERT INTO log_proceso (mensaje)
        VALUES (CONCAT('[CHANNELS_FALTANTES] Channel COMPLETADO: ', v_id_canal, ' (', v_nombre_canal, ') - ',
                       v_fechas_channel, ' fechas procesadas, ', v_errores_channel, ' errores'));

    END LOOP channels_loop;

    CLOSE channels_cursor;

    INSERT INTO log_proceso (mensaje)
    VALUES (CONCAT('[CHANNELS_FALTANTES] Procesamiento completado - Channels: ', @channels_procesados,
                   ' - Fechas totales: ', @fechas_procesadas, ' - Errores: ', @fechas_con_error));

END
