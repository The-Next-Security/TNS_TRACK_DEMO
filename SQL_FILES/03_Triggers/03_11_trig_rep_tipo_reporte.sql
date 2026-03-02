-- Triggers para rep_tipo_reporte → log_rep_tipo_reporte
CREATE TRIGGER `trig_rep_tipo_reporte_after_insert`
AFTER INSERT ON `rep_tipo_reporte`
FOR EACH ROW
BEGIN
    INSERT INTO `log_rep_tipo_reporte` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_tipo_reporte,
        JSON_OBJECT(
            'id_tipo_reporte', NEW.id_tipo_reporte,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_rep_tipo_reporte_after_update`
AFTER UPDATE ON `rep_tipo_reporte`
FOR EACH ROW
BEGIN
    INSERT INTO `log_rep_tipo_reporte` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_tipo_reporte,
        JSON_OBJECT(
            'id_tipo_reporte', OLD.id_tipo_reporte,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion
        ),
        JSON_OBJECT(
            'id_tipo_reporte', NEW.id_tipo_reporte,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_rep_tipo_reporte_after_delete`
AFTER DELETE ON `rep_tipo_reporte`
FOR EACH ROW
BEGIN
    INSERT INTO `log_rep_tipo_reporte` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_tipo_reporte,
        JSON_OBJECT(
            'id_tipo_reporte', OLD.id_tipo_reporte,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
