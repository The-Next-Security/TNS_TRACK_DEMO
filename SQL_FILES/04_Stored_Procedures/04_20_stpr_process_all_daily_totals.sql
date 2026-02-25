DELIMITER ;;

CREATE DEFINER=`root`@`%` PROCEDURE `sp_process_all_daily_totals`()
BEGIN
    DECLARE v_start_date DATE;
    DECLARE v_current_date DATE;
    DECLARE v_today DATE;

    -- Obtener la fecha más antigua de sem_mediciones
    SELECT MIN(DATE(timestamp_local)) INTO v_start_date FROM sem_mediciones;

    -- Obtener la fecha actual
    SET v_today = CURRENT_DATE();

    -- Iniciar el procesamiento desde la fecha más antigua
    SET v_current_date = v_start_date;

    -- Loop hasta la fecha actual
    WHILE v_current_date <= v_today DO
        -- Ejecutar la función para el día actual
        SELECT teltonika.fn_process_totales_dia(v_current_date);

        -- Mover a la siguiente fecha
        SET v_current_date = DATE_ADD(v_current_date, INTERVAL 1 DAY);
    END WHILE;

    SELECT 'Proceso de totales diarios completado.' AS message;
END ;;

DELIMITER ;
