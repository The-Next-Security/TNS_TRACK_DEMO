CREATE EVENT evn_actualizar_totales_hora
ON SCHEDULE EVERY 5 MINUTE
STARTS '2025-01-28 00:00:00.000'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    DECLARE v_success_hora BOOLEAN DEFAULT FALSE;
    DECLARE v_hora_actual TIMESTAMP;
    DECLARE v_error_message TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        INSERT INTO log_errores (origen, tipo_origen, mensaje_error, datos_contexto)
        VALUES (
            'evn_actualizar_totales_hora',
            'EVENTO',
            v_error_message,
            JSON_OBJECT('mensaje', 'Error en actualización de totales hora', 'hora_ejecucion', NOW())
        );
    END;

    SET v_hora_actual = DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00');
    SET v_success_hora = fun_process_totales_hora(v_hora_actual);

    IF v_success_hora THEN
        INSERT INTO log_eventos (evento_nombre, resultado, mensaje, datos)
        VALUES (
            'evn_actualizar_totales_hora',
            'EXITOSO',
            'Actualización exitosa de totales hora',
            JSON_OBJECT('hora_procesada', v_hora_actual)
        );
    END IF;
END
