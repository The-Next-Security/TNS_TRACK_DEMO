-- Reprocesa 24 horas vía stpr_process_recent_metrics → stpr_calculate_hourly_metrics (scheduler MySQL).

CREATE EVENT evn_recalculate_daily_metrics
ON SCHEDULE EVERY 1 DAY
STARTS '2025-12-27 02:00:00.000'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    CALL stpr_process_recent_metrics(24);
END
