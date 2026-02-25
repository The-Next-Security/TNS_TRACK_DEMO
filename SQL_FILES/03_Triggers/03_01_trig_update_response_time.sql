DELIMITER ;;

CREATE DEFINER=`root`@`%` TRIGGER `update_response_time`
BEFORE UPDATE ON `alert_tracking`
FOR EACH ROW
BEGIN
    IF NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL THEN
        SET NEW.response_time_minutes = TIMESTAMPDIFF(MINUTE, NEW.alert_timestamp, NEW.acknowledged_at);
    END IF;

    IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
        SET NEW.resolution_time_minutes = TIMESTAMPDIFF(MINUTE, NEW.alert_timestamp, NEW.resolved_at);
    END IF;
END ;;

DELIMITER ;
