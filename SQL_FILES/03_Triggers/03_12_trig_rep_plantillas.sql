-- Triggers para rep_plantillas → log_rep_plantillas
CREATE TRIGGER `trig_rep_plantillas_after_insert`
AFTER INSERT ON `rep_plantillas`
FOR EACH ROW
BEGIN
    INSERT INTO `log_rep_plantillas` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_plantilla,
        JSON_OBJECT(
            'id_plantilla', NEW.id_plantilla,
            'clave_plantilla', NEW.clave_plantilla,
            'id_tipo_reporte', NEW.id_tipo_reporte,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_rep_plantillas_after_update`
AFTER UPDATE ON `rep_plantillas`
FOR EACH ROW
BEGIN
    INSERT INTO `log_rep_plantillas` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_plantilla,
        JSON_OBJECT(
            'id_plantilla', OLD.id_plantilla,
            'clave_plantilla', OLD.clave_plantilla,
            'id_tipo_reporte', OLD.id_tipo_reporte,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_plantilla', NEW.id_plantilla,
            'clave_plantilla', NEW.clave_plantilla,
            'id_tipo_reporte', NEW.id_tipo_reporte,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_rep_plantillas_after_delete`
AFTER DELETE ON `rep_plantillas`
FOR EACH ROW
BEGIN
    INSERT INTO `log_rep_plantillas` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_plantilla,
        JSON_OBJECT(
            'id_plantilla', OLD.id_plantilla,
            'clave_plantilla', OLD.clave_plantilla,
            'id_tipo_reporte', OLD.id_tipo_reporte,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
