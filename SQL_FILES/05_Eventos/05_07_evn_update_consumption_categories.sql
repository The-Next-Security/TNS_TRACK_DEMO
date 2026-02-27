CREATE EVENT evn_update_consumption_categories
ON SCHEDULE EVERY 15 MINUTE
STARTS '2025-05-20 16:00:00.000'
ON COMPLETION PRESERVE
ENABLE
COMMENT 'Evento centralizado para actualizar categorías de consumo por hora, día y mes'
DO BEGIN
    -- Variables para control de rango de actualización
    DECLARE v_hora_actual TIMESTAMP;
    DECLARE v_hora_anterior TIMESTAMP;
    DECLARE v_dia_actual DATE;
    DECLARE v_dia_anterior DATE;
    DECLARE v_anio_actual INT;
    DECLARE v_mes_actual INT;
    DECLARE v_anio_anterior INT;
    DECLARE v_mes_anterior INT;

    -- Obtener fechas actuales y anteriores
    SET v_hora_actual = CURRENT_TIMESTAMP;

    -- Para horas, actualizamos las últimas 2 horas (actual y anterior)
    SET v_hora_anterior = DATE_SUB(v_hora_actual, INTERVAL 2 HOUR);

    -- Para días, actualizamos hoy y ayer
    SET v_dia_actual = CURRENT_DATE();
    SET v_dia_anterior = DATE_SUB(v_dia_actual, INTERVAL 1 DAY);

    -- Para meses, actualizamos mes actual y anterior
    SET v_anio_actual = YEAR(v_dia_actual);
    SET v_mes_actual = MONTH(v_dia_actual);

    -- Calcular mes anterior (considerando cambio de año)
    IF v_mes_actual = 1 THEN
        SET v_anio_anterior = v_anio_actual - 1;
        SET v_mes_anterior = 12;
    ELSE
        SET v_anio_anterior = v_anio_actual;
        SET v_mes_anterior = v_mes_actual - 1;
    END IF;

    -- Registrar inicio de la ejecución
    INSERT INTO log_proceso (mensaje)
    VALUES (
        CONCAT('Iniciando evento centralizado evn_update_consumption_categories a las ',
               TIME(v_hora_actual), '. Actualizando: ',
               'Horas: ', v_hora_anterior, ' a ', v_hora_actual, ', ',
               'Días: ', v_dia_anterior, ' a ', v_dia_actual, ', ',
               'Meses: ', v_anio_anterior, '-', v_mes_anterior, ' a ',
               v_anio_actual, '-', v_mes_actual)
    );

    -- 1. Ejecutar actualización de categorías por hora
    CALL stpr_update_category_totals_hora(v_hora_anterior, v_hora_actual);

    -- 2. Ejecutar actualización de categorías por día
    CALL stpr_update_category_totals_dia(v_dia_anterior, v_dia_actual);

    -- 3. Ejecutar actualización de categorías por mes
    CALL stpr_update_category_totals_mes(
        v_anio_anterior, v_mes_anterior,
        v_anio_actual, v_mes_actual
    );

    -- Registrar finalización exitosa
    INSERT INTO log_proceso (mensaje)
    VALUES (
        CONCAT('Finalizado evento centralizado evn_update_consumption_categories a las ',
               TIME(NOW()), '. Duración total: ',
               TIMESTAMPDIFF(SECOND, v_hora_actual, NOW()), ' segundos.')
    );
END
