DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_upsert_notification_preferences`(
    IN p_subscription_id INT,
    IN p_dnd_enabled BOOLEAN,
    IN p_dnd_start_time TIME,
    IN p_dnd_end_time TIME,
    IN p_dnd_days JSON,
    IN p_allow_critical_alerts BOOLEAN,
    IN p_enabled_alert_types JSON
)
BEGIN
    -- MySQL 8.0: ON DUPLICATE KEY UPDATE para UPSERT
    INSERT INTO push_notification_preferences (
        subscription_id,
        dnd_enabled,
        dnd_start_time,
        dnd_end_time,
        dnd_days,
        allow_critical_alerts,
        enabled_alert_types
    ) VALUES (
        p_subscription_id,
        p_dnd_enabled,
        p_dnd_start_time,
        p_dnd_end_time,
        p_dnd_days,
        p_allow_critical_alerts,
        p_enabled_alert_types
    )
    ON DUPLICATE KEY UPDATE
        dnd_enabled = VALUES(dnd_enabled),
        dnd_start_time = VALUES(dnd_start_time),
        dnd_end_time = VALUES(dnd_end_time),
        dnd_days = VALUES(dnd_days),
        allow_critical_alerts = VALUES(allow_critical_alerts),
        enabled_alert_types = VALUES(enabled_alert_types),
        updated_at = CURRENT_TIMESTAMP;

    SELECT 'Preferencias actualizadas correctamente' AS message;
END ;;

DELIMITER ;
