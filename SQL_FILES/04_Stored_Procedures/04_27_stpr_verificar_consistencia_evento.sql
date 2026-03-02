CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_verificar_consistencia_evento`()
    COMMENT 'Verifica la consistencia de datos procesados por el evento'
BEGIN
    -- Verificar fechas en ubi_contador_ciclos
    SELECT
        'ANÁLISIS DE FECHAS' AS seccion,
        DATE(fecha_ciclos) AS fecha,
        COUNT(*) AS cantidad_registros,
        COUNT(DISTINCT id_canal) AS canales_unicos,
        CASE
            WHEN DATE(fecha_ciclos) = CURDATE() THEN 'HOY - POSIBLE ERROR'
            WHEN DATE(fecha_ciclos) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'AYER - CORRECTO'
            WHEN DATE(fecha_ciclos) > CURDATE() THEN 'FUTURO - ERROR'
            ELSE 'HISTÓRICO'
        END AS estado_fecha
    FROM ubi_contador_ciclos
    WHERE DATE(fecha_ciclos) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(fecha_ciclos)
    ORDER BY DATE(fecha_ciclos) DESC;

    -- Detectar posibles duplicados o inconsistencias
    SELECT
        'POSIBLES INCONSISTENCIAS' AS seccion,
        fecha_grupo,
        id_canal,
        veces_procesado
    FROM (
        SELECT
            DATE(fecha_ciclos) AS fecha_grupo,
            id_canal,
            COUNT(*) AS veces_procesado
        FROM ubi_contador_ciclos
        WHERE DATE(fecha_ciclos) >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        GROUP BY DATE(fecha_ciclos), id_canal
        HAVING COUNT(*) > 1
    ) AS duplicados
    ORDER BY fecha_grupo DESC, veces_procesado DESC;

    -- Resumen de la última semana
    SELECT
        'RESUMEN ÚLTIMA SEMANA' AS seccion,
        COUNT(DISTINCT DATE(fecha_ciclos)) AS dias_con_datos,
        COUNT(*) AS total_registros,
        COUNT(DISTINCT id_canal) AS canales_distintos,
        MIN(DATE(fecha_ciclos)) AS fecha_mas_antigua,
        MAX(DATE(fecha_ciclos)) AS fecha_mas_reciente,
        ROUND(AVG(numero_ciclos), 2) AS promedio_ciclos_global,
        ROUND(AVG(tiempo_en_positivo), 1) AS promedio_tiempo_positivo
    FROM ubi_contador_ciclos
    WHERE DATE(fecha_ciclos) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);

END
