CREATE DEFINER=`root`@`localhost` PROCEDURE `teltonika`.`generate_daily_metrics`(IN target_date DATE)
BEGIN
                DELETE FROM alert_metrics_summary WHERE metric_date = target_date;

                INSERT INTO alert_metrics_summary (
                    metric_date,
                    metric_hour,
                    total_alerts,
                    temperature_alerts,
                    disconnection_alerts,
                    pending_alerts,
                    acknowledged_alerts,
                    resolved_alerts,
                    false_alarms,
                    avg_response_time,
                    min_response_time,
                    max_response_time,
                    avg_resolution_time,
                    min_resolution_time,
                    max_resolution_time
                )
                SELECT
                    target_date,
                    NULL as metric_hour,
                    COUNT(*) as total_alerts,
                    SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN alert_type = 'disconnection' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN is_false_alarm = TRUE THEN 1 ELSE 0 END),
                    AVG(response_time_minutes),
                    MIN(response_time_minutes),
                    MAX(response_time_minutes),
                    AVG(resolution_time_minutes),
                    MIN(resolution_time_minutes),
                    MAX(resolution_time_minutes)
                FROM alert_tracking
                WHERE DATE(alert_timestamp) = target_date;

                INSERT INTO alert_metrics_summary (
                    metric_date,
                    metric_hour,
                    total_alerts,
                    temperature_alerts,
                    disconnection_alerts
                )
                SELECT
                    target_date,
                    HOUR(alert_timestamp) as metric_hour,
                    COUNT(*),
                    SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END),
                    SUM(CASE WHEN alert_type = 'disconnection' THEN 1 ELSE 0 END)
                FROM alert_tracking
                WHERE DATE(alert_timestamp) = target_date
                GROUP BY HOUR(alert_timestamp);

                SELECT 'Métricas generadas exitosamente' as result;
            END