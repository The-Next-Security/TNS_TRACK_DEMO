-- Triggers para gen_cofiguracion_valores → log_gen_cofiguracion_valores
CREATE TRIGGER `trig_gen_cofiguracion_valores_after_insert`
AFTER INSERT ON `gen_cofiguracion_valores`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_valores` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_cofiguracion_valores,
        JSON_OBJECT(
            'id_cofiguracion_valores', NEW.id_cofiguracion_valores,
            'id_cofiguracion_parametros', NEW.id_cofiguracion_parametros,
            'valor', NEW.valor,
            'version', NEW.version,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_cofiguracion_valores_after_update`
AFTER UPDATE ON `gen_cofiguracion_valores`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_valores` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_cofiguracion_valores,
        JSON_OBJECT(
            'id_cofiguracion_valores', OLD.id_cofiguracion_valores,
            'id_cofiguracion_parametros', OLD.id_cofiguracion_parametros,
            'valor', OLD.valor,
            'version', OLD.version,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_cofiguracion_valores', NEW.id_cofiguracion_valores,
            'id_cofiguracion_parametros', NEW.id_cofiguracion_parametros,
            'valor', NEW.valor,
            'version', NEW.version,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_cofiguracion_valores_after_delete`
AFTER DELETE ON `gen_cofiguracion_valores`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_cofiguracion_valores` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_cofiguracion_valores,
        JSON_OBJECT(
            'id_cofiguracion_valores', OLD.id_cofiguracion_valores,
            'id_cofiguracion_parametros', OLD.id_cofiguracion_parametros,
            'valor', OLD.valor,
            'version', OLD.version,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
