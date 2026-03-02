-- Triggers para sem_grupos → log_sem_grupos
CREATE TRIGGER `trig_sem_grupos_after_insert`
AFTER INSERT ON `sem_grupos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_grupos` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_grupo,
        JSON_OBJECT(
            'id_grupo', NEW.id_grupo,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_sem_grupos_after_update`
AFTER UPDATE ON `sem_grupos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_grupos` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_grupo,
        JSON_OBJECT(
            'id_grupo', OLD.id_grupo,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_grupo', NEW.id_grupo,
            'nombre', NEW.nombre,
            'descripcion', NEW.descripcion,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_sem_grupos_after_delete`
AFTER DELETE ON `sem_grupos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_grupos` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_grupo,
        JSON_OBJECT(
            'id_grupo', OLD.id_grupo,
            'nombre', OLD.nombre,
            'descripcion', OLD.descripcion,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
