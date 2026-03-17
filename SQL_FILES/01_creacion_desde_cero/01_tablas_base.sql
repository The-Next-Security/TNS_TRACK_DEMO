CREATE DATABASE tns_cool_track
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cool_track;

-- ============================================
-- TABLAS GENERALES (gen_)
-- ============================================

-- Tabla de usuarios del sistema
CREATE TABLE `gen_usuario` (
  `id_usuario` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `token_version` INT UNSIGNED NOT NULL DEFAULT 0,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_gen_usuario_email` (`email`),
  INDEX `idx_gen_usuario_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios del sistema';

-- Tabla para recuperación de contraseñas
CREATE TABLE `gen_password_reset` (
  `id_password_reset` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` INT UNSIGNED NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` DATETIME NOT NULL,
  PRIMARY KEY (`id_password_reset`),
  UNIQUE KEY `uk_gen_password_reset_token` (`token`),
  INDEX `idx_gen_password_reset_id_usuario` (`id_usuario`),
  INDEX `idx_gen_password_reset_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `fk_gen_password_reset_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tokens para recuperación de contraseñas';

-- Tabla de permisos del sistema
CREATE TABLE `gen_permiso` (
  `id_permiso` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` VARCHAR(255) NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `uk_gen_permiso_nombre` (`nombre`),
  INDEX `idx_gen_permiso_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Permisos del sistema';

-- Tabla de relación usuarios-permisos
CREATE TABLE `gen_usuario_permisos` (
  `id_usuario` INT UNSIGNED NOT NULL,
  `id_permiso` INT UNSIGNED NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relación entre usuarios y permisos';

-- Tabla de feriados legales en Chile
CREATE TABLE `gen_feriados_cl` (
  `id_feriado` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL COMMENT 'Fecha del feriado en formato YYYY-MM-DD',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Descripción o nombre del feriado',
  PRIMARY KEY (`id_feriado`),
  UNIQUE KEY `uk_gen_feriados_cl_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Feriados legales en Chile';

-- Tabla de ubicaciones reales físicas
CREATE TABLE `gen_ubicaciones_reales` (
  `id_ubicacion_real` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre de la ubicación real',
  `descripcion` VARCHAR(255) NOT NULL COMMENT 'Descripción de la ubicación real',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ubicacion_real`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Ubicaciones reales físicas';

-- Catálogo centralizado de tipos de parámetros del sistema
CREATE TABLE `gen_tipos_parametros` (
  `id_tipo_parametro` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL COMMENT 'Nombre del tipo (STRING, NUMBER, BOOLEAN, OBJECT, ARRAY, JSON, DECIMAL, ENTERO, TEXTO)',
  `descripcion` TEXT COMMENT 'Descripción del tipo de parámetro',
  `categoria` ENUM('primitivo','complejo','numerico') NOT NULL DEFAULT 'primitivo' COMMENT 'Categorización del tipo',
  `validacion_regex` VARCHAR(255) NULL COMMENT 'Regex opcional para validar formato',
  `ejemplo_valor` TEXT NULL COMMENT 'Ejemplo de valor válido para este tipo',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tipo_parametro`),
  UNIQUE KEY `uk_gen_tipos_parametros_nombre` (`nombre`),
  INDEX `idx_gen_tipos_parametros_activo` (`activo`),
  INDEX `idx_gen_tipos_parametros_categoria` (`categoria`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo centralizado de tipos de parámetros para todo el sistema';

-- Catálogo de tipos de origen de datos — transversal al sistema (alertas, logs, auditorías, etc.)
CREATE TABLE `gen_tipos_origen` (
  `id_tipo_origen` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(30) NOT NULL COMMENT 'Identificador del origen: ubibot, shelly, sistema, teltonika...',
  `descripcion` VARCHAR(255) NULL COMMENT 'Descripción del origen de datos',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = origen activo y en uso',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tipo_origen`),
  UNIQUE KEY `uk_gen_tipos_origen_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de tipos de origen de datos del sistema — uso transversal';

-- Grupos principales de configuración del sistema
CREATE TABLE `gen_cofiguracion_grupos` (
  `id_cofiguracion_grupos` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL COMMENT 'Nombre del grupo: database, jwt, websocket, email, etc.',
  `descripcion` TEXT COMMENT 'Descripción del propósito del grupo',
  `orden` INT NOT NULL DEFAULT 0 COMMENT 'Orden de visualización en UI',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cofiguracion_grupos`),
  UNIQUE KEY `uk_gen_cofiguracion_grupos_nombre` (`nombre`),
  INDEX `idx_gen_cofiguracion_grupos_activo` (`activo`),
  INDEX `idx_gen_cofiguracion_grupos_orden` (`orden`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Grupos principales de configuración del sistema';

-- Definición de estructura de parámetros de configuración
CREATE TABLE `gen_cofiguracion_parametros` (
  `id_cofiguracion_parametros` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_cofiguracion_grupos` INT UNSIGNED NOT NULL COMMENT 'FK a gen_cofiguracion_grupos',
  `id_tipo_parametro` INT UNSIGNED NOT NULL COMMENT 'FK a gen_tipos_parametros',
  `ruta_completa` VARCHAR(255) NOT NULL COMMENT 'Ruta completa: database.development.host, jwt.secret, etc.',
  `nombre_parametro` VARCHAR(100) NOT NULL COMMENT 'Último nivel de la ruta: host, secret, port, etc.',
  `nivel_anidacion` INT NOT NULL DEFAULT 1 COMMENT 'Profundidad de anidación (1=raíz, 2=nivel1.param, 3=nivel1.nivel2.param)',
  `ruta_padre` VARCHAR(255) NULL COMMENT 'Ruta del padre (NULL si es raíz)',
  `es_sensible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = secreto/credencial (requiere encriptación), 0 = dato público',
  `descripcion` TEXT NULL COMMENT 'Descripción del propósito del parámetro',
  `valor_default` TEXT NULL COMMENT 'Valor por defecto si no hay valor activo',
  `validacion_regex` VARCHAR(255) NULL COMMENT 'Regex específico para este parámetro',
  `es_requerido` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = parámetro obligatorio, 0 = opcional',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cofiguracion_parametros`),
  UNIQUE KEY `uk_gen_cofiguracion_parametros_ruta_completa` (`ruta_completa`),
  INDEX `idx_gen_cofiguracion_parametros_id_cofiguracion_grupos` (`id_cofiguracion_grupos`),
  INDEX `idx_gen_cofiguracion_parametros_id_tipo_parametro` (`id_tipo_parametro`),
  INDEX `idx_gen_cofiguracion_parametros_es_sensible` (`es_sensible`),
  INDEX `idx_gen_cofiguracion_parametros_activo` (`activo`),
  INDEX `idx_gen_cofiguracion_parametros_ruta_padre` (`ruta_padre`),
  CONSTRAINT `fk_cofiguracion_parametros_id_grupos_cofiguracion_grupos_id`
    FOREIGN KEY (`id_cofiguracion_grupos`)
    REFERENCES `gen_cofiguracion_grupos`(`id_cofiguracion_grupos`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_cofiguracion_parametros_id_tipo_tipos_parametros_id`
    FOREIGN KEY (`id_tipo_parametro`)
    REFERENCES `gen_tipos_parametros`(`id_tipo_parametro`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Definición de estructura de parámetros de configuración del sistema';

-- Valores reales de configuración con versionado e historial
CREATE TABLE `gen_cofiguracion_valores` (
  `id_cofiguracion_valores` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_cofiguracion_parametros` INT UNSIGNED NOT NULL COMMENT 'FK a gen_cofiguracion_parametros',
  `valor` TEXT NOT NULL COMMENT 'Valor del parámetro (encriptado si es_sensible=1 en parámetros)',
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Versión del valor (incrementa con cada cambio)',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = valor actual activo, 0 = valor histórico',
  `valido_desde` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha desde la cual este valor es válido',
  `valido_hasta` DATETIME NULL DEFAULT NULL COMMENT 'Fecha hasta la cual fue válido (NULL = aún vigente)',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cofiguracion_valores`),
  INDEX `idx_gen_cofiguracion_valores_id_cofiguracion_parametros` (`id_cofiguracion_parametros`),
  INDEX `idx_gen_cofiguracion_valores_activo` (`activo`),
  INDEX `idx_gen_cofiguracion_valores_valido_desde-valido_hasta-activo` (`valido_desde`, `valido_hasta`, `activo`),
  INDEX `idx_gen_cofiguracion_valores_version` (`version`),
  UNIQUE KEY `uk_gen_cofiguracion_valores_id_parametros-activo` (`id_cofiguracion_parametros`, `activo`),
  CONSTRAINT `fk_cofiguracion_valores_id_parametros_cofiguracion_parametros_id`
    FOREIGN KEY (`id_cofiguracion_parametros`)
    REFERENCES `gen_cofiguracion_parametros`(`id_cofiguracion_parametros`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Valores reales de configuración con versionado e historial';

-- Horario operacional del sistema por día de la semana para control de notificaciones y alertas
CREATE TABLE `gen_horario_operacional` (
  `id_horario_operacional` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dia_semana` TINYINT UNSIGNED NOT NULL COMMENT '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo',
  `nombre_dia` VARCHAR(20) NOT NULL COMMENT 'Nombre del día de la semana',
  `hora_inicio` TIME NOT NULL COMMENT 'Hora de inicio del horario operacional',
  `hora_fin` TIME NOT NULL COMMENT 'Hora de fin del horario operacional',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = este registro de horario está habilitado y debe utilizarse',
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_horario_operacional`),
  UNIQUE KEY `uk_gen_horario_operacional_dia_semana` (`dia_semana`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Horario operacional por día de la semana para control de notificaciones y alertas';

-- ============================================
-- TABLAS DE REPORTERÍA (rep_)
-- ============================================

-- Tabla de tipos de reportes
CREATE TABLE `rep_tipo_reporte` (
  `id_tipo_reporte` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del tipo de reporte',
  `descripcion` VARCHAR(255) NOT NULL COMMENT 'Descripción del tipo de reporte',
  PRIMARY KEY (`id_tipo_reporte`),
  UNIQUE KEY `uk_rep_tipo_reporte_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tipos de reportes disponibles';

-- Tabla de plantillas de reportes
CREATE TABLE `rep_plantillas` (
  `id_plantilla` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `clave_plantilla` VARCHAR(100) NOT NULL COMMENT 'Clave única de la plantilla',
  `id_tipo_reporte` INT UNSIGNED NOT NULL COMMENT 'FK a rep_tipo_reporte',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre de la plantilla',
  `descripcion` VARCHAR(255) NOT NULL COMMENT 'Descripción de la plantilla',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si la plantilla está activa',
  `max_dispositivos` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Máximo de dispositivos permitidos en el reporte',
  `max_dias` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Máximo de días permitidos en el período del reporte',
  `admite_comparativo` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = plantilla admite período comparativo',
  `tiempo_estimado_segundos` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Tiempo estimado de generación en segundos',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_plantilla`),
  UNIQUE KEY `uk_rep_plantillas_clave_plantilla` (`clave_plantilla`),
  UNIQUE KEY `uk_rep_plantillas_nombre` (`nombre`),
  INDEX `idx_rep_plantillas_id_tipo_reporte` (`id_tipo_reporte`),
  CONSTRAINT `fk_plantillas_id_tipo_reporte_tipo_reporte_id_tipo_reporte`
    FOREIGN KEY (`id_tipo_reporte`)
    REFERENCES `rep_tipo_reporte`(`id_tipo_reporte`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Plantillas de reportes';

-- Tabla de reportes programados (debe ir ANTES de rep_reportes_generados por FK)
CREATE TABLE `rep_reportes_programados` (
  `id_reporte_programado` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_plantilla` INT UNSIGNED NOT NULL COMMENT 'FK a rep_plantillas',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del reporte programado',
  `descripcion` VARCHAR(255) NOT NULL COMMENT 'Descripción del reporte programado',
  `expresion_cron` VARCHAR(100) NOT NULL COMMENT 'Expresión cron de node-cron para programación (ej: 0 8 * * 1-5)',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = job de reporte activo y programado',
  `proxima_ejecucion` DATETIME NULL COMMENT 'Próxima ejecución programada (persiste el estado para restaurar jobs al reiniciar)',
  `ultima_ejecucion` DATETIME NULL COMMENT 'Fecha y hora de la última ejecución',
  `ultima_ejecucion_estado` ENUM('exitoso', 'fallido', 'omitido') NULL COMMENT 'Estado de la última ejecución',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_reporte_programado`),
  UNIQUE KEY `uk_rep_reportes_programados_nombre` (`nombre`),
  INDEX `idx_rep_reportes_programados_id_plantilla` (`id_plantilla`),
  INDEX `idx_rep_reportes_programados_activo` (`activo`),
  INDEX `idx_rep_reportes_programados_proxima_ejecucion` (`proxima_ejecucion`),
  CONSTRAINT `fk_reportes_programados_id_plantilla_plantillas_id_plantilla`
    FOREIGN KEY (`id_plantilla`)
    REFERENCES `rep_plantillas`(`id_plantilla`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reportes programados con configuración de scheduling para node-cron';

-- Tabla de reportes generados
CREATE TABLE `rep_reportes_generados` (
  `id_reporte_generado` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_plantilla` INT UNSIGNED NOT NULL COMMENT 'FK a rep_plantillas',
  `id_usuario` INT UNSIGNED NULL COMMENT 'FK a gen_usuario - usuario que generó o solicitó el reporte',
  `nombre_reporte` VARCHAR(100) NOT NULL COMMENT 'Nombre del reporte generado',
  `ruta_archivo` VARCHAR(500) NOT NULL COMMENT 'Ruta del archivo del reporte generado',
  `tamanio_bytes` BIGINT NOT NULL COMMENT 'Tamaño del archivo en bytes',
  `estado_generacion` ENUM('pendiente','generando','completado','fallido','expirado') NOT NULL DEFAULT 'pendiente',
  `fuente` ENUM('manual','programado','api','otro') NOT NULL DEFAULT 'manual',
  `fecha_inicio_periodo` DATE NULL DEFAULT NULL COMMENT 'Inicio del período reportado',
  `fecha_fin_periodo` DATE NULL DEFAULT NULL COMMENT 'Fin del período reportado',
  `ids_dispositivos` JSON NULL COMMENT 'IDs de dispositivos incluidos en el reporte',
  `config_reporte` JSON NULL COMMENT 'Configuración usada para generar el reporte',
  `tiempo_generacion_segundos` DECIMAL(10,2) NULL DEFAULT NULL COMMENT 'Tiempo real de generación en segundos',
  `mensaje_error_generacion` TEXT NULL COMMENT 'Mensaje de error si estado_generacion=fallido',
  `fecha_descarga` DATETIME NULL DEFAULT NULL,
  `fecha_expiracion` DATETIME NULL DEFAULT NULL COMMENT 'Fecha desde la cual el archivo fue eliminado por TTL',
  `id_reporte_programado` INT UNSIGNED NULL COMMENT 'FK a rep_reportes_programados',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_reporte_generado`),
  UNIQUE KEY `uk_rep_reportes_generados_nombre_reporte` (`nombre_reporte`),
  INDEX `idx_rep_reportes_generados_id_plantilla` (`id_plantilla`),
  INDEX `idx_rep_reportes_generados_id_usuario` (`id_usuario`),
  INDEX `idx_rep_reportes_generados_fecha_inicio_fin_periodo` (`fecha_inicio_periodo`, `fecha_fin_periodo`),
  INDEX `idx_rep_reportes_generados_id_reporte_programado` (`id_reporte_programado`),
  CONSTRAINT `fk_reportes_generados_id_plantilla_plantillas_id_plantilla`
    FOREIGN KEY (`id_plantilla`)
    REFERENCES `rep_plantillas`(`id_plantilla`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_rep_generados_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_rep_generados_id_programado_rep_programados_id`
    FOREIGN KEY (`id_reporte_programado`)
    REFERENCES `rep_reportes_programados`(`id_reporte_programado`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reportes generados';

-- ============================================
-- TABLAS UBIBOT - GRUPOS DE TEMPERATURA (ubi_)
-- Debe ir antes de ubi_canal por FK id_preset
-- ============================================

-- Grupos de temperatura para umbrales de alerta
CREATE TABLE `ubi_grupo` (
  `id_preset` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_preset` VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo del grupo',
  `temperatura_minima` DECIMAL(5,2) NOT NULL COMMENT 'Temperatura mínima del umbral (valor por defecto del grupo)',
  `temperatura_maxima` DECIMAL(5,2) NOT NULL COMMENT 'Temperatura máxima del umbral (valor por defecto del grupo)',
  `es_predeterminado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = grupo predeterminado del sistema',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_por` VARCHAR(100) NOT NULL COMMENT 'Usuario que creó el grupo',
  `actualizado_por` VARCHAR(100) NOT NULL COMMENT 'Último usuario que actualizó el grupo',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_preset`),
  UNIQUE KEY `uk_ubi_grupo_nombre_preset` (`nombre_preset`),
  INDEX `idx_ubi_grupo_activo` (`activo`),
  INDEX `idx_ubi_grupo_es_predeterminado` (`es_predeterminado`),
  CONSTRAINT `chk_ubi_grupo_minima`
    CHECK (`temperatura_minima` >= -50 AND `temperatura_minima` <= 150),
  CONSTRAINT `chk_ubi_grupo_maxima`
    CHECK (`temperatura_maxima` >= -50 AND `temperatura_maxima` <= 150),
  CONSTRAINT `chk_ubi_grupo_rango`
    CHECK (`temperatura_minima` < `temperatura_maxima`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Grupos de temperatura para umbrales de alerta de canales Ubibot';

-- ============================================
-- TABLAS UBIBOT (ubi_)
-- ============================================

-- Tabla de canales Ubibot
CREATE TABLE `ubi_canal` (
  `id_canal` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_ubicacion_real` INT UNSIGNED NOT NULL COMMENT 'FK a gen_ubicaciones_reales',
  `canal_id` INT NOT NULL COMMENT 'ID natural del canal en Ubibot',
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre descriptivo del canal en Ubibot',
  `id_producto` VARCHAR(20) NOT NULL COMMENT 'ID del producto en Ubibot',
  `id_dispositivo` VARCHAR(64) NOT NULL COMMENT 'ID del dispositivo en Ubibot',
  `latitud` DECIMAL(10,8) NOT NULL COMMENT 'Latitud del canal',
  `longitud` DECIMAL(11,8) NOT NULL COMMENT 'Longitud del canal',
  `firmware` VARCHAR(100) NOT NULL COMMENT 'Versión de firmware del sensor',
  `mac_address` VARCHAR(100) NOT NULL COMMENT 'Dirección MAC del sensor',
  `en_linea` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si el canal está en línea',
  `id_preset` INT UNSIGNED NULL COMMENT 'FK a ubi_grupo — umbrales base del grupo al que pertenece el canal',
  `umbral_min` DECIMAL(5,2) NULL COMMENT 'Override individual de temperatura mínima. NULL = usa temperatura_minima del grupo',
  `umbral_max` DECIMAL(5,2) NULL COMMENT 'Override individual de temperatura máxima. NULL = usa temperatura_maxima del grupo',
  `ultima_alerta_enviada` DATETIME NULL DEFAULT NULL COMMENT 'Fecha de última alerta enviada',
  `fuera_linea_desde` DATETIME NULL DEFAULT NULL COMMENT 'Fecha desde la cual el canal está sin conexión (NULL = actualmente en línea)',
  `serial` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Número de serie físico del dispositivo (full_serial de Ubibot)',
  `ultima_lectura_ubibot` DATETIME NULL DEFAULT NULL COMMENT 'Fecha last_entry_date reportada por Ubibot API — para detectar sensores silenciosos',
  `ultima_ip` VARCHAR(45) NULL DEFAULT NULL COMMENT 'Última IP reportada por Ubibot (last_ip) — para diagnóstico de red',
  `puntaje_salud` TINYINT UNSIGNED NULL DEFAULT NULL COMMENT 'Puntaje de salud del dispositivo 0-100 (device_health.score) — para mantenimiento preventivo',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si el canal está activo',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_canal`),
  UNIQUE KEY `uk_ubi_canal_canal_id` (`canal_id`),
  INDEX `idx_ubi_canal_id_ubicacion_real` (`id_ubicacion_real`),
  INDEX `idx_ubi_canal_id_preset` (`id_preset`),
  CONSTRAINT `fk_ubi_canal_id_ubicacion_real_gen_ubicaciones_reales_id`
    FOREIGN KEY (`id_ubicacion_real`)
    REFERENCES `gen_ubicaciones_reales`(`id_ubicacion_real`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ubi_canal_id_preset_ubi_grupo_id_preset`
    FOREIGN KEY (`id_preset`)
    REFERENCES `ubi_grupo`(`id_preset`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `chk_ubi_canal_umbral_min` CHECK (`umbral_min` IS NULL OR (`umbral_min` >= -50 AND `umbral_min` <= 150)),
  CONSTRAINT `chk_ubi_canal_umbral_max` CHECK (`umbral_max` IS NULL OR (`umbral_max` >= -50 AND `umbral_max` <= 150)),
  CONSTRAINT `chk_ubi_canal_umbral_rango` CHECK (`umbral_min` IS NULL OR `umbral_max` IS NULL OR `umbral_min` < `umbral_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Canales de sensores Ubibot';

-- Tabla de lecturas de sensores Ubibot
CREATE TABLE `ubi_lecturas_sensor` (
  `id_lectura_sensor` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_canal` INT UNSIGNED NOT NULL COMMENT 'FK a ubi_canal',
  `temperatura` DECIMAL(8,4) NOT NULL COMMENT 'Temperatura ambiente interior del sensor - field1',
  `humedad` DECIMAL(8,4) NOT NULL COMMENT 'Humedad registrada por el sensor - field2',
  `luz` DECIMAL(12,4) NOT NULL COMMENT 'Nivel de luz registrado por el sensor - field3',
  `voltaje` DECIMAL(8,4) NOT NULL COMMENT 'Voltaje registrado por el sensor - field4',
  `temperatura_externa` DECIMAL(8,4) NULL DEFAULT NULL COMMENT 'Temperatura sonda externa de refrigeración - field8 (dato principal del negocio)',
  `fecha_lectura_externa` DATETIME NULL DEFAULT NULL COMMENT 'Timestamp de la sonda externa - field8.created_at',
  `wifi_rssi` SMALLINT NULL DEFAULT NULL COMMENT 'Intensidad señal WiFi en dBm - field5',
  `en_linea_lectura` TINYINT(1) NULL DEFAULT NULL COMMENT 'Estado online del canal al momento de la lectura - channel.net',
  `fecha_lectura` DATETIME NOT NULL COMMENT 'Fecha y hora exacta de la lectura del sensor - field1.created_at',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de inserción del registro',
  PRIMARY KEY (`id_lectura_sensor`),
  INDEX `idx_ubi_lecturas_sensor_id_canal` (`id_canal`),
  INDEX `idx_ubi_lecturas_sensor_fecha_lectura` (`fecha_lectura`),
  INDEX `idx_ubi_lecturas_sensor_id_canal-fecha_lectura` (`id_canal`, `fecha_lectura`),
  CONSTRAINT `fk_ubi_lecturas_sensor_id_canal_ubi_canal_id_canal`
    FOREIGN KEY (`id_canal`)
    REFERENCES `ubi_canal`(`id_canal`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lecturas de sensores Ubibot';

-- ============================================
-- TABLAS DE INTELIGENCIA ARTIFICIAL (ai_)
-- ============================================

-- Tabla de sesiones de costos de IA
CREATE TABLE `ai_costos_sesion` (
  `id_sesion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Identificador único de sesión',
  `id_usuario` INT UNSIGNED NOT NULL COMMENT 'Usuario que creó la sesión',
  `fecha_inicio` DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de inicio de la sesión',
  `fecha_fin` DATETIME NULL DEFAULT NULL COMMENT 'Fecha de fin de sesión (NULL = activa)',
  `modelo_utilizado` VARCHAR(50) NOT NULL COMMENT 'Nombre del modelo IA utilizado (ej: gpt-4o-mini)',
  `total_tokens_entrada` INT NOT NULL DEFAULT 0 COMMENT 'Total de tokens de entrada acumulados',
  `total_tokens_salida` INT NOT NULL DEFAULT 0 COMMENT 'Total de tokens de salida acumulados',
  `costo_total_usd` DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Costo total acumulado en USD',
  `cantidad_consultas` INT NOT NULL DEFAULT 0 COMMENT 'Número de consultas en la sesión',
  `camaras_consultadas` TEXT COMMENT 'JSON array de nombres de cámaras consultadas',
  `exitoso` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si la sesión fue completada exitosamente',
  `mensaje_error` TEXT COMMENT 'Detalle del error si exitoso = 0',
  PRIMARY KEY (`id_sesion`),
  INDEX `idx_ai_costos_sesion_id_usuario-fecha_inicio` (`id_usuario`, `fecha_inicio`) COMMENT 'Historial de sesiones por usuario',
  INDEX `idx_ai_costos_sesion_costo_total_usd` (`costo_total_usd` DESC) COMMENT 'Consultas de análisis de costos',
  INDEX `idx_ai_costos_sesion_fecha_fin` (`fecha_fin`) COMMENT 'Búsqueda de sesiones activas (NULL)',
  INDEX `idx_ai_costos_sesion_modelo_utilizado` (`modelo_utilizado`) COMMENT 'Estadísticas de uso por modelo',
  CONSTRAINT `fk_ai_costos_sesion_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Costos de sesiones de análisis con IA';

-- ============================================
-- TABLAS DE MEDICIONES ELÉCTRICAS (sem_)
-- ============================================

-- Catálogo de tipos de parámetros del módulo de mediciones eléctricas
CREATE TABLE `sem_tipos_parametros` (
  `id_tipo_parametro` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del tipo (PRECIO_KWH, INTERVALO_RECOLECCION, etc.)',
  `descripcion` TEXT NULL COMMENT 'Descripción del tipo de parámetro',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tipo_parametro`),
  UNIQUE KEY `uk_sem_tipos_parametros_nombre` (`nombre`),
  INDEX `idx_sem_tipos_parametros_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de tipos de parámetros del módulo de mediciones eléctricas';

-- Grupos de dispositivos Shelly para agrupación de consumo
CREATE TABLE `sem_grupos` (
  `id_grupo` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del grupo de dispositivos',
  `descripcion` TEXT NULL COMMENT 'Descripción del grupo',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_grupo`),
  UNIQUE KEY `uk_sem_grupos_nombre` (`nombre`),
  INDEX `idx_sem_grupos_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Grupos de dispositivos Shelly para agrupación de consumo energético';

-- Tabla de dispositivos Shelly
CREATE TABLE `sem_dispositivos` (
  `id_dispositivo_shelly` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shelly_id` VARCHAR(12) NOT NULL COMMENT 'ID único del dispositivo Shelly (identificador natural)',
  `nombre` VARCHAR(255) NOT NULL COMMENT 'Nombre del dispositivo',
  `tipo` VARCHAR(50) DEFAULT NULL COMMENT 'Tipo de dispositivo (shelly_plug, shelly_em, etc.)',
  `id_ubicacion_real` INT UNSIGNED DEFAULT NULL COMMENT 'FK a gen_ubicaciones_reales',
  `id_grupo` INT UNSIGNED NULL COMMENT 'FK a sem_grupos, grupo de dispositivos para agrupación de consumo',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Indica si el dispositivo está activo',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_dispositivo_shelly`),
  UNIQUE KEY `uk_sem_dispositivos_shelly_id` (`shelly_id`),
  INDEX `idx_sem_dispositivos_activo` (`activo`),
  INDEX `idx_sem_dispositivos_id_grupo` (`id_grupo`),
  CONSTRAINT `fk_sem_dispositivos_id_grupo_sem_grupos_id_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `sem_grupos`(`id_grupo`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sem_dispositivos_id_ubicacion_real_gen_ubicaciones_reales_id`
    FOREIGN KEY (`id_ubicacion_real`)
    REFERENCES `gen_ubicaciones_reales`(`id_ubicacion_real`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dispositivos Shelly de medición eléctrica';

-- Tabla de configuración del módulo de mediciones eléctricas
CREATE TABLE `sem_configuracion` (
  `id_configuracion` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_tipo_parametro` INT UNSIGNED NOT NULL COMMENT 'FK a sem_tipos_parametros',
  `nombre_parametro` VARCHAR(100) NOT NULL COMMENT 'Nombre específico del parámetro del módulo eléctrico',
  `valor` TEXT NOT NULL COMMENT 'Valor del parámetro de configuración',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = activo, 0 = inactivo',
  `valido_desde` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha desde la cual este valor es válido',
  `valido_hasta` DATETIME NULL DEFAULT NULL COMMENT 'Fecha hasta la cual fue válido (NULL = aún vigente)',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_configuracion`),
  INDEX `idx_sem_configuracion_id_tipo_parametro` (`id_tipo_parametro`),
  INDEX `idx_sem_configuracion_valido_desde-valido_hasta-activo` (`valido_desde`, `valido_hasta`, `activo`),
  INDEX `idx_sem_configuracion_nombre_parametro` (`nombre_parametro`),
  CONSTRAINT `fk_sem_configuracion_id_tipo_sem_tipos_parametros_id`
    FOREIGN KEY (`id_tipo_parametro`)
    REFERENCES `sem_tipos_parametros`(`id_tipo_parametro`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuración del módulo de mediciones eléctricas';

-- Totales horarios de consumo energético
CREATE TABLE `sem_totales_hora` (
  `id_totales_hora` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shelly_id` VARCHAR(12) NOT NULL,
  `hora_local` DATETIME(6) NOT NULL,
  `energia_activa_total` DECIMAL(15,3) NOT NULL,
  `energia_reactiva_total` DECIMAL(15,3) DEFAULT NULL,
  `potencia_maxima` DECIMAL(10,2) DEFAULT NULL,
  `potencia_minima` DECIMAL(10,2) DEFAULT NULL,
  `precio_kwh_periodo` DECIMAL(10,2) NOT NULL,
  `costo_total` DECIMAL(15,2) NOT NULL,
  `lecturas_validas` INT NOT NULL,
  `calidad_datos` DECIMAL(5,2) DEFAULT NULL,
  `lecturas_limite_apagado` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_bajo` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_medio` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_alto` INT NOT NULL DEFAULT 0,
  `cantidad_datos` INT NOT NULL DEFAULT 0,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_totales_hora`),
  UNIQUE KEY `uk_sem_totales_hora_shelly_id-hora_local` (`shelly_id`, `hora_local`),
  INDEX `idx_sem_totales_hora_shelly_id` (`shelly_id`),
  INDEX `idx_sem_totales_hora_hora_local` (`hora_local`),
  INDEX `idx_sem_totales_hora_calidad_datos` (`calidad_datos`),
  INDEX `idx_sem_totales_hora_shelly_id-hora_local-energia_activa_total` (`shelly_id`, `hora_local`, `energia_activa_total`),
  CONSTRAINT `fk_sem_totales_hora_shelly_id_sem_dispositivos_shelly_id`
    FOREIGN KEY (`shelly_id`)
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totales horarios de consumo energético';

-- Totales diarios de consumo energético
CREATE TABLE `sem_totales_dia` (
  `id_totales_dia` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shelly_id` VARCHAR(12) NOT NULL,
  `fecha_local` DATE NOT NULL,
  `energia_activa_total` DECIMAL(15,3) NOT NULL,
  `energia_reactiva_total` DECIMAL(15,3) DEFAULT NULL,
  `potencia_maxima` DECIMAL(10,2) DEFAULT NULL,
  `potencia_minima` DECIMAL(10,2) DEFAULT NULL,
  `precio_kwh_promedio` DECIMAL(10,2) NOT NULL,
  `costo_total` DECIMAL(15,2) NOT NULL,
  `horas_con_datos` INT NOT NULL,
  `calidad_datos` DECIMAL(5,2) DEFAULT NULL,
  `lecturas_limite_apagado` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_bajo` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_medio` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_alto` INT NOT NULL DEFAULT 0,
  `cantidad_datos` INT NOT NULL DEFAULT 0,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_totales_dia`),
  UNIQUE KEY `uk_sem_totales_dia_shelly_id-fecha_local` (`shelly_id`, `fecha_local`),
  INDEX `idx_sem_totales_dia_shelly_id` (`shelly_id`),
  INDEX `idx_sem_totales_dia_fecha_local` (`fecha_local`),
  INDEX `idx_sem_totales_dia_calidad_datos` (`calidad_datos`),
  CONSTRAINT `fk_sem_totales_dia_shelly_id_sem_dispositivos_shelly_id`
    FOREIGN KEY (`shelly_id`)
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totales diarios de consumo energético';

-- Totales mensuales de consumo energético
CREATE TABLE `sem_totales_mes` (
  `id_totales_mes` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shelly_id` VARCHAR(12) NOT NULL,
  `año` INT NOT NULL,
  `mes` INT NOT NULL,
  `energia_activa_total` DECIMAL(15,3) NOT NULL,
  `energia_reactiva_total` DECIMAL(15,3) DEFAULT NULL,
  `potencia_maxima` DECIMAL(10,2) DEFAULT NULL,
  `potencia_minima` DECIMAL(10,2) DEFAULT NULL,
  `precio_kwh_promedio` DECIMAL(10,2) NOT NULL,
  `costo_total` DECIMAL(15,2) NOT NULL,
  `dias_con_datos` INT NOT NULL,
  `horas_con_datos` INT NOT NULL,
  `calidad_datos` DECIMAL(5,2) DEFAULT NULL,
  `lecturas_limite_apagado` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_bajo` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_medio` INT NOT NULL DEFAULT 0,
  `lecturas_consumo_alto` INT NOT NULL DEFAULT 0,
  `cantidad_datos` INT NOT NULL DEFAULT 0,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_totales_mes`),
  UNIQUE KEY `uk_sem_totales_mes_shelly_id-año-mes` (`shelly_id`, `año`, `mes`),
  INDEX `idx_sem_totales_mes_shelly_id` (`shelly_id`),
  INDEX `idx_sem_totales_mes_año-mes` (`año`, `mes`),
  INDEX `idx_sem_totales_mes_calidad_datos` (`calidad_datos`),
  CONSTRAINT `fk_sem_totales_mes_shelly_id_sem_dispositivos_shelly_id`
    FOREIGN KEY (`shelly_id`)
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Totales mensuales de consumo energético';

-- Mediciones brutas de energía de dispositivos Shelly
CREATE TABLE `sem_mediciones` (
  `id_medicion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `shelly_id` VARCHAR(12) NOT NULL COMMENT 'FK a sem_dispositivos',
  `timestamp_utc` DATETIME NOT NULL COMMENT 'Timestamp original del dispositivo en UTC',
  `timestamp_local` DATETIME NOT NULL COMMENT 'Timestamp local en hora de Santiago',
  `fase` ENUM('A', 'B', 'C', 'TOTAL') NOT NULL DEFAULT 'TOTAL' COMMENT 'Fase eléctrica medida',
  `voltaje` DECIMAL(6,2) NULL COMMENT 'Voltaje en V',
  `corriente` DECIMAL(8,4) NULL COMMENT 'Corriente en A',
  `potencia_activa` DECIMAL(10,2) NULL COMMENT 'Potencia activa en W',
  `potencia_reactiva` DECIMAL(10,2) NULL COMMENT 'Potencia reactiva en VAR',
  `potencia_aparente` DECIMAL(10,2) NULL COMMENT 'Potencia aparente en VA',
  `factor_potencia` DECIMAL(5,4) NULL COMMENT 'Factor de potencia (-1 a 1)',
  `frecuencia` DECIMAL(5,2) NULL COMMENT 'Frecuencia en Hz',
  `energia_activa` DECIMAL(15,3) NULL COMMENT 'Energía activa acumulada en Wh',
  `energia_reactiva` DECIMAL(15,3) NULL COMMENT 'Energía reactiva acumulada en VARh',
  `calidad_lectura` ENUM('NORMAL', 'ESTIMADO', 'INVALIDO') NOT NULL DEFAULT 'NORMAL' COMMENT 'Calidad de la lectura recibida',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_medicion`),
  INDEX `idx_sem_mediciones_shelly_id-timestamp_local` (`shelly_id`, `timestamp_local`),
  INDEX `idx_sem_mediciones_timestamp_local` (`timestamp_local`),
  INDEX `idx_sem_mediciones_fase` (`fase`),
  INDEX `idx_sem_mediciones_calidad_lectura` (`calidad_lectura`),
  CONSTRAINT `fk_sem_mediciones_shelly_id_sem_dispositivos_shelly_id`
    FOREIGN KEY (`shelly_id`)
    REFERENCES `sem_dispositivos`(`shelly_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Mediciones brutas de energía de dispositivos Shelly';

-- Contadores de ciclos de temperatura diarios por canal Ubibot
CREATE TABLE `ubi_contador_ciclos` (
  `id_contador_ciclo` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fecha_ciclos` DATETIME NOT NULL COMMENT 'Fecha y hora de inicio del ciclo de temperatura',
  `id_canal` INT UNSIGNED NOT NULL COMMENT 'FK a ubi_canal',
  `numero_ciclos` DECIMAL(3,1) NOT NULL DEFAULT 0 COMMENT 'Número de ciclos de temperatura detectados en el día',
  `tiempo_en_positivo` INT NOT NULL DEFAULT 0 COMMENT 'Tiempo en minutos con temperatura positiva',
  `porcentaje_tiempo` DECIMAL(6,3) NOT NULL DEFAULT 0 COMMENT 'Porcentaje del tiempo con temperatura positiva',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_contador_ciclo`),
  UNIQUE KEY `uk_ubi_contador_ciclos_fecha_canal` (`fecha_ciclos`, `id_canal`),
  INDEX `idx_ubi_contador_ciclos_id_canal` (`id_canal`),
  INDEX `idx_ubi_contador_ciclos_fecha_ciclos` (`fecha_ciclos`),
  CONSTRAINT `fk_contador_ciclos_id_canal_ubi_canal_id_canal`
    FOREIGN KEY (`id_canal`)
    REFERENCES `ubi_canal`(`id_canal`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Contadores de ciclos de temperatura diarios por canal Ubibot';

-- ============================================
-- TABLAS DE ALERTAS Y NOTIFICACIONES (ale_)
-- ============================================

-- Catálogo de tipos de alerta (reemplaza ENUM en ale_seguimiento para extensibilidad sin ALTER TABLE)
CREATE TABLE `ale_tipo_alerta` (
  `id_tipo_alerta` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL COMMENT 'Identificador único del tipo de alerta',
  `descripcion` VARCHAR(255) NULL COMMENT 'Descripción del tipo de alerta',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = tipo de alerta activo y en uso',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tipo_alerta`),
  UNIQUE KEY `uk_ale_tipo_alerta_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de tipos de alerta del sistema';

-- Seguimiento de alertas del sistema (genérica — datos específicos en ale_datos_*)
CREATE TABLE `ale_seguimiento` (
  `id_alerta` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_tipo_alerta` TINYINT UNSIGNED NOT NULL COMMENT 'FK a ale_tipo_alerta',
  `id_origen_tipo` TINYINT UNSIGNED NOT NULL COMMENT 'FK a gen_tipos_origen — qué sistema generó la alerta',
  `origen_id` INT UNSIGNED NULL COMMENT 'ID del dispositivo de origen en su tabla nativa (ej: id_canal de ubi_canal)',
  `estado` ENUM('pendiente', 'confirmado', 'resuelto', 'falsa_alarma') NOT NULL DEFAULT 'pendiente',
  `severidad` ENUM('baja', 'media', 'critica') NOT NULL DEFAULT 'media',
  `datos_alerta` JSON NULL COMMENT 'Metadatos adicionales no estructurados de la alerta',
  `es_falsa_alarma` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = alerta marcada como falsa alarma',
  `atendido_por` VARCHAR(100) NULL COMMENT 'Usuario que atendió la alerta',
  `resuelto_por` VARCHAR(100) NULL COMMENT 'Usuario que resolvió la alerta',
  `observaciones` TEXT NULL COMMENT 'Notas del operador durante investigación',
  `notas_resolucion` TEXT NULL COMMENT 'Notas al cerrar la alerta',
  `info_dispositivo` JSON NULL COMMENT 'Snapshot del dispositivo al momento de la alerta',
  `notificado_push` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = notificación push enviada',
  `tiempo_respuesta_minutos` DECIMAL(10,2) NULL COMMENT 'Tiempo desde generación hasta confirmación en minutos',
  `tiempo_resolucion_minutos` DECIMAL(10,2) NULL COMMENT 'Tiempo desde generación hasta resolución en minutos',
  `fecha_alerta` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de generación de la alerta',
  `fecha_confirmacion` DATETIME NULL COMMENT 'Fecha y hora de confirmación de la alerta',
  `fecha_resolucion` DATETIME NULL COMMENT 'Fecha y hora de resolución de la alerta',
  PRIMARY KEY (`id_alerta`),
  INDEX `idx_ale_seguimiento_id_tipo_alerta` (`id_tipo_alerta`),
  INDEX `idx_ale_seguimiento_id_origen_tipo` (`id_origen_tipo`),
  INDEX `idx_ale_seguimiento_origen_id` (`origen_id`),
  INDEX `idx_ale_seguimiento_estado` (`estado`),
  INDEX `idx_ale_seguimiento_severidad` (`severidad`),
  INDEX `idx_ale_seguimiento_fecha_alerta` (`fecha_alerta`),
  INDEX `idx_ale_seguimiento_estado-fecha_alerta` (`estado`, `fecha_alerta`),
  CONSTRAINT `fk_ale_seguimiento_id_tipo_alerta_ale_tipo_alerta_id_tipo_alerta`
    FOREIGN KEY (`id_tipo_alerta`)
    REFERENCES `ale_tipo_alerta`(`id_tipo_alerta`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ale_seguimiento_id_origen_tipo_gen_tipos_origen_id_tipo_origen`
    FOREIGN KEY (`id_origen_tipo`)
    REFERENCES `gen_tipos_origen`(`id_tipo_origen`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Seguimiento genérico de alertas del sistema — datos específicos en ale_datos_*';

-- Datos específicos de alertas de temperatura (relación 1:1 con ale_seguimiento)
CREATE TABLE `ale_datos_temperatura` (
  `id_ale_datos_temperatura` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_alerta` INT UNSIGNED NOT NULL COMMENT 'FK a ale_seguimiento',
  `id_canal` INT UNSIGNED NULL COMMENT 'FK a ubi_canal (NULL si el canal fue eliminado)',
  `valor_temperatura` DECIMAL(5,2) NOT NULL COMMENT 'Temperatura media cuando se disparó la alerta',
  `umbral_minimo` DECIMAL(5,2) NOT NULL COMMENT 'Umbral mínimo configurado al momento de la alerta',
  `umbral_maximo` DECIMAL(5,2) NOT NULL COMMENT 'Umbral máximo configurado al momento de la alerta',
  PRIMARY KEY (`id_ale_datos_temperatura`),
  UNIQUE KEY `uk_ale_datos_temperatura_id_alerta` (`id_alerta`),
  INDEX `idx_ale_datos_temperatura_id_canal` (`id_canal`),
  INDEX `idx_ale_datos_temperatura_valor_temperatura` (`valor_temperatura`),
  CONSTRAINT `fk_ale_datos_temperatura_id_alerta_ale_seguimiento_id_alerta`
    FOREIGN KEY (`id_alerta`)
    REFERENCES `ale_seguimiento`(`id_alerta`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ale_datos_temperatura_id_canal_ubi_canal_id_canal`
    FOREIGN KEY (`id_canal`)
    REFERENCES `ubi_canal`(`id_canal`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Datos específicos de alertas de temperatura — extiende ale_seguimiento';

-- Datos específicos de alertas de desconexión de sensores (relación 1:1 con ale_seguimiento)
CREATE TABLE `ale_datos_desconexion` (
  `id_ale_datos_desconexion` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_alerta` INT UNSIGNED NOT NULL COMMENT 'FK a ale_seguimiento',
  `id_canal` INT UNSIGNED NULL COMMENT 'FK a ubi_canal (NULL si el canal fue eliminado)',
  `ultima_lectura_antes` DATETIME NOT NULL COMMENT 'Timestamp de la última lectura recibida antes de la desconexión',
  `primera_lectura_tras_reconexion` DATETIME NULL COMMENT 'Timestamp de la primera lectura tras reconexión (NULL si sigue desconectado)',
  `duracion_desconexion_minutos` DECIMAL(10,2) NULL COMMENT 'Minutos de desconexión materializado — NULL mientras sigue desconectado',
  `umbral_minutos_configurado` INT UNSIGNED NOT NULL COMMENT 'Threshold en minutos que disparó la alerta, tomado de alertSystem.intervals.disconnection.initialDelay al momento de crear la alerta',
  `lecturas_perdidas_estimadas` INT UNSIGNED NULL COMMENT 'Lecturas que deberían haber llegado durante el período de desconexión',
  `ultimo_valor_temperatura` DECIMAL(5,2) NULL COMMENT 'Última temperatura registrada antes de la desconexión (contexto)',
  PRIMARY KEY (`id_ale_datos_desconexion`),
  UNIQUE KEY `uk_ale_datos_desconexion_id_alerta` (`id_alerta`),
  INDEX `idx_ale_datos_desconexion_id_canal` (`id_canal`),
  INDEX `idx_ale_datos_desconexion_ultima_lectura_antes` (`ultima_lectura_antes`),
  CONSTRAINT `fk_ale_datos_desconexion_id_alerta_ale_seguimiento_id_alerta`
    FOREIGN KEY (`id_alerta`)
    REFERENCES `ale_seguimiento`(`id_alerta`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ale_datos_desconexion_id_canal_ubi_canal_id_canal`
    FOREIGN KEY (`id_canal`)
    REFERENCES `ubi_canal`(`id_canal`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Datos específicos de alertas de desconexión de sensores — extiende ale_seguimiento';

-- Suscripciones unificadas de usuarios a alertas por canal (email o push)
CREATE TABLE `ale_suscripciones_notificacion` (
  `id_suscripcion_notificacion` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` INT UNSIGNED NOT NULL COMMENT 'FK a gen_usuario',
  `id_tipo_alerta` TINYINT UNSIGNED NOT NULL COMMENT 'FK a ale_tipo_alerta',
  `id_origen_tipo` TINYINT UNSIGNED NOT NULL COMMENT 'FK a gen_tipos_origen',
  `canal` ENUM('email','push') NOT NULL COMMENT 'Canal de envío',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = suscripción activa',
  `ultima_notificacion_enviada` DATETIME NULL COMMENT 'Último envío por este canal para esta combinación usuario/tipo/origen',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_suscripcion_notificacion`),
  UNIQUE KEY `uk_ale_suscripciones_notificacion_regla` (`id_usuario`, `id_tipo_alerta`, `id_origen_tipo`, `canal`),
  CONSTRAINT `fk_ale_suscripciones_notificacion_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ale_suscripciones_notificacion_id_tipo_alerta_ale_tipo_alerta_id_tipo_alerta`
    FOREIGN KEY (`id_tipo_alerta`)
    REFERENCES `ale_tipo_alerta`(`id_tipo_alerta`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ale_suscripciones_notificacion_id_origen_tipo_gen_tipos_origen_id_tipo_origen`
    FOREIGN KEY (`id_origen_tipo`)
    REFERENCES `gen_tipos_origen`(`id_tipo_origen`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Suscripciones unificadas de usuarios a alertas por tipo, origen y canal (email/push)';

-- Horarios base de envío por tipo de alerta y canal (definidos por administradores)
CREATE TABLE `ale_horarios_alerta_canal` (
  `id_horario_alerta_canal` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_tipo_alerta` TINYINT UNSIGNED NOT NULL COMMENT 'FK a ale_tipo_alerta',
  `canal` ENUM('email','push') NOT NULL COMMENT 'Canal de envío',
  `dia_semana` TINYINT(1) NOT NULL COMMENT '1=Lun..7=Dom; 0=día feriado',
  `hora_inicio` TIME NOT NULL COMMENT 'Inicio ventana de envío',
  `hora_fin` TIME NOT NULL COMMENT 'Fin ventana de envío',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = fila activa',
  `respeta_horario_operacional` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = intersección con gen_horario_operacional; 0 = solo esta ventana',
  `respeta_feriados` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = no enviar en feriados; 0 = sí enviar en feriados',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_horario_alerta_canal`),
  UNIQUE KEY `uk_ale_horarios_alerta_canal_tipo_canal_dia` (`id_tipo_alerta`, `canal`, `dia_semana`),
  CONSTRAINT `fk_ale_horarios_alerta_canal_id_tipo_alerta_ale_tipo_alerta_id_tipo_alerta`
    FOREIGN KEY (`id_tipo_alerta`)
    REFERENCES `ale_tipo_alerta`(`id_tipo_alerta`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Horarios base de envío por tipo de alerta y canal (admin); dia_semana=0 para feriados';

-- Horarios personalizados por usuario (sobrescriben base si existen)
CREATE TABLE `ale_horarios_usuario` (
  `id_horario_usuario` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` INT UNSIGNED NOT NULL COMMENT 'FK a gen_usuario',
  `id_tipo_alerta` TINYINT UNSIGNED NOT NULL COMMENT 'FK a ale_tipo_alerta',
  `canal` ENUM('email','push') NOT NULL COMMENT 'Canal de envío',
  `dia_semana` TINYINT(1) NOT NULL COMMENT '0=feriado, 1=Lun..7=Dom',
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NOT NULL,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `respeta_horario_operacional` TINYINT(1) NOT NULL DEFAULT 1,
  `respeta_feriados` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_horario_usuario`),
  UNIQUE KEY `uk_ale_horarios_usuario_usuario_tipo_canal_dia` (`id_usuario`, `id_tipo_alerta`, `canal`, `dia_semana`),
  CONSTRAINT `fk_ale_horarios_usuario_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ale_horarios_usuario_id_tipo_alerta_ale_tipo_alerta_id_tipo_alerta`
    FOREIGN KEY (`id_tipo_alerta`)
    REFERENCES `ale_tipo_alerta`(`id_tipo_alerta`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Horarios personalizados por usuario/tipo/canal/día; si no hay filas se usa base';

-- Métricas resumen de alertas por día y hora
CREATE TABLE `ale_metricas_resumen` (
  `id_metrica` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL COMMENT 'Fecha del resumen de métricas',
  `hora` TINYINT NULL COMMENT 'Hora del resumen (NULL = resumen diario completo)',
  `total_alertas_temperatura` INT NOT NULL DEFAULT 0,
  `total_alertas_desconexion` INT NOT NULL DEFAULT 0,
  `promedio_tiempo_respuesta` DECIMAL(10,2) NULL COMMENT 'Tiempo promedio de respuesta en minutos',
  `promedio_tiempo_resolucion` DECIMAL(10,2) NULL COMMENT 'Tiempo promedio de resolución en minutos',
  `minimo_tiempo_respuesta` DECIMAL(10,2) NULL,
  `maximo_tiempo_respuesta` DECIMAL(10,2) NULL,
  `alertas_pendientes` INT NOT NULL DEFAULT 0,
  `alertas_confirmadas` INT NOT NULL DEFAULT 0,
  `alertas_resueltas` INT NOT NULL DEFAULT 0,
  `alertas_falsa_alarma` INT NOT NULL DEFAULT 0,
  `push_enviados` INT NOT NULL DEFAULT 0,
  `push_fallidos` INT NOT NULL DEFAULT 0,
  `tasa_entrega_push` DECIMAL(5,2) NULL COMMENT 'Porcentaje de notificaciones push entregadas',
  `total_alertas_criticas` INT NOT NULL DEFAULT 0,
  `promedio_tiempo_respuesta_critica` DECIMAL(10,2) NULL COMMENT 'Tiempo promedio de respuesta para alertas críticas',
  `canales_alertados_unicos` INT NOT NULL DEFAULT 0 COMMENT 'Número de canales distintos con alertas en el período',
  `id_canal_top` INT UNSIGNED NULL COMMENT 'Canal con más alertas en el período',
  `alertas_canal_top` INT NULL COMMENT 'Cantidad de alertas del canal con más alertas',
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_metrica`),
  UNIQUE KEY `uk_ale_metricas_resumen_fecha-hora` (`fecha`, `hora`),
  INDEX `idx_ale_metricas_resumen_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Métricas resumen de alertas por día y hora';

-- Suscripciones push de usuarios para notificaciones
CREATE TABLE `ale_push_suscripciones` (
  `id_suscripcion` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` INT UNSIGNED NOT NULL COMMENT 'FK a gen_usuario',
  `endpoint` VARCHAR(500) NOT NULL COMMENT 'URL del endpoint push (debe iniciar con https://)',
  `p256dh` VARCHAR(255) NOT NULL COMMENT 'Clave pública de encriptación para push',
  `auth` VARCHAR(255) NOT NULL COMMENT 'Secret de autenticación para push',
  `tipo_dispositivo` ENUM('escritorio', 'movil', 'tablet', 'desconocido') NOT NULL DEFAULT 'desconocido',
  `activo` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = suscripción activa',
  `ultima_conexion` DATETIME NULL COMMENT 'Última vez que el dispositivo se conectó',
  `ultima_notificacion_enviada` DATETIME NULL COMMENT 'Última notificación enviada a esta suscripción',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_suscripcion`),
  UNIQUE KEY `uk_ale_push_suscripciones_endpoint` (`endpoint`(191)),
  INDEX `idx_ale_push_suscripciones_id_usuario` (`id_usuario`),
  INDEX `idx_ale_push_suscripciones_activo` (`activo`),
  INDEX `idx_ale_push_suscripciones_ultima_conexion` (`ultima_conexion`),
  CONSTRAINT `fk_ale_push_suscripciones_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `chk_ale_push_suscripciones_endpoint`
    CHECK (`endpoint` LIKE 'https://%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Suscripciones push de usuarios para notificaciones';

-- Preferencias de notificaciones push por suscripción de usuario
CREATE TABLE `ale_preferencias_push` (
  `id_preferencia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_suscripcion` INT UNSIGNED NOT NULL COMMENT 'FK a ale_push_suscripciones',
  `dnd_habilitado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = modo No Molestar habilitado',
  `hora_inicio_dnd` TIME NULL COMMENT 'Hora de inicio del modo No Molestar',
  `hora_fin_dnd` TIME NULL COMMENT 'Hora de fin del modo No Molestar',
  `dias_dnd` JSON NULL COMMENT 'Días de la semana para DND (JSON array con nombres en inglés)',
  `permitir_alertas_criticas` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = permitir alertas críticas incluso en DND',
  `tipos_alerta_habilitados` JSON NULL COMMENT 'JSON array de tipos de alerta habilitados (NULL = todos)',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_preferencia`),
  UNIQUE KEY `uk_ale_preferencias_push_id_suscripcion` (`id_suscripcion`),
  CONSTRAINT `fk_preferencias_push_id_suscripcion_push_suscripciones_id`
    FOREIGN KEY (`id_suscripcion`)
    REFERENCES `ale_push_suscripciones`(`id_suscripcion`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Preferencias de notificaciones push por suscripción de usuario';
