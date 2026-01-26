# Base de Datos - TNS Track

## 🗄️ Información General

- **Nombre**: `tns_cool_track`
- **Charset**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **DBMS**: MySQL 8.0+
- **Driver Node.js**: mysql2 (versión ^3.15.2)
- **Zona Horaria**: America/Santiago (Chile)

### Script de Creación
```sql
CREATE DATABASE tns_cool_track
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tns_cool_track;
```

**Ubicación**: `/SQL_FILES/01_creacion_desde_cero/01_tablas_base.sql`

---

## 📋 Convenciones de Nomenclatura

### Tablas
- **Formato**: snake_case
- **Ejemplos**: `alert_tracking`, `device_names`, `scheduled_reports`
- **Pluralización**: Depende del contexto semántico
  - Uso de plural para colecciones: `usuarios`, `devices`
  - Uso de singular para entidades: `alert_tracking` (tracking de alerta)
- **Sin prefijos**: No se utiliza prefijo estándar como `tns_`

### Columnas
- **Formato**: snake_case
- **IDs**:
  - Primary Key: `id` (AUTO_INCREMENT, UNSIGNED)
  - Foreign Keys: `{tabla}_id` (ej: `user_id`, `device_id`, `channel_id`)
- **Timestamps**:
  - `created_at` DATETIME (fecha de creación)
  - `updated_at` DATETIME (fecha de última actualización)
  - `deleted_at` DATETIME (soft delete, si aplica)
- **Booleans**:
  - Prefijo `is_` (ej: `is_active`, `is_enabled`)
  - Prefijo `has_` (ej: `has_notifications`, `has_alerts`)
  - Tipo: TINYINT(1) o BOOLEAN
- **Fechas**: DATETIME (manejo de zona horaria en aplicación)
- **Textos**:
  - VARCHAR(N) para textos cortos
  - TEXT para textos largos
  - JSON para estructuras complejas

### Índices
- **Primary Key**: `PRIMARY KEY (id)`
- **Índices Únicos**:
  - Naming: `UNIQUE KEY idx_unique_{columna}` o `UNIQUE KEY uk_{tabla}_{columna}`
  - Ejemplo: `UNIQUE KEY idx_unique_email (email)`
- **Índices Simples**:
  - Naming: `KEY idx_{tabla}_{columna}` o `KEY idx_{columna}`
  - Ejemplo: `KEY idx_created_at (created_at)`
- **Índices Compuestos**:
  - Naming: `KEY idx_{tabla}_{col1}_{col2}`
  - Ejemplo: `KEY idx_alert_tracking_user_date (user_id, created_at)`
- **Foreign Keys**:
  - Naming: `CONSTRAINT fk_{tabla_origen}_{tabla_destino}`
  - Ejemplo: `CONSTRAINT fk_alert_tracking_usuarios FOREIGN KEY (user_id) REFERENCES usuarios(id)`

### Valores NULL
- **Regla General**: Preferir `NOT NULL` con valores por defecto
- **Excepciones**:
  - Timestamps opcionales (`updated_at`, `deleted_at`)
  - Referencias opcionales (Foreign Keys que pueden ser nulos)
  - Campos calculados o derivados

> **Nota**: Las convenciones de nomenclatura serán formalizadas y estandarizadas en Issues #1 (Creación de BD) y #3 (Tabla de configuración).

---

## 📊 Estructura de Tablas Identificadas

⚠️ **NOTA IMPORTANTE**: Esta estructura está basada en análisis del código fuente. Se requiere verificación contra la base de datos real para completar detalles exactos de columnas, tipos de datos, constraints y relaciones.

### 1. Tablas de Usuarios y Autenticación

#### `usuarios`
**Propósito**: Almacenar información de usuarios del sistema

**Columnas identificadas** (basado en código):
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `email` - VARCHAR(255) UNIQUE NOT NULL
- `password` - VARCHAR(255) NOT NULL (hash Argon2/Bcrypt)
- `nombre` - VARCHAR(255)
- `rol` - VARCHAR(50) (ej: 'admin', 'user')
- `is_active` - TINYINT(1) DEFAULT 1
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Controlador**: `usuariosController.js`
**Rutas**: `/api/usuarios`, `/api/auth`

---

#### `reset_tokens`
**Propósito**: Tokens para recuperación de contraseña

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `user_id` - INT UNSIGNED (FK a usuarios)
- `token` - VARCHAR(255) UNIQUE NOT NULL
- `expires_at` - DATETIME NOT NULL
- `used` - TINYINT(1) DEFAULT 0
- `created_at` - DATETIME

**Servicio**: `tokenService.js`
**Rutas**: `/api/auth` (forgot-password, reset-password)

---

### 2. Tablas de Dispositivos

#### `device_names`
**Propósito**: Configuración y nombres de dispositivos Shelly

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `device_id` - VARCHAR(100) UNIQUE NOT NULL
- `name` - VARCHAR(255) NOT NULL
- `type` - VARCHAR(50) (ej: 'shelly_plug', 'shelly_em')
- `location` - VARCHAR(255)
- `is_active` - TINYINT(1) DEFAULT 1
- `categoria` - VARCHAR(100) (para agrupación de consumo)
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Collector**: `shelly-collector.js`
**Migración**: `20251110_restore_device_names.sql`
**Rutas**: `/api/devices`

---

#### `devices_ubibot`
**Propósito**: Configuración de sensores de temperatura Ubibot

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `channel_id` - VARCHAR(100) UNIQUE NOT NULL
- `name` - VARCHAR(255) NOT NULL
- `location` - VARCHAR(255)
- `min_temp` - DECIMAL(5,2) (temperatura mínima permitida)
- `max_temp` - DECIMAL(5,2) (temperatura máxima permitida)
- `is_active` - TINYINT(1) DEFAULT 1
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Collector**: `ubibot-collector.js`
**Servicio**: `ubibot/ubibotService.js`
**Rutas**: `/api/ubibot`

---

### 3. Tablas de Alertas

#### `alert_tracking`
**Propósito**: Registro histórico de todas las alertas generadas

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `alert_type` - VARCHAR(50) (ej: 'temperature', 'power', 'gps')
- `severity` - VARCHAR(20) (ej: 'critical', 'warning', 'info')
- `device_id` - VARCHAR(100)
- `channel_id` - VARCHAR(100)
- `message` - TEXT NOT NULL
- `value` - DECIMAL(10,2) (valor que disparó la alerta)
- `threshold` - DECIMAL(10,2) (umbral configurado)
- `status` - VARCHAR(20) (ej: 'active', 'acknowledged', 'resolved')
- `acknowledged_by` - INT UNSIGNED (FK a usuarios)
- `acknowledged_at` - DATETIME
- `resolved_at` - DATETIME
- `notification_sent` - TINYINT(1) DEFAULT 0
- `notification_channels` - JSON (ej: ["email", "sms", "push"])
- `metadata` - JSON (datos adicionales)
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Índices recomendados**:
- `KEY idx_alert_type (alert_type)`
- `KEY idx_severity (severity)`
- `KEY idx_status (status)`
- `KEY idx_created_at (created_at)`
- `KEY idx_device_id (device_id)`

**Rutas**: `/api/alert-tracking`

---

#### `alert_metrics_hourly`
**Propósito**: Métricas agregadas de alertas por hora (optimización de queries)

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `hour_timestamp` - DATETIME NOT NULL (truncado a hora)
- `alert_type` - VARCHAR(50)
- `total_alerts` - INT UNSIGNED DEFAULT 0
- `critical_count` - INT UNSIGNED DEFAULT 0
- `warning_count` - INT UNSIGNED DEFAULT 0
- `info_count` - INT UNSIGNED DEFAULT 0
- `acknowledged_count` - INT UNSIGNED DEFAULT 0
- `resolved_count` - INT UNSIGNED DEFAULT 0
- `avg_resolution_time_minutes` - DECIMAL(10,2)
- `created_at` - DATETIME

**Índices recomendados**:
- `UNIQUE KEY uk_hour_type (hour_timestamp, alert_type)`
- `KEY idx_hour_timestamp (hour_timestamp)`

**Job**: `metricsAggregationJob.js`

---

#### `alert_schedule_config`
**Propósito**: Configuración de horarios de alertas (Feature: 002-configurable-alert-schedules)

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `name` - VARCHAR(255) NOT NULL
- `description` - TEXT
- `enabled` - TINYINT(1) DEFAULT 1
- `schedule_type` - VARCHAR(50) (ej: 'always', 'business_hours', 'custom')
- `days_of_week` - JSON (ej: [1,2,3,4,5] para lunes a viernes)
- `start_time` - TIME (ej: '09:00:00')
- `end_time` - TIME (ej: '18:00:00')
- `timezone` - VARCHAR(50) DEFAULT 'America/Santiago'
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Servicio**: `db/alertScheduleConfigService.js`, `baseAlertService.js`
**Rutas**: `/api/alert-schedule`

---

#### `alert_notification_config`
**Propósito**: Configuración de destinatarios de notificaciones

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `alert_type` - VARCHAR(50)
- `notification_channel` - VARCHAR(20) (ej: 'email', 'sms', 'push')
- `recipients` - JSON (array de emails/teléfonos/user_ids)
- `enabled` - TINYINT(1) DEFAULT 1
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Servicio**: `baseAlertService.js`

---

### 4. Tablas de Reportes

#### `scheduled_reports`
**Propósito**: Programación de reportes automáticos

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `name` - VARCHAR(255) NOT NULL
- `report_type` - VARCHAR(50) (ej: 'executive_temperature', 'executive_consumption', 'executive_alerts')
- `schedule_cron` - VARCHAR(100) (expresión cron)
- `recipients` - JSON (array de emails)
- `parameters` - JSON (parámetros del reporte)
- `enabled` - TINYINT(1) DEFAULT 1
- `last_run_at` - DATETIME
- `next_run_at` - DATETIME
- `created_by` - INT UNSIGNED (FK a usuarios)
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Servicio**: `reports/reportSchedulerService.js`
**Job**: `reportCleanupJob.js`
**Rutas**: `/api/reports`

---

#### `report_analytics`
**Propósito**: Analytics de reportes generados

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `report_id` - INT UNSIGNED (FK a scheduled_reports, puede ser NULL para reportes on-demand)
- `report_type` - VARCHAR(50)
- `generated_at` - DATETIME NOT NULL
- `generated_by` - INT UNSIGNED (FK a usuarios, puede ser NULL para automáticos)
- `file_path` - VARCHAR(500)
- `file_size_bytes` - INT UNSIGNED
- `generation_time_ms` - INT UNSIGNED (tiempo de generación en milisegundos)
- `status` - VARCHAR(20) (ej: 'success', 'error')
- `error_message` - TEXT
- `viewed_at` - DATETIME
- `downloaded_at` - DATETIME
- `expires_at` - DATETIME
- `created_at` - DATETIME

**Servicio**: `reports/reportAnalyticsService.js`

---

### 5. Tablas de Energía y Consumo

#### `energy_data`
**Propósito**: Datos de consumo eléctrico recolectados por Shelly

**Columnas identificadas**:
- `id` - BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `device_id` - VARCHAR(100) NOT NULL
- `timestamp` - DATETIME NOT NULL
- `power_watts` - DECIMAL(10,2) (potencia instantánea)
- `energy_wh` - DECIMAL(15,2) (energía acumulada en Wh)
- `voltage_v` - DECIMAL(6,2)
- `current_a` - DECIMAL(8,3)
- `temperature_c` - DECIMAL(5,2) (temperatura del dispositivo)
- `is_on` - TINYINT(1)
- `collected_at` - DATETIME (timestamp de recolección)
- `created_at` - DATETIME

**Índices recomendados**:
- `KEY idx_device_timestamp (device_id, timestamp)`
- `KEY idx_timestamp (timestamp)`

**Collector**: `shelly-collector.js`
**Servicio**: `database-service.js`

---

#### `total_energy`
**Propósito**: Totales de energía calculados

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `device_id` - VARCHAR(100) NOT NULL
- `date` - DATE NOT NULL
- `total_energy_kwh` - DECIMAL(15,3)
- `avg_power_w` - DECIMAL(10,2)
- `max_power_w` - DECIMAL(10,2)
- `min_power_w` - DECIMAL(10,2)
- `hours_on` - DECIMAL(5,2)
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Índices recomendados**:
- `UNIQUE KEY uk_device_date (device_id, date)`
- `KEY idx_date (date)`

**Servicio**: `total-energy-service.js`

---

#### `consumo_por_categoria`
**Propósito**: Consumo agrupado por categoría de dispositivo

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `categoria` - VARCHAR(100) NOT NULL
- `periodo` - VARCHAR(20) (ej: 'daily', 'monthly', 'yearly')
- `fecha` - DATE NOT NULL
- `total_kwh` - DECIMAL(15,3)
- `total_costo` - DECIMAL(12,2) (si se calcula costo)
- `device_count` - INT UNSIGNED (número de dispositivos en categoría)
- `created_at` - DATETIME

**Servicio**: `consumo-categoria-service.js`
**Rutas**: `/api/consumo-categoria`

---

### 6. Tablas de Temperatura

#### `temperature_data`
**Propósito**: Datos de temperatura recolectados por Ubibot

**Columnas identificadas**:
- `id` - BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `channel_id` - VARCHAR(100) NOT NULL
- `timestamp` - DATETIME NOT NULL
- `temperature_c` - DECIMAL(5,2) NOT NULL
- `humidity` - DECIMAL(5,2) (si el sensor lo soporta)
- `battery_level` - DECIMAL(5,2)
- `signal_strength` - INT
- `is_defrost_cycle` - TINYINT(1) DEFAULT 0 (detectado automáticamente)
- `collected_at` - DATETIME
- `created_at` - DATETIME

**Índices recomendados**:
- `KEY idx_channel_timestamp (channel_id, timestamp)`
- `KEY idx_timestamp (timestamp)`
- `KEY idx_is_defrost (is_defrost_cycle)`

**Collector**: `ubibot-collector.js`
**Servicio**: `temperatureDashboardService.js`

---

#### `temperature_thresholds`
**Propósito**: Umbrales de temperatura configurados por dispositivo

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `channel_id` - VARCHAR(100) NOT NULL
- `min_temp` - DECIMAL(5,2) NOT NULL
- `max_temp` - DECIMAL(5,2) NOT NULL
- `critical_min_temp` - DECIMAL(5,2) (umbral crítico bajo)
- `critical_max_temp` - DECIMAL(5,2) (umbral crítico alto)
- `enabled` - TINYINT(1) DEFAULT 1
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Índices recomendados**:
- `UNIQUE KEY uk_channel (channel_id)`

**Componente**: `ThresholdManagementV2.js`

---

#### `defrost_cycles`
**Propósito**: Registro de ciclos de descongelamiento detectados

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `channel_id` - VARCHAR(100) NOT NULL
- `start_timestamp` - DATETIME NOT NULL
- `end_timestamp` - DATETIME
- `duration_minutes` - INT UNSIGNED
- `max_temp_during_cycle` - DECIMAL(5,2)
- `recovery_time_minutes` - INT UNSIGNED (tiempo en volver a temp normal)
- `is_complete` - TINYINT(1) DEFAULT 0
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Índices recomendados**:
- `KEY idx_channel_start (channel_id, start_timestamp)`
- `KEY idx_is_complete (is_complete)`

**Componente**: `DefrostAnalysisV2.js`, `ContadorCiclosDescongelamiento.js`
**Controlador**: `contadorCiclosController.js`

---

### 7. Tablas de GPS y Tracking

#### `gps_data`
**Propósito**: Datos GPS históricos de personal/activos

**Columnas identificadas**:
- `id` - BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `device_id` - VARCHAR(100) NOT NULL
- `user_id` - INT UNSIGNED (FK a usuarios, si aplica)
- `latitude` - DECIMAL(10,8) NOT NULL
- `longitude` - DECIMAL(11,8) NOT NULL
- `accuracy_meters` - DECIMAL(8,2)
- `altitude_meters` - DECIMAL(8,2)
- `speed_kmh` - DECIMAL(6,2)
- `heading_degrees` - DECIMAL(5,2)
- `timestamp` - DATETIME NOT NULL
- `battery_level` - DECIMAL(5,2)
- `created_at` - DATETIME

**Índices recomendados**:
- `KEY idx_device_timestamp (device_id, timestamp)`
- `KEY idx_user_timestamp (user_id, timestamp)`
- `KEY idx_timestamp (timestamp)`
- Considerar índice espacial: `SPATIAL KEY idx_location (latitude, longitude)` (requiere tipo POINT)

**Rutas**: `/api/gps-data`, `/api/gps`
**Componentes**: `MapModal.js`, `HistoricalMovementsSearchV2.js`

---

#### `last_known_position`
**Propósito**: Última posición conocida (optimización de queries)

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `device_id` - VARCHAR(100) UNIQUE NOT NULL
- `user_id` - INT UNSIGNED (FK a usuarios)
- `latitude` - DECIMAL(10,8) NOT NULL
- `longitude` - DECIMAL(11,8) NOT NULL
- `accuracy_meters` - DECIMAL(8,2)
- `timestamp` - DATETIME NOT NULL
- `updated_at` - DATETIME

**Índices recomendados**:
- `UNIQUE KEY uk_device (device_id)`
- `KEY idx_user (user_id)`

**Componente**: `LastKnownPositionV2.js`

---

#### `blind_spot_zones`
**Propósito**: Zonas de puntos ciegos (sin cobertura GPS)

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `name` - VARCHAR(255) NOT NULL
- `description` - TEXT
- `polygon_coordinates` - JSON (array de lat/lng)
- `is_active` - TINYINT(1) DEFAULT 1
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Rutas**: `/api/blind-spots`

---

### 8. Tablas de Configuración

#### `presets`
**Propósito**: Presets de configuración de usuario

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `user_id` - INT UNSIGNED (FK a usuarios)
- `name` - VARCHAR(255) NOT NULL
- `type` - VARCHAR(50) (ej: 'dashboard', 'alerts', 'reports')
- `configuration` - JSON NOT NULL
- `is_default` - TINYINT(1) DEFAULT 0
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Servicio**: `presetService.js`
**Rutas**: `/api/presets`

---

#### `global_settings`
**Propósito**: Configuración global del sistema

**Columnas identificadas**:
- `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `setting_key` - VARCHAR(100) UNIQUE NOT NULL
- `setting_value` - TEXT
- `data_type` - VARCHAR(20) (ej: 'string', 'number', 'boolean', 'json')
- `description` - TEXT
- `updated_by` - INT UNSIGNED (FK a usuarios)
- `created_at` - DATETIME
- `updated_at` - DATETIME

**Rutas**: `/api/config`

---

## 🔧 Stored Procedures Identificados

⚠️ **NOTA**: Basado en análisis de código. Requiere verificación contra base de datos real.

### Procedimientos de Alertas

#### `sp_insert_alert`
**Propósito**: Inserción de nuevas alertas con validación

**Parámetros estimados**:
```sql
IN p_alert_type VARCHAR(50),
IN p_severity VARCHAR(20),
IN p_device_id VARCHAR(100),
IN p_message TEXT,
IN p_value DECIMAL(10,2),
IN p_threshold DECIMAL(10,2)
```

**Lógica estimada**:
- Validar parámetros
- Insertar en `alert_tracking`
- Retornar ID de alerta creada

---

#### `sp_update_alert_status`
**Propósito**: Actualización de estado de alertas

**Parámetros estimados**:
```sql
IN p_alert_id INT UNSIGNED,
IN p_status VARCHAR(20),
IN p_user_id INT UNSIGNED
```

---

#### `sp_get_alert_metrics`
**Propósito**: Obtención de métricas agregadas de alertas

**Parámetros estimados**:
```sql
IN p_start_date DATETIME,
IN p_end_date DATETIME,
IN p_alert_type VARCHAR(50)
```

**Retorno**: Resultset con métricas agregadas

---

### Procedimientos de Energía

#### `sp_calculate_energy_totals`
**Propósito**: Cálculo de totales diarios de energía

**Parámetros estimados**:
```sql
IN p_device_id VARCHAR(100),
IN p_date DATE
```

**Lógica estimada**:
- Agregar datos de `energy_data` para el día especificado
- Insertar/actualizar en `total_energy`

---

#### `sp_aggregate_consumption`
**Propósito**: Agregación de consumo por categoría

**Parámetros estimados**:
```sql
IN p_periodo VARCHAR(20),
IN p_fecha DATE
```

---

### Procedimientos de Reportes

#### `sp_generate_report_data`
**Propósito**: Generación de datos para reportes ejecutivos

**Parámetros estimados**:
```sql
IN p_report_type VARCHAR(50),
IN p_start_date DATETIME,
IN p_end_date DATETIME
```

**Retorno**: Múltiples resultsets según tipo de reporte

---

#### `sp_cleanup_expired_reports`
**Propósito**: Limpieza de reportes expirados

**Lógica estimada**:
- Seleccionar reportes donde `expires_at < NOW()`
- Eliminar archivos físicos
- Marcar como eliminados o borrar registros

**Job asociado**: `reportCleanupJob.js`

---

## ⚡ Triggers Identificados

⚠️ **NOTA**: Basado en lógica de aplicación. Requiere verificación contra base de datos real.

### Triggers de Auditoría

#### `before_insert_usuarios`
**Tabla**: `usuarios`
**Evento**: BEFORE INSERT
**Propósito**: Generación de timestamps

**Lógica estimada**:
```sql
SET NEW.created_at = NOW();
SET NEW.updated_at = NOW();
```

---

#### `before_update_usuarios`
**Tabla**: `usuarios`
**Evento**: BEFORE UPDATE
**Propósito**: Actualización de `updated_at`

**Lógica estimada**:
```sql
SET NEW.updated_at = NOW();
```

---

### Triggers de Agregación

#### `after_insert_energy_data`
**Tabla**: `energy_data`
**Evento**: AFTER INSERT
**Propósito**: Actualización de totales de energía

**Lógica estimada**:
- Llamar a `sp_calculate_energy_totals` para actualizar `total_energy`

---

#### `after_insert_temperature_data`
**Tabla**: `temperature_data`
**Evento**: AFTER INSERT
**Propósito**: Detección de ciclos de descongelamiento y generación de alertas

**Lógica estimada**:
- Si temperatura > umbral de descongelamiento: marcar `is_defrost_cycle = 1`
- Si temperatura fuera de rango: insertar en `alert_tracking`

---

### Triggers de Validación

#### `before_insert_alert_tracking`
**Tabla**: `alert_tracking`
**Evento**: BEFORE INSERT
**Propósito**: Validación de datos antes de inserción

**Lógica estimada**:
- Validar que `severity` esté en valores permitidos
- Validar que `alert_type` sea válido
- Generar timestamp de creación

---

## 🔍 Vistas (Views)

### `kpi_view`
**Propósito**: Agregación de KPIs principales del sistema

**Creación**: Migration `20251023_create_kpi_view.js`

**Columnas estimadas**:
- `total_devices` - Total de dispositivos activos
- `total_alerts_today` - Alertas generadas hoy
- `critical_alerts_active` - Alertas críticas sin resolver
- `avg_temperature` - Temperatura promedio actual
- `total_energy_today_kwh` - Consumo total del día
- `devices_online` - Dispositivos en línea
- `last_updated` - Timestamp de última actualización

**Uso**: Dashboards principales

---

## 🕐 Zona Horaria

- **Configuración Sistema**: America/Santiago (Chile)
- **Manejo en Backend**: `moment-timezone` configura timezone
- **Storage en BD**: DATETIME sin conversión automática de MySQL
- **Conversión**: Realizada en capa de aplicación (Node.js)

**Configuración en unified-config.json**:
```json
{
  "database": {
    "timezone": "America/Santiago"
  }
}
```

**Importante**: Todas las fechas se almacenan en hora local de Santiago. Al mostrar datos, la aplicación asume esta zona horaria.

---

## 📊 Backup y Mantenimiento

### Scripts SQL

**Ubicación**: `/SQL_FILES/`

#### Estructura de Directorios
```
SQL_FILES/
├── 01_creacion_desde_cero/
│   └── 01_tablas_base.sql       # Script de creación de BD
└── 99_others/                    # Scripts varios
```

---

### Recomendaciones de Backup

**Backup Diario**:
```bash
# Backup completo
mysqldump -u root -p tns_cool_track > backup_$(date +%Y%m%d).sql

# Backup solo estructura
mysqldump -u root -p --no-data tns_cool_track > schema_$(date +%Y%m%d).sql

# Backup solo datos
mysqldump -u root -p --no-create-info tns_cool_track > data_$(date +%Y%m%d).sql
```

**Backup por Tabla**:
```bash
# Backup tablas críticas
mysqldump -u root -p tns_cool_track usuarios alert_tracking scheduled_reports > critical_$(date +%Y%m%d).sql
```

---

### Mantenimiento de Tablas

**Optimización recomendada (mensual)**:
```sql
-- Optimizar tablas grandes
OPTIMIZE TABLE energy_data;
OPTIMIZE TABLE temperature_data;
OPTIMIZE TABLE gps_data;
OPTIMIZE TABLE alert_tracking;

-- Analizar para actualizar estadísticas
ANALYZE TABLE energy_data;
ANALYZE TABLE temperature_data;
```

**Limpieza de datos antiguos**:
```sql
-- Ejemplo: Eliminar datos de energía mayores a 1 año
DELETE FROM energy_data
WHERE timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Ejemplo: Archivar alertas resueltas antiguas
-- (considerar tabla de archivo separada)
```

---

## 📝 Notas Importantes

### ⚠️ Verificación Pendiente

Esta documentación se basa en análisis del código fuente del proyecto. Se requiere **verificación contra la base de datos real** para completar:

1. **Listado completo de tablas y columnas**
   - Tipos de datos exactos
   - Longitudes de VARCHAR
   - Valores DEFAULT
   - Constraints NOT NULL

2. **Stored procedures y triggers completos**
   - Parámetros exactos
   - Lógica completa
   - Valores de retorno

3. **Constraints y relaciones FK exactas**
   - ON DELETE CASCADE/SET NULL/RESTRICT
   - ON UPDATE CASCADE/SET NULL/RESTRICT

4. **Índices completos**
   - Todos los índices creados
   - Estadísticas de uso

### Issue Relacionado

**Issue #1**: Creación de la base de datos desde cero

Este issue se encargará de:
- Generar scripts SQL completos de creación
- Documentar todas las tablas, columnas y relaciones
- Crear stored procedures y triggers
- Establecer índices optimizados
- Generar datos de prueba (seed data)

---

### Mantenimiento de Documentación

**Actualizar este documento cuando**:
- Se agreguen nuevas tablas
- Se modifiquen esquemas existentes
- Se creen stored procedures o triggers
- Se agreguen/modifiquen índices
- Se realicen migraciones importantes

**Responsable**: Equipo TNS (Bufigol, andresTNS)

---

## 🔗 Referencias

- **Documentación de Proyecto**: [README.md](./README.md)
- **APIs Externas**: [Apis_externas.md](./Apis_externas.md)
- **Gestión GitHub**: [Info_Github.md](./Info_Github.md)
- **MySQL Documentation**: https://dev.mysql.com/doc/
- **Issue #1 (Creación de BD)**: https://github.com/andresTNS/TNS_TRACK_DEMO/issues/1

---

**Última actualización**: 2026-01-26
**Versión**: 1.0.0 (basada en análisis de código)
**Estado**: ⚠️ Requiere verificación contra BD real
**Mantenido por**: Equipo TNS
