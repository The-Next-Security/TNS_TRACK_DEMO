CREATE PROCEDURE `tns_cool_track`.`stpr_calcular_cuartiles_consumo`(
    IN p_primera_ejecucion BOOLEAN
)
BEGIN
    -- Variables para almacenar los resultados
    DECLARE json_consumo_bajo JSON;
    DECLARE json_consumo_medio JSON;
    DECLARE json_consumo_alto JSON;
    
    -- Variables para controlar el procesamiento de grupos
    DECLARE v_grupo_id INT;
    DECLARE v_grupo_nombre VARCHAR(100);
    DECLARE v_fecha_calculo TIMESTAMP;
    DECLARE v_finished INT DEFAULT 0;
    
    -- Variables para almacenar estadísticas
    DECLARE v_registros_analizados INT DEFAULT 0;
    DECLARE v_fecha_inicio TIMESTAMP;
    DECLARE v_fecha_fin TIMESTAMP;
    
    -- Variables para cuartiles
    DECLARE v_cuartil_bajo DECIMAL(10,2);
    DECLARE v_cuartil_medio DECIMAL(10,2);
    DECLARE v_cuartil_alto DECIMAL(10,2);
    DECLARE v_total_registros INT;
    
    -- Declarar cursor para recorrer los grupos activos
    DECLARE grupo_cursor CURSOR FOR 
        SELECT id_grupo, nombre FROM sem_grupos WHERE activo = 1;
    
    -- Declarar handler para el final del cursor
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_finished = 1;
    
    -- Inicializar valores
    SET v_fecha_calculo = NOW();
    SET json_consumo_bajo = JSON_OBJECT();
    SET json_consumo_medio = JSON_OBJECT();
    SET json_consumo_alto = JSON_OBJECT();
    
    -- Manejar valores NULL para los parámetros 
    IF p_primera_ejecucion IS NULL THEN
        SET p_primera_ejecucion = 0;
    END IF;
    
    -- Obtener el rango de fechas para el análisis
    IF p_primera_ejecucion THEN
        -- Para la primera ejecución, consideramos todo el histórico disponible
        SELECT MIN(timestamp_local), NOW() 
        INTO v_fecha_inicio, v_fecha_fin
        FROM sem_mediciones
        WHERE fase = 'TOTAL' AND calidad_lectura = 'NORMAL';
        
        -- Si no hay datos, usar un período razonable (último año)
        IF v_fecha_inicio IS NULL THEN
            SET v_fecha_inicio = DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR);
            SET v_fecha_fin = NOW();
        END IF;
    ELSE
        -- Para ejecuciones trimestrales, enfocarse en el último trimestre
        -- Calcular el inicio del trimestre actual
        SET @mes_actual = MONTH(CURRENT_DATE());
        SET @trimestre_actual = FLOOR((@mes_actual-1)/3) + 1;
        SET @inicio_trimestre_actual = DATE(CONCAT(
            YEAR(CURRENT_DATE()),
            '-',
            LPAD(((@trimestre_actual-1)*3)+1, 2, '0'),
            '-01'
        ));
        
        -- El período de análisis es el trimestre anterior al actual
        SET v_fecha_inicio = DATE_SUB(@inicio_trimestre_actual, INTERVAL 3 MONTH);
        SET v_fecha_fin = DATE_SUB(@inicio_trimestre_actual, INTERVAL 1 DAY);
    END IF;
    
    -- Abrir el cursor de grupos
    OPEN grupo_cursor;
    
    -- Empezar el loop para procesar cada grupo
    grupo_loop: LOOP
        -- Obtener el siguiente grupo
        FETCH grupo_cursor INTO v_grupo_id, v_grupo_nombre;
        
        -- Salir si no hay más grupos
        IF v_finished = 1 THEN
            LEAVE grupo_loop;
        END IF;
        
        -- Inicializar valores por defecto para este grupo
        SET v_cuartil_bajo = 600;
        SET v_cuartil_medio = 800;
        SET v_cuartil_alto = 1000;
        SET v_total_registros = 0;
        
        -- Obtener IDs de dispositivos para este grupo
        SELECT GROUP_CONCAT(CONCAT("'", shelly_id, "'")) 
        INTO @dispositivos_ids
        FROM sem_dispositivos
        WHERE id_grupo = v_grupo_id
          AND activo = 1;
        
        -- Si no hay dispositivos, continuar con el siguiente grupo
        IF @dispositivos_ids IS NULL OR @dispositivos_ids = '' THEN
            ITERATE grupo_loop;
        END IF;
        
        -- Contar registros
        SET @sql_query = CONCAT(
            "SELECT COUNT(*) INTO @total_count ",
            "FROM sem_mediciones ",
            "WHERE shelly_id IN (", @dispositivos_ids, ") ",
            "  AND fase = 'TOTAL' ",
            "  AND calidad_lectura = 'NORMAL' ",
            "  AND potencia_activa > 500 ",
            "  AND timestamp_local BETWEEN '", v_fecha_inicio, "' AND '", v_fecha_fin, "'"
        );
        
        PREPARE stmt FROM @sql_query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET v_total_registros = @total_count;
        SET v_registros_analizados = v_registros_analizados + v_total_registros;
        
        -- Calcular cuartiles usando PERCENT_RANK() si hay suficientes datos
        IF v_total_registros >= 10 THEN
            SET @sql_query = CONCAT(
                "WITH ranked_data AS ( ",
                "  SELECT ",
                "    potencia_activa, ",
                "    PERCENT_RANK() OVER (ORDER BY potencia_activa) AS percentil ",
                "  FROM sem_mediciones ",
                "  WHERE shelly_id IN (", @dispositivos_ids, ") ",
                "    AND fase = 'TOTAL' ",
                "    AND calidad_lectura = 'NORMAL' ",
                "    AND potencia_activa > 500 ",
                "    AND timestamp_local BETWEEN '", v_fecha_inicio, "' AND '", v_fecha_fin, "' ",
                ") ",
                "SELECT ",
                "  MIN(CASE WHEN percentil >= 0.25 THEN potencia_activa END) AS q1, ",
                "  MIN(CASE WHEN percentil >= 0.50 THEN potencia_activa END) AS q2, ",
                "  MIN(CASE WHEN percentil >= 0.75 THEN potencia_activa END) AS q3 ",
                "INTO @q1, @q2, @q3 ",
                "FROM ranked_data"
            );
            
            PREPARE stmt FROM @sql_query;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            
            -- Actualizar valores si no son NULL
            IF @q1 IS NOT NULL THEN
                SET v_cuartil_bajo = @q1;
            END IF;
            
            IF @q2 IS NOT NULL THEN
                SET v_cuartil_medio = @q2;
            END IF;
            
            IF @q3 IS NOT NULL THEN
                SET v_cuartil_alto = @q3;
            END IF;
        END IF;
        
        -- Añadir resultados al JSON
        SET json_consumo_bajo = JSON_SET(
            json_consumo_bajo, 
            CONCAT('$."', v_grupo_id, '"'), 
            JSON_OBJECT(
                'valor', v_cuartil_bajo,
                'nombre_grupo', v_grupo_nombre
            )
        );
        
        SET json_consumo_medio = JSON_SET(
            json_consumo_medio, 
            CONCAT('$."', v_grupo_id, '"'), 
            JSON_OBJECT(
                'valor', v_cuartil_medio,
                'nombre_grupo', v_grupo_nombre
            )
        );
        
        SET json_consumo_alto = JSON_SET(
            json_consumo_alto, 
            CONCAT('$."', v_grupo_id, '"'), 
            JSON_OBJECT(
                'valor', v_cuartil_alto,
                'nombre_grupo', v_grupo_nombre
            )
        );
    END LOOP;
    
    -- Cerrar el cursor
    CLOSE grupo_cursor;
    
    -- Añadir metadatos a los JSON
    SET @metadatos = JSON_OBJECT(
        'registros_analizados', v_registros_analizados,
        'rango_fechas', CONCAT(DATE_FORMAT(v_fecha_inicio, '%Y-%m-%d'), ' al ', DATE_FORMAT(v_fecha_fin, '%Y-%m-%d')),
        'fecha_calculo', v_fecha_calculo,
        'primera_ejecucion', p_primera_ejecucion
    );
    
    SET json_consumo_bajo = JSON_SET(json_consumo_bajo, '$.metadatos', @metadatos);
    SET json_consumo_medio = JSON_SET(json_consumo_medio, '$.metadatos', @metadatos);
    SET json_consumo_alto = JSON_SET(json_consumo_alto, '$.metadatos', @metadatos);
    
    -- Actualizar configuración
    START TRANSACTION;
    
    -- Marcar registros anteriores como inactivos
    UPDATE sem_configuracion 
    SET valido_hasta = v_fecha_calculo,
        activo = 0,
        fecha_actualizacion = NOW()
    WHERE id_tipo_parametro IN (11, 12, 13)
      AND activo = 1;
    
    -- Insertar nuevos registros
    INSERT INTO sem_configuracion (
        id_tipo_parametro,
        nombre_parametro,
        valor,
        activo,
        valido_desde
    )
    VALUES 
        (11, 'CONSUMO BAJO',  json_consumo_bajo,  1, v_fecha_calculo),
        (12, 'CONSUMO MEDIO', json_consumo_medio, 1, v_fecha_calculo),
        (13, 'CONSUMO ALTO',  json_consumo_alto,  1, v_fecha_calculo);
    
    COMMIT;
END