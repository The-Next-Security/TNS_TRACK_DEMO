CREATE DEFINER=`root`@`%` PROCEDURE `teltonika`.`sp_calculate_hourly_metrics`(
    IN p_target_date DATE,
    IN p_target_hour TINYINT
)
BEGIN
    DECLARE v_hour_start DATETIME;
    DECLARE v_hour_end DATETIME;
    DECLARE v_alert_count INT;

    -- Calcular rango de timestamps para la hora
    SET v_hour_start = TIMESTAMP(p_target_date, MAKETIME(p_target_hour, 0, 0));
    SET v_hour_end = TIMESTAMP(p_target_date, MAKETIME(p_target_hour, 59, 59));

    -- Verificar si hay alertas en el período
    SELECT COUNT(*) INTO v_alert_count
    FROM alert_tracking
    WHERE alert_timestamp BETWEEN v_hour_start AND v_hour_end;

    -- Si no hay alertas, insertar registro con ceros
    IF v_alert_count = 0 THEN
        INSERT INTO alert_metrics_summary (
            `date`, `hour`,
            total_temperature_alerts, total_disconnection_alerts,
            alerts_pending, alerts_acknowledged, alerts_resolved, alerts_false_alarm,
            push_sent, push_failed, critical_alerts_count, unique_channels_alerted,
            last_updated_at
        ) VALUES (
            p_target_date, p_target_hour,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            NOW()
        )
        ON DUPLICATE KEY UPDATE
            last_updated_at = NOW();

        SELECT 
            p_target_date AS target_date,
            p_target_hour AS target_hour,
            0 AS total_alerts,
            'Sin alertas en este período' AS message;
    ELSE
        -- UPSERT con datos reales
        INSERT INTO alert_metrics_summary (
            `date`,
            `hour`,
            total_temperature_alerts,
            total_disconnection_alerts,
            avg_response_time_minutes,
            avg_resolution_time_minutes,
            min_response_time_minutes,
            max_response_time_minutes,
            alerts_pending,
            alerts_acknowledged,
            alerts_resolved,
            alerts_false_alarm,
            push_sent,
            push_failed,
            push_delivery_rate,
            critical_alerts_count,
            critical_avg_response_time_minutes,
            unique_channels_alerted,
            top_channel_id,
            top_channel_alert_count,
            last_updated_at
        )
        SELECT
            p_target_date AS `date`,
            p_target_hour AS `hour`,

            -- Alert volume metrics (COALESCE para evitar NULL)
            COALESCE(SUM(CASE WHEN alert_type = 'temperature' THEN 1 ELSE 0 END), 0) AS total_temperature_alerts,
            COALESCE(SUM(CASE WHEN alert_type = 'disconnection' THEN 1 ELSE 0 END), 0) AS total_disconnection_alerts,

            -- Response/resolution time metrics
            ROUND(AVG(response_time_minutes), 2) AS avg_response_time_minutes,
            ROUND(AVG(resolution_time_minutes), 2) AS avg_resolution_time_minutes,
            MIN(response_time_minutes) AS min_response_time_minutes,
            MAX(response_time_minutes) AS max_response_time_minutes,

            -- Status distribution
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS alerts_pending,
            COALESCE(SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END), 0) AS alerts_acknowledged,
            COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0) AS alerts_resolved,
            COALESCE(SUM(CASE WHEN status = 'false_alarm' OR is_false_alarm = 1 THEN 1 ELSE 0 END), 0) AS alerts_false_alarm,

            -- Push notification metrics
            COALESCE(SUM(CASE WHEN notified_via_push = 1 THEN 1 ELSE 0 END), 0) AS push_sent,
            COALESCE(SUM(CASE WHEN notified_via_push = 0 THEN 1 ELSE 0 END), 0) AS push_failed,
            CASE
                WHEN COUNT(*) > 0
                THEN ROUND(
                    SUM(CASE WHEN notified_via_push = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
                    2
                )
                ELSE NULL
            END AS push_delivery_rate,

            -- Critical alerts metrics
            COALESCE(SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END), 0) AS critical_alerts_count,
            ROUND(
                AVG(CASE WHEN severity = 'critical' THEN response_time_minutes ELSE NULL END),
                2
            ) AS critical_avg_response_time_minutes,

            -- Channel metrics
            COALESCE(COUNT(DISTINCT channel_id), 0) AS unique_channels_alerted,
            (
                SELECT at2.channel_id
                FROM alert_tracking at2
                WHERE at2.alert_timestamp BETWEEN v_hour_start AND v_hour_end
                GROUP BY at2.channel_id
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS top_channel_id,
            (
                SELECT COUNT(*)
                FROM alert_tracking at3
                WHERE at3.alert_timestamp BETWEEN v_hour_start AND v_hour_end
                GROUP BY at3.channel_id
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS top_channel_alert_count,

            NOW() AS last_updated_at

        FROM alert_tracking
        WHERE alert_timestamp BETWEEN v_hour_start AND v_hour_end

        ON DUPLICATE KEY UPDATE
            total_temperature_alerts = VALUES(total_temperature_alerts),
            total_disconnection_alerts = VALUES(total_disconnection_alerts),
            avg_response_time_minutes = VALUES(avg_response_time_minutes),
            avg_resolution_time_minutes = VALUES(avg_resolution_time_minutes),
            min_response_time_minutes = VALUES(min_response_time_minutes),
            max_response_time_minutes = VALUES(max_response_time_minutes),
            alerts_pending = VALUES(alerts_pending),
            alerts_acknowledged = VALUES(alerts_acknowledged),
            alerts_resolved = VALUES(alerts_resolved),
            alerts_false_alarm = VALUES(alerts_false_alarm),
            push_sent = VALUES(push_sent),
            push_failed = VALUES(push_failed),
            push_delivery_rate = VALUES(push_delivery_rate),
            critical_alerts_count = VALUES(critical_alerts_count),
            critical_avg_response_time_minutes = VALUES(critical_avg_response_time_minutes),
            unique_channels_alerted = VALUES(unique_channels_alerted),
            top_channel_id = VALUES(top_channel_id),
            top_channel_alert_count = VALUES(top_channel_alert_count),
            last_updated_at = NOW();

        -- Retornar estadísticas
        SELECT 
            p_target_date AS target_date,
            p_target_hour AS target_hour,
            v_alert_count AS total_alerts,
            'Métricas calculadas exitosamente' AS message;
    END IF;
END