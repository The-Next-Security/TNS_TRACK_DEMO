CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_sync_alert_temperature_by_id`(IN p_id_alerta INT)
BEGIN
  DECLARE v_avg DECIMAL(5,2);
  DECLARE v_min DECIMAL(5,2);
  DECLARE v_max DECIMAL(5,2);
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_eligible INT DEFAULT 0;

  SELECT COUNT(*) INTO v_exists
  FROM ale_seguimiento
  WHERE id_alerta = p_id_alerta;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'id_alerta no encontrado en ale_seguimiento';
  END IF;

  SELECT COUNT(*) INTO v_eligible
  FROM ale_seguimiento
  WHERE id_alerta = p_id_alerta
    AND (tipo_alerta = 'temperatura' OR tipo_alerta IS NULL)
    AND JSON_EXTRACT(datos_alerta, '$.connectionStatus') IS NULL
    AND JSON_EXTRACT(datos_alerta, '$.averageTemperature') IS NOT NULL
    AND JSON_EXTRACT(datos_alerta, '$.minThreshold')      IS NOT NULL
    AND JSON_EXTRACT(datos_alerta, '$.maxThreshold')      IS NOT NULL;

  IF v_eligible = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'datos_alerta no es de temperatura o faltan campos requeridos; omitido';
  END IF;

  SELECT
    CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.averageTemperature')) AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.minThreshold'))      AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.maxThreshold'))      AS DECIMAL(5,2))
  INTO v_avg, v_min, v_max
  FROM ale_seguimiento
  WHERE id_alerta = p_id_alerta
  FOR UPDATE;

  UPDATE ale_seguimiento
  SET
    valor_temperatura = v_avg,
    umbral_minimo     = v_min,
    umbral_maximo     = v_max
  WHERE id_alerta = p_id_alerta;

END
