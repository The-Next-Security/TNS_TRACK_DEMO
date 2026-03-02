CREATE EVENT evn_procesar_totales
ON SCHEDULE EVERY 5 MINUTE
STARTS '2024-12-18 13:09:48.000'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    DECLARE v_previous_hour TIMESTAMP;
    DECLARE v_current_hour TIMESTAMP;
    DECLARE v_processed_previous BOOLEAN;
    DECLARE v_processed_current BOOLEAN;

    -- Obtener la hora actual y la anterior
    SET v_current_hour = DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00');
    SET v_previous_hour = DATE_SUB(v_current_hour, INTERVAL 1 HOUR);

    -- Procesar ambas horas
    SET v_processed_previous = fun_process_totales_hora(v_previous_hour);
    SET v_processed_current = fun_process_totales_hora(v_current_hour);

    -- Registrar la ejecución del evento
    INSERT INTO log_eventos (evento_nombre, resultado, mensaje, datos)
    VALUES (
        'evn_procesar_totales',
        IF(v_processed_previous + v_processed_current > 0, 'EXITOSO', 'SIN_CAMBIOS'),
        'Procesamiento de totales completado',
        JSON_OBJECT(
            'hora_anterior_procesada', v_previous_hour,
            'resultado_hora_anterior', IF(v_processed_previous, 'EXITOSO', 'SIN_CAMBIOS'),
            'hora_actual_procesada', v_current_hour,
            'resultado_hora_actual', IF(v_processed_current, 'EXITOSO', 'SIN_CAMBIOS'),
            'total_periodos_actualizados', v_processed_previous + v_processed_current
        )
    );
END
