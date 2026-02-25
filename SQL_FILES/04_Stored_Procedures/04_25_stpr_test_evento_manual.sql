DELIMITER ;;

CREATE DEFINER=`root`@`%` PROCEDURE `sp_test_evento_manual`(IN p_fecha_test DATE)
    COMMENT 'Ejecuta manualmente la lógica del evento para testing con validaciones'
BEGIN
    DECLARE v_fecha_test DATE DEFAULT COALESCE(p_fecha_test, DATE_SUB(CURDATE(), INTERVAL 1 DAY));
    DECLARE v_registros_antes INT DEFAULT 0;
    DECLARE v_registros_despues INT DEFAULT 0;

    -- Verificar que no estemos procesando el día actual accidentalmente
    IF v_fecha_test = CURDATE() THEN
        INSERT INTO process_log (message)
        VALUES (CONCAT('[TEST_MANUAL] ADVERTENCIA - Intentando procesar día actual: ', v_fecha_test));

        SELECT 'ADVERTENCIA' AS resultado,
               v_fecha_test AS fecha_solicitada,
               'No se recomienda procesar el día actual' AS mensaje;

        -- Preguntar confirmación (en producción se podría cancelar)
        -- LEAVE;
    END IF;

    SELECT COUNT(*) INTO v_registros_antes
    FROM contador_ciclos
    WHERE DATE(fecha_ciclos) = v_fecha_test;

    INSERT INTO process_log (message)
    VALUES (CONCAT('[TEST_MANUAL] Iniciando test para fecha: ', v_fecha_test,
                   ' - Registros existentes: ', v_registros_antes));

    -- Ejecutar la misma lógica que el evento
    CALL sp_calcular_ciclos_temperatura(v_fecha_test);

    SELECT COUNT(*) INTO v_registros_despues
    FROM contador_ciclos
    WHERE DATE(fecha_ciclos) = v_fecha_test;

    -- Mostrar resultados detallados
    SELECT
        'RESULTADO DEL TEST' AS seccion,
        v_fecha_test AS fecha_procesada,
        v_registros_antes AS registros_antes,
        v_registros_despues AS registros_despues,
        (v_registros_despues - v_registros_antes) AS registros_nuevos,
        COUNT(*) AS total_channels,
        ROUND(AVG(numero_ciclos), 2) AS promedio_ciclos,
        ROUND(AVG(tiempo_en_positivo), 1) AS promedio_tiempo_positivo,
        MAX(numero_ciclos) AS max_ciclos,
        MIN(numero_ciclos) AS min_ciclos
    FROM contador_ciclos
    WHERE DATE(fecha_ciclos) = v_fecha_test;

    INSERT INTO process_log (message)
    VALUES (CONCAT('[TEST_MANUAL] Test completado para ', v_fecha_test,
                   ' - Registros finales: ', v_registros_despues));

END ;;

DELIMITER ;
