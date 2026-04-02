CREATE PROCEDURE `tns_cool_track`.`stpr_sync_alert_temperature_by_id`(IN p_id_alerta INT)
BEGIN
  DECLARE v_avg DECIMAL(5,2);
  DECLARE v_min DECIMAL(5,2);
  DECLARE v_max DECIMAL(5,2);
  DECLARE v_id_canal INT UNSIGNED DEFAULT NULL;
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_eligible INT DEFAULT 0;

  SELECT COUNT(*) INTO v_exists
  FROM ale_seguimiento
  WHERE id_alerta = p_id_alerta;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'id_alerta no encontrado en ale_seguimiento';
  END IF;

  SELECT COUNT(*) INTO v_eligible
  FROM ale_seguimiento s
  INNER JOIN ale_tipo_alerta ta ON ta.id_tipo_alerta = s.id_tipo_alerta AND ta.nombre = 'temperatura'
  WHERE s.id_alerta = p_id_alerta
    AND JSON_EXTRACT(s.datos_alerta, '$.connectionStatus') IS NULL
    AND JSON_EXTRACT(s.datos_alerta, '$.averageTemperature') IS NOT NULL
    AND JSON_EXTRACT(s.datos_alerta, '$.minThreshold')      IS NOT NULL
    AND JSON_EXTRACT(s.datos_alerta, '$.maxThreshold')      IS NOT NULL;

  IF v_eligible = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'datos_alerta no es de temperatura o faltan campos requeridos; omitido';
  END IF;

  SELECT
    CAST(JSON_UNQUOTE(JSON_EXTRACT(s.datos_alerta, '$.averageTemperature')) AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(s.datos_alerta, '$.minThreshold'))      AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(s.datos_alerta, '$.maxThreshold'))      AS DECIMAL(5,2)),
    s.origen_id
  INTO v_avg, v_min, v_max, v_id_canal
  FROM ale_seguimiento s
  INNER JOIN ale_tipo_alerta ta ON ta.id_tipo_alerta = s.id_tipo_alerta AND ta.nombre = 'temperatura'
  WHERE s.id_alerta = p_id_alerta
  FOR UPDATE;

  INSERT INTO ale_datos_temperatura (id_alerta, id_canal, valor_temperatura, umbral_minimo, umbral_maximo)
  VALUES (p_id_alerta, v_id_canal, v_avg, v_min, v_max)
  ON DUPLICATE KEY UPDATE
    id_canal = COALESCE(VALUES(id_canal), ale_datos_temperatura.id_canal),
    valor_temperatura = VALUES(valor_temperatura),
    umbral_minimo = VALUES(umbral_minimo),
    umbral_maximo = VALUES(umbral_maximo);

END
