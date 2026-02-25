DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_sync_alert_temperature_historical`(IN p_overwrite_existing BOOLEAN)
BEGIN
  DECLARE v_processed INT DEFAULT 0;

  IF p_overwrite_existing THEN
    UPDATE alert_tracking
    SET
      temperature_value = CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.averageTemperature')) AS DECIMAL(5,2)),
      min_threshold     = CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.minThreshold'))      AS DECIMAL(5,2)),
      max_threshold     = CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.maxThreshold'))      AS DECIMAL(5,2))
    WHERE
      (alert_type = 'temperature' OR alert_type IS NULL)
      AND JSON_EXTRACT(alert_data, '$.connectionStatus') IS NULL
      AND JSON_EXTRACT(alert_data, '$.averageTemperature') IS NOT NULL
      AND JSON_EXTRACT(alert_data, '$.minThreshold')      IS NOT NULL
      AND JSON_EXTRACT(alert_data, '$.maxThreshold')      IS NOT NULL;
  ELSE
    UPDATE alert_tracking
    SET
      temperature_value = CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.averageTemperature')) AS DECIMAL(5,2)),
      min_threshold     = CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.minThreshold'))      AS DECIMAL(5,2)),
      max_threshold     = CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.maxThreshold'))      AS DECIMAL(5,2))
    WHERE
      (alert_type = 'temperature' OR alert_type IS NULL)
      AND JSON_EXTRACT(alert_data, '$.connectionStatus') IS NULL
      AND JSON_EXTRACT(alert_data, '$.averageTemperature') IS NOT NULL
      AND JSON_EXTRACT(alert_data, '$.minThreshold')      IS NOT NULL
      AND JSON_EXTRACT(alert_data, '$.maxThreshold')      IS NOT NULL
      AND (temperature_value IS NULL OR min_threshold IS NULL OR max_threshold IS NULL);
  END IF;

  SET v_processed = ROW_COUNT();
  SELECT v_processed AS rows_updated;
END ;;

DELIMITER ;
