CREATE EVENT evn_actualizar_totales_mes
ON SCHEDULE EVERY 1 HOUR
STARTS '2025-01-28 00:00:00.000'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    DECLARE v_success_mes BOOLEAN DEFAULT FALSE;
    DECLARE v_año_actual INT;
    DECLARE v_mes_actual INT;
    DECLARE v_error_message TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        INSERT INTO log_errores (origen, tipo_origen, mensaje_error, datos_contexto)
        VALUES (
            'evn_actualizar_totales_mes',
            'EVENTO',
            v_error_message,
            JSON_OBJECT('mensaje', 'Error en actualización de totales mes', 'hora_ejecucion', NOW())
        );
    END;

    SET v_año_actual = YEAR(CURRENT_DATE());
    SET v_mes_actual = MONTH(CURRENT_DATE());
    SET v_success_mes = fun_process_totales_mes(v_año_actual, v_mes_actual);

    IF v_success_mes THEN
        INSERT INTO log_eventos (evento_nombre, resultado, mensaje, datos)
        VALUES (
            'evn_actualizar_totales_mes',
            'EXITOSO',
            'Actualización exitosa de totales mes',
            JSON_OBJECT('año', v_año_actual, 'mes', v_mes_actual)
        );
    END IF;
END
