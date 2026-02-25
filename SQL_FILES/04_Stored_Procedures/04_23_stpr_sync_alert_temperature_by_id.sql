DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_sync_alert_temperature_by_id`(IN p_alert_id INT)
BEGIN
  DECLARE v_avg DECIMAL(5,2);
  DECLARE v_min DECIMAL(5,2);
  DECLARE v_max DECIMAL(5,2);
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_eligible INT DEFAULT 0;

  SELECT COUNT(*) INTO v_exists
  FROM alert_tracking
  WHERE alert_id = p_alert_id;

  IF v_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'alert_id no encontrado en alert_tracking';
  END IF;

  SELECT COUNT(*) INTO v_eligible
  FROM alert_tracking
  WHERE alert_id = p_alert_id
    AND (alert_type = 'temperature' OR alert_type IS NULL)
    AND JSON_EXTRACT(alert_data, '$.connectionStatus') IS NULL
    AND JSON_EXTRACT(alert_data, '$.averageTemperature') IS NOT NULL
    AND JSON_EXTRACT(alert_data, '$.minThreshold')      IS NOT NULL
    AND JSON_EXTRACT(alert_data, '$.maxThreshold')      IS NOT NULL;

  IF v_eligible = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'alert_data no es de temperatura o faltan campos requeridos; omitido';
  END IF;

  SELECT
    CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.averageTemperature')) AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.minThreshold'))      AS DECIMAL(5,2)),
    CAST(JSON_UNQUOTE(JSON_EXTRACT(alert_data, '$.maxThreshold'))      AS DECIMAL(5,2))
  INTO v_avg, v_min, v_max
  FROM alert_tracking
  WHERE alert_id = p_alert_id
  FOR UPDATE;

  UPDATE alert_tracking
  SET
    temperature_value = v_avg,
    min_threshold     = v_min,
    max_threshold     = v_max
  WHERE alert_id = p_alert_id;

END ;;

DELIMITER ;
