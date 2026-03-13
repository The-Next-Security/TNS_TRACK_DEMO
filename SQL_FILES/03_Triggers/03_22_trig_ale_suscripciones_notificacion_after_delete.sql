-- Trigger: ale_suscripciones_notificacion AFTER DELETE → log_ale_suscripciones_notificacion
DELIMITER $$
CREATE TRIGGER `trig_ale_suscripciones_notificacion_after_delete`
AFTER DELETE ON `ale_suscripciones_notificacion`
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
    OLD.id_suscripcion_notificacion,
    OLD.id_usuario,
    OLD.id_tipo_alerta,
    OLD.id_origen_tipo,
    OLD.canal,
    'DELETE',
    JSON_OBJECT(
      'id_suscripcion_notificacion', OLD.id_suscripcion_notificacion,
      'id_usuario', OLD.id_usuario,
      'id_tipo_alerta', OLD.id_tipo_alerta,
      'id_origen_tipo', OLD.id_origen_tipo,
      'canal', OLD.canal,
      'activo', OLD.activo,
      'ultima_notificacion_enviada', OLD.ultima_notificacion_enviada
    ),
    NULL
  );
END$$
DELIMITER ;
