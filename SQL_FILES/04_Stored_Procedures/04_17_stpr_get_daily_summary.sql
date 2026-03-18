CREATE PROCEDURE `tns_cool_track`.`stpr_get_daily_summary`(
    IN p_fecha DATE
)
BEGIN
    SELECT
        p_fecha AS fecha_resumen,
        SUM(total_alertas_temperatura) AS alertas_temperatura_dia,
        SUM(total_alertas_desconexion) AS alertas_desconexion_dia,
        ROUND(AVG(promedio_tiempo_respuesta), 2) AS promedio_respuesta_dia,
        ROUND(AVG(promedio_tiempo_resolucion), 2) AS promedio_resolucion_dia,
        MIN(minimo_tiempo_respuesta) AS mejor_tiempo_respuesta_dia,
        MAX(maximo_tiempo_respuesta) AS peor_tiempo_respuesta_dia,
        SUM(alertas_resueltas) AS resueltas_dia,
        SUM(alertas_pendientes) AS pendientes_dia,
        SUM(push_enviados) AS push_enviados_dia,
        SUM(push_fallidos) AS push_fallidos_dia,
        CASE
            WHEN SUM(push_enviados) + SUM(push_fallidos) > 0
            THEN ROUND(SUM(push_enviados) * 100.0 / (SUM(push_enviados) + SUM(push_fallidos)), 2)
            ELSE NULL
        END AS tasa_entrega_dia,
        MAX(canales_alertados_unicos) AS pico_canales_alertados_hora,
        (
            SELECT HOUR(TIMESTAMP(fecha, MAKETIME(hora, 0, 0)))
            FROM ale_metricas_resumen
            WHERE fecha = p_fecha
            ORDER BY (total_alertas_temperatura + total_alertas_desconexion) DESC
            LIMIT 1
        ) AS hora_pico_alertas
    FROM ale_metricas_resumen
    WHERE fecha = p_fecha
    GROUP BY p_fecha;
END
