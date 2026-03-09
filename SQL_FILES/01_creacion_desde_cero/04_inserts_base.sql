-- ==============================================================================
-- 04_inserts_base.sql
-- Datos semilla (core) para la base de datos tns_cool_track.
-- Solo datos de catálogo y configuración estática. Sin datos transaccionales.
--
-- Orden de ejecución respeta dependencias FK:
--   1. gen_feriados_cl, gen_tipos_origen, gen_horario_operacional
--   2. gen_ubicaciones_reales
--   3. sem_grupos
--   4. sem_tipos_parametros
--   5. sem_configuracion
--   6. sem_dispositivos
--   7. ubi_presets_temperatura
--   8. ubi_canal
--   9. gen_tipos_parametros → gen_cofiguracion_grupos
--      → gen_cofiguracion_parametros → gen_cofiguracion_valores
--  10. rep_tipo_reporte → rep_plantillas
--  11. ale_tipo_alerta
-- ==============================================================================

USE tns_cool_track;

INSERT INTO `gen_usuario` (`id_usuario`, `nombre`, `apellido`, `password`, `email`, `activo`) VALUES
(1 , 'Felipe' , 'Vásquez' , '[placeholeder]' , 'felipe@thenextsecurity.cl', 1),
(2 , 'Andres' , 'Vásquez' , '[placeholeder]' , 'andres@thenextsecurity.cl', 1),
(3 , 'Raimundo' , 'Sanchez' , '[placeholeder]' , 'raimundo@thenextsecurity.cl', 1),
(4 , 'Usuario' , 'Test' , '[placeholeder]' , 'usuario@test.cl', 1),
(99 , 'System' , 'System' , '[placeholeder]' , 'tns@thenextsecurity.cl', 1);

INSERT INTO `gen_permiso` (`id_permiso`, `nombre`, `descripcion`, `activo`) VALUES
(1,  'view_dashboard',                    'Permiso para acceder al módulo Dashboard', 1),
(2,  'view_blind_spot_intrusions',         'Permiso para acceder al módulo Intrusiones Blind Spot', 1),
(3,  'view_presence',                     'Permiso para acceder al módulo Sectores Presencia Personal', 1),
(4,  'view_sms',                          'Permiso para acceder al módulo Mensajes SOS Visualización por Ubicación', 1),
(5,  'view_temperature',                  'Permiso para acceder al módulo Temperatura', 1),
(6,  'view_temperature_dashboard',        'Permiso para acceder al módulo Display Temperatura Cámaras', 1),
(7,  'view_temperature_camaras',          'Permiso para acceder al módulo Gráficos Temperatura Cámaras', 1),
(8,  'view_temperature_data_intelligence','Permiso para acceder a módulos de inteligencia de datos de temperatura', 1),
(9,  'view_temperature_reports',          'Permiso para acceder al módulo Reportes Temperatura', 1),
(10, 'ai_analysis',                       'Permiso para acceder al módulo Análisis AI Cámaras', 1),
(11, 'view_alerts',                       'Permiso para acceder al módulo Monitor de Alertas', 1),
(12, 'manage_alerts',                     'Permiso para acceder al módulo Gestión de Alertas', 1),
(13, 'view_energy_data_intelligence',     'Permiso para acceder a módulos de inteligencia de datos de energía eléctrica', 1),
(14, 'view_interior',                     'Permiso para acceder al módulo Interior Ubicación en Tiempo Real', 1),
(15, 'search_interior',                   'Permiso para acceder al módulo Interior Búsqueda Histórica Ubicación', 1),
(16, 'view_exterior',                     'Permiso para acceder al módulo Exterior Ubicación Tiempo Real', 1),
(17, 'search_exterior',                   'Permiso para acceder al módulo Exterior Búsqueda Histórica Ubicación', 1),
(18, 'view_door_status',                  'Permiso para acceder al módulo Puertas Status Cierre / Apertura', 1),
(19, 'view_data_intelligence',            'Permiso para acceder al módulo Datos Análisis Forense', 1),
(20, 'view_configuration',                'Permiso para acceder al módulo Parametrización', 1),
(21, 'view_defrost_analysis',             'Permiso para acceder al módulo Análisis de Deshielo', 1),
(22, 'config_notifications',              'Permiso para acceder al módulo Config. Alertas', 1),
(23, 'view_temp_params',                  'Permiso para acceder al módulo Parámetros Temperatura Cámaras', 1),
(24, 'create_users',                      'Permiso para acceder al módulo Registrar Usuario', 1);

INSERT INTO `gen_usuario_permisos` (`id_usuario`, `id_permiso`) VALUES
(1 ,1 ),(1 ,2 ),(1 ,3 ),(1 ,4 ),
(1 ,5 ),(1 ,6 ),(1 ,7 ),(1 ,8 ),
(1 ,9 ),(1 ,10 ),(1 ,11 ),(1 ,12 ),
(1 ,13 ),(1 ,14 ),(1 ,15 ),(1 ,16 ),
(1 ,17 ),(1 ,18 ),(1 ,19 ),(1 ,20 ),
(1 ,21 ),(1 ,22 ),(1 ,23 ),(1 ,24 ),

(2 ,1 ),(2 ,2 ),(2 ,3 ),(2 ,4 ),
(2 ,5 ),(2 ,6 ),(2 ,7 ),(2 ,8 ),
(2 ,9 ),(2 ,10 ),(2 ,11 ),(2 ,12 ),
(2 ,13 ),(2 ,14 ),(2 ,15 ),(2 ,16 ),
(2 ,17 ),(2 ,18 ),(2 ,19 ),(2 ,20 ),
(2 ,21 ),(2 ,22 ),(2 ,23 ),(2 ,24 ),

(3 ,1 ),(3 ,2 ),(3 ,3 ),(3 ,4 ),
(3 ,5 ),(3 ,6 ),(3 ,7 ),(3 ,8 ),
(3 ,9 ),(3 ,10 ),(3 ,11 ),(3 ,12 ),
(3 ,13 ),(3 ,14 ),(3 ,15 ),(3 ,16 ),
(3 ,17 ),(3 ,18 ),(3 ,19 ),(3 ,20 ),
(3 ,21 ),(3 ,22 ),(3 ,23 ),(3 ,24 ),

(4 ,1 ),(4 ,2 ),(4 ,3 ),(4 ,4 ),
(4 ,5 ),(4 ,6 ),(4 ,7 ),(4 ,8 ),
(4 ,9 ),(4 ,10 ),(4 ,11 ),(4 ,12 ),
(4 ,13 ),(4 ,14 ),(4 ,15 ),(4 ,16 ),
(4 ,17 ),(4 ,18 ),(4 ,19 ),(4 ,20 ),
(4 ,21 ),(4 ,22 ),(4 ,23 ),(4 ,24 ),

(99 ,1 ),(99 ,2 ),(99 ,3 ),(99 ,4 ),
(99 ,5 ),(99 ,6 ),(99 ,7 ),(99 ,8 ),
(99 ,9 ),(99 ,10 ),(99 ,11 ),(99 ,12 ),
(99 ,13 ),(99 ,14 ),(99 ,15 ),(99 ,16 ),
(99 ,17 ),(99 ,18 ),(99 ,19 ),(99 ,20 ),
(99 ,21 ),(99 ,22 ),(99 ,23 ),(99 ,24 );

INSERT INTO `gen_feriados_cl` (`fecha`, `nombre`) VALUES
('2026-01-01' , 'Año Nuevo'),
('2026-04-03' , 'Viernes Santo'),
('2026-04-04' , 'Sabado Santo'),
('2026-05-01' , 'Día del Trabajo'),
('2026-05-21' , 'Día de las Glorias Navales'),
('2026-06-21' , 'Día Nacional de los Pueblos Indígenas'),
('2026-06-29' , 'San Pedro y Pablo'),
('2026-07-16' , 'Día de la Virgen del Carmen'),
('2026-09-18' , 'Independencia Nacional'),
('2026-09-19' , 'Día de las Glorias del Ejército'),
('2026-10-12' , 'Encuentro de las Culturas'),
('2026-10-31' , 'Día de las Iglesias Evangélicas y Protestantes'),
('2026-11-01' , 'Todos los Santos'),
('2026-12-08' , 'Inmaculada Concepción'),
('2026-12-25' , 'Navidad'),
('2026-12-31' , 'Fin de año');


-- ==============================================================================
-- gen_tipos_origen
--    Catálogo transversal de orígenes de datos del sistema.
--    Usado en alertas, logs y auditorías. Ampliar según crezca el sistema.
-- ==============================================================================

INSERT INTO `gen_tipos_origen` (`id_tipo_origen`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'ubibot',  'Sensores de temperatura y conectividad Ubibot',                     1),
(2, 'shelly',  'Dispositivos de medición eléctrica Shelly',                         1),
(3, 'sistema', 'Origen interno del sistema (eventos automáticos, scheduler, etc.)', 1);


-- ==============================================================================
-- gen_horario_operacional
--    Horario operacional por día de la semana (7 filas fijas).
--    Valores base migrados desde alertSystem.workingHours en gen_cofiguracion_*.
--    Parámetros globales (respetar_feriados, criticas_ignoran_horario) en gen_cofiguracion_*.
-- ==============================================================================

INSERT INTO `gen_horario_operacional` (`id_horario_operacional`, `dia_semana`, `nombre_dia`, `hora_inicio`, `hora_fin`, `activo`) VALUES
(1, 1, 'Lunes',     '08:30:00', '18:30:00', 1),
(2, 2, 'Martes',    '08:30:00', '18:30:00', 1),
(3, 3, 'Miércoles', '08:30:00', '18:30:00', 1),
(4, 4, 'Jueves',    '08:30:00', '18:30:00', 1),
(5, 5, 'Viernes',   '08:30:00', '18:30:00', 1),
(6, 6, 'Sábado',    '08:30:00', '14:30:00', 1),
(7, 7, 'Domingo',   '00:00:00', '00:00:00', 0);


-- ==============================================================================
-- 1. gen_ubicaciones_reales
--    Fuente: catalogo_ubicaciones_reales (teltonika)
--    IDs renumerados del rango 2-14 al rango 1-13
-- ==============================================================================

INSERT INTO `gen_ubicaciones_reales` (`id_ubicacion_real`, `nombre`, `descripcion`, `activo`) VALUES
(1,  'Camara 1', 'Sensor de temperatura Camara 1', 1),
(2,  'Camara 2', 'Sensor de temperatura Camara 2', 1),
(3,  'Camara 3', 'Sensor de temperatura Camara 3', 1),
(4,  'Camara 4', 'Sensor de temperatura Camara 4', 1),
(5,  'Camara 5', 'Sensor de temperatura Camara 5', 1),
(6,  'Reefer A', 'Sensor de temperatura Reefer A', 1),
(7,  'Reefer B', 'Sensor de temperatura Reefer B', 1),
(8,  'Reefer C', 'Sensor de temperatura Reefer C', 1),
(9,  'Reefer D', 'Sensor de temperatura Reefer D', 1),
(10, 'Reefer E', 'Sensor de temperatura Reefer E', 1),
(11, 'Reefer F', 'Sensor de temperatura Reefer F', 1),
(12, 'Reefer G', 'Sensor de temperatura Reefer G', 1),
(13, 'Reefer H', 'Sensor de temperatura Reefer H', 1);


-- ==============================================================================
-- 2. sem_grupos
--    Fuente: sem_grupos (teltonika)
-- ==============================================================================

INSERT INTO `sem_grupos` (`id_grupo`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'General', 'Grupo general por defecto', 1);


-- ==============================================================================
-- 3. sem_tipos_parametros
--    Fuente: sem_tipos_parametros (teltonika)
--    IDs 1-13, incluye tipos de cuartiles (son definiciones de catálogo)
-- ==============================================================================

INSERT INTO `sem_tipos_parametros` (`id_tipo_parametro`, `nombre`, `descripcion`, `activo`) VALUES
(1,  'INTERVALO_RECOLECCION',  'Intervalo de recolección de datos en segundos', 1),
(2,  'PRECIO_KWH',             'Precio del kWh en la moneda local', 1),
(3,  'ZONA_HORARIA',           'Zona horaria por defecto', 1),
(4,  'UMBRAL_CALIDAD',         'Umbral de calidad de datos', 1),
(5,  'DIAS_RETENCION',         'Días de retención para datos detallados', 1),
(6,  'VOLTAJE_NOMINAL',        'Voltaje nominal del sistema', 1),
(7,  'MAX_DESVIACION_VOLTAJE', 'Máxima desviación permitida del voltaje nominal', 1),
(8,  'FACTOR_POTENCIA_MIN',    'Factor de potencia mínimo aceptable', 1),
(9,  'CONFIG_ALERTAS',         'Configuración de alertas', 1),
(10, 'LIMITE APAGADO',         'Valor por el cual se considera que un dispositivo está apagado', 1),
(11, 'CONSUMO BAJO',           'Valor que representa el cuartil de consumo más bajo, 25% bajo', 1),
(12, 'CONSUMO MEDIO',          'Valor que representa el cuartil de consumo medio, 50% central', 1),
(13, 'CONSUMO ALTO',           'Valor que representa el cuartil de consumo más alto, 25% alto', 1);


-- ==============================================================================
-- 4. sem_configuracion
--    Fuente: sem_configuracion (teltonika), solo filas 1-10 (parámetros estáticos)
--    Excluidas filas 20-22 (valores computados de cuartiles - datos transaccionales)
--    Campo nombre_parametro derivado del nombre del tipo relacionado
-- ==============================================================================

INSERT INTO `sem_configuracion` (`id_configuracion`, `id_tipo_parametro`, `nombre_parametro`, `valor`, `activo`, `valido_desde`) VALUES
(1,  9,  'CONFIG_ALERTAS',         '{"habilitado": true, "umbrales": {"voltaje": 10, "corriente": 20}}', 1, '2024-12-18 13:21:32'),
(2,  5,  'DIAS_RETENCION',         '90',                1, '2024-12-18 13:21:32'),
(3,  8,  'FACTOR_POTENCIA_MIN',    '0.93',              1, '2024-12-18 13:21:32'),
(4,  1,  'INTERVALO_RECOLECCION',  '10',                1, '2024-12-18 13:21:32'),
(5,  7,  'MAX_DESVIACION_VOLTAJE', '10',                1, '2024-12-18 13:21:32'),
(6,  2,  'PRECIO_KWH',             '205',               1, '2024-12-18 13:21:32'),
(7,  4,  'UMBRAL_CALIDAD',         '0.8',               1, '2024-12-18 13:21:32'),
(8,  6,  'VOLTAJE_NOMINAL',        '220',               1, '2024-12-18 13:21:32'),
(9,  3,  'ZONA_HORARIA',           'America/Santiago',  1, '2024-12-18 13:21:32'),
(10, 10, 'LIMITE APAGADO',         '500',               1, '2025-05-29 16:02:04');


-- ==============================================================================
-- 5. sem_dispositivos
--    Fuente: sem_dispositivos (teltonika) - los 13 registros completos
--    Campo tipo: derivado del nombre del dispositivo (NULL para Dummy)
--    Campo id_ubicacion_real: mapeado del rango original 2-14 al rango nuevo 1-13
-- ==============================================================================

INSERT INTO `sem_dispositivos` (`shelly_id`, `nombre`, `tipo`, `id_ubicacion_real`, `id_grupo`, `activo`) VALUES
('fce8c0d82d02', 'Dummy 2',         NULL,              1, 1, 1),
('fce8c0d82d03', 'Dummy 3',         NULL,              2, 1, 1),
('fce8c0d82d04', 'Dummy 4',         NULL,              3, 1, 1),
('fce8c0d82d05', 'Dummy 5',         NULL,              4, 1, 1),
('fce8c0d82d06', 'Dummy 6',         NULL,              5, 1, 1),
('fce8c0d82d07', 'Dummy 7',         NULL,              6, 1, 1),
('fce8c0d82d08', 'Shelly Pro 3EM',  'shelly_pro_3em',  7, 1, 1),
('fce8c0d82d09', 'Dummy 9',         NULL,              8, 1, 1),
('fce8c0d82d10', 'Dummy 10',        NULL,              9, 1, 1),
('fce8c0d82d11', 'Dummy 11',        NULL,             10, 1, 1),
('fce8c0d82d12', 'Dummy 12',        NULL,             11, 1, 1),
('fce8c0d82d13', 'Dummy 13',        NULL,             12, 1, 1),
('fce8c0d82d14', 'Dummy 14',        NULL,             13, 1, 1);


-- ==============================================================================
-- 6. ubi_presets_temperatura
--    Fuente: temperature_presets (teltonika)
-- ==============================================================================

INSERT INTO `ubi_presets_temperatura` (`id_preset`, `nombre_preset`, `temperatura_minima`, `temperatura_maxima`, `es_predeterminado`, `activo`, `creado_por`, `actualizado_por`) VALUES
(1, 'Grupo 1 - Ultra Congelado', -22.00, -13.00, 1, 1, 'SYSTEM', 'SYSTEM'),
(2, 'Grupo 2 - Refrigerado',      -5.00,   5.00, 1, 1, 'SYSTEM', 'WEB_APP');


-- ==============================================================================
-- 7. ubi_canal
--    Fuente: channels_ubibot (teltonika)
--    id_ubicacion_real: mapeado del rango original 2-14 al rango nuevo 1-13
--    id_producto: product_id original (VARCHAR)
--    id_dispositivo: device_id original (VARCHAR hex único por canal)
-- ==============================================================================

INSERT INTO `ubi_canal` (
    `id_ubicacion_real`, `canal_id`, `nombre`,
    `id_producto`, `id_dispositivo`,
    `latitud`, `longitud`, `firmware`, `mac_address`,
    `en_linea`, `temperatura_minima_umbral`, `temperatura_maxima_umbral`,
    `fecha_actualizacion_umbral`, `usuario_actualizacion_umbral`,
    `ultima_alerta_enviada`, `activo`
) VALUES
(1,  92498, 'Camara 1', 'ubibot-ws1a', '7787f135de09d3af9c41dab3830aae8154862304', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:b0', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(2,  92505, 'Camara 2', 'ubibot-ws1a', '6ae7add025978d1a550d832a1d59fe75530d9a6d', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8c:dc', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(3,  92507, 'Camara 3', 'ubibot-ws1a', '862ad92a4ec056501d25a63d2f61db0eb5dcf7f0', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:82:68', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(4,  92509, 'Camara 4', 'ubibot-ws1a', '2769782e47b7bec525feb5fee445bfedc5503f32', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:94', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(5,  92431, 'Camara 5', 'ubibot-ws1a', '3612744868ec490e8d662df858fc31ab68bc2c99', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f6:7b:a4', 1,  -5.00,   5.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(6,  92519, 'Reefer A', 'ubibot-ws1a', '1710fa3162d8280e51eef48e2bc1ad53ac62d609', -33.43780000, -70.65030000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:30', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(7,  92521, 'Reefer B', 'ubibot-ws1a', 'f94060fce7662d68505329bde3f02e900500a8b8', -34.17080000, -70.74440000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:5c', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(8,  92523, 'Reefer C', 'ubibot-ws1a', '21ad0da0b5cf89c9dbb16e4dbdb0220b3733b2f9', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:80', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(9,  92729, 'Reefer D', 'ubibot-ws1a', 'bda7193855427875a68ee9b72655403931ce4761', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:68', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(10, 92486, 'Reefer E', 'ubibot-ws1a', '074d3f347adde1d8c3f41bf2897dd3a46ea53805', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:8c', 1,  -2.00,   5.00, '2026-01-15 16:26:52', 'Web UI',     NULL, 1),
(11, 88850, 'Reefer F', 'ubibot-ws1a', '873de03514e1ab0668979a802e44bdd227f21b58', -33.42768965, -70.68643212, 'ws1a_v2.2.9', '08:f9:e0:d4:92:d8', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(12, 90024, 'Reefer G', 'ubibot-ws1a', '3a59454bde1ede75555a89eed91e7e13e43d0edd', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:d4:8f:c4', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1),
(13, 92494, 'Reefer H', 'ubibot-ws1a', 'd2447cac064bb9761eb87bf8d769bdb2695f9bfa', -33.46250000, -70.66820000, 'ws1a_v2.2.9', '08:f9:e0:f7:8d:44', 1, -22.00, -13.00, '2025-12-22 11:24:41', 'Desarrollo', NULL, 1);


-- ==============================================================================
-- CONFIGURACIÓN GENERAL DEL SISTEMA
-- Orden de dependencias FK:
--   gen_tipos_parametros → gen_cofiguracion_grupos → gen_cofiguracion_parametros
--   → gen_cofiguracion_valores
-- ⚠️  Los valores marcados con '[CONFIGURAR]' deben reemplazarse en cada
--     instalación antes de ejecutar en producción.
-- ==============================================================================


-- ==============================================================================
-- 8. gen_tipos_parametros
--    Catálogo de tipos de datos para el sistema de configuración centralizado.
--    Se eliminó NUMBER por redundancia con DECIMAL/ENTERO.
-- ==============================================================================

INSERT INTO `gen_tipos_parametros` (`id_tipo_parametro`, `nombre`, `descripcion`, `categoria`, `activo`) VALUES
(1, 'STRING',  'Cadena de texto simple (email, host, nombre, URL)',                          'primitivo', 1),
(2, 'BOOLEAN', 'Valor booleano true/false',                                                  'primitivo', 1),
(3, 'OBJECT',  'Objeto JSON con campos definidos',                                           'complejo',  1),
(4, 'ARRAY',   'Arreglo JSON de valores o elementos',                                        'complejo',  1),
(5, 'JSON',    'Documento JSON arbitrario (sin esquema fijo)',                               'complejo',  1),
(6, 'DECIMAL', 'Número decimal con precisión fraccionaria (ej: 0.93, 205.50)',              'numerico',  1),
(7, 'ENTERO',  'Número entero sin decimales (ej: 3306, 10, 90)',                            'numerico',  1),
(8, 'TEXTO',   'Texto libre de longitud extendida (descripciones, contenido largo)',         'primitivo', 1);


-- ==============================================================================
-- 9. gen_cofiguracion_grupos
--    Grupos lógicos que organizan los parámetros de configuración del sistema.
--    Fuente: secciones del archivo unified-config.json + config-loader.js
-- ==============================================================================

INSERT INTO `gen_cofiguracion_grupos` (`id_cofiguracion_grupos`, `nombre`, `descripcion`, `orden`, `activo`) VALUES
(1,  'system',                'Configuración del entorno de ejecución del sistema',                     1,  1),
(2,  'jwt',                   'Configuración de autenticación JWT',                                     2,  1),
(3,  'websocket',             'Configuración del servidor WebSocket',                                    3,  1),
(4,  'email',                 'Configuración del proveedor de correo electrónico (SendGrid)',            4,  1),
(5,  'notifications',         'Habilitación de canales de notificación (email, SMS)',                    5,  1),
(6,  'mapbox',                'Configuración de Mapbox para visualización de mapas',                     6,  1),
(7,  'posthog',               'Configuración de analítica de uso PostHog',                               7,  1),
(8,  'tracking',              'Configuración de tracking de eventos de usuario',                         8,  1),
(9,  'api',                   'Configuración de APIs externas (Shelly Cloud)',                           9,  1),
(10, 'ubibot',                'Configuración del colector de sensores Ubibot',                          10, 1),
-- id=11 eliminado: 'sms' → módulo SMS local (módem HiLink) eliminado del sistema
-- id=12 eliminado: 'measurement' → parámetros gestionados por sem_configuracion (no duplicar)
(13, 'alertSystem',           'Configuración del sistema de alertas de temperatura',                    13, 1),
(14, 'pushNotifications',     'Configuración de notificaciones push PWA (claves VAPID)',                14, 1),
(15, 'reports_module_config', 'Configuración del módulo de generación de reportes PDF',                 15, 1),
(16, 'OpenAI_API',            'Configuración de la API de OpenAI para módulo de análisis AI',          16, 1),
(17, 'twilio',                'Configuración de Twilio como proveedor SMS alternativo',                 17, 1),
(18, 'appInfo',               'Información de la aplicación (nombre, empresa, versión)',                19, 1);


-- ==============================================================================
-- 10. gen_cofiguracion_parametros
--     Definición de cada parámetro: ruta, tipo, sensibilidad y valor por defecto.
--     Solo se incluyen parámetros requeridos o de alto uso en el sistema.
--     nivel_anidacion: 2 = raíz.clave  |  3 = raíz.sub.clave
-- ==============================================================================

INSERT INTO `gen_cofiguracion_parametros`
  (`id_cofiguracion_parametros`, `id_cofiguracion_grupos`, `id_tipo_parametro`,
   `ruta_completa`, `nombre_parametro`, `nivel_anidacion`, `ruta_padre`,
   `es_sensible`, `descripcion`, `valor_default`, `es_requerido`, `activo`) VALUES

-- ── Grupo system (id_grupo=1) → id 1 ─────────────────────────────────────────
(1,  1, 7, 'system.environment',                       'environment',          2, 'system',                    0, 'Entorno de ejecución activo: 0=development, 1=production',                          '0',     1, 1),

-- ── Grupo jwt (id_grupo=2) → ids 2-6 ─────────────────────────────────────────
(2,  2, 1, 'jwt.secret',                               'secret',               2, 'jwt',                       1, 'Secreto HMAC-SHA256 para firma de tokens JWT (mínimo 64 caracteres hex)',            '[CONFIGURAR]',   1, 1),
(3,  2, 1, 'jwt.expiresIn',                            'expiresIn',            2, 'jwt',                       0, 'Duración del token JWT (ej: 1h, 24h, 7d)',                                          '1h',             1, 1),
(4,  2, 1, 'jwt.algorithm',                            'algorithm',            2, 'jwt',                       0, 'Algoritmo de firma JWT soportado por jsonwebtoken',                                 'HS256',          1, 1),
(5,  2, 1, 'jwt.issuer',                               'issuer',               2, 'jwt',                       0, 'Identificador del emisor del token JWT (claim iss)',                                'TNS_TRACK',      1, 1),
(6,  2, 1, 'jwt.audience',                             'audience',             2, 'jwt',                       0, 'Audiencia objetivo del token JWT (claim aud)',                                      'bitumix-users',  1, 1),

-- ── Grupo websocket (id_grupo=3) → ids 7-10 ──────────────────────────────────
(7,  3, 2, 'websocket.enabled',                        'enabled',              2, 'websocket',                 0, 'Habilitar servidor WebSocket para comunicación en tiempo real',                     'true',  1, 1),
(8,  3, 7, 'websocket.port',                           'port',                 2, 'websocket',                 0, 'Puerto de escucha del servidor WebSocket',                                          '1337',  1, 1),
(9,  3, 4, 'websocket.cors.origin',                    'origin',               3, 'websocket.cors',            0, 'Orígenes permitidos para conexiones WebSocket (CORS)',                             '["http://localhost:3000","http://localhost:1337"]', 0, 1),
(10, 3, 4, 'websocket.cors.methods',                   'methods',              3, 'websocket.cors',            0, 'Métodos HTTP permitidos en negociación CORS del WebSocket',                        '["GET","POST"]', 0, 1),

-- ── Grupo email (id_grupo=4) → ids 11-14 ─────────────────────────────────────
(11, 4, 1, 'email.sendgrid_api_key',                   'sendgrid_api_key',     2, 'email',                     1, 'API Key de SendGrid para envío de correos (comienza con SG.)',                     '[CONFIGURAR]', 1, 1),
(12, 4, 1, 'email.email_contacto.from_verificado',     'from_verificado',      3, 'email.email_contacto',      0, 'Correo remitente verificado en SendGrid',                                          '[CONFIGURAR]', 1, 1),
(13, 4, 1, 'email.email_contacto.from_name',           'from_name',            3, 'email.email_contacto',      0, 'Nombre visible del remitente en los correos enviados',                             'TNS TRACK',    0, 1),
(14, 4, 1, 'email.emergency_recipient',                'emergency_recipient',  2, 'email',                     0, 'Correo destinatario de alertas críticas del sistema',                              '[CONFIGURAR]', 1, 1),

-- ── Grupo notifications (id_grupo=5) → ids 15-16 ─────────────────────────────
(15, 5, 2, 'notifications.email.enabled',              'enabled',              3, 'notifications.email',       0, 'Habilitar envío de notificaciones por correo electrónico',                         'true',  0, 1),
(16, 5, 2, 'notifications.sms.enabled',                'enabled',              3, 'notifications.sms',         0, 'Habilitar envío de notificaciones por SMS vía módem local',                        'false', 0, 1),

-- ── Grupo mapbox (id_grupo=6) → ids 17-18 ────────────────────────────────────
(17, 6, 1, 'mapbox.access_token',                      'access_token',         2, 'mapbox',                    1, 'Token de acceso Mapbox para renderizado de mapas en el cliente',                   '[CONFIGURAR]',                        1, 1),
(18, 6, 1, 'mapbox.style_url',                         'style_url',            2, 'mapbox',                    0, 'URL del estilo de mapa Mapbox a utilizar en la aplicación',                       'mapbox://styles/mapbox/satellite-v9', 0, 1),

-- ── Grupo posthog (id_grupo=7) → ids 19-21 ───────────────────────────────────
(19, 7, 1, 'posthog.project_API_key',                  'project_API_key',      2, 'posthog',                   1, 'API Key del proyecto PostHog para analítica de uso (phc_...)',                     '[CONFIGURAR]',             0, 1),
(20, 7, 1, 'posthog.project_host_url',                 'project_host_url',     2, 'posthog',                   0, 'URL del servidor PostHog (US o EU cloud)',                                         'https://us.i.posthog.com', 0, 1),
(21, 7, 7, 'posthog.sesion_sample_rate',               'sesion_sample_rate',   2, 'posthog',                   0, 'Porcentaje de sesiones a muestrear en PostHog (0-100)',                            '100',                      0, 1),

-- ── Grupo tracking (id_grupo=8) → ids 22-28 ──────────────────────────────────
(22, 8, 2, 'tracking.enabled',                         'enabled',              2, 'tracking',                  0, 'Habilitar sistema de tracking de eventos de usuario',                              'true',  1, 1),
(23, 8, 7, 'tracking.mysql.batchSize',                 'batchSize',            3, 'tracking.mysql',            0, 'Número de eventos a acumular antes de flush a MySQL',                              '75',    0, 1),
(24, 8, 7, 'tracking.mysql.flushIntervalSeconds',      'flushIntervalSeconds', 3, 'tracking.mysql',            0, 'Intervalo en segundos entre flush automático a MySQL',                             '5',     0, 1),
(25, 8, 7, 'tracking.posthog.batchSize',               'batchSize',            3, 'tracking.posthog',          0, 'Número de eventos a acumular antes de enviar a PostHog',                           '20',    0, 1),
(26, 8, 7, 'tracking.posthog.flushIntervalSeconds',    'flushIntervalSeconds', 3, 'tracking.posthog',          0, 'Intervalo en segundos entre envíos a PostHog',                                    '3',     0, 1),
(27, 8, 7, 'tracking.rateLimiting.maxEventsPerSecond', 'maxEventsPerSecond',   3, 'tracking.rateLimiting',     0, 'Máximo de eventos por segundo permitidos (rate limiter)',                           '10',    0, 1),
(28, 8, 7, 'tracking.logRetentionDays',                'logRetentionDays',     2, 'tracking',                  0, 'Días de retención de logs de tracking antes de purga automática',                  '90',    0, 1),

-- ── Grupo api - Shelly Cloud (id_grupo=9) → ids 29-32 ────────────────────────
(29, 9, 1, 'api.shelly_cloud.url',                     'url',                  3, 'api.shelly_cloud',          0, 'URL base de la API Shelly Cloud',                                                  '[CONFIGURAR]', 1, 1),
(30, 9, 1, 'api.shelly_cloud.device_id',               'device_id',            3, 'api.shelly_cloud',          1, 'ID del dispositivo Shelly Cloud (identificador único)',                            '[CONFIGURAR]', 1, 1),
(31, 9, 1, 'api.shelly_cloud.auth_key',                'auth_key',             3, 'api.shelly_cloud',          1, 'Clave de autenticación de la API Shelly Cloud',                                    '[CONFIGURAR]', 1, 1),
(32, 9, 7, 'api.shelly_cloud.collection_interval',     'collection_interval',  3, 'api.shelly_cloud',          0, 'Intervalo de recolección de datos Shelly en milisegundos',                         '10000',        0, 1),

-- ── Grupo ubibot (id_grupo=10) → ids 33-36 ───────────────────────────────────
(33, 10, 1, 'ubibot.account_key',                      'account_key',          2, 'ubibot',                    1, 'Account Key Ubibot para autenticación con la API (32 chars hex)',                   '[CONFIGURAR]',              1, 1),
(34, 10, 1, 'ubibot.token_file',                       'token_file',           2, 'ubibot',                    0, 'Ruta al archivo local donde se persiste el access token de la API Ubibot',          './src/config/token_id.txt', 1, 1),
(35, 10, 4, 'ubibot.excluded_channels',                'excluded_channels',    2, 'ubibot',                    0, 'Array de channel_id a excluir del ciclo de recolección',                           '[]',                        0, 1),
(36, 10, 7, 'ubibot.collection_interval',              'collection_interval',  2, 'ubibot',                    0, 'Intervalo de recolección de datos Ubibot en milisegundos (default: 5 min)',         '300000',                    0, 1),

-- ids 37-47 eliminados: grupo sms (módem HiLink local) — módulo SMS eliminado del sistema
-- ids 37-47 eliminados: grupo sms (módem HiLink local) — módulo SMS eliminado del sistema

-- ── Grupo alertSystem (id_grupo=13) → ids 48-58 ───────────────────────────────
(48, 13, 7, 'alertSystem.intervals.processing',                 'processing',   4, 'alertSystem.intervals',              0, 'Intervalo en ms del ciclo de procesamiento de alertas pendientes',             '3600000',  0, 1),
(49, 13, 7, 'alertSystem.intervals.cleanup',                    'cleanup',      4, 'alertSystem.intervals',              0, 'Intervalo en ms del ciclo de limpieza de alertas antiguas',                    '43200000', 0, 1),
(50, 13, 7, 'alertSystem.intervals.temperature.initialDelay',   'initialDelay', 5, 'alertSystem.intervals.temperature',  0, 'Minutos sin cambio antes de enviar primera alerta de temperatura',             '60',       0, 1),
(51, 13, 7, 'alertSystem.intervals.temperature.betweenAlerts',  'betweenAlerts',5, 'alertSystem.intervals.temperature',  0, 'Minutos mínimos entre alertas consecutivas de temperatura',                    '60',       0, 1),
(52, 13, 7, 'alertSystem.intervals.disconnection.initialDelay', 'initialDelay', 5, 'alertSystem.intervals.disconnection',0, 'Minutos desconectado antes de enviar primera alerta de desconexión',           '55',       0, 1),
(53, 13, 7, 'alertSystem.intervals.disconnection.betweenAlerts','betweenAlerts',5, 'alertSystem.intervals.disconnection',0, 'Minutos mínimos entre alertas consecutivas de desconexión',                    '55',       0, 1),
(54, 13, 7, 'alertSystem.retention.maxAgeHours',                'maxAgeHours',  3, 'alertSystem.retention',              0, 'Horas máximas de retención del historial de alertas',                          '24',       0, 1),
(55, 13, 6, 'alertSystem.workingHours.weekdays.start',          'start',        4, 'alertSystem.workingHours.weekdays',  0, 'Hora de inicio del horario laboral semana (ej: 8.5 = 08:30)',                  '8.5',      0, 1),
(56, 13, 6, 'alertSystem.workingHours.weekdays.end',            'end',          4, 'alertSystem.workingHours.weekdays',  0, 'Hora de fin del horario laboral semana (ej: 18.5 = 18:30)',                    '18.5',     0, 1),
(57, 13, 6, 'alertSystem.workingHours.saturday.start',          'start',        4, 'alertSystem.workingHours.saturday',  0, 'Hora de inicio del horario laboral sábado',                                    '8.5',      0, 1),
(58, 13, 6, 'alertSystem.workingHours.saturday.end',            'end',          4, 'alertSystem.workingHours.saturday',  0, 'Hora de fin del horario laboral sábado',                                       '14.5',     0, 1),

-- ── Grupo pushNotifications (id_grupo=14) → ids 59-62 ─────────────────────────
(59, 14, 2, 'pushNotifications.enabled',                        'enabled',        2, 'pushNotifications', 0, 'Habilitar notificaciones push PWA mediante Web Push API',                         'false',         0, 1),
(60, 14, 1, 'pushNotifications.vapidPublicKey',                 'vapidPublicKey', 2, 'pushNotifications', 1, 'Clave pública VAPID para autenticar el servidor de notificaciones push',           '[CONFIGURAR]',  1, 1),
(61, 14, 1, 'pushNotifications.vapidPrivateKey',                'vapidPrivateKey',2, 'pushNotifications', 1, 'Clave privada VAPID (nunca exponer al cliente)',                                   '[CONFIGURAR]',  1, 1),
(62, 14, 1, 'pushNotifications.vapidSubject',                   'vapidSubject',   2, 'pushNotifications', 0, 'Identificador de contacto del servidor push (mailto: o URL)',                     '[CONFIGURAR]',  0, 1),

-- ── Grupo reports_module_config (id_grupo=15) → ids 63-67 ────────────────────
(63, 15, 1, 'reports_module_config.storage_path',               'storage_path',           2, 'reports_module_config', 0, 'Ruta de almacenamiento de reportes PDF generados',                            '../storage/reports', 1, 1),
(64, 15, 2, 'reports_module_config.scheduler_enabled',          'scheduler_enabled',      2, 'reports_module_config', 0, 'Habilitar generación automática de reportes programados',                     'true',               0, 1),
(65, 15, 1, 'reports_module_config.scheduler_timezone',         'scheduler_timezone',     2, 'reports_module_config', 0, 'Zona horaria para el scheduler de reportes (IANA timezone)',                  'America/Santiago',   0, 1),
(66, 15, 7, 'reports_module_config.retention_days',             'retention_days',         2, 'reports_module_config', 0, 'Días de retención de reportes PDF antes de eliminación automática',           '90',                 0, 1),
(67, 15, 7, 'reports_module_config.max_concurrent_reports',     'max_concurrent_reports', 2, 'reports_module_config', 0, 'Máximo de reportes que pueden generarse en paralelo',                         '5',                  0, 1),

-- ── Grupo OpenAI_API (id_grupo=16) → id 68 ───────────────────────────────────
(68, 16, 1, 'OpenAI_API.OPENAI_API_KEY',                        'OPENAI_API_KEY', 2, 'OpenAI_API', 1, 'API Key de OpenAI para módulo de análisis AI de cámaras',                                         '[CONFIGURAR]', 0, 1),

-- ── Grupo twilio (id_grupo=17) → ids 69-73 ───────────────────────────────────
(69, 17, 1, 'twilio.accountSid',                                'accountSid',    2, 'twilio', 1, 'SID de la cuenta Twilio (comienza con AC)',                                            '[CONFIGURAR]', 1, 1),
(70, 17, 1, 'twilio.authToken',                                 'authToken',     2, 'twilio', 1, 'Token de autenticación de la cuenta Twilio',                                           '[CONFIGURAR]', 1, 1),
(71, 17, 1, 'twilio.phoneNumber',                               'phoneNumber',   2, 'twilio', 0, 'Número de teléfono Twilio emisor en formato E.164 (ej: +13149166784)',                  '[CONFIGURAR]', 1, 1),
(72, 17, 1, 'twilio.url_llamada',                               'url_llamada',   2, 'twilio', 0, 'URL del TwiML Bin para llamadas de voz de alerta',                                     '[CONFIGURAR]', 0, 1),
(73, 17, 4, 'twilio.destinatarios',                             'destinatarios', 2, 'twilio', 1, 'Array de números de teléfono destinatarios de llamadas Twilio en formato E.164',       '[CONFIGURAR]', 1, 1),

-- ── Grupo appInfo (id_grupo=18) → ids 74-76 ──────────────────────────────────
(74, 18, 1, 'appInfo.appName',                                  'appName',     2, 'appInfo', 0, 'Nombre de la aplicación mostrado en notificaciones y reportes',                        'Sistema de Monitoreo',   0, 1),
(75, 18, 1, 'appInfo.companyName',                              'companyName', 2, 'appInfo', 0, 'Nombre de la empresa operadora mostrado en notificaciones y reportes',                 'The Next Security',      0, 1),
(76, 18, 1, 'appInfo.version',                                  'version',     2, 'appInfo', 0, 'Versión actual de la aplicación (semver)',                                              '1.0.0',                  0, 1);


-- ==============================================================================
-- 11. gen_cofiguracion_valores
--     Valores activos iniciales para cada parámetro definido.
--     ⚠️  Reemplazar todos los '[CONFIGURAR]' antes de desplegar en producción.
-- ==============================================================================

-- ⚠️  Todos los valores '[CONFIGURAR]' deben ser reemplazados antes de desplegar.
-- ⚠️  Usar el archivo 04_valores_reales.sql (gitignored) para actualizar con valores reales.
INSERT INTO `gen_cofiguracion_valores` (`id_cofiguracion_parametros`, `valor`, `version`, `activo`) VALUES
-- system (id 1)
(1,  '0',                                                          1, 1),
-- jwt (ids 2-6)
(2,  '[CONFIGURAR]',                                               1, 1),
(3,  '1h',                                                         1, 1),
(4,  'HS256',                                                      1, 1),
(5,  'TNS_TRACK',                                                  1, 1),
(6,  'bitumix-users',                                              1, 1),
-- websocket (ids 7-10)
(7,  'true',                                                       1, 1),
(8,  '1337',                                                       1, 1),
(9,  '["http://localhost:3000","http://localhost:1337"]',           1, 1),
(10, '["GET","POST"]',                                             1, 1),
-- email (ids 11-14)
(11, '[CONFIGURAR]',                                               1, 1),
(12, '[CONFIGURAR]',                                               1, 1),
(13, 'TNS TRACK',                                                  1, 1),
(14, '[CONFIGURAR]',                                               1, 1),
-- notifications (ids 15-16)
(15, 'true',                                                       1, 1),
(16, 'false',                                                      1, 1),
-- mapbox (ids 17-18)
(17, '[CONFIGURAR]',                                               1, 1),
(18, 'mapbox://styles/mapbox/satellite-v9',                        1, 1),
-- posthog (ids 19-21)
(19, '[CONFIGURAR]',                                               1, 1),
(20, 'https://us.i.posthog.com',                                   1, 1),
(21, '100',                                                        1, 1),
-- tracking (ids 22-28)
(22, 'true',                                                       1, 1),
(23, '75',                                                         1, 1),
(24, '5',                                                          1, 1),
(25, '20',                                                         1, 1),
(26, '3',                                                          1, 1),
(27, '10',                                                         1, 1),
(28, '90',                                                         1, 1),
-- api shelly cloud (ids 29-32)
(29, '[CONFIGURAR]',                                               1, 1),
(30, '[CONFIGURAR]',                                               1, 1),
(31, '[CONFIGURAR]',                                               1, 1),
(32, '10000',                                                      1, 1),
-- ubibot (ids 33-36)
(33, '[CONFIGURAR]',                                               1, 1),
(34, './src/config/token_id.txt',                                  1, 1),
(35, '[]',                                                         1, 1),
(36, '300000',                                                     1, 1),
-- sms (ids 37-47)
(37, 'http://192.168.8.1',                                         1, 1),
(38, '/api',                                                       1, 1),
(39, '15000',                                                      1, 1),
(40, '2',                                                          1, 1),
(41, '[10000,7000]',                                               1, 1),
(42, '8000',                                                       1, 1),
(43, '8.5',                                                        1, 1),
(44, '18.5',                                                       1, 1),
(45, '8.5',                                                        1, 1),
(46, '14.5',                                                       1, 1),
(47, '[CONFIGURAR]',                                               1, 1),
-- alertSystem (ids 48-58)
(48, '3600000',                                                    1, 1),
(49, '43200000',                                                   1, 1),
(50, '60',                                                         1, 1),
(51, '60',                                                         1, 1),
(52, '55',                                                         1, 1),
(53, '55',                                                         1, 1),
(54, '24',                                                         1, 1),
(55, '8.5',                                                        1, 1),
(56, '18.5',                                                       1, 1),
(57, '8.5',                                                        1, 1),
(58, '14.5',                                                       1, 1),
-- pushNotifications (ids 59-62)
(59, 'false',                                                      1, 1),
(60, '[CONFIGURAR]',                                               1, 1),
(61, '[CONFIGURAR]',                                               1, 1),
(62, '[CONFIGURAR]',                                               1, 1),
-- reports_module_config (ids 63-67)
(63, '../storage/reports',                                         1, 1),
(64, 'true',                                                       1, 1),
(65, 'America/Santiago',                                           1, 1),
(66, '90',                                                         1, 1),
(67, '5',                                                          1, 1),
-- OpenAI_API (id 68)
(68, '[CONFIGURAR]',                                               1, 1),
-- twilio (ids 69-73)
(69, '[CONFIGURAR]',                                               1, 1),
(70, '[CONFIGURAR]',                                               1, 1),
(71, '[CONFIGURAR]',                                               1, 1),
(72, '[CONFIGURAR]',                                               1, 1),
(73, '[CONFIGURAR]',                                               1, 1),
-- appInfo (ids 74-76)
(74, 'Sistema de Monitoreo',                                       1, 1),
(75, 'The Next Security',                                          1, 1),
(76, '1.0.0',                                                      1, 1);


-- ==============================================================================
-- MÓDULO DE REPORTERÍA
-- ==============================================================================


-- ==============================================================================
-- 12. rep_tipo_reporte
--     Tipos de reportes disponibles. Fuente: migraciones del servicio Node.js.
-- ==============================================================================

INSERT INTO `rep_tipo_reporte` (`id_tipo_reporte`, `nombre`, `descripcion`) VALUES
(1, 'temperature', 'Reportes de temperatura de cámaras frigoríficas'),
(2, 'consumption', 'Reportes de consumo eléctrico por dispositivo Shelly'),
(3, 'alerts',      'Reportes de alertas y métricas de respuesta del sistema');


-- ==============================================================================
-- 13. rep_plantillas
--     Plantillas PDF disponibles. Fuente: migraciones 20251023, 20251103, 20251104.
-- ==============================================================================

INSERT INTO `rep_plantillas` (`id_plantilla`, `clave_plantilla`, `id_tipo_reporte`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'executive_temperature', 1,
   'Reporte Ejecutivo de Temperaturas',
   'Reporte completo con KPIs consolidados, gráficos de tendencias, heatmaps y análisis comparativo de temperaturas', 1),
(2, 'executive_alerts',      3,
   'Reporte Ejecutivo de Alertas',
   'Análisis completo de alertas del sistema con métricas de respuesta, SLA y distribución temporal', 1),
(3, 'executive_consumption', 2,
   'Reporte Ejecutivo Consumo Eléctrico',
   'Análisis de consumo, demanda máxima, factor de carga y costos eléctricos con KPIs operacionales, gráficos de tendencias y ranking de dispositivos', 1);
