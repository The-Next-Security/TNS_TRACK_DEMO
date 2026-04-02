CREATE PROCEDURE `tns_cool_track`.`stpr_calculate_hourly_metrics`(
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
        -- UPSERT con datos reales (esquema: id_tipo_alerta + ale_tipo_alerta; origen_id sustituye id_canal legacy)
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

            COALESCE(SUM(CASE WHEN ta.nombre = 'temperatura' THEN 1 ELSE 0 END), 0) AS total_alertas_temperatura,
            COALESCE(SUM(CASE WHEN ta.nombre = 'desconexion' THEN 1 ELSE 0 END), 0) AS total_alertas_desconexion,

            ROUND(AVG(s.tiempo_respuesta_minutos), 2) AS promedio_tiempo_respuesta,
            ROUND(AVG(s.tiempo_resolucion_minutos), 2) AS promedio_tiempo_resolucion,
            MIN(s.tiempo_respuesta_minutos) AS minimo_tiempo_respuesta,
            MAX(s.tiempo_respuesta_minutos) AS maximo_tiempo_respuesta,

            COALESCE(SUM(CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 0 END), 0) AS alertas_pendientes,
            COALESCE(SUM(CASE WHEN s.estado = 'confirmado' THEN 1 ELSE 0 END), 0) AS alertas_confirmadas,
            COALESCE(SUM(CASE WHEN s.estado = 'resuelto' THEN 1 ELSE 0 END), 0) AS alertas_resueltas,
            COALESCE(SUM(CASE WHEN s.estado = 'falsa_alarma' OR s.es_falsa_alarma = 1 THEN 1 ELSE 0 END), 0) AS alertas_falsa_alarma,

            COALESCE(SUM(CASE WHEN s.notificado_push = 1 THEN 1 ELSE 0 END), 0) AS push_enviados,
            COALESCE(SUM(CASE WHEN s.notificado_push = 0 THEN 1 ELSE 0 END), 0) AS push_fallidos,
            CASE
                WHEN COUNT(*) > 0
                THEN ROUND(
                    SUM(CASE WHEN s.notificado_push = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
                    2
                )
                ELSE NULL
            END AS tasa_entrega_push,

            COALESCE(SUM(CASE WHEN s.severidad = 'critica' THEN 1 ELSE 0 END), 0) AS total_alertas_criticas,
            ROUND(
                AVG(CASE WHEN s.severidad = 'critica' THEN s.tiempo_respuesta_minutos ELSE NULL END),
                2
            ) AS promedio_tiempo_respuesta_critica,

            COALESCE(COUNT(DISTINCT s.origen_id), 0) AS canales_alertados_unicos,
            (
                SELECT s2.origen_id
                FROM ale_seguimiento s2
                WHERE s2.fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora
                  AND s2.origen_id IS NOT NULL
                GROUP BY s2.origen_id
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS id_canal_top,
            (
                SELECT COUNT(*)
                FROM ale_seguimiento s3
                WHERE s3.fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora
                  AND s3.origen_id IS NOT NULL
                GROUP BY s3.origen_id
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS alertas_canal_top,

            NOW() AS fecha_actualizacion

        FROM ale_seguimiento s
        INNER JOIN ale_tipo_alerta ta ON ta.id_tipo_alerta = s.id_tipo_alerta
        WHERE s.fecha_alerta BETWEEN v_inicio_hora AND v_fin_hora

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

        SELECT
            p_fecha_objetivo AS fecha_objetivo,
            p_hora_objetivo AS hora_objetivo,
            v_total_alertas AS total_alertas,
            'Métricas calculadas exitosamente' AS mensaje;
    END IF;
END
