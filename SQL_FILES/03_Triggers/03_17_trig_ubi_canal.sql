-- Triggers para ubi_canal → log_ubi_canal
CREATE TRIGGER `trig_ubi_canal_after_insert`
AFTER INSERT ON `ubi_canal`
FOR EACH ROW
BEGIN
    INSERT INTO `log_ubi_canal` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_canal,
        JSON_OBJECT(
            'id_canal', NEW.id_canal,
            'id_ubicacion_real', NEW.id_ubicacion_real,
            'canal_id', NEW.canal_id,
            'nombre', NEW.nombre,
            'en_linea', NEW.en_linea,
            'id_preset', NEW.id_preset,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_ubi_canal_after_update`
AFTER UPDATE ON `ubi_canal`
FOR EACH ROW
BEGIN
    INSERT INTO `log_ubi_canal` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_canal,
        JSON_OBJECT(
            'id_canal', OLD.id_canal,
            'id_ubicacion_real', OLD.id_ubicacion_real,
            'canal_id', OLD.canal_id,
            'nombre', OLD.nombre,
            'en_linea', OLD.en_linea,
            'id_preset', OLD.id_preset,
            'activo', OLD.activo
        ),
        JSON_OBJECT(
            'id_canal', NEW.id_canal,
            'id_ubicacion_real', NEW.id_ubicacion_real,
            'canal_id', NEW.canal_id,
            'nombre', NEW.nombre,
            'en_linea', NEW.en_linea,
            'id_preset', NEW.id_preset,
            'activo', NEW.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_ubi_canal_after_delete`
AFTER DELETE ON `ubi_canal`
FOR EACH ROW
BEGIN
    INSERT INTO `log_ubi_canal` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_canal,
        JSON_OBJECT(
            'id_canal', OLD.id_canal,
            'id_ubicacion_real', OLD.id_ubicacion_real,
            'canal_id', OLD.canal_id,
            'nombre', OLD.nombre,
            'en_linea', OLD.en_linea,
            'id_preset', OLD.id_preset,
            'activo', OLD.activo
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
