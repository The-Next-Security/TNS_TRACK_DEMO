CREATE PROCEDURE `tns_cool_track`.`stpr_get_weekly_trends`(
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT
        fecha,
        SUM(total_alertas_temperatura + total_alertas_desconexion) AS total_alertas,
        SUM(alertas_resueltas) AS total_resueltas,
        ROUND(AVG(promedio_tiempo_respuesta), 2) AS promedio_tiempo_respuesta,
        ROUND(AVG(tasa_entrega_push), 2) AS promedio_tasa_entrega,
        MAX(canales_alertados_unicos) AS max_canales_alertados
    FROM ale_metricas_resumen
    WHERE fecha BETWEEN p_fecha_inicio AND p_fecha_fin
    GROUP BY fecha
    ORDER BY fecha ASC;
END
