CREATE DEFINER=`root`@`localhost` PROCEDURE `teltonika`.`cleanup_old_alerts`(IN days_to_keep INT)
BEGIN
                DECLARE deleted_count INT DEFAULT 0;

                DELETE FROM alert_tracking
                WHERE status IN ('resolved', 'false_alarm')
                AND resolved_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);

                SET deleted_count = ROW_COUNT();

                SELECT deleted_count as alerts_deleted;
            END