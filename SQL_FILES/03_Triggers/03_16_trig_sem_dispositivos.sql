-- Triggers para sem_dispositivos → log_sem_dispositivos
CREATE TRIGGER `trig_sem_dispositivos_after_insert`
AFTER INSERT ON `sem_dispositivos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_dispositivos` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_dispositivo_shelly,
        JSON_OBJECT(
            'id_dispositivo_shelly', NEW.id_dispositivo_shelly,
            'shelly_id', NEW.shelly_id,
            'nombre', NEW.nombre,
            'tipo', NEW.tipo,
            'id_ubicacion_real', NEW.id_ubicacion_real,
            'id_grupo', NEW.id_grupo,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_sem_dispositivos_after_update`
AFTER UPDATE ON `sem_dispositivos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_dispositivos` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_dispositivo_shelly,
        JSON_OBJECT(
            'id_dispositivo_shelly', OLD.id_dispositivo_shelly,
            'shelly_id', OLD.shelly_id,
            'nombre', OLD.nombre,
            'tipo', OLD.tipo,
            'id_ubicacion_real', OLD.id_ubicacion_real,
            'id_grupo', OLD.id_grupo,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_dispositivo_shelly', NEW.id_dispositivo_shelly,
            'shelly_id', NEW.shelly_id,
            'nombre', NEW.nombre,
            'tipo', NEW.tipo,
            'id_ubicacion_real', NEW.id_ubicacion_real,
            'id_grupo', NEW.id_grupo,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_sem_dispositivos_after_delete`
AFTER DELETE ON `sem_dispositivos`
FOR EACH ROW
BEGIN
    INSERT INTO `log_sem_dispositivos` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_dispositivo_shelly,
        JSON_OBJECT(
            'id_dispositivo_shelly', OLD.id_dispositivo_shelly,
            'shelly_id', OLD.shelly_id,
            'nombre', OLD.nombre,
            'tipo', OLD.tipo,
            'id_ubicacion_real', OLD.id_ubicacion_real,
            'id_grupo', OLD.id_grupo,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
