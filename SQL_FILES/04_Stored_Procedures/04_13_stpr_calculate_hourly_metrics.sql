CREATE DEFINER=`root`@`%` PROCEDURE `tns_cool_track`.`stpr_calculate_hourly_metrics`(
    IN p_fecha_objetivo DATE,
    IN p_hora_objetivo TINYINT
)
BEGIN
    DECLARE v_inicio_hora DATETIME;
    DECLARE v_fin_hora DATETIME;
    DECLARE v_total_alertas INT;

    -- Calcular rango de timestamps para la hora
    SET v_inicio_hora = TIMESTAMP(p_fecha_objetivo, MAKETIME(p_hora_objetivo, 0, 0));
    SET v_fin_hora = TIMESTAMP(p_fecha_objetivo, MAKETIME(p_hora_objetivo, 59, 59));

    -- Verificar si hay alertas en el período
    SELECT COUNT(*) INTO v_total_alertas
    FROM ale_seguimiento
    WHERE fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora;

    -- Si no hay alertas, insertar registro con ceros
    IF v_total_alertas = 0 THEN
        INSERT INTO ale_metricas_resumen (
            `fecha`, `hora`,
            total_alertas_temperatura, total_alertas_desconexion,
            alertas_pendientes, alertas_confirmadas, alertas_resueltas, alertas_falsa_alarma,
            push_enviados, push_fallidos, total_alertas_criticas, canales_alertados_unicos,
            fecha_actualizacion
        ) VALUES (
            p_fecha_objetivo, p_hora_objetivo,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            NOW()
        )
        ON DUPLICATE KEY UPDATE
            fecha_actualizacion = NOW();

        SELECT
            p_fecha_objetivo AS fecha_objetivo,
            p_hora_objetivo AS hora_objetivo,
            0 AS total_alertas,
            'Sin alertas en este período' AS mensaje;
    ELSE
        -- UPSERT con datos reales
        INSERT INTO ale_metricas_resumen (
            `fecha`,
            `hora`,
            total_alertas_temperatura,
            total_alertas_desconexion,
            promedio_tiempo_respuesta,
            promedio_tiempo_resolucion,
            minimo_tiempo_respuesta,
            maximo_tiempo_respuesta,
            alertas_pendientes,
            alertas_confirmadas,
            alertas_resueltas,
            alertas_falsa_alarma,
            push_enviados,
            push_fallidos,
            tasa_entrega_push,
            total_alertas_criticas,
            promedio_tiempo_respuesta_critica,
            canales_alertados_unicos,
            id_canal_top,
            alertas_canal_top,
            fecha_actualizacion
        )
        SELECT
            p_fecha_objetivo AS `fecha`,
            p_hora_objetivo AS `hora`,

            -- Volumen de alertas (COALESCE para evitar NULL)
            COALESCE(SUM(CASE WHEN tipo_alerta = 'temperatura' THEN 1 ELSE 0 END), 0) AS total_alertas_temperatura,
            COALESCE(SUM(CASE WHEN tipo_alerta = 'desconexion' THEN 1 ELSE 0 END), 0) AS total_alertas_desconexion,

            -- Tiempos de respuesta y resolución
            ROUND(AVG(tiempo_respuesta_minutos), 2) AS promedio_tiempo_respuesta,
            ROUND(AVG(tiempo_resolucion_minutos), 2) AS promedio_tiempo_resolucion,
            MIN(tiempo_respuesta_minutos) AS minimo_tiempo_respuesta,
            MAX(tiempo_respuesta_minutos) AS maximo_tiempo_respuesta,

            -- Distribución por estado
            COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS alertas_pendientes,
            COALESCE(SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END), 0) AS alertas_confirmadas,
            COALESCE(SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END), 0) AS alertas_resueltas,
            COALESCE(SUM(CASE WHEN estado = 'falsa_alarma' OR es_falsa_alarma = 1 THEN 1 ELSE 0 END), 0) AS alertas_falsa_alarma,

            -- Métricas de notificaciones push
            COALESCE(SUM(CASE WHEN notificado_push = 1 THEN 1 ELSE 0 END), 0) AS push_enviados,
            COALESCE(SUM(CASE WHEN notificado_push = 0 THEN 1 ELSE 0 END), 0) AS push_fallidos,
            CASE
                WHEN COUNT(*) > 0
                THEN ROUND(
                    SUM(CASE WHEN notificado_push = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
                    2
                )
                ELSE NULL
            END AS tasa_entrega_push,

            -- Métricas de alertas críticas
            COALESCE(SUM(CASE WHEN severidad = 'critica' THEN 1 ELSE 0 END), 0) AS total_alertas_criticas,
            ROUND(
                AVG(CASE WHEN severidad = 'critica' THEN tiempo_respuesta_minutos ELSE NULL END),
                2
            ) AS promedio_tiempo_respuesta_critica,

            -- Métricas de canales
            COALESCE(COUNT(DISTINCT id_canal), 0) AS canales_alertados_unicos,
            (
                SELECT s2.id_canal
                FROM ale_seguimiento s2
                WHERE s2.fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora
                GROUP BY s2.id_canal
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS id_canal_top,
            (
                SELECT COUNT(*)
                FROM ale_seguimiento s3
                WHERE s3.fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora
                GROUP BY s3.id_canal
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS alertas_canal_top,

            NOW() AS fecha_actualizacion

        FROM ale_seguimiento
        WHERE fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora

        ON DUPLICATE KEY UPDATE
            total_alertas_temperatura = VALUES(total_alertas_temperatura),
            total_alertas_desconexion = VALUES(total_alertas_desconexion),
            promedio_tiempo_respuesta = VALUES(promedio_tiempo_respuesta),
            promedio_tiempo_resolucion = VALUES(promedio_tiempo_resolucion),
            minimo_tiempo_respuesta = VALUES(minimo_tiempo_respuesta),
            maximo_tiempo_respuesta = VALUES(maximo_tiempo_respuesta),
            alertas_pendientes = VALUES(alertas_pendientes),
            alertas_confirmadas = VALUES(alertas_confirmadas),
            alertas_resueltas = VALUES(alertas_resueltas),
            alertas_falsa_alarma = VALUES(alertas_falsa_alarma),
            push_enviados = VALUES(push_enviados),
            push_fallidos = VALUES(push_fallidos),
            tasa_entrega_push = VALUES(tasa_entrega_push),
            total_alertas_criticas = VALUES(total_alertas_criticas),
            promedio_tiempo_respuesta_critica = VALUES(promedio_tiempo_respuesta_critica),
            canales_alertados_unicos = VALUES(canales_alertados_unicos),
            id_canal_top = VALUES(id_canal_top),
            alertas_canal_top = VALUES(alertas_canal_top),
            fecha_actualizacion = NOW();

        -- Retornar estadísticas
        SELECT
            p_fecha_objetivo AS fecha_objetivo,
            p_hora_objetivo AS hora_objetivo,
            v_total_alertas AS total_alertas,
            'Métricas calculadas exitosamente' AS mensaje;
    END IF;
END