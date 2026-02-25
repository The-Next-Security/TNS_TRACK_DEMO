CREATE DEFINER=`root`@`%` PROCEDURE `teltonika`.`ObtenerValorString`(
    IN p_input_string TEXT,
    IN p_key VARCHAR(50),
    OUT p_value VARCHAR(255)
)
BEGIN
    DECLARE v_start INT;
    DECLARE v_end INT;
    DECLARE v_search VARCHAR(55);
    
    -- Preparar la cadena de búsqueda
    SET v_search = CONCAT('"', p_key, '":');
    
    -- Encontrar la posición inicial del valor
    SET v_start = LOCATE(v_search, p_input_string);
    
    IF v_start > 0 THEN
        -- Ajustar la posición inicial al comienzo del valor
        SET v_start = v_start + LENGTH(v_search);
        
        -- Encontrar el final del valor
        SET v_end = LOCATE(',', p_input_string, v_start);
        
        -- Si no hay coma, buscar el final del objeto
        IF v_end = 0 THEN
            SET v_end = LOCATE('}', p_input_string, v_start);
        END IF;
        
        -- Extraer el valor
        IF v_end > v_start THEN
            SET p_value = SUBSTRING(p_input_string, v_start, v_end - v_start);
        ELSE
            SET p_value = SUBSTRING(p_input_string, v_start);
        END IF;
        
        -- Limpiar el valor de comillas si es necesario
        SET p_value = TRIM(BOTH '"' FROM p_value);
        
        -- Manejar valores booleanos
        IF p_value = 'true' THEN
            SET p_value = '1';
        ELSEIF p_value = 'false' THEN
            SET p_value = '0';
        END IF;
    ELSE
        SET p_value = NULL;
    END IF;
END