-- Triggers para gen_usuario → log_gen_usuario
CREATE TRIGGER `trig_gen_usuario_after_insert`
AFTER INSERT ON `gen_usuario`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_usuario` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_usuario,
        JSON_OBJECT(
            'id_usuario', NEW.id_usuario,
            'nombre', NEW.nombre,
            'apellido', NEW.apellido,
            'email', NEW.email,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_usuario_after_update`
AFTER UPDATE ON `gen_usuario`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_usuario` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_usuario,
        JSON_OBJECT(
            'id_usuario', OLD.id_usuario,
            'nombre', OLD.nombre,
            'apellido', OLD.apellido,
            'email', OLD.email,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_usuario', NEW.id_usuario,
            'nombre', NEW.nombre,
            'apellido', NEW.apellido,
            'email', NEW.email,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_usuario_after_delete`
AFTER DELETE ON `gen_usuario`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_usuario` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_usuario,
        JSON_OBJECT(
            'id_usuario', OLD.id_usuario,
            'nombre', OLD.nombre,
            'apellido', OLD.apellido,
            'email', OLD.email,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
