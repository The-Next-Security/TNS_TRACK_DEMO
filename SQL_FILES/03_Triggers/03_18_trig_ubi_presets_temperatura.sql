-- Triggers para ubi_presets_temperatura → log_ubi_presets_temperatura
CREATE TRIGGER `trig_ubi_presets_temperatura_after_insert`
AFTER INSERT ON `ubi_presets_temperatura`
FOR EACH ROW
BEGIN
    INSERT INTO `log_ubi_presets_temperatura` (tipo_operacion, id_registro, datos_nuevos, cambiado_por)
    VALUES (
        'INSERT',
        NEW.id_preset,
        JSON_OBJECT(
            'id_preset', NEW.id_preset,
            'nombre_preset', NEW.nombre_preset,
            'temperatura_minima', NEW.temperatura_minima,
            'temperatura_maxima', NEW.temperatura_maxima,
            'es_predeterminado', NEW.es_predeterminado,
            'activo', NEW.activo,
            'creado_por', NEW.creado_por,
            'actualizado_por', NEW.actualizado_por
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_ubi_presets_temperatura_after_update`
AFTER UPDATE ON `ubi_presets_temperatura`
FOR EACH ROW
BEGIN
    INSERT INTO `log_ubi_presets_temperatura` (tipo_operacion, id_registro, datos_anteriores, datos_nuevos, cambiado_por)
    VALUES (
        'UPDATE',
        NEW.id_preset,
        JSON_OBJECT(
            'id_preset', OLD.id_preset,
            'nombre_preset', OLD.nombre_preset,
            'temperatura_minima', OLD.temperatura_minima,
            'temperatura_maxima', OLD.temperatura_maxima,
            'es_predeterminado', OLD.es_predeterminado,
            'activo', OLD.activo,
            'creado_por', OLD.creado_por,
            'actualizado_por', OLD.actualizado_por
        ),
        JSON_OBJECT(
            'id_preset', NEW.id_preset,
            'nombre_preset', NEW.nombre_preset,
            'temperatura_minima', NEW.temperatura_minima,
            'temperatura_maxima', NEW.temperatura_maxima,
            'es_predeterminado', NEW.es_predeterminado,
            'activo', NEW.activo,
            'creado_por', NEW.creado_por,
            'actualizado_por', NEW.actualizado_por
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;

CREATE TRIGGER `trig_ubi_presets_temperatura_after_delete`
AFTER DELETE ON `ubi_presets_temperatura`
FOR EACH ROW
BEGIN
    INSERT INTO `log_ubi_presets_temperatura` (tipo_operacion, id_registro, datos_anteriores, cambiado_por)
    VALUES (
        'DELETE',
        OLD.id_preset,
        JSON_OBJECT(
            'id_preset', OLD.id_preset,
            'nombre_preset', OLD.nombre_preset,
            'temperatura_minima', OLD.temperatura_minima,
            'temperatura_maxima', OLD.temperatura_maxima,
            'es_predeterminado', OLD.es_predeterminado,
            'activo', OLD.activo,
            'creado_por', OLD.creado_por,
            'actualizado_por', OLD.actualizado_por
        ),
        IFNULL(@app_usuario, 'SYSTEM')
    );
END;
