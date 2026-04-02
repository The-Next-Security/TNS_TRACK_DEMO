CREATE PROCEDURE `tns_cool_track`.`stpr_sync_alert_temperature_historical`(IN p_sobreescribir_existentes BOOLEAN)
BEGIN
  DECLARE v_processed INT DEFAULT 0;

  INSERT INTO ale_datos_temperatura (id_alerta, id_canal, valor_temperatura, umbral_minimo, umbral_maximo)
  SELECT
    s.id_alerta,
    s.origen_id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(s.datos_alerta, '$.averageTemperature')) AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(s.datos_alerta, '$.minThreshold'))      AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(s.datos_alerta, '$.maxThreshold'))      AS DECIMAL(5,2))
  FROM ale_seguimiento s
  INNER JOIN ale_tipo_alerta ta ON ta.id_tipo_alerta = s.id_tipo_alerta AND ta.nombre = 'temperatura'
  WHERE JSON_EXTRACT(s.datos_alerta, '$.connectionStatus') IS NULL
    AND JSON_EXTRACT(s.datos_alerta, '$.averageTemperature') IS NOT NULL
    AND JSON_EXTRACT(s.datos_alerta, '$.minThreshold')      IS NOT NULL
    AND JSON_EXTRACT(s.datos_alerta, '$.maxThreshold')      IS NOT NULL
  ON DUPLICATE KEY UPDATE
    id_canal = COALESCE(VALUES(id_canal), ale_datos_temperatura.id_canal),
    valor_temperatura = IF(
      p_sobreescribir_existentes,
      VALUES(valor_temperatura),
      IF(ale_datos_temperatura.valor_temperatura IS NULL, VALUES(valor_temperatura), ale_datos_temperatura.valor_temperatura)
    ),
    umbral_minimo = IF(
      p_sobreescribir_existentes,
      VALUES(umbral_minimo),
      IF(ale_datos_temperatura.umbral_minimo IS NULL, VALUES(umbral_minimo), ale_datos_temperatura.umbral_minimo)
    ),
    umbral_maximo = IF(
      p_sobreescribir_existentes,
      VALUES(umbral_maximo),
      IF(ale_datos_temperatura.umbral_maximo IS NULL, VALUES(umbral_maximo), ale_datos_temperatura.umbral_maximo)
    );

  SET v_processed = ROW_COUNT();
  SELECT v_processed AS rows_updated;
END
