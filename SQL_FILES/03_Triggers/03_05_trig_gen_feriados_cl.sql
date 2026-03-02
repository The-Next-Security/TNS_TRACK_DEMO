-- Triggers para gen_feriados_cl → log_gen_feriados_cl
CREATE TRIGGER `trig_gen_feriados_cl_after_insert`
AFTER INSERT ON `gen_feriados_cl`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_feriados_cl` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_feriado,
        JSON_OBJECT(
            'id_feriado', NEW.id_feriado,
            'fecha', NEW.fecha,
            'nombre', NEW.nombre
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_feriados_cl_after_update`
AFTER UPDATE ON `gen_feriados_cl`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_feriados_cl` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_feriado,
        JSON_OBJECT(
            'id_feriado', OLD.id_feriado,
            'fecha', OLD.fecha,
            'nombre', OLD.nombre
        ),
        JSON_OBJECT(
            'id_feriado', NEW.id_feriado,
            'fecha', NEW.fecha,
            'nombre', NEW.nombre
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_feriados_cl_after_delete`
AFTER DELETE ON `gen_feriados_cl`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_feriados_cl` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_feriado,
        JSON_OBJECT(
            'id_feriado', OLD.id_feriado,
            'fecha', OLD.fecha,
            'nombre', OLD.nombre
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
