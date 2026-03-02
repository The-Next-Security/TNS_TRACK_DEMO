-- Triggers para gen_permiso → log_gen_permiso
CREATE TRIGGER `trig_gen_permiso_after_insert`
AFTER INSERT ON `gen_permiso`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_permiso` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_permiso,
        JSON_OBJECT(
            'id_permiso', NEW.id_permiso,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_permiso_after_update`
AFTER UPDATE ON `gen_permiso`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_permiso` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_permiso,
        JSON_OBJECT(
            'id_permiso', OLD.id_permiso,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_permiso', NEW.id_permiso,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_permiso_after_delete`
AFTER DELETE ON `gen_permiso`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_permiso` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_permiso,
        JSON_OBJECT(
            'id_permiso', OLD.id_permiso,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
