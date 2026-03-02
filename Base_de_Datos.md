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


### Nombres de Tablas


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
- **Idioma**: Español obligatorio en todos los nombres de columnas
- **IDs**:
  - Primary Key: `id_{tabla}` (AUTO_INCREMENT, UNSIGNED) (ej: `id_usuario`, `id_canal`)
  - Foreign Keys: misma columna que el PK de la tabla referenciada, sin prefijo adicional (ej: `id_usuario`, `id_canal`)
- **Timestamps de auditoría**:
  - `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  - `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  - `fecha_eliminacion` DATETIME NULL (soft delete, si aplica)
- **Booleans**:
  - Estado estándar: `activo` TINYINT(1) NOT NULL DEFAULT 1
  - Otros estados: adjetivo descriptivo en español sin prefijo (ej: `en_linea`, `exitoso`, `habilitado`)
  - Capacidades: prefijo `tiene_` (ej: `tiene_notificaciones`, `tiene_alertas`)
  - Tipo: TINYINT(1)
- **Fechas de negocio**: DATETIME (manejo de zona horaria en aplicación)
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

## 📊 Estructura de Tablas 


---

## 🔧 Stored Procedures Identificados


---

## ⚡ Triggers Identificados



---

## 🔍 Vistas (Views)



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
