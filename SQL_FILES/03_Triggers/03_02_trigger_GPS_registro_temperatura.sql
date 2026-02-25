DELIMITER ;;

CREATE DEFINER=`root`@`localhost` TRIGGER `trigger_GPS_registro_temperatura`
AFTER INSERT ON `gps_data`
FOR EACH ROW
BEGIN
    DECLARE json_data JSON DEFAULT NEW.ble_beacons;
    DECLARE array_length INT DEFAULT JSON_LENGTH(json_data);
    DECLARE counter INT DEFAULT 0;
    DECLARE json_element JSON;
    DECLARE temperatura FLOAT;
    DECLARE mac_address VARCHAR(45);
    DECLARE es_Temperatura TINYINT;
    DECLARE beacon_id VARCHAR(50);

    WHILE counter < array_length DO
        SET json_element = JSON_EXTRACT(json_data, CONCAT('$[', counter, ']'));
        SET temperatura = JSON_EXTRACT(json_element, '$.temperature');
        INSERT INTO teltonika.process_log(message) VALUES(temperatura);
        IF temperatura IS NOT NULL THEN
            SET mac_address = JSON_UNQUOTE(JSON_EXTRACT(json_element, '$.mac.address'));
            IF mac_address IS NOT NULL THEN
                SELECT id, esTemperatura INTO beacon_id, es_Temperatura
                FROM beacons
                WHERE mac  LIKE CONCAT('%',  mac_address, '%');
                INSERT INTO teltonika.process_log(message) VALUES (CONCAT('%',  mac_address, '%', ' esTemperatura:_',es_Temperatura));
            ELSE
                SET beacon_id = JSON_UNQUOTE(JSON_EXTRACT(json_element, '$.id'));
                SELECT esTemperatura INTO es_Temperatura
                FROM beacons
                WHERE id LIKE CONCAT('%', beacon_id , '%');
                INSERT INTO teltonika.process_log(message) VALUES (CONCAT('%',  beacon_id, '%', ' esTemperatura:_',es_Temperatura));
            END IF;

            IF es_Temperatura = 1 THEN
                INSERT INTO teltonika.registro_temperaturas(beacon_id, timestamp, temperatura)
                VALUES (beacon_id, FROM_UNIXTIME(NEW.timestamp), temperatura);
                INSERT INTO teltonika.process_log(message) VALUES(concat("INSERT INTO teltonika.registro_temperaturas(beacon_id, timestamp, temperatura)
                VALUES (beacon_id, FROM_UNIXTIME(NEW.timestamp),",temperatura));
            END IF;
        END IF;

        SET counter = counter + 1;
    END WHILE;

    -- Solo un log al final del proceso
    INSERT INTO teltonika.process_log(message) VALUES("Proceso de registro de temperaturas completado");
END ;;

DELIMITER ;
