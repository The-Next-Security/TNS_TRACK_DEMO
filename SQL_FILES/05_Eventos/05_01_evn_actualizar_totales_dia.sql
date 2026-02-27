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
        INSERT INTO sem_auditoria_detallada (
            tipo_operacion, tabla_afectada, usuario, datos_nuevos, 
            fecha_operacion, direccion_ip, aplicacion
        ) VALUES (
            'ERROR', 'sem_totales_dia', 'SYSTEM',
            JSON_OBJECT(
                'mensaje', 'Error en actualización de totales día',
                'error', v_error_message,
                'hora_ejecucion', NOW()
            ),
            CURRENT_TIMESTAMP(6), '127.0.0.1', 'EVENT_actualizar_totales_dia'
        );
    END;

    SET v_dia_actual = CURRENT_DATE();
    SET v_success_dia = fun_process_totales_dia(v_dia_actual);

    IF v_success_dia THEN
        INSERT INTO sem_auditoria_detallada (
            tipo_operacion, tabla_afectada, usuario, datos_nuevos, 
            fecha_operacion, direccion_ip, aplicacion
        ) VALUES (
            'ACTUALIZACION', 'sem_totales_dia', 'SYSTEM',
            JSON_OBJECT(
                'mensaje', 'Actualización exitosa de totales día',
                'dia_procesado', v_dia_actual
            ),
            CURRENT_TIMESTAMP(6), '127.0.0.1', 'EVENT_actualizar_totales_dia'
        );
    END IF;
END