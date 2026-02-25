CREATE DEFINER=`root`@`localhost` PROCEDURE `teltonika`.`sp_disable_dnd`(
    IN p_subscription_id INT
)
BEGIN
    UPDATE push_notification_preferences
    SET dnd_enabled = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE subscription_id = p_subscription_id;

    SELECT 'DND deshabilitado' AS message;
END