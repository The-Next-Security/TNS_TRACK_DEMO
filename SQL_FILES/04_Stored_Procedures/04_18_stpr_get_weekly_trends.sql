DELIMITER ;;

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_weekly_trends`(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT
        date,
        SUM(total_temperature_alerts + total_disconnection_alerts) AS total_alerts,
        SUM(alerts_resolved) AS total_resolved,
        ROUND(AVG(avg_response_time_minutes), 2) AS avg_response_time,
        ROUND(AVG(push_delivery_rate), 2) AS avg_delivery_rate,
        MAX(unique_channels_alerted) AS max_channels_alerted
    FROM alert_metrics_summary
    WHERE date BETWEEN p_start_date AND p_end_date
    GROUP BY date
    ORDER BY date ASC;
END ;;

DELIMITER ;
