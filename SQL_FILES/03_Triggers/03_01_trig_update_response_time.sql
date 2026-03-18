CREATE TRIGGER `trig_update_response_time`
BEFORE UPDATE ON `ale_seguimiento`
FOR EACH ROW
BEGIN
    IF NEW.fecha_confirmacion IS NOT NULL AND OLD.fecha_confirmacion IS NULL THEN
        SET NEW.tiempo_respuesta_minutos = TIMESTAMPDIFF(MINUTE, NEW.fecha_alerta, NEW.fecha_confirmacion);
    END IF;

    IF NEW.fecha_resolucion IS NOT NULL AND OLD.fecha_resolucion IS NULL THEN
        SET NEW.tiempo_resolucion_minutos = TIMESTAMPDIFF(MINUTE, NEW.fecha_alerta, NEW.fecha_resolucion);
    END IF;
END
