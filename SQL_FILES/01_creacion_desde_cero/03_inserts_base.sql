-- ==============================================================================
-- 03_inserts_base.sql
-- Datos semilla (core) para la base de datos tns_cool_track.
-- Solo datos de catálogo y configuración estática. Sin datos transaccionales.
--
-- Orden de ejecución respeta dependencias FK:
--   1. gen_ubicaciones_reales
--   2. sem_grupos
--   3. sem_tipos_parametros
--   4. sem_configuracion
--   5. sem_dispositivos
--   6. ubi_presets_temperatura
--   7. ubi_canal
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
(1,  'database',              'Configuración de conexión a base de datos (desarrollo y producción)',   1,  1),
(2,  'jwt',                   'Configuración de autenticación JWT',                                    2,  1),
(3,  'websocket',             'Configuración del servidor WebSocket',                                   3,  1),
(4,  'email',                 'Configuración del proveedor de correo electrónico (SendGrid)',           4,  1),
(5,  'notifications',         'Habilitación de canales de notificación (email, SMS)',                   5,  1),
(6,  'mapbox',                'Configuración de Mapbox para visualización de mapas',                    6,  1),
(7,  'posthog',               'Configuración de analítica de uso PostHog',                              7,  1),
(8,  'tracking',              'Configuración de tracking de eventos de usuario',                        8,  1),
(9,  'api',                   'Configuración de APIs externas (Shelly Cloud)',                          9,  1),
(10, 'ubibot',                'Configuración del colector de sensores Ubibot',                         10, 1),
(11, 'sms',                   'Configuración del módem SMS local (on-premise)',                        11, 1),
(12, 'measurement',           'Parámetros de medición y cálculo eléctrico',                           12, 1),
(13, 'alertSystem',           'Configuración del sistema de alertas de temperatura',                   13, 1),
(14, 'pushNotifications',     'Configuración de notificaciones push PWA (claves VAPID)',               14, 1),
(15, 'reports_module_config', 'Configuración del módulo de generación de reportes PDF',                15, 1),
(16, 'OpenAI_API',            'Configuración de la API de OpenAI para módulo de análisis AI',         16, 1),
(17, 'twilio',                'Configuración de Twilio como proveedor SMS alternativo',                17, 1);


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

-- Grupo database - entorno development (id_grupo=1)
(1,  1, 1, 'database.development.host',            'host',            3, 'database.development', 0, 'Host del servidor MySQL de desarrollo',                    'localhost',      1, 1),
(2,  1, 7, 'database.development.port',            'port',            3, 'database.development', 0, 'Puerto TCP del servidor MySQL de desarrollo',              '3306',           1, 1),
(3,  1, 1, 'database.development.user',            'user',            3, 'database.development', 0, 'Usuario MySQL de desarrollo',                              '[CONFIGURAR]',   1, 1),
(4,  1, 1, 'database.development.password',        'password',        3, 'database.development', 1, 'Contraseña MySQL de desarrollo',                           '[CONFIGURAR]',   1, 1),
(5,  1, 1, 'database.development.database',        'database',        3, 'database.development', 0, 'Nombre de la base de datos de desarrollo',                 'tns_cool_track', 1, 1),
(6,  1, 7, 'database.development.connectionLimit', 'connectionLimit', 3, 'database.development', 0, 'Límite máximo de conexiones en el pool de desarrollo',     '10',             0, 1),

-- Grupo database - entorno production (id_grupo=1)
(7,  1, 1, 'database.production.host',            'host',            3, 'database.production', 0, 'Host del servidor MySQL de producción',                     '[CONFIGURAR]',   1, 1),
(8,  1, 7, 'database.production.port',            'port',            3, 'database.production', 0, 'Puerto TCP del servidor MySQL de producción',               '3306',           1, 1),
(9,  1, 1, 'database.production.user',            'user',            3, 'database.production', 0, 'Usuario MySQL de producción',                               '[CONFIGURAR]',   1, 1),
(10, 1, 1, 'database.production.password',        'password',        3, 'database.production', 1, 'Contraseña MySQL de producción',                            '[CONFIGURAR]',   1, 1),
(11, 1, 1, 'database.production.database',        'database',        3, 'database.production', 0, 'Nombre de la base de datos de producción',                  '[CONFIGURAR]',   1, 1),
(12, 1, 7, 'database.production.connectionLimit', 'connectionLimit', 3, 'database.production', 0, 'Límite máximo de conexiones en el pool de producción',      '20',             0, 1),

-- Grupo jwt (id_grupo=2)
(13, 2, 1, 'jwt.secret',    'secret',    2, 'jwt', 1, 'Secreto HMAC-SHA256 para firma de tokens JWT (mínimo 64 caracteres)', '[CONFIGURAR]',   1, 1),
(14, 2, 1, 'jwt.expiresIn', 'expiresIn', 2, 'jwt', 0, 'Duración del token JWT (ej: 1h, 24h, 7d)',                            '1h',             1, 1),
(15, 2, 1, 'jwt.algorithm', 'algorithm', 2, 'jwt', 0, 'Algoritmo de firma JWT',                                               'HS256',          1, 1),
(16, 2, 1, 'jwt.issuer',    'issuer',    2, 'jwt', 0, 'Identificador del emisor del token JWT',                               'TNS_TRACK',      1, 1),
(17, 2, 1, 'jwt.audience',  'audience',  2, 'jwt', 0, 'Audiencia objetivo del token JWT',                                     'bitumix-users',  1, 1),

-- Grupo email (id_grupo=4)
(18, 4, 1, 'email.sendgrid_api_key',               'sendgrid_api_key',   2, 'email',                0, 'API Key de SendGrid para envío de correos (comienza con SG.)', '[CONFIGURAR]', 1, 1),
(19, 4, 1, 'email.email_contacto.from_verificado', 'from_verificado',    3, 'email.email_contacto', 0, 'Correo remitente verificado en SendGrid',                       '[CONFIGURAR]', 1, 1),
(20, 4, 1, 'email.email_contacto.from_name',       'from_name',          3, 'email.email_contacto', 0, 'Nombre visible del remitente en los correos enviados',          'TNS TRACK',    0, 1),
(21, 4, 1, 'email.emergency_recipient',            'emergency_recipient',2, 'email',                0, 'Correo destinatario de alertas críticas del sistema',           '[CONFIGURAR]', 1, 1),

-- Grupo api - Shelly Cloud (id_grupo=9)
(22, 9, 1, 'api.shelly_cloud.url',                 'url',                 3, 'api.shelly_cloud', 0, 'URL base de la API Shelly Cloud',                            '[CONFIGURAR]', 1, 1),
(23, 9, 1, 'api.shelly_cloud.device_id',           'device_id',           3, 'api.shelly_cloud', 1, 'ID del dispositivo Shelly Cloud (identificador único)',      '[CONFIGURAR]', 1, 1),
(24, 9, 1, 'api.shelly_cloud.auth_key',            'auth_key',            3, 'api.shelly_cloud', 1, 'Clave de autenticación de la API Shelly Cloud',             '[CONFIGURAR]', 1, 1),
(25, 9, 7, 'api.shelly_cloud.collection_interval', 'collection_interval', 3, 'api.shelly_cloud', 0, 'Intervalo de recolección de datos Shelly en milisegundos',  '10000',        0, 1),

-- Grupo mapbox (id_grupo=6)
(26, 6, 1, 'mapbox.access_token', 'access_token', 2, 'mapbox', 1, 'Token de acceso Mapbox para renderizado de mapas en el cliente',      '[CONFIGURAR]',                        1, 1),
(27, 6, 1, 'mapbox.style_url',    'style_url',    2, 'mapbox', 0, 'URL del estilo de mapa Mapbox a utilizar en la aplicación',           'mapbox://styles/mapbox/satellite-v9', 0, 1),

-- Grupo posthog (id_grupo=7)
(28, 7, 1, 'posthog.project_API_key',    'project_API_key',    2, 'posthog', 1, 'API Key del proyecto PostHog para analítica de uso',       '[CONFIGURAR]',             0, 1),
(29, 7, 1, 'posthog.project_host_url',   'project_host_url',   2, 'posthog', 0, 'URL del servidor PostHog (US o EU cloud)',                  'https://us.i.posthog.com', 0, 1),
(30, 7, 7, 'posthog.sesion_sample_rate', 'sesion_sample_rate', 2, 'posthog', 0, 'Porcentaje de sesiones a muestrear en PostHog (0-100)',     '100',                      0, 1),

-- Grupo notifications (id_grupo=5)
(31, 5, 2, 'notifications.email.enabled', 'enabled', 3, 'notifications.email', 0, 'Habilitar envío de notificaciones por correo electrónico', 'true',  0, 1),
(32, 5, 2, 'notifications.sms.enabled',   'enabled', 3, 'notifications.sms',   0, 'Habilitar envío de notificaciones por SMS',                 'false', 0, 1),

-- Grupo OpenAI_API (id_grupo=16)
(33, 16, 1, 'OpenAI_API.OPENAI_API_KEY', 'OPENAI_API_KEY', 2, 'OpenAI_API', 1, 'API Key de OpenAI para módulo de análisis AI de cámaras', '[CONFIGURAR]', 0, 1);


-- ==============================================================================
-- 11. gen_cofiguracion_valores
--     Valores activos iniciales para cada parámetro definido.
--     ⚠️  Reemplazar todos los '[CONFIGURAR]' antes de desplegar en producción.
-- ==============================================================================

INSERT INTO `gen_cofiguracion_valores` (`id_cofiguracion_parametros`, `valor`, `version`, `activo`) VALUES
-- database development
(1,  'localhost',         1, 1),
(2,  '3306',              1, 1),
(3,  '[CONFIGURAR]',      1, 1),
(4,  '[CONFIGURAR]',      1, 1),
(5,  'tns_cool_track',    1, 1),
(6,  '10',                1, 1),
-- database production
(7,  '[CONFIGURAR]',      1, 1),
(8,  '3306',              1, 1),
(9,  '[CONFIGURAR]',      1, 1),
(10, '[CONFIGURAR]',      1, 1),
(11, '[CONFIGURAR]',      1, 1),
(12, '20',                1, 1),
-- jwt
(13, '[CONFIGURAR]',      1, 1),
(14, '1h',                1, 1),
(15, 'HS256',             1, 1),
(16, 'TNS_TRACK',         1, 1),
(17, 'bitumix-users',     1, 1),
-- email
(18, '[CONFIGURAR]',      1, 1),
(19, '[CONFIGURAR]',      1, 1),
(20, 'TNS TRACK',         1, 1),
(21, '[CONFIGURAR]',      1, 1),
-- api shelly cloud
(22, '[CONFIGURAR]',      1, 1),
(23, '[CONFIGURAR]',      1, 1),
(24, '[CONFIGURAR]',      1, 1),
(25, '10000',             1, 1),
-- mapbox
(26, '[CONFIGURAR]',      1, 1),
(27, 'mapbox://styles/mapbox/satellite-v9', 1, 1),
-- posthog
(28, '[CONFIGURAR]',      1, 1),
(29, 'https://us.i.posthog.com', 1, 1),
(30, '100',               1, 1),
-- notifications
(31, 'true',              1, 1),
(32, 'false',             1, 1),
-- OpenAI_API
(33, '[CONFIGURAR]',      1, 1);


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
