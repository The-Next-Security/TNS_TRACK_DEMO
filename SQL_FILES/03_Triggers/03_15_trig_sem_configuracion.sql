-- Triggers para sem_configuracion → log_sem_configuracion
CREATE TRIGGER `trig_sem_configuracion_after_insert`
AFTER INSERT ON `sem_configuracion`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_configuracion` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_configuracion,
        JSON_OBJECT(
            'id_configuracion', NEW.id_configuracion,
            'id_tipo_parametro', NEW.id_tipo_parametro,
            'nombre_parametro', NEW.nombre_parametro,
            'valor', NEW.valor,
            'activo', NEW.activo,
            'valido_desde', NEW.valido_desde,
            'valido_hasta', NEW.valido_hasta
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_sem_configuracion_after_update`
AFTER UPDATE ON `sem_configuracion`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_configuracion` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_configuracion,
        JSON_OBJECT(
            'id_configuracion', OLD.id_configuracion,
            'id_tipo_parametro', OLD.id_tipo_parametro,
            'nombre_parametro', OLD.nombre_parametro,
            'valor', OLD.valor,
            'activo', OLD.activo,
            'valido_desde', OLD.valido_desde,
            'valido_hasta', OLD.valido_hasta
        ),
        JSON_OBJECT(
            'id_configuracion', NEW.id_configuracion,
            'id_tipo_parametro', NEW.id_tipo_parametro,
            'nombre_parametro', NEW.nombre_parametro,
            'valor', NEW.valor,
            'activo', NEW.activo,
            'valido_desde', NEW.valido_desde,
            'valido_hasta', NEW.valido_hasta
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_sem_configuracion_after_delete`
AFTER DELETE ON `sem_configuracion`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_configuracion` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_configuracion,
        JSON_OBJECT(
            'id_configuracion', OLD.id_configuracion,
            'id_tipo_parametro', OLD.id_tipo_parametro,
            'nombre_parametro', OLD.nombre_parametro,
            'valor', OLD.valor,
            'activo', OLD.activo,
            'valido_desde', OLD.valido_desde,
            'valido_hasta', OLD.valido_hasta
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
