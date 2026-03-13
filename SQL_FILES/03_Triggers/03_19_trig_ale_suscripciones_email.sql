-- Triggers para ale_suscripciones_email → log_ale_suscripciones_email

DELIMITER $$

CREATE TRIGGER `trig_ale_suscripciones_email_after_insert`
AFTER INSERT ON `ale_suscripciones_email`
FOR EACH ROW
BEGIN
  INSERT INTO `log_ale_suscripciones_email` (
    id_suscripcion_email,
    id_usuario,
    id_tipo_alerta,
    id_origen_tipo,
    operacion,
    datos_anteriores,
    datos_nuevos
  ) VALUES (
    NEW.id_suscripcion_email,
    NEW.id_usuario,
    NEW.id_tipo_alerta,
    NEW.id_origen_tipo,
    'INSERT',
    NULL,
    JSON_OBJECT(
      'id_suscripcion_email', NEW.id_suscripcion_email,
      'id_usuario', NEW.id_usuario,
      'id_tipo_alerta', NEW.id_tipo_alerta,
      'id_origen_tipo', NEW.id_origen_tipo,
      'activo', NEW.activo,
      'ultima_notificacion_enviada', NEW.ultima_notificacion_enviada
    )
  );
END$$

CREATE TRIGGER `trig_ale_suscripciones_email_after_update`
AFTER UPDATE ON `ale_suscripciones_email`
FOR EACH ROW
BEGIN
  INSERT INTO `log_ale_suscripciones_email` (
    id_suscripcion_email,
    id_usuario,
    id_tipo_alerta,
    id_origen_tipo,
    operacion,
    datos_anteriores,
    datos_nuevos
  ) VALUES (
    NEW.id_suscripcion_email,
    NEW.id_usuario,
    NEW.id_tipo_alerta,
    NEW.id_origen_tipo,
    'UPDATE',
    JSON_OBJECT(
      'id_suscripcion_email', OLD.id_suscripcion_email,
      'id_usuario', OLD.id_usuario,
      'id_tipo_alerta', OLD.id_tipo_alerta,
      'id_origen_tipo', OLD.id_origen_tipo,
      'activo', OLD.activo,
      'ultima_notificacion_enviada', OLD.ultima_notificacion_enviada
    ),
    JSON_OBJECT(
      'id_suscripcion_email', NEW.id_suscripcion_email,
      'id_usuario', NEW.id_usuario,
      'id_tipo_alerta', NEW.id_tipo_alerta,
      'id_origen_tipo', NEW.id_origen_tipo,
      'activo', NEW.activo,
      'ultima_notificacion_enviada', NEW.ultima_notificacion_enviada
    )
  );
END$$

CREATE TRIGGER `trig_ale_suscripciones_email_after_delete`
AFTER DELETE ON `ale_suscripciones_email`
FOR EACH ROW
BEGIN
  INSERT INTO `log_ale_suscripciones_email` (
    id_suscripcion_email,
    id_usuario,
    id_tipo_alerta,
    id_origen_tipo,
    operacion,
    datos_anteriores,
    datos_nuevos
  ) VALUES (
    OLD.id_suscripcion_email,
    OLD.id_usuario,
    OLD.id_tipo_alerta,
    OLD.id_origen_tipo,
    'DELETE',
    JSON_OBJECT(
      'id_suscripcion_email', OLD.id_suscripcion_email,
      'id_usuario', OLD.id_usuario,
      'id_tipo_alerta', OLD.id_tipo_alerta,
      'id_origen_tipo', OLD.id_origen_tipo,
      'activo', OLD.activo,
      'ultima_notificacion_enviada', OLD.ultima_notificacion_enviada
    ),
    NULL
  );
END$$

DELIMITER ;

