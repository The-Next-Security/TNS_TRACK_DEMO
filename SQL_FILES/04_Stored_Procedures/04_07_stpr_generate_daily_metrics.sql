CREATE PROCEDURE `tns_cool_track`.`stpr_generate_daily_metrics`(IN p_fecha_objetivo DATE)
BEGIN
    -- Limpiar métricas existentes para esta fecha
    DELETE FROM ale_metricas_resumen WHERE fecha = p_fecha_objetivo;

    -- Insertar resumen diario completo (hora = NULL)
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
        COALESCE(SUM(CASE WHEN tipo_alerta = 'temperatura' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_alerta = 'desconexion' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN es_falsa_alarma = TRUE THEN 1 ELSE 0 END), 0),
        ROUND(AVG(tiempo_respuesta_minutos), 2),
        MIN(tiempo_respuesta_minutos),
        MAX(tiempo_respuesta_minutos),
        ROUND(AVG(tiempo_resolucion_minutos), 2)
    FROM ale_seguimiento
    WHERE DATE(fecha_alerta) = p_fecha_objetivo;

    -- Insertar métricas por hora
    INSERT INTO ale_metricas_resumen (
        fecha,
        hora,
        total_alertas_temperatura,
        total_alertas_desconexion
    )
    SELECT
        p_fecha_objetivo,
        HOUR(fecha_alerta) AS hora,
        COALESCE(SUM(CASE WHEN tipo_alerta = 'temperatura' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN tipo_alerta = 'desconexion' THEN 1 ELSE 0 END), 0)
    FROM ale_seguimiento
    WHERE DATE(fecha_alerta) = p_fecha_objetivo
    GROUP BY HOUR(fecha_alerta);

    SELECT 'Métricas generadas exitosamente' AS resultado;
END