-- Triggers para gen_usuario_permisos → log_gen_usuario_permisos
-- PK compuesta (id_usuario, id_permiso): id_registro = NULL, referencia en JSON
CREATE TRIGGER `trig_gen_usuario_permisos_after_insert`
AFTER INSERT ON `gen_usuario_permisos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_usuario_permisos` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NULL,
        JSON_OBJECT(
            'id_usuario', NEW.id_usuario,
            'id_permiso', NEW.id_permiso,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_usuario_permisos_after_update`
AFTER UPDATE ON `gen_usuario_permisos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_usuario_permisos` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NULL,
        JSON_OBJECT('id_usuario', OLD.id_usuario, 'id_permiso', OLD.id_permiso, 'activo', OLD.activo),
        JSON_OBJECT('id_usuario', NEW.id_usuario, 'id_permiso', NEW.id_permiso, 'activo', NEW.activo),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_gen_usuario_permisos_after_delete`
AFTER DELETE ON `gen_usuario_permisos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_gen_usuario_permisos` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        NULL,
        JSON_OBJECT('id_usuario', OLD.id_usuario, 'id_permiso', OLD.id_permiso, 'activo', OLD.activo),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
