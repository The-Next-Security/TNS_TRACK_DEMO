CREATE PROCEDURE `tns_cool_track`.`stpr_sync_alert_temperature_historical`(IN p_sobreescribir_existentes BOOLEAN)
BEGIN
  DECLARE v_processed INT DEFAULT 0;

  IF p_sobreescribir_existentes THEN
    UPDATE ale_seguimiento
    SET
      valor_temperatura = CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.averageTemperature')) AS DECIMAL(5,2)),
      umbral_minimo     = CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.minThreshold'))      AS DECIMAL(5,2)),
      umbral_maximo     = CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.maxThreshold'))      AS DECIMAL(5,2))
    WHERE
      (tipo_alerta = 'temperatura' OR tipo_alerta IS NULL)
      AND JSON_EXTRACT(datos_alerta, '$.connectionStatus') IS NULL
      AND JSON_EXTRACT(datos_alerta, '$.averageTemperature') IS NOT NULL
      AND JSON_EXTRACT(datos_alerta, '$.minThreshold')      IS NOT NULL
      AND JSON_EXTRACT(datos_alerta, '$.maxThreshold')      IS NOT NULL;
  ELSE
    UPDATE ale_seguimiento
    SET
      valor_temperatura = CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.averageTemperature')) AS DECIMAL(5,2)),
      umbral_minimo     = CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.minThreshold'))      AS DECIMAL(5,2)),
      umbral_maximo     = CAST(JSON_UNQUOTE(JSON_EXTRACT(datos_alerta, '$.maxThreshold'))      AS DECIMAL(5,2))
    WHERE
      (tipo_alerta = 'temperatura' OR tipo_alerta IS NULL)
      AND JSON_EXTRACT(datos_alerta, '$.connectionStatus') IS NULL
      AND JSON_EXTRACT(datos_alerta, '$.averageTemperature') IS NOT NULL
      AND JSON_EXTRACT(datos_alerta, '$.minThreshold')      IS NOT NULL
      AND JSON_EXTRACT(datos_alerta, '$.maxThreshold')      IS NOT NULL
      AND (valor_temperatura IS NULL OR umbral_minimo IS NULL OR umbral_maximo IS NULL);
  END IF;

  SET v_processed = ROW_COUNT();
  SELECT v_processed AS rows_updated;
END
