-- ============================================
-- TABLAS DE LOG (log_)
-- Se crean DESPUÉS de 01_tablas_base.sql
-- pues algunas tienen FKs a tablas de dominio
-- ============================================

-- ============================================
-- LOG DE INFRAESTRUCTURA (general, sin FKs)
-- ============================================

CREATE TABLE `log_general` (
  `id_log_general` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `origen` VARCHAR(100) NOT NULL COMMENT 'Trigger/SP/evento que generó el log',
  `mensaje` TEXT NOT NULL COMMENT 'Mensaje descriptivo del proceso o evento',
  `datos` JSON NULL COMMENT 'Datos adicionales estructurados del proceso',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_general`),
  INDEX `idx_log_general_origen` (`origen`),
  INDEX `idx_log_general_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log general de procesos y operaciones internas del sistema';

CREATE TABLE `log_triggers` (
  `id_log_triggers` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `trigger_nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del trigger que generó el log',
  `tabla_afectada` VARCHAR(100) NOT NULL COMMENT 'Tabla sobre la que actuó el trigger',
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` BIGINT UNSIGNED NULL COMMENT 'PK del registro afectado (NULL si no aplica)',
  `datos_anteriores` JSON NULL COMMENT 'Estado OLD del registro (UPDATE/DELETE)',
  `datos_nuevos` JSON NULL COMMENT 'Estado NEW del registro (INSERT/UPDATE)',
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM' COMMENT 'Usuario o proceso que realizó el cambio',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_triggers`),
  INDEX `idx_log_triggers_trigger_nombre` (`trigger_nombre`),
  INDEX `idx_log_triggers_tabla_afectada` (`tabla_afectada`),
  INDEX `idx_log_triggers_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_triggers_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de ejecuciones de triggers sobre tablas base';

CREATE TABLE `log_eventos` (
  `id_log_eventos` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `evento_nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del evento que generó el log',
  `resultado` ENUM('EXITOSO','SIN_CAMBIOS','ERROR') NOT NULL DEFAULT 'EXITOSO',
  `mensaje` TEXT NULL COMMENT 'Mensaje descriptivo de la ejecución',
  `datos` JSON NULL COMMENT 'Datos adicionales de la ejecución del evento',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_eventos`),
  INDEX `idx_log_eventos_evento_nombre` (`evento_nombre`),
  INDEX `idx_log_eventos_resultado` (`resultado`),
  INDEX `idx_log_eventos_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de ejecuciones de eventos programados del scheduler';

CREATE TABLE `log_stored_procedures` (
  `id_log_stored_procedures` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sp_nombre` VARCHAR(100) NOT NULL COMMENT 'Nombre del SP o función que generó el log',
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE','SELECT','CALL') NOT NULL DEFAULT 'CALL',
  `tabla_afectada` VARCHAR(100) NULL COMMENT 'Tabla principal afectada por el SP',
  `id_registro` BIGINT UNSIGNED NULL COMMENT 'PK del registro afectado (si aplica)',
  `datos_anteriores` JSON NULL COMMENT 'Estado anterior del registro',
  `datos_nuevos` JSON NULL COMMENT 'Estado nuevo del registro',
  `mensaje` TEXT NULL COMMENT 'Mensaje descriptivo del resultado',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_stored_procedures`),
  INDEX `idx_log_stored_procedures_sp_nombre` (`sp_nombre`),
  INDEX `idx_log_stored_procedures_tabla_afectada` (`tabla_afectada`),
  INDEX `idx_log_stored_procedures_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de ejecuciones de stored procedures y funciones del sistema';

CREATE TABLE `log_errores` (
  `id_log_errores` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `origen` VARCHAR(100) NOT NULL COMMENT 'Trigger/SP/evento donde ocurrió el error',
  `tipo_origen` ENUM('TRIGGER','STORED_PROCEDURE','EVENTO','FUNCION','APLICACION') NOT NULL,
  `codigo_error` VARCHAR(20) NULL COMMENT 'Código SQLSTATE o código de error personalizado',
  `mensaje_error` TEXT NOT NULL COMMENT 'Descripción detallada del error',
  `datos_contexto` JSON NULL COMMENT 'Datos del contexto en que ocurrió el error',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_errores`),
  INDEX `idx_log_errores_origen` (`origen`),
  INDEX `idx_log_errores_tipo_origen` (`tipo_origen`),
  INDEX `idx_log_errores_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log centralizado de errores del sistema';

-- ============================================
-- LOG OPERACIONALES CON FK
-- (registros vinculados a entidades del dominio)
-- ============================================

-- Log de ejecución de reportes programados
-- FK: depende de rep_reportes_programados y rep_reportes_generados
CREATE TABLE `log_rep_ejecucion` (
  `id_log_rep_ejecucion` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_reporte_programado` INT UNSIGNED NOT NULL COMMENT 'FK a rep_reportes_programados',
  `id_reporte_generado` INT UNSIGNED NULL COMMENT 'FK a rep_reportes_generados',
  `fecha_ejecucion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de ejecución del reporte',
  `estado_ejecucion` ENUM('exitoso','fallido','omitido') NOT NULL COMMENT 'Estado de la ejecución',
  `duracion_segundos` INT NOT NULL COMMENT 'Duración de la ejecución en segundos',
  `error_ejecucion` TEXT COMMENT 'Detalle del error si la ejecución falló',
  PRIMARY KEY (`id_log_rep_ejecucion`),
  INDEX `idx_log_rep_ejecucion_id_reporte_programado` (`id_reporte_programado`),
  INDEX `idx_log_rep_ejecucion_id_reporte_generado` (`id_reporte_generado`),
  INDEX `idx_log_rep_ejecucion_estado_ejecucion` (`estado_ejecucion`),
  INDEX `idx_log_rep_ejecucion_fecha_ejecucion` (`fecha_ejecucion`),
  CONSTRAINT `fk_log_rep_ejecucion_id_programado_rep_programados_id`
    FOREIGN KEY (`id_reporte_programado`)
    REFERENCES `rep_reportes_programados`(`id_reporte_programado`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_log_rep_ejecucion_id_generado_rep_generados_id`
    FOREIGN KEY (`id_reporte_generado`)
    REFERENCES `rep_reportes_generados`(`id_reporte_generado`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de ejecución de reportes programados';

-- Log de consultas a IA para auditoría y observabilidad
-- FK: depende de ai_costos_sesion y gen_usuario
CREATE TABLE `log_ai_consultas` (
  `id_log_ai_consultas` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Identificador único del log de consulta',
  `id_sesion` BIGINT UNSIGNED NOT NULL COMMENT 'FK a ai_costos_sesion',
  `id_usuario` INT UNSIGNED NOT NULL COMMENT 'FK a gen_usuario',
  `texto_consulta` TEXT NOT NULL COMMENT 'Pregunta en lenguaje natural del usuario',
  `camaras` TEXT COMMENT 'JSON array de IDs de canales consultados',
  `fecha_rango_inicio` DATE DEFAULT NULL COMMENT 'Fecha de inicio del filtro de rango',
  `fecha_rango_fin` DATE DEFAULT NULL COMMENT 'Fecha de fin del filtro de rango',
  `resumen_respuesta` TEXT COMMENT 'Primeros 500 caracteres de la respuesta de la IA',
  `tokens_entrada` INT NOT NULL DEFAULT 0 COMMENT 'Tokens de entrada para esta consulta',
  `tokens_salida` INT NOT NULL DEFAULT 0 COMMENT 'Tokens de salida para esta consulta',
  `costo_usd` DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Costo de esta consulta en USD',
  `tiempo_ejecucion_ms` INT DEFAULT NULL COMMENT 'Tiempo total de ejecución incluyendo fetch de datos + IA',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de ejecución de la consulta',
  PRIMARY KEY (`id_log_ai_consultas`),
  INDEX `idx_log_ai_consultas_id_sesion` (`id_sesion`),
  INDEX `idx_log_ai_consultas_id_usuario` (`id_usuario`),
  INDEX `idx_log_ai_consultas_fecha_creacion` (`fecha_creacion` DESC),
  INDEX `idx_log_ai_consultas_tiempo_ejecucion_ms` (`tiempo_ejecucion_ms`),
  FULLTEXT KEY `ft_log_ai_consultas_texto_consulta` (`texto_consulta`),
  CONSTRAINT `fk_log_ai_consultas_id_sesion_ai_costos_sesion_id_sesion`
    FOREIGN KEY (`id_sesion`)
    REFERENCES `ai_costos_sesion`(`id_sesion`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_log_ai_consultas_id_usuario_gen_usuario_id_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `gen_usuario`(`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de consultas a IA para auditoría y observabilidad';

-- ============================================
-- LOG DE DATOS BASE (log_[tabla])
-- Registran INSERT/UPDATE/DELETE en tablas con datos seed.
-- NOTA: id_registro NO tiene FK intencionalmente — las tablas
-- de auditoría deben sobrevivir a la eliminación del registro
-- padre (el DELETE log sería inválido con FK RESTRICT).
-- La referencia queda preservada en datos_anteriores/datos_nuevos.
-- ============================================

CREATE TABLE `log_ubi_presets_temperatura` (
  `id_log_ubi_presets_temperatura` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_preset del registro afectado en ubi_presets_temperatura',
  `datos_anteriores` JSON NULL COMMENT 'Valores antes del cambio (NULL en INSERT)',
  `datos_nuevos` JSON NULL COMMENT 'Valores después del cambio (NULL en DELETE)',
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM' COMMENT 'Usuario o proceso que realizó el cambio',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_ubi_presets_temperatura`),
  INDEX `idx_log_ubi_presets_temperatura_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_ubi_presets_temperatura_id_registro` (`id_registro`),
  INDEX `idx_log_ubi_presets_temperatura_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en ubi_presets_temperatura';

CREATE TABLE `log_gen_usuario` (
  `id_log_gen_usuario` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_usuario del registro afectado en gen_usuario',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_usuario`),
  INDEX `idx_log_gen_usuario_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_usuario_id_registro` (`id_registro`),
  INDEX `idx_log_gen_usuario_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_usuario';

CREATE TABLE `log_gen_permiso` (
  `id_log_gen_permiso` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_permiso del registro afectado en gen_permiso',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_permiso`),
  INDEX `idx_log_gen_permiso_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_permiso_id_registro` (`id_registro`),
  INDEX `idx_log_gen_permiso_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_permiso';

-- gen_usuario_permisos tiene PK compuesta (id_usuario, id_permiso),
-- por lo que id_registro = NULL siempre; el par afectado queda en datos_anteriores/datos_nuevos
CREATE TABLE `log_gen_usuario_permisos` (
  `id_log_gen_usuario_permisos` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'NULL siempre: PK compuesta, referencia en JSON',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_usuario_permisos`),
  INDEX `idx_log_gen_usuario_permisos_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_usuario_permisos_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_usuario_permisos (PK compuesta: referencia en JSON)';

CREATE TABLE `log_gen_feriados_cl` (
  `id_log_gen_feriados_cl` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_feriado del registro afectado en gen_feriados_cl',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_feriados_cl`),
  INDEX `idx_log_gen_feriados_cl_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_feriados_cl_id_registro` (`id_registro`),
  INDEX `idx_log_gen_feriados_cl_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_feriados_cl';

CREATE TABLE `log_gen_ubicaciones_reales` (
  `id_log_gen_ubicaciones_reales` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_ubicacion_real del registro afectado en gen_ubicaciones_reales',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_ubicaciones_reales`),
  INDEX `idx_log_gen_ubicaciones_reales_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_ubicaciones_reales_id_registro` (`id_registro`),
  INDEX `idx_log_gen_ubicaciones_reales_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_ubicaciones_reales';

CREATE TABLE `log_gen_tipos_parametros` (
  `id_log_gen_tipos_parametros` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_tipo_parametro del registro afectado en gen_tipos_parametros',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_tipos_parametros`),
  INDEX `idx_log_gen_tipos_parametros_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_tipos_parametros_id_registro` (`id_registro`),
  INDEX `idx_log_gen_tipos_parametros_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_tipos_parametros';

CREATE TABLE `log_gen_cofiguracion_grupos` (
  `id_log_gen_cofiguracion_grupos` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_cofiguracion_grupos del registro afectado en gen_cofiguracion_grupos',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_cofiguracion_grupos`),
  INDEX `idx_log_gen_cofiguracion_grupos_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_cofiguracion_grupos_id_registro` (`id_registro`),
  INDEX `idx_log_gen_cofiguracion_grupos_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_cofiguracion_grupos';

CREATE TABLE `log_gen_cofiguracion_parametros` (
  `id_log_gen_cofiguracion_parametros` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_cofiguracion_parametros del registro afectado',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_cofiguracion_parametros`),
  INDEX `idx_log_gen_cofiguracion_parametros_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_cofiguracion_parametros_id_registro` (`id_registro`),
  INDEX `idx_log_gen_cofiguracion_parametros_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_cofiguracion_parametros';

CREATE TABLE `log_gen_cofiguracion_valores` (
  `id_log_gen_cofiguracion_valores` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_cofiguracion_valores del registro afectado',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_gen_cofiguracion_valores`),
  INDEX `idx_log_gen_cofiguracion_valores_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_gen_cofiguracion_valores_id_registro` (`id_registro`),
  INDEX `idx_log_gen_cofiguracion_valores_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en gen_cofiguracion_valores';

CREATE TABLE `log_rep_tipo_reporte` (
  `id_log_rep_tipo_reporte` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_tipo_reporte del registro afectado en rep_tipo_reporte',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_rep_tipo_reporte`),
  INDEX `idx_log_rep_tipo_reporte_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_rep_tipo_reporte_id_registro` (`id_registro`),
  INDEX `idx_log_rep_tipo_reporte_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en rep_tipo_reporte';

CREATE TABLE `log_rep_plantillas` (
  `id_log_rep_plantillas` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_plantilla del registro afectado en rep_plantillas',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_rep_plantillas`),
  INDEX `idx_log_rep_plantillas_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_rep_plantillas_id_registro` (`id_registro`),
  INDEX `idx_log_rep_plantillas_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en rep_plantillas';

CREATE TABLE `log_sem_grupos` (
  `id_log_sem_grupos` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_grupo del registro afectado en sem_grupos',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_sem_grupos`),
  INDEX `idx_log_sem_grupos_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_sem_grupos_id_registro` (`id_registro`),
  INDEX `idx_log_sem_grupos_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en sem_grupos';

CREATE TABLE `log_sem_tipos_parametros` (
  `id_log_sem_tipos_parametros` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_tipo_parametro del registro afectado en sem_tipos_parametros',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_sem_tipos_parametros`),
  INDEX `idx_log_sem_tipos_parametros_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_sem_tipos_parametros_id_registro` (`id_registro`),
  INDEX `idx_log_sem_tipos_parametros_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en sem_tipos_parametros';

CREATE TABLE `log_sem_configuracion` (
  `id_log_sem_configuracion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_configuracion del registro afectado en sem_configuracion',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_sem_configuracion`),
  INDEX `idx_log_sem_configuracion_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_sem_configuracion_id_registro` (`id_registro`),
  INDEX `idx_log_sem_configuracion_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en sem_configuracion';

CREATE TABLE `log_sem_dispositivos` (
  `id_log_sem_dispositivos` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_dispositivo_shelly del registro afectado en sem_dispositivos',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_sem_dispositivos`),
  INDEX `idx_log_sem_dispositivos_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_sem_dispositivos_id_registro` (`id_registro`),
  INDEX `idx_log_sem_dispositivos_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en sem_dispositivos';

CREATE TABLE `log_ubi_canal` (
  `id_log_ubi_canal` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo_operacion` ENUM('INSERT','UPDATE','DELETE') NOT NULL,
  `id_registro` INT UNSIGNED NULL COMMENT 'id_canal del registro afectado en ubi_canal',
  `datos_anteriores` JSON NULL,
  `datos_nuevos` JSON NULL,
  `cambiado_por` VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  `fecha_creacion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_log_ubi_canal`),
  INDEX `idx_log_ubi_canal_tipo_operacion` (`tipo_operacion`),
  INDEX `idx_log_ubi_canal_id_registro` (`id_registro`),
  INDEX `idx_log_ubi_canal_fecha_creacion` (`fecha_creacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log de cambios en ubi_canal';
