DELIMITER ;;

CREATE DEFINER=`root`@`%` TRIGGER `triggerGPSDATAaDoorStatus`
AFTER INSERT ON `gps_data`
FOR EACH ROW
BEGIN
    DECLARE mac_address VARCHAR(45);
    DECLARE es_puerta TINYINT;
    DECLARE temperatura VARCHAR(45);
    DECLARE status_magnetico VARCHAR(45);
    DECLARE nombre_sector VARCHAR(45);
    DECLARE tiempo_formateado DATETIME;
    DECLARE pos_inicio INT;
    DECLARE pos_fin INT;
    DECLARE objeto_actual TEXT;
    DECLARE raw_data TEXT;

    IF NEW.event_enum = 11317 THEN
        SET raw_data = NEW.ble_beacons;
        SET pos_inicio = 2; -- Comenzar después del '['

        bucle_principal: LOOP
            -- Encontrar el final del objeto actual
            SET pos_fin = LOCATE('}', raw_data, pos_inicio);

            IF pos_fin = 0 OR pos_inicio >= LENGTH(raw_data) THEN
                LEAVE bucle_principal;
            END IF;

            -- Extraer el objeto JSON actual
            SET objeto_actual = SUBSTRING(raw_data, pos_inicio, pos_fin - pos_inicio + 1);

            -- Obtener mac.address del objeto actual
            CALL ObtenerValorString(objeto_actual, 'mac.address', mac_address);

            -- Verificar si es una puerta
            SELECT esPuerta INTO es_puerta FROM beacons WHERE mac = mac_address;

            IF es_puerta = 1 THEN
                -- Obtener temperatura y estado magnético
                CALL ObtenerValorString(objeto_actual, 'temperature', temperatura);
                CALL ObtenerValorString(objeto_actual, 'magnet', status_magnetico);

                -- Obtener el sector
                SELECT ubicacion INTO nombre_sector FROM beacons WHERE mac = mac_address;

                -- Formatear el timestamp
                SET tiempo_formateado = FROM_UNIXTIME(NEW.timestamp);

                -- Insertar en door_status
                INSERT INTO door_status (sector, magnet_status, temperature, timestamp)
                VALUES (
                    nombre_sector,
                    CAST(status_magnetico AS SIGNED),
                    CAST(temperatura AS DECIMAL(10,2)),
                    tiempo_formateado
                );
            END IF;

            -- Buscar el inicio del siguiente objeto
            SET pos_inicio = LOCATE('{', raw_data, pos_fin + 1);
        END LOOP bucle_principal;
    END IF;
END ;;

DELIMITER ;
