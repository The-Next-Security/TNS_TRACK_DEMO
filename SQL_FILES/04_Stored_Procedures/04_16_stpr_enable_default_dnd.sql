DELIMITER ;;

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_enable_default_dnd`(
    IN p_subscription_id INT
)
BEGIN
    CALL sp_upsert_notification_preferences(
        p_subscription_id,
        TRUE,                                                                           -- dnd_enabled
        '22:00:00',                                                                     -- dnd_start_time
        '08:00:00',                                                                     -- dnd_end_time
        JSON_ARRAY('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), -- todos los días
        TRUE,                                                                           -- allow_critical_alerts
        NULL                                                                            -- enabled_alert_types (todos)
    );

    SELECT 'DND habilitado: 22:00-08:00, todos los días, permitir alertas críticas' AS message;
END ;;

DELIMITER ;
