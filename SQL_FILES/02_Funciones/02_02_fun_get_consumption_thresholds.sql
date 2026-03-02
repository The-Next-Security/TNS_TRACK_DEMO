CREATE DEFINER=`root`@`%` FUNCTION `tns_cool_track`.`fun_get_consumption_thresholds`(
    p_grupo_id INT,
    p_fecha TIMESTAMP
) RETURNS json
    DETERMINISTIC
BEGIN
    DECLARE v_limite_apagado DECIMAL(10,2);
    DECLARE v_cuartil_bajo JSON;
    DECLARE v_cuartil_medio JSON;
    DECLARE v_cuartil_alto JSON;
    DECLARE v_resultado JSON;
    DECLARE v_grupo_id_usado INT;
    DECLARE v_grupo_existe BOOLEAN;
    
    -- Variables para almacenar valores numéricos extraídos
    DECLARE v_valor_cuartil_bajo DECIMAL(10,2);
    DECLARE v_valor_cuartil_medio DECIMAL(10,2);
    DECLARE v_valor_cuartil_alto DECIMAL(10,2);
    
    -- Verificar si el grupo existe
    SELECT EXISTS(SELECT 1 FROM sem_grupos WHERE id_grupo = p_grupo_id AND activo = 1)
    INTO v_grupo_existe;
    
    -- Determinar qué grupo_id usar
    IF v_grupo_existe THEN
        SET v_grupo_id_usado = p_grupo_id;
    ELSE
        SET v_grupo_id_usado = 1; -- Usar grupo General como fallback
        
        -- Registrar la sustitución
        INSERT INTO log_general (origen, mensaje) 
        VALUES ('fun_get_consumption_thresholds', CONCAT('Grupo ID: ', p_grupo_id, ' no existe o no está activo. Usando grupo General (ID: 1) para fecha: ', p_fecha));
    END IF;
    
    -- Obtener el límite de apagado usando nombre en lugar de ID
    SELECT CAST(c.valor AS DECIMAL(10,2))
    INTO v_limite_apagado
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'LIMITE APAGADO'
    AND c.activo = 1
    AND c.valido_desde <= p_fecha
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_fecha)
    LIMIT 1;
    
    -- Obtener los valores JSON de cuartiles por nombre
    SELECT c.valor
    INTO v_cuartil_bajo
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'CONSUMO BAJO'
    AND c.activo = 1
    AND c.valido_desde <= p_fecha
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_fecha)
    LIMIT 1;
    
    SELECT c.valor
    INTO v_cuartil_medio
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'CONSUMO MEDIO'
    AND c.activo = 1
    AND c.valido_desde <= p_fecha
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_fecha)
    LIMIT 1;
    
    SELECT c.valor
    INTO v_cuartil_alto
    FROM sem_configuracion c
    JOIN sem_tipos_parametros tp ON c.id_tipo_parametro = tp.id_tipo_parametro
    WHERE tp.nombre = 'CONSUMO ALTO'
    AND c.activo = 1
    AND c.valido_desde <= p_fecha
    AND (c.valido_hasta IS NULL OR c.valido_hasta > p_fecha)
    LIMIT 1;
    
    -- Extraer y convertir explícitamente los valores numéricos de los JSONs
    -- Usar el grupo_id_usado determinado anteriormente
    SET v_valor_cuartil_bajo = CAST(JSON_EXTRACT(v_cuartil_bajo, CONCAT('$."', v_grupo_id_usado, '".valor')) AS DECIMAL(10,2));
    SET v_valor_cuartil_medio = CAST(JSON_EXTRACT(v_cuartil_medio, CONCAT('$."', v_grupo_id_usado, '".valor')) AS DECIMAL(10,2));
    SET v_valor_cuartil_alto = CAST(JSON_EXTRACT(v_cuartil_alto, CONCAT('$."', v_grupo_id_usado, '".valor')) AS DECIMAL(10,2));
    
    -- Aplicar valores por defecto si son NULL
    SET v_limite_apagado = COALESCE(v_limite_apagado, 500.00);
    SET v_valor_cuartil_bajo = COALESCE(v_valor_cuartil_bajo, 3000.00);
    SET v_valor_cuartil_medio = COALESCE(v_valor_cuartil_medio, 4000.00);
    SET v_valor_cuartil_alto = COALESCE(v_valor_cuartil_alto, 5000.00);
    
    -- Construcción del objeto resultado utilizando los valores ya convertidos a decimal
    SET v_resultado = JSON_OBJECT(
        'limite_apagado', v_limite_apagado,
        'cuartil_bajo', v_valor_cuartil_bajo,
        'cuartil_medio', v_valor_cuartil_medio,
        'cuartil_alto', v_valor_cuartil_alto,
        'grupo_id_usado', v_grupo_id_usado  -- Agregar el grupo_id que realmente se usó para transparencia
    );
    
    RETURN v_resultado;
END