-- Triggers para gen_cofiguracion_grupos → log_gen_cofiguracion_grupos
CREATE TRIGGER `trig_gen_cofiguracion_grupos_after_insert`
AFTER INSERT ON `gen_cofiguracion_grupos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_grupos` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_cofiguracion_grupos,
        JSON_OBJECT(
            'id_cofiguracion_grupos', NEW.id_cofiguracion_grupos,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'orden', NEW.orden,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_cofiguracion_grupos_after_update`
AFTER UPDATE ON `gen_cofiguracion_grupos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_grupos` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_cofiguracion_grupos,
        JSON_OBJECT(
            'id_cofiguracion_grupos', OLD.id_cofiguracion_grupos,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'orden', OLD.orden,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_cofiguracion_grupos', NEW.id_cofiguracion_grupos,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'orden', NEW.orden,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_cofiguracion_grupos_after_delete`
AFTER DELETE ON `gen_cofiguracion_grupos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_grupos` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_cofiguracion_grupos,
        JSON_OBJECT(
            'id_cofiguracion_grupos', OLD.id_cofiguracion_grupos,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'orden', OLD.orden,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
