DELIMITER ;;

CREATE DEFINER=`root`@`%` PROCEDURE `sp_get_daily_summary`(
    IN p_date DATE
)
BEGIN
    SELECT
        p_date AS summary_date,
        SUM(total_temperature_alerts) AS daily_temperature_alerts,
        SUM(total_disconnection_alerts) AS daily_disconnection_alerts,
        ROUND(AVG(avg_response_time_minutes), 2) AS daily_avg_response_time,
        ROUND(AVG(avg_resolution_time_minutes), 2) AS daily_avg_resolution_time,
        MIN(min_response_time_minutes) AS daily_best_response_time,
        MAX(max_response_time_minutes) AS daily_worst_response_time,
        SUM(alerts_resolved) AS daily_resolved_count,
        SUM(alerts_pending) AS daily_pending_count,
        SUM(push_sent) AS daily_push_sent,
        SUM(push_failed) AS daily_push_failed,
        CASE
            WHEN SUM(push_sent) + SUM(push_failed) > 0
            THEN ROUND(SUM(push_sent) * 100.0 / (SUM(push_sent) + SUM(push_failed)), 2)
            ELSE NULL
        END AS daily_delivery_rate,
        MAX(unique_channels_alerted) AS peak_channels_alerted_hour,
        (
            SELECT HOUR(TIMESTAMP(date, MAKETIME(hour, 0, 0)))
            FROM alert_metrics_summary
            WHERE date = p_date
            ORDER BY (total_temperature_alerts + total_disconnection_alerts) DESC
            LIMIT 1
        ) AS peak_alert_hour
    FROM alert_metrics_summary
    WHERE date = p_date
    GROUP BY p_date;
END ;;

DELIMITER ;
