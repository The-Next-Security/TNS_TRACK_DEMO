DELIMITER ;;

CREATE DEFINER=`root`@`%` PROCEDURE `process_sector`(
    IN sector_num INT,
    IN min_rojo INT,
    IN max_rojo INT,
    IN min_amarillo INT,
    IN max_amarillo INT,
    OUT sector_status VARCHAR(45)
)
BEGIN
    DECLARE minutos_diferencia INT;
    DECLARE inicio int;
    DECLARE fin INT;
    SELECT
        MIN(gps_data.timestamp), MAX(gps_data.timestamp)
    INTO
        inicio,fin
    FROM
        gps_data
    JOIN
        beacons ON (
            gps_data.ble_beacons LIKE CONCAT('%', beacons.id, '%')
            OR gps_data.ble_beacons LIKE CONCAT('%', beacons.mac, '%')
        )
    WHERE
        beacons.lugar = CONCAT('Sector ', sector_num)
        AND gps_data.ident IN (SELECT id_dispositivo_asignado FROM personal)
        AND gps_data.timestamp  > ((SELECT timestamp FROM gps_data ORDER BY id DESC LIMIT 1) - 1800);


	CALL calcular_diferencia_minutos(inicio, fin, minutos_diferencia);
    INSERT INTO `teltonika`.`debug_beacon_count` (`sector`,`count`,`timestamp`)
    VALUES(CONCAT('Sector ', sector_num), minutos_diferencia, CURRENT_TIMESTAMP());


	IF minutos_diferencia IS NULL OR minutos_diferencia <= min_rojo THEN
		SET sector_status = 'Negro';
	ELSEIF minutos_diferencia > min_rojo AND minutos_diferencia <= max_rojo THEN
		SET sector_status = 'Rojo';
	ELSEIF minutos_diferencia > min_amarillo AND minutos_diferencia <= max_amarillo THEN
		SET sector_status = 'Amarillo';
	ELSE
		SET sector_status = 'Verde';
	END IF;

END ;;

DELIMITER ;
