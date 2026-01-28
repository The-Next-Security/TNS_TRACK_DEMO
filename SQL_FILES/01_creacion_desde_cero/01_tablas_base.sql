CREATE DATABASE tns_cool_track
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cool_track;

-- ============================================
-- TABLAS GENERALES (gen_)
-- ============================================

-- Tabla de Usuario
CREATE TABLE `gen_usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `activo` tinyint DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_gen_usuario_email` (`email`),
  INDEX `idx_gen_usuario_activo` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para recuperar contraseñas
CREATE TABLE `gen_password_reset` (
  `id_password_reset` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime NOT NULL,
  PRIMARY KEY (`id_password_reset`),
  UNIQUE KEY `uk_gen_password_reset_token` (`token`),
  INDEX `idx_gen_password_reset_id_usuario` (`id_usuario`),
  INDEX `idx_gen_password_reset_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `fk_gen_password_reset_id_usuario_gen_usuario_id_usuario` 
    FOREIGN KEY (`id_usuario`) 
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gen_permiso` (
  `id_permiso` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `activo` tinyint DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `uk_gen_permiso_nombre` (`nombre`),
  INDEX `idx_gen_permiso_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `gen_usuario_permisos` (
  `id_usuario` int NOT NULL,
  `id_permiso` int NOT NULL,
  `activo` tinyint DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`, `id_permiso`),
  INDEX `idx_gen_usuario_permisos_id_usuario` (`id_usuario`),
  INDEX `idx_gen_usuario_permisos_id_permiso` (`id_permiso`),
  CONSTRAINT `fk_gen_usuario_permisos_id_usuario_gen_usuario_id_usuario` 
    FOREIGN KEY (`id_usuario`) 
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_gen_usuario_permisos_id_permiso_gen_permiso_id_permiso` 
    FOREIGN KEY (`id_permiso`) 
    REFERENCES `gen_permiso`(`id_permiso`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de feriados legales en Chile
CREATE TABLE `gen_feriados_cl` (
  `id_feriado` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL COMMENT 'Fecha del feriado en formato YYYY-MM-DD',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción o nombre del feriado',
  PRIMARY KEY (`id_feriado`),
  UNIQUE KEY `uk_gen_feriados_cl_fecha` (`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de feriados legales en Chile';

-- Tabla de ubicaciones reales
CREATE TABLE `gen_ubicaciones_reales` (
  `id_ubicacion_real` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre de la ubicación real',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción de la ubicación real',
  `activo` tinyint DEFAULT '1',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ubicacion_real`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de ubicaciones reales';

-- Catálogo de tipos de parámetros del sistema (compartido entre gen_cofiguracion y sem_configuracion)
CREATE TABLE `gen_tipos_parametros` (
  `id_tipo_parametro` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL COMMENT 'Nombre del tipo (STRING, NUMBER, BOOLEAN, OBJECT, ARRAY, JSON, DECIMAL, ENTERO, TEXTO)',
  `descripcion` text COMMENT 'Descripción del tipo de parámetro',
  `categoria` enum('PRIMITIVO','COMPLEJO','NUMERICO') DEFAULT 'PRIMITIVO' COMMENT 'Categorización del tipo',
  `validacion_regex` varchar(255) NULL COMMENT 'Regex opcional para validar formato',
  `ejemplo_valor` text NULL COMMENT 'Ejemplo de valor válido para este tipo',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tipo_parametro`),
  UNIQUE KEY `uk_gen_tipos_parametros_nombre` (`nombre`),
  INDEX `idx_gen_tipos_parametros_activo` (`activo`),
  INDEX `idx_gen_tipos_parametros_categoria` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo centralizado de tipos de parámetros para todo el sistema';

-- Grupos principales de configuración del sistema (database, jwt, websocket, email, etc.)
CREATE TABLE `gen_cofiguracion_grupos` (
  `id_cofiguracion_grupos` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL COMMENT 'Nombre del grupo: database, jwt, websocket, email, etc.',
  `descripcion` text COMMENT 'Descripción del propósito del grupo',
  `orden` int DEFAULT '0' COMMENT 'Orden de visualización en UI',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cofiguracion_grupos`),
  UNIQUE KEY `uk_gen_cofiguracion_grupos_nombre` (`nombre`),
  INDEX `idx_gen_cofiguracion_grupos_activo` (`activo`),
  INDEX `idx_gen_cofiguracion_grupos_orden` (`orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Grupos principales de configuración del sistema';

-- Definición de estructura de parámetros de configuración general del sistema (sin valores)
CREATE TABLE `gen_cofiguracion_parametros` (
  `id_cofiguracion_parametros` int NOT NULL AUTO_INCREMENT,
  `cofiguracion_grupos_id` int NOT NULL COMMENT 'FK a gen_cofiguracion_grupos',
  `tipo_parametro_id` int NOT NULL COMMENT 'FK a gen_tipos_parametros',
  `ruta_completa` varchar(255) NOT NULL COMMENT 'Ruta completa: database.development.host, jwt.secret, etc.',
  `nombre_parametro` varchar(100) NOT NULL COMMENT 'Último nivel de la ruta: host, secret, port, etc.',
  `nivel_anidacion` int NOT NULL DEFAULT '1' COMMENT 'Profundidad de anidación (1=raíz, 2=nivel1.param, 3=nivel1.nivel2.param)',
  `ruta_padre` varchar(255) NULL COMMENT 'Ruta del padre (NULL si es raíz, ej: database.development para database.development.host)',
  `es_sensible` tinyint(1) DEFAULT '0' COMMENT '1 = secreto/credencial (requiere encriptación), 0 = dato público',
  `descripcion` text NULL COMMENT 'Descripción del propósito del parámetro',
  `valor_default` text NULL COMMENT 'Valor por defecto si no hay valor activo',
  `validacion_regex` varchar(255) NULL COMMENT 'Regex específico para este parámetro (sobreescribe el del tipo)',
  `es_requerido` tinyint(1) DEFAULT '1' COMMENT '1 = parámetro obligatorio, 0 = opcional',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cofiguracion_parametros`),
  UNIQUE KEY `uk_gen_cofiguracion_parametros_ruta_completa` (`ruta_completa`),
  INDEX `idx_gen_cofiguracion_parametros_grupo_id` (`cofiguracion_grupos_id`),
  INDEX `idx_gen_cofiguracion_parametros_tipo_parametro_id` (`tipo_parametro_id`),
  INDEX `idx_gen_cofiguracion_parametros_es_sensible` (`es_sensible`),
  INDEX `idx_gen_cofiguracion_parametros_activo` (`activo`),
  INDEX `idx_gen_cofiguracion_parametros_ruta_padre` (`ruta_padre`),
  CONSTRAINT `fk_gen_cofiguracion_parametros_grupo_id_gen_cofiguracion_grupos_id_cofiguracion_grupos`
    FOREIGN KEY (`cofiguracion_grupos_id`)
    REFERENCES `gen_cofiguracion_grupos`(`id_cofiguracion_grupos`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_gen_cofiguracion_parametros_tipo_parametro_id_gen_tipos_parametros_id_tipo_parametro`
    FOREIGN KEY (`tipo_parametro_id`)
    REFERENCES `gen_tipos_parametros`(`id_tipo_parametro`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Definición de estructura de parámetros de configuración general del sistema (sin valores)';

-- Valores reales de configuración con versionado e historial
CREATE TABLE `gen_cofiguracion_valores` (
  `id_cofiguracion_valores` int NOT NULL AUTO_INCREMENT,
  `cofiguracion_parametros_id` int NOT NULL COMMENT 'FK a gen_cofiguracion_parametros',
  `valor` text NOT NULL COMMENT 'Valor del parámetro (encriptado si es_sensible=1 en parámetros)',
  `version` int DEFAULT '1' COMMENT 'Versión del valor (incrementa con cada cambio)',
  `activo` tinyint(1) DEFAULT '1' COMMENT '1 = valor actual activo, 0 = valor histórico',
  `valido_desde` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha desde la cual este valor es válido',
  `valido_hasta` timestamp NULL DEFAULT NULL COMMENT 'Fecha hasta la cual fue válido (NULL = aún vigente)',
  `fecha_creacion` timestamp DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cofiguracion_valores`),
  INDEX `idx_gen_cofiguracion_valores_parametro_id` (`cofiguracion_parametros_id`),
  INDEX `idx_gen_cofiguracion_valores_activo` (`activo`),
  INDEX `idx_gen_cofiguracion_valores_valido_desde-valido_hasta-activo` (`valido_desde`, `valido_hasta`, `activo`),
  INDEX `idx_gen_cofiguracion_valores_version` (`version`),
  UNIQUE KEY `uk_gen_cofiguracion_valores_parametro_id-activo` (`cofiguracion_parametros_id`, `activo`),
  CONSTRAINT `fk_gen_cofiguracion_valores_parametro_id_gen_cofiguracion_parametros_id_cofiguracion_parametros`
    FOREIGN KEY (`cofiguracion_parametros_id`)
    REFERENCES `gen_cofiguracion_parametros`(`id_cofiguracion_parametros`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Valores reales de configuración con versionado e historial';

-- ============================================
-- TABLAS DE REPORTERÍA (rep_)
-- ============================================

-- Tabla de tipos de reportes
CREATE TABLE `rep_report_type` (
  `id_report_type` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del tipo de reporte',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción del tipo de reporte',
  PRIMARY KEY (`id_report_type`),
  UNIQUE KEY `uk_rep_report_type_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de tipos de reportes';

-- Tabla de templates de reportes
CREATE TABLE `rep_templates` (
  `id_template` int NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Clave única del template',
  `id_report_type` int NOT NULL COMMENT 'FK a rep_report_type.id_report_type',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del template',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción del template',
  `activo` tinyint DEFAULT '1' COMMENT 'Indica si el template está activo',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del template',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del template',
  PRIMARY KEY (`id_template`),
  UNIQUE KEY `uk_rep_templates_template_key` (`template_key`),
  UNIQUE KEY `uk_rep_templates_nombre` (`nombre`),
  INDEX `idx_rep_templates_id_report_type` (`id_report_type`),
  CONSTRAINT `fk_rep_templates_id_report_type_rep_report_type_id_report_type` 
    FOREIGN KEY (`id_report_type`) 
    REFERENCES `rep_report_type`(`id_report_type`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de templates de reportes';

-- Tabla de reportes generados
CREATE TABLE `rep_generated_reports` (
  `id_generated_report` int NOT NULL AUTO_INCREMENT,
  `id_template` int NOT NULL COMMENT 'FK a rep_templates.id_template',
  `nombre_reporte` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del reporte generado',
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ruta del archivo del reporte generado',
  `file_size_bytes` INT NOT NULL COMMENT 'Tamaño del archivo del reporte generado',
  `generation_status` enum('pending','generating','completed','failed','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `fuente` ENUM('manual','scheduled','api','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `downloaded_at` timestamp NULL DEFAULT NULL,
  `expired_at` timestamp NULL DEFAULT NULL COMMENT 'Auto-set when TTL cleanup deletes file',
  `schedule_id` int NULL COMMENT 'FK a rep_scheduled_reports.id_scheduled_report',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del reporte generado',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del reporte generado',
  PRIMARY KEY (`id_generated_report`),
  UNIQUE KEY `uk_rep_generated_reports_nombre_reporte` (`nombre_reporte`),
  INDEX `idx_rep_generated_reports_id_template` (`id_template`),
  INDEX `idx_rep_generated_reports_schedule_id` (`schedule_id`),
  CONSTRAINT `fk_rep_generated_reports_id_template_rep_templates_id_template` 
    FOREIGN KEY (`id_template`) 
    REFERENCES `rep_templates`(`id_template`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_rep_generated_reports_schedule_id_rep_scheduled_reports_id_scheduled_report` 
    FOREIGN KEY (`schedule_id`) 
    REFERENCES `rep_scheduled_reports`(`id_scheduled_report`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de reportes generados';

-- Tabla de reportes programados
CREATE TABLE `rep_scheduled_reports` (
  `id_scheduled_report` int NOT NULL AUTO_INCREMENT,
  `id_template` int NOT NULL COMMENT 'FK a rep_templates.id_template',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del reporte programado',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción del reporte programado',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del reporte programado',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del reporte programado',
  PRIMARY KEY (`id_scheduled_report`),
  UNIQUE KEY `uk_rep_scheduled_reports_nombre` (`nombre`),
  INDEX `idx_rep_scheduled_reports_id_template` (`id_template`),
  CONSTRAINT `fk_rep_scheduled_reports_id_template_rep_templates_id_template` 
    FOREIGN KEY (`id_template`) 
    REFERENCES `rep_templates`(`id_template`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de reportes programados';

-- Tabla de log de ejecución de reportes programados
CREATE TABLE `rep_schedule_execution_log` (
  `id_schedule_execution_log` int NOT NULL AUTO_INCREMENT,
  `id_scheduled_report` int NOT NULL COMMENT 'FK a rep_scheduled_reports.id_scheduled_report',
  `id_generated_report` int NULL COMMENT 'FK a rep_generated_reports.id_generated_report',
  `execution_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de ejecución del reporte programado',
  `execution_status` enum('success','failed','skipped') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Estado de ejecución del reporte programado',
  `execution_duration_seconds` INT NOT NULL COMMENT 'Tiempo de ejecución del reporte programado',
  `execution_error` TEXT COMMENT 'Error de ejecución del reporte programado',
  PRIMARY KEY (`id_schedule_execution_log`),
  INDEX `idx_rep_schedule_execution_log_id_scheduled_report` (`id_scheduled_report`),
  INDEX `idx_rep_schedule_execution_log_id_generated_report` (`id_generated_report`),
  CONSTRAINT `fk_rep_schedule_execution_log_id_scheduled_report_rep_scheduled_reports_id_scheduled_report` 
    FOREIGN KEY (`id_scheduled_report`) 
    REFERENCES `rep_scheduled_reports`(`id_scheduled_report`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_rep_schedule_execution_log_id_generated_report_rep_generated_reports_id_generated_report` 
    FOREIGN KEY (`id_generated_report`) 
    REFERENCES `rep_generated_reports`(`id_generated_report`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de log de ejecución de reportes programados';

-- ============================================
-- TABLAS UBIBOT (ubi_)
-- ============================================

-- Tabla de canales ubibot
CREATE TABLE `ubi_channel` (
  `id_channel` int NOT NULL AUTO_INCREMENT,
  `id_ubicacion_real` int NOT NULL COMMENT 'FK a gen_ubicaciones_reales.id_ubicacion_real',
  `channel_id` int NOT NULL COMMENT 'ID del canal',
  `product_id` int NOT NULL COMMENT 'ID del producto',
  `device_id` int NOT NULL COMMENT 'ID del dispositivo',
  `latitude` decimal(10,8) NOT NULL COMMENT 'Latitud del canal',
  `longitude` decimal(11,8) NOT NULL COMMENT 'Longitud del canal',
  `firmware` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Firmware del canal',
  `mac_address` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'MAC address del canal',
  `is_online` tinyint DEFAULT '1' COMMENT 'Indica si el canal está en línea',
  `threshold_min_temperature` decimal(10,2) NOT NULL COMMENT 'Umbral mínimo de temperatura del canal',
  `threshold_max_temperature` decimal(10,2) NOT NULL COMMENT 'Umbral máximo de temperatura del canal',
  `threshold_updated_at` timestamp NULL DEFAULT NULL COMMENT 'Fecha de última actualización del umbral de temperatura',
  `threshold_updated_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Usuario que actualizó el umbral de temperatura',
  `last_alert_sent` timestamp NULL DEFAULT NULL COMMENT 'Fecha de último alerta enviada',
  `activo` tinyint DEFAULT '1' COMMENT 'Indica si el canal está activo',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del canal',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del canal',
  PRIMARY KEY (`id_channel`),
  UNIQUE KEY `uk_ubi_channel_channel_id` (`channel_id`),
  INDEX `idx_ubi_channel_id_ubicacion_real` (`id_ubicacion_real`),
  CONSTRAINT `fk_ubi_channel_id_ubicacion_real_gen_ubicaciones_reales_id_ubicacion_real` 
    FOREIGN KEY (`id_ubicacion_real`) 
    REFERENCES `gen_ubicaciones_reales`(`id_ubicacion_real`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de canales ubibot';

-- Tabla de lecturas de sensores ubibot
CREATE TABLE `ubi_sensor_readings` (
  `id_sensor_reading` int NOT NULL AUTO_INCREMENT,
  `id_channel` int NOT NULL COMMENT 'FK a ubi_channel.id_channel',
  `temperature` decimal(10,2) NOT NULL COMMENT 'Temperatura del sensor',
  `humidity` decimal(10,2) NOT NULL COMMENT 'Humedad del sensor',
  `light` decimal(10,2) NOT NULL COMMENT 'Luz del sensor',
  `voltage` decimal(10,2) NOT NULL COMMENT 'Voltaje del sensor',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro de lectura',
  PRIMARY KEY (`id_sensor_reading`),
  INDEX `idx_ubi_sensor_readings_id_channel` (`id_channel`),
  CONSTRAINT `fk_ubi_sensor_readings_id_channel_ubi_channel_id_channel` 
    FOREIGN KEY (`id_channel`) 
    REFERENCES `ubi_channel`(`id_channel`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de lecturas de sensores ubibot';

-- ============================================
-- TABLAS DE INTELIGENCIA ARTIFICIAL (ai_)
-- ============================================

-- Tabla de sesiones de costos de IA
CREATE TABLE `ai_session_costs` (
  `id_session` bigint NOT NULL AUTO_INCREMENT COMMENT 'Unique session identifier',
  `id_usuario` int NOT NULL COMMENT 'User who created this session',
  `session_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Session start time',
  `session_end` timestamp NULL DEFAULT NULL COMMENT 'Session end time (NULL = active)',
  `model_used` varchar(50) NOT NULL COMMENT 'AI model name (e.g., gpt-4o-mini)',
  `total_input_tokens` int DEFAULT '0' COMMENT 'Cumulative input tokens across all queries',
  `total_output_tokens` int DEFAULT '0' COMMENT 'Cumulative output tokens across all queries',
  `total_cost_usd` decimal(10,4) DEFAULT '0.0000' COMMENT 'Cumulative cost in USD',
  `query_count` int DEFAULT '0' COMMENT 'Number of queries in this session',
  `chambers_queried` text COMMENT 'JSON array of chamber names accessed',
  `success` tinyint(1) DEFAULT '1' COMMENT 'Session completed successfully',
  `error_message` text COMMENT 'Error details if success=FALSE',
  PRIMARY KEY (`id_session`),
  INDEX `idx_ai_session_costs_id_usuario-session_start` (`id_usuario`,`session_start`) COMMENT 'User session history lookup',
  INDEX `idx_ai_session_costs_total_cost_usd` (`total_cost_usd` DESC) COMMENT 'Cost analysis queries',
  INDEX `idx_ai_session_costs_session_end` (`session_end`) COMMENT 'Find active sessions (NULL)',
  INDEX `idx_ai_session_costs_model_used` (`model_used`) COMMENT 'Model usage statistics',
  CONSTRAINT `fk_ai_session_costs_id_usuario_gen_usuario_id_usuario` 
    FOREIGN KEY (`id_usuario`) 
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI analysis session costs for budget tracking (FR-028, SC-011, SC-012)';

-- Tabla de logs de consultas de IA
CREATE TABLE `ai_query_logs` (
  `id_query_log` bigint NOT NULL AUTO_INCREMENT COMMENT 'Unique query log identifier',
  `id_session` bigint NOT NULL COMMENT 'Parent session reference',
  `id_usuario` int NOT NULL COMMENT 'User who executed this query',
  `query_text` text NOT NULL COMMENT 'User natural language question',
  `chambers` text COMMENT 'JSON array of channel IDs queried',
  `date_range_start` date DEFAULT NULL COMMENT 'Query start date filter',
  `date_range_end` date DEFAULT NULL COMMENT 'Query end date filter',
  `response_summary` text COMMENT 'First 500 chars of AI response',
  `input_tokens` int DEFAULT '0' COMMENT 'Input tokens for this query',
  `output_tokens` int DEFAULT '0' COMMENT 'Output tokens for this query',
  `cost_usd` decimal(10,4) DEFAULT '0.0000' COMMENT 'Cost for this query in USD',
  `execution_time_ms` int DEFAULT NULL COMMENT 'Total query time including data fetch + AI',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Query execution timestamp',
  PRIMARY KEY (`id_query_log`),
  INDEX `idx_ai_query_logs_id_session` (`id_session`) COMMENT 'Session query history',
  INDEX `idx_ai_query_logs_id_usuario` (`id_usuario`) COMMENT 'User query history',
  INDEX `idx_ai_query_logs_created_at` (`created_at` DESC) COMMENT 'Recent queries',
  INDEX `idx_ai_query_logs_execution_time_ms` (`execution_time_ms`) COMMENT 'Performance analysis',
  FULLTEXT KEY `ft_ai_query_logs_query_text` (`query_text`) COMMENT 'Search queries by content',
  CONSTRAINT `fk_ai_query_logs_id_session_ai_session_costs_id_session` 
    FOREIGN KEY (`id_session`) 
    REFERENCES `ai_session_costs`(`id_session`) 
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ai_query_logs_id_usuario_gen_usuario_id_usuario` 
    FOREIGN KEY (`id_usuario`) 
    REFERENCES `gen_usuario`(`id_usuario`) 
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit log of AI queries for security and observability (Principle III, NFR-003, NFR-008)';

-- ============================================
-- TABLAS DE MEDICIONES ELÉCTRICAS (sem_)
-- ============================================

-- Tabla de dispositivos Shelly
CREATE TABLE `sem_dispositivos` (
  `id_dispositivo_shelly` int NOT NULL AUTO_INCREMENT,
  `shelly_id` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ID único del dispositivo Shelly (identificador natural)',
  `nombre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del dispositivo',
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Tipo de dispositivo (shelly_plug, shelly_em, etc.)',
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ubicación del dispositivo',
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Categoría para agrupación de consumo',
  `activo` tinyint DEFAULT '1' COMMENT 'Indica si el dispositivo está activo',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del dispositivo',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del dispositivo',
  PRIMARY KEY (`id_dispositivo_shelly`),
  UNIQUE KEY `uk_sem_dispositivos_shelly_id` (`shelly_id`),
  INDEX `idx_sem_dispositivos_activo` (`activo`),
  INDEX `idx_sem_dispositivos_categoria` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de dispositivos Shelly';



-- Tabla de configuración específica del módulo de mediciones eléctricas (usa gen_tipos_parametros compartido)
CREATE TABLE `sem_configuracion` (
  `id_configuracion` int NOT NULL AUTO_INCREMENT,
  `tipo_parametro_id` int NOT NULL COMMENT 'FK a gen_tipos_parametros (tabla compartida)',
  `nombre_parametro` varchar(100) NOT NULL COMMENT 'Nombre específico del parámetro del módulo eléctrico',
  `valor` text NOT NULL COMMENT 'Valor del parámetro de configuración',
  `activo` tinyint(1) DEFAULT '1' COMMENT '1 = activo, 0 = inactivo',
  `valido_desde` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha desde la cual este valor es válido',
  `valido_hasta` timestamp NULL DEFAULT NULL COMMENT 'Fecha hasta la cual fue válido (NULL = aún vigente)',
  `fecha_creacion` timestamp DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_configuracion`),
  INDEX `idx_sem_configuracion_tipo_parametro_id` (`tipo_parametro_id`),
  INDEX `idx_sem_configuracion_valido_desde-valido_hasta-activo` (`valido_desde`, `valido_hasta`, `activo`),
  INDEX `idx_sem_configuracion_nombre_parametro` (`nombre_parametro`),
  CONSTRAINT `fk_sem_configuracion_tipo_parametro_id_gen_tipos_parametros_id_tipo_parametro`
    FOREIGN KEY (`tipo_parametro_id`)
    REFERENCES `gen_tipos_parametros`(`id_tipo_parametro`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración específica del módulo de mediciones eléctricas';

-- Totales horarios de consumo energético
CREATE TABLE `sem_totales_hora` (
  `id_totales_hora` bigint NOT NULL AUTO_INCREMENT,
  `shelly_id` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hora_local` timestamp(6) NOT NULL,
  `energia_activa_total` decimal(15,3) NOT NULL,
  `energia_reactiva_total` decimal(15,3) DEFAULT NULL,
  `potencia_maxima` decimal(10,2) DEFAULT NULL,
  `potencia_minima` decimal(10,2) DEFAULT NULL,
  `precio_kwh_periodo` decimal(10,2) NOT NULL,
  `costo_total` decimal(15,2) NOT NULL,
  `lecturas_validas` int NOT NULL,
  `calidad_datos` decimal(5,2) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lecturas_limite_apagado` int DEFAULT '0',
  `lecturas_consumo_bajo` int DEFAULT '0',
  `lecturas_consumo_medio` int DEFAULT '0',
  `lecturas_consumo_alto` int DEFAULT '0',
  `cantidad_datos` int DEFAULT '0',
  PRIMARY KEY (`id_totales_hora`),
  UNIQUE KEY `uk_sem_totales_hora_shelly_id-hora_local` (`shelly_id`,`hora_local`),
  INDEX `idx_sem_totales_hora_shelly_id` (`shelly_id`),
  INDEX `idx_sem_totales_hora_hora_local` (`hora_local`),
  INDEX `idx_sem_totales_hora_calidad_datos` (`calidad_datos`),
  INDEX `idx_sem_totales_hora_shelly_id-hora_local-energia_activa_total` (`shelly_id`,`hora_local`,`energia_activa_total`),
  CONSTRAINT `fk_sem_totales_hora_shelly_id_sem_dispositivos_shelly_id` 
    FOREIGN KEY (`shelly_id`) 
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=316292 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totales horarios de consumo energético';

-- Totales diarios de consumo energético
CREATE TABLE `sem_totales_dia` (
  `id_totales_dia` bigint NOT NULL AUTO_INCREMENT,
  `shelly_id` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_local` date NOT NULL,
  `energia_activa_total` decimal(15,3) NOT NULL,
  `energia_reactiva_total` decimal(15,3) DEFAULT NULL,
  `potencia_maxima` decimal(10,2) DEFAULT NULL,
  `potencia_minima` decimal(10,2) DEFAULT NULL,
  `precio_kwh_promedio` decimal(10,2) NOT NULL,
  `costo_total` decimal(15,2) NOT NULL,
  `horas_con_datos` int NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lecturas_limite_apagado` int DEFAULT '0',
  `lecturas_consumo_bajo` int DEFAULT '0',
  `lecturas_consumo_medio` int DEFAULT '0',
  `lecturas_consumo_alto` int DEFAULT '0',
  `cantidad_datos` int DEFAULT '0',
  PRIMARY KEY (`id_totales_dia`),
  UNIQUE KEY `uk_sem_totales_dia_shelly_id-fecha_local` (`shelly_id`,`fecha_local`),
  INDEX `idx_sem_totales_dia_shelly_id` (`shelly_id`),
  INDEX `idx_sem_totales_dia_fecha_local` (`fecha_local`),
  CONSTRAINT `fk_sem_totales_dia_shelly_id_sem_dispositivos_shelly_id` 
    FOREIGN KEY (`shelly_id`) 
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17267 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totales diarios de consumo energético';

-- Totales mensuales de consumo energético
CREATE TABLE `sem_totales_mes` (
  `id_totales_mes` bigint NOT NULL AUTO_INCREMENT,
  `shelly_id` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `año` int NOT NULL,
  `mes` int NOT NULL,
  `energia_activa_total` decimal(15,3) NOT NULL,
  `energia_reactiva_total` decimal(15,3) DEFAULT NULL,
  `potencia_maxima` decimal(10,2) DEFAULT NULL,
  `potencia_minima` decimal(10,2) DEFAULT NULL,
  `precio_kwh_promedio` decimal(10,2) NOT NULL,
  `costo_total` decimal(15,2) NOT NULL,
  `dias_con_datos` int NOT NULL,
  `horas_con_datos` int NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lecturas_limite_apagado` int DEFAULT '0',
  `lecturas_consumo_bajo` int DEFAULT '0',
  `lecturas_consumo_medio` int DEFAULT '0',
  `lecturas_consumo_alto` int DEFAULT '0',
  `cantidad_datos` int DEFAULT '0',
  PRIMARY KEY (`id_totales_mes`),
  UNIQUE KEY `uk_sem_totales_mes_shelly_id-año-mes` (`shelly_id`,`año`,`mes`),
  INDEX `idx_sem_totales_mes_shelly_id` (`shelly_id`),
  INDEX `idx_sem_totales_mes_año-mes` (`año`,`mes`),
  CONSTRAINT `fk_sem_totales_mes_shelly_id_sem_dispositivos_shelly_id` 
    FOREIGN KEY (`shelly_id`) 
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8690 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totales mensuales de consumo energético';
