CREATE DATABASE tns_cool_track
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cool_track;

-- Tablas generales
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
  INDEX idx_gen_usuario_activo (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--Tabla para recuperar contraseñas
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
  CONSTRAINT `fk_gen_usuario_id_usuario_gen_password_reset_id_usuario` 
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
  CONSTRAINT `fk_gen_usuario_id_usuario_gen_usuario_permisos_id_usuario` 
    FOREIGN KEY (`id_usuario`) 
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_gen_permiso_id_permiso_gen_usuario_permisos_id_permiso` 
    FOREIGN KEY (`id_permiso`) 
    REFERENCES `gen_permiso`(`id_permiso`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- teltonika.feriados_cl definition

CREATE TABLE `gen_feriados_cl` (
  `id_feriado` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL COMMENT 'Fecha del feriado en formato YYYY-MM-DD',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción o nombre del feriado',
  PRIMARY KEY (`id_feriado`),
  UNIQUE KEY `uk_fecha` (`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de feriados legales en Chile';

CREATE TABLE `rep_report_type` (
  `id_report_type` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del tipo de reporte',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción del tipo de reporte',
  PRIMARY KEY (`id_report_type`),
  UNIQUE KEY `uk_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de tipos de reportes';

CREATE TABLE `rep_templates` (
  `id_template` int NOT NULL AUTO_INCREMENT,
  `template_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE COMMENT 'Clave única del template',
  `id_report_type` int NOT NULL COMMENT 'FK a rep_report_type.id_report_type',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del template',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción del template',
  `activo` tinyint DEFAULT '1' COMMENT 'Indica si el template está activo',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del template',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del template',
  PRIMARY KEY (`id_template`),
  UNIQUE KEY `uk_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de templates de reportes';

CREATE TABLE `rep_generated_reports` (
  `id_generated_report` int NOT NULL AUTO_INCREMENT,
  `id_template` int NOT NULL COMMENT 'FK a rep_templates.id_template',
  `nombre_reporte` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del reporte generado',
  'file_path' varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ruta del archivo del reporte generado',
  'file_size_bytes' INT NOT NULL COMMENT 'Tamaño del archivo del reporte generado',
  `generation_status` enum('pending','generating','completed','failed','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `fuente`ENUM('manual','scheduled','api','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `downloaded_at` timestamp NULL DEFAULT NULL,
  `expired_at` timestamp NULL DEFAULT NULL COMMENT 'Auto-set when TTL cleanup deletes file',
  `schedule_id` int NULL COMMENT 'FK a rep_scheduled_reports.id_scheduled_report',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del reporte generado',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del reporte generado',
  PRIMARY KEY (`id_generated_report`),
  UNIQUE KEY `uk_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de reportes generados';

CREATE TABLE `rep_scheduled_reports` (
  `id_scheduled_report` int NOT NULL AUTO_INCREMENT,
  `id_template` int NOT NULL COMMENT 'FK a rep_templates.id_template',
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del reporte programado',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descripción del reporte programado',
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del reporte programado',
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de actualización del reporte programado',
  PRIMARY KEY (`id_scheduled_report`),
  UNIQUE KEY `uk_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de reportes programados';