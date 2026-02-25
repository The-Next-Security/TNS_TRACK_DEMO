CREATE DEFINER=`root`@`%` PROCEDURE `teltonika`.`cleanup_old_push_subscriptions`(IN days_inactive INT)
BEGIN
    UPDATE push_subscriptions
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND (last_seen_at IS NULL OR last_seen_at < DATE_SUB(NOW(), INTERVAL days_inactive DAY))
      AND (last_notification_sent IS NULL OR last_notification_sent < DATE_SUB(NOW(), INTERVAL days_inactive DAY));

    SELECT ROW_COUNT() as subscriptions_deactivated;
END