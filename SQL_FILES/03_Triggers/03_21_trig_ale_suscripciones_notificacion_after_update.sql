-- Trigger: ale_suscripciones_notificacion AFTER UPDATE → log_ale_suscripciones_notificacion
DELIMITER $$
CREATE TRIGGER `trig_ale_suscripciones_notificacion_after_update`
AFTER UPDATE ON `ale_suscripciones_notificacion`
FOR EACH ROW
BEGIN
  INSERT INTO `log_ale_suscripciones_notificacion` (
    id_suscripcion_notificacion,
    id_usuario,
    id_tipo_alerta,
    id_origen_tipo,
    canal,
    operacion,
    datos_anteriores,
    datos_nuevos
  ) VALUES (
    NEW.id_suscripcion_notificacion,
    NEW.id_usuario,
    NEW.id_tipo_alerta,
    NEW.id_origen_tipo,
    NEW.canal,
    'UPDATE',
    JSON_OBJECT(
      'id_suscripcion_notificacion', OLD.id_suscripcion_notificacion,
      'id_usuario', OLD.id_usuario,
      'id_tipo_alerta', OLD.id_tipo_alerta,
      'id_origen_tipo', OLD.id_origen_tipo,
      'canal', OLD.canal,
      'activo', OLD.activo,
      'ultima_notificacion_enviada', OLD.ultima_notificacion_enviada
    ),
    JSON_OBJECT(
      'id_suscripcion_notificacion', NEW.id_suscripcion_notificacion,
      'id_usuario', NEW.id_usuario,
      'id_tipo_alerta', NEW.id_tipo_alerta,
      'id_origen_tipo', NEW.id_origen_tipo,
      'canal', NEW.canal,
      'activo', NEW.activo,
      'ultima_notificacion_enviada', NEW.ultima_notificacion_enviada
    )
  );
END$$
DELIMITER ;
