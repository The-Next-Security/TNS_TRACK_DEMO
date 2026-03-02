-- Triggers para gen_cofiguracion_parametros → log_gen_cofiguracion_parametros
CREATE TRIGGER `trig_gen_cofiguracion_parametros_after_insert`
AFTER INSERT ON `gen_cofiguracion_parametros`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_parametros` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_cofiguracion_parametros,
        JSON_OBJECT(
            'id_cofiguracion_parametros', NEW.id_cofiguracion_parametros,
            'id_cofiguracion_grupos', NEW.id_cofiguracion_grupos,
            'id_tipo_parametro', NEW.id_tipo_parametro,
            'ruta_completa', NEW.ruta_completa,
            'nombre_parametro', NEW.nombre_parametro,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_cofiguracion_parametros_after_update`
AFTER UPDATE ON `gen_cofiguracion_parametros`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_parametros` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_cofiguracion_parametros,
        JSON_OBJECT(
            'id_cofiguracion_parametros', OLD.id_cofiguracion_parametros,
            'id_cofiguracion_grupos', OLD.id_cofiguracion_grupos,
            'id_tipo_parametro', OLD.id_tipo_parametro,
            'ruta_completa', OLD.ruta_completa,
            'nombre_parametro', OLD.nombre_parametro,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_cofiguracion_parametros', NEW.id_cofiguracion_parametros,
            'id_cofiguracion_grupos', NEW.id_cofiguracion_grupos,
            'id_tipo_parametro', NEW.id_tipo_parametro,
            'ruta_completa', NEW.ruta_completa,
            'nombre_parametro', NEW.nombre_parametro,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_cofiguracion_parametros_after_delete`
AFTER DELETE ON `gen_cofiguracion_parametros`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_parametros` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_cofiguracion_parametros,
        JSON_OBJECT(
            'id_cofiguracion_parametros', OLD.id_cofiguracion_parametros,
            'id_cofiguracion_grupos', OLD.id_cofiguracion_grupos,
            'id_tipo_parametro', OLD.id_tipo_parametro,
            'ruta_completa', OLD.ruta_completa,
            'nombre_parametro', OLD.nombre_parametro,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
