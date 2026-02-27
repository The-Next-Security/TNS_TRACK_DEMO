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
        INSERT INTO sem_auditoria_detallada (
            tipo_operacion, tabla_afectada, usuario, datos_nuevos, 
            fecha_operacion, direccion_ip, aplicacion
        ) VALUES (
            'ERROR', 'sem_totales_hora', 'SYSTEM',
            JSON_OBJECT(
                'mensaje', 'Error en actualización de totales hora',
                'error', v_error_message,
                'hora_ejecucion', NOW()
            ),
            CURRENT_TIMESTAMP(6), '127.0.0.1', 'EVENT_actualizar_totales_hora'
        );
    END;

    SET v_hora_actual = DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00');
    SET v_success_hora = fun_process_totales_hora(v_hora_actual);

    IF v_success_hora THEN
        INSERT INTO sem_auditoria_detallada (
            tipo_operacion, tabla_afectada, usuario, datos_nuevos, 
            fecha_operacion, direccion_ip, aplicacion
        ) VALUES (
            'ACTUALIZACION', 'sem_totales_hora', 'SYSTEM',
            JSON_OBJECT(
                'mensaje', 'Actualización exitosa de totales hora',
                'hora_procesada', v_hora_actual
            ),
            CURRENT_TIMESTAMP(6), '127.0.0.1', 'EVENT_actualizar_totales_hora'
        );
    END IF;
END