-- Regenera métricas para un día completo en ale_metricas_resumen.
-- ATENCIÓN: hace DELETE de todas las filas de ese día (hora NULL y por hora).
-- Si en paralelo se usan upserts horarios vía stpr_calculate_hourly_metrics / eventos,
-- ejecutar este SP solo como mantenimiento o en ventana controlada para evitar pisar series horarias recientes.

CREATE PROCEDURE `tns_cool_track`.`stpr_generate_daily_metrics`(IN p_fecha_objetivo DATE)
BEGIN
    DELETE FROM ale_metricas_resumen WHERE fecha = p_fecha_objetivo;

    INSERT INTO ale_metricas_resumen (
        fecha,
        hora,
        total_alertas_temperatura,
        total_alertas_desconexion,
        alertas_pendientes,
        alertas_confirmadas,
        alertas_resueltas,
        alertas_falsa_alarma,
        promedio_tiempo_respuesta,
        minimo_tiempo_respuesta,
        maximo_tiempo_respuesta,
        promedio_tiempo_resolucion
    )
    SELECT
        p_fecha_objetivo,
        NULL AS hora,
        COALESCE(SUM(CASE WHEN ta.nombre = 'temperatura' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ta.nombre = 'desconexion' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN s.estado = 'confirmado' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN s.estado = 'resuelto' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN s.es_falsa_alarma = 1 THEN 1 ELSE 0 END), 0),
        ROUND(AVG(s.tiempo_respuesta_minutos), 2),
        MIN(s.tiempo_respuesta_minutos),
        MAX(s.tiempo_respuesta_minutos),
        ROUND(AVG(s.tiempo_resolucion_minutos), 2)
    FROM ale_seguimiento s
    INNER JOIN ale_tipo_alerta ta ON ta.id_tipo_alerta = s.id_tipo_alerta
    WHERE DATE(s.fecha_alerta) = p_fecha_objetivo;

    INSERT INTO ale_metricas_resumen (
        fecha,
        hora,
        total_alertas_temperatura,
        total_alertas_desconexion
    )
    SELECT
        p_fecha_objetivo,
        HOUR(s.fecha_alerta) AS hora,
        COALESCE(SUM(CASE WHEN ta.nombre = 'temperatura' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN ta.nombre = 'desconexion' THEN 1 ELSE 0 END), 0)
    FROM ale_seguimiento s
    INNER JOIN ale_tipo_alerta ta ON ta.id_tipo_alerta = s.id_tipo_alerta
    WHERE DATE(s.fecha_alerta) = p_fecha_objetivo
    GROUP BY HOUR(s.fecha_alerta);

    SELECT 'Métricas generadas exitosamente' AS resultado;
END
