CREATE EVENT evn_actualizar_totales_dia
ON SCHEDULE EVERY 30 MINUTE
STARTS '2025-01-28 00:00:00.000'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    DECLARE v_success_dia BOOLEAN DEFAULT FALSE;
    DECLARE v_dia_actual DATE;
    DECLARE v_error_message TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        INSERT INTO log_errores (origen, tipo_origen, mensaje_error, datos_contexto)
        VALUES (
            'evn_actualizar_totales_dia',
            'EVENTO',
            v_error_message,
            JSON_OBJECT('mensaje', 'Error en actualización de totales día', 'hora_ejecucion', NOW())
        );
    END;

    SET v_dia_actual = CURRENT_DATE();
    SET v_success_dia = fun_process_totales_dia(v_dia_actual);

    IF v_success_dia THEN
        INSERT INTO log_eventos (evento_nombre, resultado, mensaje, datos)
        VALUES (
            'evn_actualizar_totales_dia',
            'EXITOSO',
            'Actualización exitosa de totales día',
            JSON_OBJECT('dia_procesado', v_dia_actual)
        );
    END IF;
END
