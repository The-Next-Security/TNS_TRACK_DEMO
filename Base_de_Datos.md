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

> **Fuente oficial**: [Issue #1 - Creación de la base de datos desde cero](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/1)

### Nombres de Tablas

Las tablas deben seguir un sistema de **prefijos obligatorios** según su propósito:

| Prefijo | Significado | Explicación | Ejemplo |
|---------|-------------|-------------|---------|
| `gen_` | General | Utilizado para tablas de uso global y que impactan en todos los módulos del servicio | `gen_usuario` |
| `rep_` | Reportería | Utilizado para tablas de uso específico de reportería que se realizan mediante email | `rep_reportes_generados` |
| `ale_` | Alertas y notificaciones | Utilizado para tablas de uso específico de envío de alertas y notificaciones que no son enviadas mediante email | `ale_preferencias` |
| `sem_` | Mediciones eléctricas (Shelly Electrical Measurements) | Utilizado para tablas de uso relativo a mediciones eléctricas y lo relativo a transformaciones y cálculos de los mismos | `sem_mediciones` |
| `ubi_` | Ubibot | Utilizado para tablas de uso relativo a mediciones de temperatura salidas desde Ubibot y lo relativo a transformaciones y cálculos de los mismos | `ubi_sensor_readings` |
| `log_` | Auditoría de cambios (concepto de log) | Utilizado en tablas que hacen de todo tipo de auditorías | `log_configuracion` |
| `ai_` | Artificial Intelligence | Tablas específicas para el uso de inteligencia artificial | `ai_query_logs` |

**Reglas**:
- Todo en minúsculas
- Formato: snake_case
- Prefijo obligatorio según categoría
- Nombre descriptivo después del prefijo

### Convención de Nombres de Índices

#### Formato General

**Para índices simples**:
```
[Tipo]_[TABLA]_[COLUMNA]
```

**Para índices compuestos (múltiples columnas)**:
```
[Tipo]_[TABLA]_[COLUMNA1]-[COLUMNA2]-[COLUMNA3]
```

**Nota**: Si el nombre resultante excede los 64 caracteres (límite de MySQL) o es necesario por legibilidad, se puede omitir el prefijo de la tabla (ej: `gen_`) en el nombre del índice, manteniendo solo el nombre base de la tabla.

#### Prefijos de Tipo

| Prefijo | Tipo de Índice | Uso |
|---------|----------------|-----|
| `pk_` | PRIMARY KEY | Implícito, rara vez nombrado explícitamente |
| `uk_` | UNIQUE KEY | Índices con restricción de unicidad |
| `idx_` | INDEX normal | Índices de búsqueda estándar |
| `ft_` | FULLTEXT INDEX | Índices de texto completo |
| `sp_` | SPATIAL INDEX | Índices espaciales/geográficos |
| `fk_` | FOREIGN KEY | Claves foráneas |

#### Foreign Keys (Formato Especial)

Para claves foráneas, el formato es más descriptivo para identificar claramente el origen y destino:

```
fk_[tabla origen]_[columna origen]_[tabla destino]_[columna destino]
```

#### Ejemplos de Índices

**Índices simples**:
- `uk_gen_usuario_email` - Índice único en email de usuarios
- `idx_gen_usuario_activo` - Índice en columna activo

**Índices compuestos**:
- `idx_gen_usuario_activo-fecha_creacion` - Índice compuesto en activo y fecha_creacion
- `idx_gen_usuario_nombre-apellido` - Índice compuesto en nombre y apellido
- `idx_gen_usuario_activo-fecha_creacion-fecha_actualizacion` - Índice compuesto en tres columnas

**Foreign Keys**:
- `fk_gen_rol_id_usuario_gen_usuario_id_usuario` - Foreign key desde gen_rol.id_usuario hacia gen_usuario.id_usuario
- `fk_gen_permiso_id_rol_gen_rol_id_rol` - Foreign key desde gen_permiso.id_rol hacia gen_rol.id_rol

**Ejemplo omitiendo prefijo (si es necesario por longitud)**:
- `uk_usuario_email` - Versión abreviada si `uk_gen_usuario_email` excede 64 caracteres

#### Reglas de Nomenclatura de Índices

1. Todo en minúsculas
2. Separación con guiones bajos (`_`) para tipo, tabla y columna individual
3. Separación con guiones (`-`) entre columnas en índices compuestos
4. Nombre de tabla completo (sin prefijo de esquema), a menos que sea necesario omitir el prefijo por longitud
5. Para índices compuestos: listar todas las columnas separadas por guiones
6. Máximo 64 caracteres (límite MySQL)
7. Foreign keys deben seguir el formato completo con origen y destino

### Columnas

- **Formato**: snake_case
- **IDs**:
  - Primary Key: `id_{tabla}` (AUTO_INCREMENT, UNSIGNED)
  - Foreign Keys: `fk_id_{tabla}` (ej: `fk_id_usuario`, `fk_id_dispositivo`, `fk_id_canal`)
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

### Valores NULL

- **Regla General**: Preferir `NOT NULL` con valores por defecto
- **Excepciones**:
  - Timestamps opcionales (`updated_at`, `deleted_at`)
  - Referencias opcionales (Foreign Keys que pueden ser nulos)
  - Campos calculados o derivados

---

## 📊 Estructura de Tablas Identificadas

### Agrupacion
#### Tabla 
[Caracteristicas a completar]

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
