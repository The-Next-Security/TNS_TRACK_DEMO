CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_process_recent_metrics`(
    IN p_hours_back INT
)
BEGIN
    DECLARE v_current_datetime DATETIME;
    DECLARE v_counter INT DEFAULT 0;

    SET v_current_datetime = DATE_SUB(NOW(), INTERVAL p_hours_back HOUR);

    WHILE v_counter < p_hours_back DO
        CALL stpr_calculate_hourly_metrics(
            DATE(v_current_datetime),
            HOUR(v_current_datetime)
        );

        SET v_current_datetime = DATE_ADD(v_current_datetime, INTERVAL 1 HOUR);
        SET v_counter = v_counter + 1;
    END WHILE;

    SELECT CONCAT('Procesadas ', p_hours_back, ' horas de métricas') AS mensaje;
END
