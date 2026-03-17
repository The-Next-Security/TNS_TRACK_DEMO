-- ==============================================================================
-- 03_indices.sql
-- Índices adicionales a los declarados inline en 01_tablas_base.sql.
-- Cubre los patrones de acceso de todos los SPs, eventos y consultas analíticas
-- del sistema de mediciones eléctricas y temperatura.
--
-- NOTA: Los índices inline de cada CREATE TABLE NO se repiten aquí.
--       Solo se agregan índices nuevos que optimizan patrones específicos
--       identificados en Stored Procedures, Eventos y consultas de negocio.
--
-- Convención de nombres: idx_{tabla}_{col1}-{col2}-{colN}
-- ==============================================================================

USE tns_cool_track;

-- ==============================================================================
-- ============================================================
-- MÓDULO ENERGÉTICO: sem_
-- Tablas de mayor criticidad para rendimiento del sistema.
-- ============================================================
-- ==============================================================================


-- ----------------------------------------------------------
-- sem_mediciones
-- Tabla de mayor volumen. Recibe mediciones brutas de todos
-- los dispositivos Shelly. Patrones críticos de acceso:
--   1) Aggregation: WHERE shelly_id + timestamp_local BETWEEN
--                   + fase = 'TOTAL' + calidad_lectura = 'NORMAL'
--   2) Cuartiles:   WHERE shelly_id + timestamp_local BETWEEN
--                   + potencia_activa BETWEEN (umbrales)
--   3) JOIN:        ON m.shelly_id = d.shelly_id
-- ----------------------------------------------------------

-- Covering index para el patrón principal de agregación por hora
-- (stpr_update_category_totals_hora, stpr_calcular_cuartiles_consumo):
-- WHERE shelly_id=X AND timestamp_local BETWEEN Y AND Z AND fase='TOTAL' AND calidad_lectura='NORMAL'
CREATE INDEX `idx_sem_mediciones_shelly_id-timestamp_local-fase-calidad`
    ON `sem_mediciones` (`shelly_id`, `timestamp_local`, `fase`, `calidad_lectura`);

-- Extiende el anterior con potencia_activa para queries de cuartiles
-- (stpr_calcular_cuartiles_consumo):
-- WHERE shelly_id=X AND timestamp_local BETWEEN Y AND Z AND fase='TOTAL'
--   AND calidad_lectura='NORMAL' AND potencia_activa > v_limite
CREATE INDEX `idx_sem_mediciones_shelly_id-ts_local-fase-calidad-potencia`
    ON `sem_mediciones` (`shelly_id`, `timestamp_local`, `fase`, `calidad_lectura`, `potencia_activa`);

-- Para consultas time-first sobre todos los dispositivos en un período
-- (monitoreo global y dashboards de sistema):
-- WHERE timestamp_local BETWEEN Y AND Z [GROUP BY shelly_id]
CREATE INDEX `idx_sem_mediciones_timestamp_local-shelly_id-fase`
    ON `sem_mediciones` (`timestamp_local`, `shelly_id`, `fase`);

-- Para análisis de calidad de lectura + período
-- WHERE calidad_lectura = 'INVALIDO' AND timestamp_local BETWEEN Y AND Z
CREATE INDEX `idx_sem_mediciones_calidad-shelly_id-timestamp_local`
    ON `sem_mediciones` (`calidad_lectura`, `shelly_id`, `timestamp_local`);

-- Para cálculo de energía acumulada por dispositivo en rango
-- SELECT shelly_id, SUM(energia_activa) WHERE shelly_id=X AND timestamp_local BETWEEN Y AND Z
CREATE INDEX `idx_sem_mediciones_shelly_id-timestamp_local-energia_activa`
    ON `sem_mediciones` (`shelly_id`, `timestamp_local`, `energia_activa`);

-- Para análisis de potencia activa sin filtro de fase
-- (trending por dispositivo, picos de consumo)
CREATE INDEX `idx_sem_mediciones_shelly_id-timestamp_local-potencia_activa`
    ON `sem_mediciones` (`shelly_id`, `timestamp_local`, `potencia_activa`);

-- Para consultas de timestamp UTC (reconciliación con fuentes externas)
CREATE INDEX `idx_sem_mediciones_timestamp_utc`
    ON `sem_mediciones` (`timestamp_utc`);

-- Para queries combinadas UTC + dispositivo
CREATE INDEX `idx_sem_mediciones_shelly_id-timestamp_utc`
    ON `sem_mediciones` (`shelly_id`, `timestamp_utc`);

-- Para filtrado por fase sin restricción de shelly_id
-- (análisis de fases en todos los dispositivos trifásicos)
CREATE INDEX `idx_sem_mediciones_fase-timestamp_local`
    ON `sem_mediciones` (`fase`, `timestamp_local`);

-- Para análisis de factor de potencia (calidad de la red eléctrica)
CREATE INDEX `idx_sem_mediciones_shelly_id-timestamp_local-factor_potencia`
    ON `sem_mediciones` (`shelly_id`, `timestamp_local`, `factor_potencia`);

-- Registro de inserción reciente (depuración y auditoría de ingesta)
CREATE INDEX `idx_sem_mediciones_fecha_creacion`
    ON `sem_mediciones` (`fecha_creacion`);


-- ----------------------------------------------------------
-- sem_totales_hora
-- Totales horarios agregados. Patrones críticos:
--   1) UPDATE: hora_local BETWEEN + shelly_id (JOIN con sem_dispositivos)
--   2) SELECT: hora_local BETWEEN para generación de totales diarios
--   3) GROUP BY: shelly_id + DATE(hora_local)
-- ----------------------------------------------------------

-- Para queries time-first sobre todos los dispositivos en rango horario
CREATE INDEX `idx_sem_totales_hora_hora_local-shelly_id`
    ON `sem_totales_hora` (`hora_local`, `shelly_id`);

-- Covering para análisis de costo horario por dispositivo
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-costo_total`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `costo_total`);

-- Covering para análisis de potencia máxima horaria
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-potencia_maxima`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `potencia_maxima`);

-- Covering para análisis de potencia mínima horaria
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-potencia_minima`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `potencia_minima`);

-- Para control de calidad de datos horarios
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-lecturas_validas`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `lecturas_validas`);

-- Para análisis de precio por período (variaciones tarifarias horarias)
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-precio_kwh_periodo`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `precio_kwh_periodo`);

-- Para detección de horas con alto consumo (diagnóstico operativo)
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-lecturas_consumo_alto`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `lecturas_consumo_alto`);

-- Para detección de horas con dispositivo en límite de apagado
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-lect_lim_apagado`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `lecturas_limite_apagado`);

-- Para calidad de datos por dispositivo (monitoreo de fiabilidad)
CREATE INDEX `idx_sem_totales_hora_shelly_id-calidad_datos`
    ON `sem_totales_hora` (`shelly_id`, `calidad_datos`);

-- Para consultas globales de energía activa por hora
-- (ranking de consumo entre dispositivos en un período)
CREATE INDEX `idx_sem_totales_hora_hora_local-energia_activa_total`
    ON `sem_totales_hora` (`hora_local`, `energia_activa_total`);

-- Covering financiero completo (energía + costo) por dispositivo/hora
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-energia_total-costo`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `energia_activa_total`, `costo_total`);

-- Validación de cantidad de datos registrados por hora
CREATE INDEX `idx_sem_totales_hora_shelly_id-hora_local-cantidad_datos`
    ON `sem_totales_hora` (`shelly_id`, `hora_local`, `cantidad_datos`);

-- Para queries de registros actualizados recientemente
CREATE INDEX `idx_sem_totales_hora_fecha_actualizacion`
    ON `sem_totales_hora` (`fecha_actualizacion`);


-- ----------------------------------------------------------
-- sem_totales_dia
-- Totales diarios. Patrones críticos:
--   1) UPDATE: fecha_local BETWEEN + JOIN por shelly_id
--   2) GROUP BY: shelly_id + fecha_local
--   3) NOT EXISTS: shelly_id + DATE(hora_local)
--   4) HAVING: validación de coherencia energía total vs suma horaria
-- ----------------------------------------------------------

-- Para queries time-first (dashboards que agregan todos los dispositivos por fecha)
CREATE INDEX `idx_sem_totales_dia_fecha_local-shelly_id`
    ON `sem_totales_dia` (`fecha_local`, `shelly_id`);

-- Covering para análisis de energía diaria por dispositivo
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-energia_activa_total`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `energia_activa_total`);

-- Covering para análisis de costo diario por dispositivo
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-costo_total`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `costo_total`);

-- Covering financiero completo diario
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-energia_activa-costo`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `energia_activa_total`, `costo_total`);

-- Para análisis de potencia máxima diaria (picos)
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-potencia_maxima`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `potencia_maxima`);

-- Para completitud de datos diarios (verificación de cobertura)
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-horas_con_datos`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `horas_con_datos`);

-- Para análisis de precio promedio diario
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-precio_kwh_promedio`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `precio_kwh_promedio`);

-- Para ranking global de energía consumida por día (todos los dispositivos)
CREATE INDEX `idx_sem_totales_dia_fecha_local-energia_activa_total`
    ON `sem_totales_dia` (`fecha_local`, `energia_activa_total`);

-- Para ranking global de costos diarios
CREATE INDEX `idx_sem_totales_dia_fecha_local-costo_total`
    ON `sem_totales_dia` (`fecha_local`, `costo_total`);

-- Para detección de días con alto consumo por dispositivo
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-lecturas_consumo_alto`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `lecturas_consumo_alto`);

-- Para detección de días con dispositivo en límite de apagado
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-lect_lim_apagado`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `lecturas_limite_apagado`);

-- Para verificación de cantidad de datos diarios
CREATE INDEX `idx_sem_totales_dia_shelly_id-fecha_local-cantidad_datos`
    ON `sem_totales_dia` (`shelly_id`, `fecha_local`, `cantidad_datos`);

-- Para queries de registros actualizados recientemente
CREATE INDEX `idx_sem_totales_dia_fecha_actualizacion`
    ON `sem_totales_dia` (`fecha_actualizacion`);


-- ----------------------------------------------------------
-- sem_totales_mes
-- Totales mensuales. Patrones críticos:
--   1) WHERE: (año > X OR (año=X AND mes>=Y)) AND (año < Z OR (año=Z AND mes<=W))
--   2) GROUP BY: shelly_id + YEAR(fecha_local) + MONTH(fecha_local)
--   3) JOIN: shelly_id entre totales_dia y totales_mes
-- ----------------------------------------------------------

-- Para queries cross-device en un mes específico
CREATE INDEX `idx_sem_totales_mes_año-mes-shelly_id`
    ON `sem_totales_mes` (`año`, `mes`, `shelly_id`);

-- Covering para tendencia mensual de energía por dispositivo
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-energia_activa_total`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `energia_activa_total`);

-- Covering para análisis de costo mensual por dispositivo
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-costo_total`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `costo_total`);

-- Covering financiero completo mensual
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-energia-costo`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `energia_activa_total`, `costo_total`);

-- Para potencia máxima mensual (picos por período)
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-potencia_maxima`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `potencia_maxima`);

-- Para ranking global de energía por mes (todos los dispositivos)
CREATE INDEX `idx_sem_totales_mes_año-mes-energia_activa_total`
    ON `sem_totales_mes` (`año`, `mes`, `energia_activa_total`);

-- Para ranking global de costos mensuales
CREATE INDEX `idx_sem_totales_mes_año-mes-costo_total`
    ON `sem_totales_mes` (`año`, `mes`, `costo_total`);

-- Para análisis de completitud mensual (días con datos)
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-dias_con_datos`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `dias_con_datos`);

-- Para análisis de completitud horaria mensual
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-horas_con_datos`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `horas_con_datos`);

-- Para análisis anual consolidado por dispositivo
CREATE INDEX `idx_sem_totales_mes_shelly_id-año`
    ON `sem_totales_mes` (`shelly_id`, `año`);

-- Para detección de meses con alto consumo
CREATE INDEX `idx_sem_totales_mes_shelly_id-año-mes-lecturas_consumo_alto`
    ON `sem_totales_mes` (`shelly_id`, `año`, `mes`, `lecturas_consumo_alto`);

-- Para queries de registros actualizados recientemente
CREATE INDEX `idx_sem_totales_mes_fecha_actualizacion`
    ON `sem_totales_mes` (`fecha_actualizacion`);


-- ----------------------------------------------------------
-- sem_dispositivos
-- Catálogo de dispositivos Shelly. Patrones críticos:
--   1) Cursor: WHERE id_grupo=X AND activo=1
--   2) JOIN: ON td.shelly_id = d.shelly_id
--   3) GROUP_CONCAT: WHERE id_grupo=X AND activo=1
-- ----------------------------------------------------------

-- Para cursor principal (iteración por grupo activo en SPs):
-- SELECT shelly_id FROM sem_dispositivos WHERE id_grupo=X AND activo=1
CREATE INDEX `idx_sem_dispositivos_id_grupo-activo`
    ON `sem_dispositivos` (`id_grupo`, `activo`);

-- Orden alternativo: cuando se filtra por activo primero
CREATE INDEX `idx_sem_dispositivos_activo-id_grupo`
    ON `sem_dispositivos` (`activo`, `id_grupo`);

-- Para búsquedas de dispositivos activos en una ubicación real
CREATE INDEX `idx_sem_dispositivos_id_ubicacion_real-activo`
    ON `sem_dispositivos` (`id_ubicacion_real`, `activo`);

-- Para filtrado por tipo de dispositivo y actividad
CREATE INDEX `idx_sem_dispositivos_tipo-activo`
    ON `sem_dispositivos` (`tipo`, `activo`);

-- Para listado completo de dispositivos activos con grupo y ubicación
CREATE INDEX `idx_sem_dispositivos_activo-id_grupo-id_ubicacion_real`
    ON `sem_dispositivos` (`activo`, `id_grupo`, `id_ubicacion_real`);


-- ----------------------------------------------------------
-- sem_configuracion
-- Configuración del módulo eléctrico. Patrón crítico (dominante):
--   JOIN sem_tipos_parametros ON id_tipo_parametro
--   WHERE c.activo=1 AND c.valido_desde<=fecha
--         AND (c.valido_hasta IS NULL OR c.valido_hasta > fecha)
--   ORDER BY c.valido_desde DESC LIMIT 1
-- ----------------------------------------------------------

-- Covering index para el patrón dominante de lookup de configuración
-- (stpr_update_category_totals_hora/dia/mes, stpr_calcular_cuartiles_consumo):
-- JOIN ON id_tipo_parametro + WHERE activo=1 + ORDER BY valido_desde DESC
CREATE INDEX `idx_sem_configuracion_id_tipo-activo-valido_hasta-valido_desde`
    ON `sem_configuracion` (`id_tipo_parametro`, `activo`, `valido_hasta`, `valido_desde`);

-- Para queries de configuración vigente sin filtro de tipo
-- (listado de todos los parámetros activos)
CREATE INDEX `idx_sem_configuracion_activo-valido_desde-valido_hasta`
    ON `sem_configuracion` (`activo`, `valido_desde`, `valido_hasta`);

-- Para búsqueda por nombre de parámetro con filtro de actividad
CREATE INDEX `idx_sem_configuracion_nombre_parametro-activo`
    ON `sem_configuracion` (`nombre_parametro`, `activo`);


-- ----------------------------------------------------------
-- sem_grupos
-- Pequeño catálogo. El cursor `WHERE activo=1` es frecuente.
-- El índice inline ya cubre activo; se agrega uno compuesto.
-- ----------------------------------------------------------

-- Covering para cursor de grupos activos: SELECT id_grupo, nombre WHERE activo=1
CREATE INDEX `idx_sem_grupos_activo-id_grupo`
    ON `sem_grupos` (`activo`, `id_grupo`);


-- ==============================================================================
-- ============================================================
-- MÓDULO TEMPERATURA: ubi_
-- ============================================================
-- ==============================================================================


-- ----------------------------------------------------------
-- ubi_lecturas_sensor
-- Tabla de mayor volumen en temperatura. Patrones críticos:
--   1) Cursor: WHERE id_canal=X AND fecha_lectura BETWEEN Y AND Z ORDER BY fecha_lectura ASC
--   2) COUNT: WHERE id_canal=X AND fecha_lectura BETWEEN Y AND Z AND fecha_lectura IS NOT NULL
--   3) Análisis de temperatura, humedad, voltaje, luz
-- ----------------------------------------------------------

-- Covering para el cursor principal de análisis de ciclos de temperatura
-- (stpr_calcular_ciclos_temperatura y stpr_calcular_metricas_temperatura):
-- WHERE id_canal=X AND fecha_lectura BETWEEN Y AND Z ORDER BY fecha_lectura ASC
-- SELECT temperatura, fecha_lectura
CREATE INDEX `idx_ubi_lecturas_sensor_id_canal-fecha_lectura-temperatura`
    ON `ubi_lecturas_sensor` (`id_canal`, `fecha_lectura`, `temperatura`);

-- Covering ambiental completo (temperatura + humedad)
CREATE INDEX `idx_ubi_lecturas_sensor_id_canal-fecha_lectura-temp-humedad`
    ON `ubi_lecturas_sensor` (`id_canal`, `fecha_lectura`, `temperatura`, `humedad`);

-- Para queries time-first sobre todos los canales
-- (monitoreo global de temperatura en un período)
CREATE INDEX `idx_ubi_lecturas_sensor_fecha_lectura-id_canal`
    ON `ubi_lecturas_sensor` (`fecha_lectura`, `id_canal`);

-- Para detección de umbrales de temperatura (alertas en tiempo real):
-- WHERE temperatura > v_umbral_max OR temperatura < v_umbral_min
-- Ordena por temperatura para búsquedas de valores extremos
CREATE INDEX `idx_ubi_lecturas_sensor_id_canal-temperatura-fecha_lectura`
    ON `ubi_lecturas_sensor` (`id_canal`, `temperatura`, `fecha_lectura`);

-- Para análisis global de temperatura (ranking de canales más fríos/calientes)
CREATE INDEX `idx_ubi_lecturas_sensor_temperatura-id_canal-fecha_lectura`
    ON `ubi_lecturas_sensor` (`temperatura`, `id_canal`, `fecha_lectura`);

-- Para análisis de humedad por canal
CREATE INDEX `idx_ubi_lecturas_sensor_id_canal-fecha_lectura-humedad`
    ON `ubi_lecturas_sensor` (`id_canal`, `fecha_lectura`, `humedad`);

-- Para análisis de voltaje/batería del sensor por canal
CREATE INDEX `idx_ubi_lecturas_sensor_id_canal-fecha_lectura-voltaje`
    ON `ubi_lecturas_sensor` (`id_canal`, `fecha_lectura`, `voltaje`);

-- Para análisis de nivel de luz por canal
CREATE INDEX `idx_ubi_lecturas_sensor_id_canal-fecha_lectura-luz`
    ON `ubi_lecturas_sensor` (`id_canal`, `fecha_lectura`, `luz`);

-- Para cross-channel temperatura + fecha (dashboards y alertas globales)
CREATE INDEX `idx_ubi_lecturas_sensor_fecha_lectura-temperatura`
    ON `ubi_lecturas_sensor` (`fecha_lectura`, `temperatura`);

-- Para auditoría de ingesta reciente
CREATE INDEX `idx_ubi_lecturas_sensor_fecha_creacion`
    ON `ubi_lecturas_sensor` (`fecha_creacion`);


-- ----------------------------------------------------------
-- ubi_canal
-- Catálogo de canales de sensores. Patrones críticos:
--   1) Cursor: WHERE activo=1 ORDER BY id_canal
--   2) UPDATE: WHERE FIND_IN_SET(id_canal, p_ids_canales) > 0
--   3) Alertas: filtrado por en_linea, ultima_alerta_enviada
-- ----------------------------------------------------------

-- Para cursor en stpr_calcular_ciclos_temperatura:
-- SELECT id_canal, nombre FROM ubi_canal WHERE activo=1 ORDER BY id_canal
CREATE INDEX `idx_ubi_canal_activo`
    ON `ubi_canal` (`activo`);

-- Para búsqueda de canales offline (alertas de desconexión)
CREATE INDEX `idx_ubi_canal_en_linea`
    ON `ubi_canal` (`en_linea`);

-- Para control de frecuencia de alertas por canal activo
CREATE INDEX `idx_ubi_canal_activo-ultima_alerta_enviada`
    ON `ubi_canal` (`activo`, `ultima_alerta_enviada`);

-- Para filtrado combinado estado conexión + actividad (dashboard)
CREATE INDEX `idx_ubi_canal_activo-en_linea`
    ON `ubi_canal` (`activo`, `en_linea`);

-- Para canales activos agrupados por ubicación real
CREATE INDEX `idx_ubi_canal_id_ubicacion_real-activo`
    ON `ubi_canal` (`id_ubicacion_real`, `activo`);

-- Para queries completas de estado: activo + en_linea + ubicación
CREATE INDEX `idx_ubi_canal_activo-en_linea-id_ubicacion_real`
    ON `ubi_canal` (`activo`, `en_linea`, `id_ubicacion_real`);

-- Para búsqueda de canales por preset (umbrales via ubi_grupo)
CREATE INDEX `idx_ubi_canal_id_preset-activo`
    ON `ubi_canal` (`id_preset`, `activo`);

-- Para búsqueda directa de última alerta (sin filtro de activo)
CREATE INDEX `idx_ubi_canal_ultima_alerta_enviada`
    ON `ubi_canal` (`ultima_alerta_enviada`);


-- ----------------------------------------------------------
-- ubi_contador_ciclos
-- Contadores de ciclos de temperatura por canal y fecha.
-- Patrones críticos:
--   1) SELECT/UPDATE: WHERE fecha_ciclos=X AND id_canal=Y
--   2) Validación: DATE(fecha_ciclos) BETWEEN ... GROUP BY id_canal
-- ----------------------------------------------------------

-- Covering para análisis de ciclos por canal en rango de fechas
CREATE INDEX `idx_ubi_contador_ciclos_id_canal-fecha_ciclos-numero_ciclos`
    ON `ubi_contador_ciclos` (`id_canal`, `fecha_ciclos`, `numero_ciclos`);

-- Para detección de días con ciclos anómalos (global, todos los canales)
CREATE INDEX `idx_ubi_contador_ciclos_fecha_ciclos-numero_ciclos`
    ON `ubi_contador_ciclos` (`fecha_ciclos`, `numero_ciclos`);

-- Para análisis de canales con mayor actividad de ciclos
CREATE INDEX `idx_ubi_contador_ciclos_id_canal-numero_ciclos-fecha_ciclos`
    ON `ubi_contador_ciclos` (`id_canal`, `numero_ciclos`, `fecha_ciclos`);

-- Para análisis de porcentaje de tiempo con temperatura positiva
CREATE INDEX `idx_ubi_contador_ciclos_id_canal-fecha_ciclos-porcentaje_tiempo`
    ON `ubi_contador_ciclos` (`id_canal`, `fecha_ciclos`, `porcentaje_tiempo`);

-- Para análisis de tiempo absoluto en temperatura positiva
CREATE INDEX `idx_ubi_contador_ciclos_id_canal-fecha_ciclos-tiempo_en_positivo`
    ON `ubi_contador_ciclos` (`id_canal`, `fecha_ciclos`, `tiempo_en_positivo`);

-- Para identificar los días de mayor actividad de ciclos (top fechas)
CREATE INDEX `idx_ubi_contador_ciclos_numero_ciclos-fecha_ciclos`
    ON `ubi_contador_ciclos` (`numero_ciclos`, `fecha_ciclos`);


-- ----------------------------------------------------------
-- ubi_grupo
-- Catálogo de grupos de temperatura. Patrones de acceso simples.
-- ----------------------------------------------------------

-- Para búsqueda del grupo predeterminado activo
CREATE INDEX `idx_ubi_grupo_activo-es_predeterminado`
    ON `ubi_grupo` (`activo`, `es_predeterminado`);

-- Para búsqueda de grupos dentro de un rango de temperatura mínima
CREATE INDEX `idx_ubi_grupo_activo-temperatura_minima`
    ON `ubi_grupo` (`activo`, `temperatura_minima`);

-- Para búsqueda de grupos dentro de un rango de temperatura máxima
CREATE INDEX `idx_ubi_grupo_activo-temperatura_maxima`
    ON `ubi_grupo` (`activo`, `temperatura_maxima`);

-- Para compound de rangos de temperatura (matching de umbrales a grupos)
CREATE INDEX `idx_ubi_grupo_activo-temp_minima-temp_maxima`
    ON `ubi_grupo` (`activo`, `temperatura_minima`, `temperatura_maxima`);


-- ==============================================================================
-- ============================================================
-- MÓDULO DE ALERTAS Y NOTIFICACIONES: ale_
-- ============================================================
-- ==============================================================================


-- ----------------------------------------------------------
-- ale_seguimiento
-- Tabla de alertas activas e históricas. Patrones críticos:
--   1) DELETE cleanup: estado IN (...) AND fecha_resolucion < DATE_SUB(...)
--   2) Reports: fecha_alerta BETWEEN + GROUP BY tipo/estado/severidad/hora
--   3) KPIs: AVG/MIN/MAX(tiempo_respuesta_minutos) + AVG(tiempo_resolucion_minutos)
--   4) Top canal: GROUP BY id_canal ORDER BY COUNT(*) DESC LIMIT 1
-- ----------------------------------------------------------

-- Para limpieza periódica de alertas resueltas antiguas
CREATE INDEX `idx_ale_seguimiento_fecha_resolucion`
    ON `ale_seguimiento` (`fecha_resolucion`);

-- Compound para DELETE de cleanup (stpr_cleanup_old_alerts):
-- WHERE estado IN ('resuelto','falsa_alarma') AND fecha_resolucion < DATE_SUB(...)
CREATE INDEX `idx_ale_seguimiento_estado-fecha_resolucion`
    ON `ale_seguimiento` (`estado`, `fecha_resolucion`);

-- Para reports de alertas por tipo en períodos (stpr_generate_daily_metrics)
CREATE INDEX `idx_ale_seguimiento_tipo_alerta-fecha_alerta`
    ON `ale_seguimiento` (`tipo_alerta`, `fecha_alerta`);

-- Para cálculo del canal con más alertas (TOP canal en stpr_calculate_hourly_metrics)
CREATE INDEX `idx_ale_seguimiento_id_canal-tipo_alerta-fecha_alerta`
    ON `ale_seguimiento` (`id_canal`, `tipo_alerta`, `fecha_alerta`);

-- Para queries por estado de alerta en canal específico
CREATE INDEX `idx_ale_seguimiento_id_canal-estado-fecha_alerta`
    ON `ale_seguimiento` (`id_canal`, `estado`, `fecha_alerta`);

-- Para monitoreo de alertas por nivel de severidad
CREATE INDEX `idx_ale_seguimiento_severidad-estado-fecha_alerta`
    ON `ale_seguimiento` (`severidad`, `estado`, `fecha_alerta`);

-- Para reportes combinados tipo + estado + período
CREATE INDEX `idx_ale_seguimiento_tipo_alerta-estado-fecha_alerta`
    ON `ale_seguimiento` (`tipo_alerta`, `estado`, `fecha_alerta`);

-- Para análisis de alertas críticas por canal
CREATE INDEX `idx_ale_seguimiento_id_canal-severidad-fecha_alerta`
    ON `ale_seguimiento` (`id_canal`, `severidad`, `fecha_alerta`);

-- Para reports de tiempo de confirmación (KPI de respuesta)
CREATE INDEX `idx_ale_seguimiento_fecha_confirmacion`
    ON `ale_seguimiento` (`fecha_confirmacion`);

-- Para análisis de notificaciones push por estado y período
CREATE INDEX `idx_ale_seguimiento_notificado_push-estado-fecha_alerta`
    ON `ale_seguimiento` (`notificado_push`, `estado`, `fecha_alerta`);

-- Para análisis de falsas alarmas por tipo y período
CREATE INDEX `idx_ale_seguimiento_es_falsa_alarma-tipo_alerta-fecha_alerta`
    ON `ale_seguimiento` (`es_falsa_alarma`, `tipo_alerta`, `fecha_alerta`);

-- Para reports completos de estado: tipo + severidad + estado + fecha
CREATE INDEX `idx_ale_seguimiento_tipo_alerta-severidad-estado-fecha_alerta`
    ON `ale_seguimiento` (`tipo_alerta`, `severidad`, `estado`, `fecha_alerta`);

-- Para análisis de valor de temperatura que disparó la alerta
CREATE INDEX `idx_ale_seguimiento_id_canal-valor_temperatura-fecha_alerta`
    ON `ale_seguimiento` (`id_canal`, `valor_temperatura`, `fecha_alerta`);


-- ----------------------------------------------------------
-- ale_suscripciones_notificacion
-- Suscripciones unificadas por usuario/tipo/origen/canal.
-- Patrones: destinatarios por tipo/origen/canal; por usuario
-- ----------------------------------------------------------

CREATE INDEX `idx_ale_suscripciones_notificacion_tipo_origen_canal_activo`
    ON `ale_suscripciones_notificacion` (`id_tipo_alerta`, `id_origen_tipo`, `canal`, `activo`);

CREATE INDEX `idx_ale_suscripciones_notificacion_id_usuario`
    ON `ale_suscripciones_notificacion` (`id_usuario`);

CREATE INDEX `idx_ale_suscripciones_notificacion_activo`
    ON `ale_suscripciones_notificacion` (`activo`);

-- ----------------------------------------------------------
-- ale_horarios_alerta_canal
-- Horarios base por tipo/canal/día (admin). Patrón: resolver ventana efectiva
-- ----------------------------------------------------------

CREATE INDEX `idx_ale_horarios_alerta_canal_tipo_canal`
    ON `ale_horarios_alerta_canal` (`id_tipo_alerta`, `canal`);

CREATE INDEX `idx_ale_horarios_alerta_canal_canal_dia`
    ON `ale_horarios_alerta_canal` (`canal`, `dia_semana`);

-- ----------------------------------------------------------
-- ale_horarios_usuario
-- Horarios custom por usuario/tipo/canal. Patrón: ¿tiene custom para tipo/canal?
-- ----------------------------------------------------------

CREATE INDEX `idx_ale_horarios_usuario_usuario_tipo_canal`
    ON `ale_horarios_usuario` (`id_usuario`, `id_tipo_alerta`, `canal`);

CREATE INDEX `idx_ale_horarios_usuario_activo`
    ON `ale_horarios_usuario` (`activo`);


-- ----------------------------------------------------------
-- ale_metricas_resumen
-- Métricas agregadas de alertas por día y hora.
-- Patrones: WHERE fecha BETWEEN + GROUP BY fecha
-- ----------------------------------------------------------

-- Para tendencias de alertas de temperatura
CREATE INDEX `idx_ale_metricas_resumen_fecha-total_alertas_temperatura`
    ON `ale_metricas_resumen` (`fecha`, `total_alertas_temperatura`);

-- Para tendencias de alertas de desconexión
CREATE INDEX `idx_ale_metricas_resumen_fecha-total_alertas_desconexion`
    ON `ale_metricas_resumen` (`fecha`, `total_alertas_desconexion`);

-- Para monitoreo de alertas críticas
CREATE INDEX `idx_ale_metricas_resumen_fecha-total_alertas_criticas`
    ON `ale_metricas_resumen` (`fecha`, `total_alertas_criticas`);

-- Para análisis de KPI de tiempo de respuesta
CREATE INDEX `idx_ale_metricas_resumen_fecha-promedio_tiempo_respuesta`
    ON `ale_metricas_resumen` (`fecha`, `promedio_tiempo_respuesta`);

-- Para monitoreo de alertas pendientes en el tiempo
CREATE INDEX `idx_ale_metricas_resumen_fecha-hora-alertas_pendientes`
    ON `ale_metricas_resumen` (`fecha`, `hora`, `alertas_pendientes`);

-- Para análisis de tasa de entrega de notificaciones push
CREATE INDEX `idx_ale_metricas_resumen_fecha-tasa_entrega_push`
    ON `ale_metricas_resumen` (`fecha`, `tasa_entrega_push`);

-- Para análisis de cobertura de canales alertados
CREATE INDEX `idx_ale_metricas_resumen_fecha-canales_alertados_unicos`
    ON `ale_metricas_resumen` (`fecha`, `canales_alertados_unicos`);


-- ----------------------------------------------------------
-- ale_push_suscripciones
-- Suscripciones push. Patrón crítico:
--   UPDATE WHERE activo=TRUE AND (ultima_conexion IS NULL OR ...) AND (...)
-- ----------------------------------------------------------

-- Compound para limpieza de suscripciones inactivas (stpr_cleanup_old_push_subscriptions)
CREATE INDEX `idx_ale_push_suscripciones_activo-ultima_conexion-ultima_notif`
    ON `ale_push_suscripciones` (`activo`, `ultima_conexion`, `ultima_notificacion_enviada`);

-- Para listado de suscripciones activas por usuario
CREATE INDEX `idx_ale_push_suscripciones_id_usuario-activo`
    ON `ale_push_suscripciones` (`id_usuario`, `activo`);

-- Para análisis de suscripciones por tipo de dispositivo
CREATE INDEX `idx_ale_push_suscripciones_tipo_dispositivo-activo`
    ON `ale_push_suscripciones` (`tipo_dispositivo`, `activo`);

-- Para análisis de última actividad de los dispositivos
CREATE INDEX `idx_ale_push_suscripciones_activo-tipo_dispositivo`
    ON `ale_push_suscripciones` (`activo`, `tipo_dispositivo`);


-- ==============================================================================
-- ============================================================
-- MÓDULO IA: ai_
-- ============================================================
-- ==============================================================================


-- ----------------------------------------------------------
-- ai_costos_sesion
-- Sesiones de IA. Patrones: análisis de costos, uso por modelo,
-- sesiones fallidas, tendencias en el tiempo.
-- ----------------------------------------------------------

-- Para análisis de sesiones fallidas en el tiempo
CREATE INDEX `idx_ai_costos_sesion_exitoso-fecha_inicio`
    ON `ai_costos_sesion` (`exitoso`, `fecha_inicio`);

-- Para consultas globales sin filtro de usuario (admin, reporting)
CREATE INDEX `idx_ai_costos_sesion_fecha_inicio`
    ON `ai_costos_sesion` (`fecha_inicio`);

-- Para análisis de evolución de costos por modelo
CREATE INDEX `idx_ai_costos_sesion_modelo_utilizado-fecha_inicio`
    ON `ai_costos_sesion` (`modelo_utilizado`, `fecha_inicio`);

-- Para análisis de costo acumulado en el tiempo
CREATE INDEX `idx_ai_costos_sesion_fecha_inicio-costo_total_usd`
    ON `ai_costos_sesion` (`fecha_inicio`, `costo_total_usd`);

-- Para tasa de éxito por usuario
CREATE INDEX `idx_ai_costos_sesion_id_usuario-exitoso`
    ON `ai_costos_sesion` (`id_usuario`, `exitoso`);

-- Para análisis de sesiones por número de consultas realizadas
CREATE INDEX `idx_ai_costos_sesion_cantidad_consultas-fecha_inicio`
    ON `ai_costos_sesion` (`cantidad_consultas`, `fecha_inicio`);


-- ----------------------------------------------------------
-- log_ai_consultas
-- Log de consultas a IA. Patrones: historial por usuario,
-- consultas costosas, consultas lentas, análisis de períodos.
-- ----------------------------------------------------------

-- Para historial de consultas por usuario
CREATE INDEX `idx_log_ai_consultas_id_usuario-fecha_creacion`
    ON `log_ai_consultas` (`id_usuario`, `fecha_creacion`);

-- Para identificación de consultas costosas en el tiempo
CREATE INDEX `idx_log_ai_consultas_costo_usd-fecha_creacion`
    ON `log_ai_consultas` (`costo_usd`, `fecha_creacion`);

-- Para análisis de costo acumulado por período
CREATE INDEX `idx_log_ai_consultas_fecha_creacion-costo_usd`
    ON `log_ai_consultas` (`fecha_creacion`, `costo_usd`);

-- Para identificación de consultas lentas
CREATE INDEX `idx_log_ai_consultas_tiempo_ejecucion_ms-fecha_creacion`
    ON `log_ai_consultas` (`tiempo_ejecucion_ms`, `fecha_creacion`);

-- Para análisis de rangos de fechas consultados frecuentemente
CREATE INDEX `idx_log_ai_consultas_fecha_rango_inicio-fecha_rango_fin`
    ON `log_ai_consultas` (`fecha_rango_inicio`, `fecha_rango_fin`);


-- ==============================================================================
-- ============================================================
-- MÓDULO GENERAL: gen_
-- ============================================================
-- ==============================================================================


-- ----------------------------------------------------------
-- gen_ubicaciones_reales
-- Filtrado por activo en JOINs desde sem_dispositivos y ubi_canal.
-- ----------------------------------------------------------

CREATE INDEX `idx_gen_ubicaciones_reales_activo`
    ON `gen_ubicaciones_reales` (`activo`);


-- ==============================================================================
-- ============================================================
-- MÓDULO REPORTERÍA: rep_
-- ============================================================
-- ==============================================================================


-- ----------------------------------------------------------
-- rep_reportes_generados
-- Operaciones de limpieza TTL, archivado y búsquedas.
-- ----------------------------------------------------------

-- Para filtrado por estado de generación
CREATE INDEX `idx_rep_reportes_generados_estado_generacion`
    ON `rep_reportes_generados` (`estado_generacion`);

-- Para limpieza TTL: WHERE fecha_expiracion < NOW()
CREATE INDEX `idx_rep_reportes_generados_fecha_expiracion`
    ON `rep_reportes_generados` (`fecha_expiracion`);

-- Compound estado + fecha_expiracion: cubre la operación de archivado y cleanup
CREATE INDEX `idx_rep_reportes_generados_estado-fecha_expiracion`
    ON `rep_reportes_generados` (`estado_generacion`, `fecha_expiracion`);

-- Para filtrado por fuente de generación
CREATE INDEX `idx_rep_reportes_generados_fuente`
    ON `rep_reportes_generados` (`fuente`);

-- Para búsqueda de reportes por plantilla y estado
CREATE INDEX `idx_rep_reportes_generados_id_plantilla-estado_generacion`
    ON `rep_reportes_generados` (`id_plantilla`, `estado_generacion`);

-- Para listado cronológico de reportes por estado
CREATE INDEX `idx_rep_reportes_generados_estado_generacion-fecha_creacion`
    ON `rep_reportes_generados` (`estado_generacion`, `fecha_creacion`);

-- Para análisis de reportes por fuente + estado + período
CREATE INDEX `idx_rep_reportes_generados_fuente-estado_gen-fecha_creacion`
    ON `rep_reportes_generados` (`fuente`, `estado_generacion`, `fecha_creacion`);
