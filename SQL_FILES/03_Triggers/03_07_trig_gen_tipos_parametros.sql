-- Triggers para gen_tipos_parametros → log_gen_tipos_parametros
CREATE TRIGGER `trig_gen_tipos_parametros_after_insert`
AFTER INSERT ON `gen_tipos_parametros`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_tipos_parametros` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_tipo_parametro,
        JSON_OBJECT(
            'id_tipo_parametro', NEW.id_tipo_parametro,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'categoria', NEW.categoria,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_tipos_parametros_after_update`
AFTER UPDATE ON `gen_tipos_parametros`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_tipos_parametros` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_tipo_parametro,
        JSON_OBJECT(
            'id_tipo_parametro', OLD.id_tipo_parametro,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'categoria', OLD.categoria,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_tipo_parametro', NEW.id_tipo_parametro,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'categoria', NEW.categoria,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_tipos_parametros_after_delete`
AFTER DELETE ON `gen_tipos_parametros`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_tipos_parametros` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_tipo_parametro,
        JSON_OBJECT(
            'id_tipo_parametro', OLD.id_tipo_parametro,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'categoria', OLD.categoria,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
