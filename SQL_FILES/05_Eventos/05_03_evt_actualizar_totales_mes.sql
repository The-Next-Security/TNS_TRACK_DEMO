CREATE EVENT event_actualizar_totales_mes
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
        INSERT INTO sem_auditoria_detallada (
            tipo_operacion, tabla_afectada, usuario, datos_nuevos, 
            fecha_operacion, direccion_ip, aplicacion
        ) VALUES (
            'ERROR', 'sem_totales_mes', 'SYSTEM',
            JSON_OBJECT(
                'mensaje', 'Error en actualización de totales mes',
                'error', v_error_message,
                'hora_ejecucion', NOW()
            ),
            CURRENT_TIMESTAMP(6), '127.0.0.1', 'EVENT_actualizar_totales_mes'
        );
    END;

    SET v_año_actual = YEAR(CURRENT_DATE());
    SET v_mes_actual = MONTH(CURRENT_DATE());
    SET v_success_mes = fn_process_totales_mes(v_año_actual, v_mes_actual);

    IF v_success_mes THEN
        INSERT INTO sem_auditoria_detallada (
            tipo_operacion, tabla_afectada, usuario, datos_nuevos, 
            fecha_operacion, direccion_ip, aplicacion
        ) VALUES (
            'ACTUALIZACION', 'sem_totales_mes', 'SYSTEM',
            JSON_OBJECT(
                'mensaje', 'Actualización exitosa de totales mes',
                'año', v_año_actual,
                'mes', v_mes_actual
            ),
            CURRENT_TIMESTAMP(6), '127.0.0.1', 'EVENT_actualizar_totales_mes'
        );
    END IF;
END