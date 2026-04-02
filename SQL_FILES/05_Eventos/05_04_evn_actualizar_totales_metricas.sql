-- Agregación horaria única: el servidor Node no duplica este trabajo (ver servicios/server.js).
-- Requiere event_scheduler=ON y procedimiento stpr_calculate_hourly_metrics alineado al esquema actual.

CREATE EVENT evn_actualizar_totales_metricas
ON SCHEDULE EVERY 1 HOUR
STARTS '2025-12-26 01:05:00.000'
ON COMPLETION NOT PRESERVE
ENABLE
DO BEGIN
    -- Calcular métricas de la hora anterior (para asegurar que estén todos los datos)
    CALL stpr_calculate_hourly_metrics(
        DATE(DATE_SUB(NOW(), INTERVAL 1 HOUR)),
        HOUR(DATE_SUB(NOW(), INTERVAL 1 HOUR))
    );
END