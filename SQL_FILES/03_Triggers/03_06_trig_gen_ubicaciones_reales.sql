-- Triggers para gen_ubicaciones_reales → log_gen_ubicaciones_reales
CREATE TRIGGER `trig_gen_ubicaciones_reales_after_insert`
AFTER INSERT ON `gen_ubicaciones_reales`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_ubicaciones_reales` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_ubicacion_real,
        JSON_OBJECT(
            'id_ubicacion_real', NEW.id_ubicacion_real,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_ubicaciones_reales_after_update`
AFTER UPDATE ON `gen_ubicaciones_reales`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_ubicaciones_reales` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_ubicacion_real,
        JSON_OBJECT(
            'id_ubicacion_real', OLD.id_ubicacion_real,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_ubicacion_real', NEW.id_ubicacion_real,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_ubicaciones_reales_after_delete`
AFTER DELETE ON `gen_ubicaciones_reales`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_ubicaciones_reales` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_ubicacion_real,
        JSON_OBJECT(
            'id_ubicacion_real', OLD.id_ubicacion_real,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
