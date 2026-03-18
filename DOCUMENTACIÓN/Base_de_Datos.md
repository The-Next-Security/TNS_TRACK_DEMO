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

> Los estándares completos de nomenclatura SQL y de base de datos están documentados en **[Estandares_Nomenclatura_SQL.md](./Estandares_Nomenclatura_SQL.md)**.

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

> **Fuente SQL:** [`SQL_FILES/01_creacion_desde_cero/01_tablas_base.sql`](../SQL_FILES/01_creacion_desde_cero/01_tablas_base.sql) · [`02_tablas_log.sql`](../SQL_FILES/01_creacion_desde_cero/02_tablas_log.sql)
> 🆕 = tabla nueva (Block 1, Issue #12) · ✏️ = tabla modificada (Block 1, Issue #12)

---

### Tablas Generales (`gen_`)

#### `gen_usuario`
> Usuarios del sistema con autenticación y control de versión de tokens JWT.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_usuario` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(100) | NO | |
| `apellido` | VARCHAR(100) | NO | |
| `password` | VARCHAR(255) | NO | Hash bcrypt |
| `email` | VARCHAR(255) | NO | UNIQUE |
| `token_version` | INT UNSIGNED | NO | DEFAULT 0 — incrementa al revocar tokens JWT |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_password_reset`
> Tokens temporales para recuperación de contraseña.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_password_reset` | INT UNSIGNED AI | NO | PK |
| `id_usuario` | INT UNSIGNED | NO | FK → `gen_usuario` ON DELETE CASCADE |
| `token` | VARCHAR(255) | NO | UNIQUE |
| `fecha_creacion` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |
| `fecha_expiracion` | DATETIME | NO | TTL del token |

---

#### `gen_permiso`
> Catálogo de permisos del sistema.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_permiso` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(100) | NO | UNIQUE |
| `descripcion` | VARCHAR(255) | NO | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_usuario_permisos`
> Relación N:M entre usuarios y permisos.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_usuario` | INT UNSIGNED | NO | PK + FK → `gen_usuario` ON DELETE CASCADE |
| `id_permiso` | INT UNSIGNED | NO | PK + FK → `gen_permiso` ON DELETE CASCADE |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_feriados_cl`
> Feriados legales chilenos para control de horario operacional.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_feriado` | INT UNSIGNED AI | NO | PK |
| `fecha` | DATE | NO | UNIQUE |
| `nombre` | VARCHAR(100) | NO | Nombre oficial del feriado |

---

#### `gen_ubicaciones_reales`
> Ubicaciones físicas que agrupan sensores y dispositivos.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_ubicacion_real` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(100) | NO | |
| `descripcion` | VARCHAR(255) | NO | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_tipos_parametros`
> Catálogo de tipos de datos para parámetros de configuración global.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_tipo_parametro` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(50) | NO | UNIQUE (STRING, BOOLEAN, JSON, FLOAT, INTEGER…) |
| `descripcion` | TEXT | SÍ | |
| `categoria` | ENUM('primitivo','complejo','numerico') | NO | DEFAULT 'primitivo' |
| `validacion_regex` | VARCHAR(255) | SÍ | Regex de validación del valor |
| `ejemplo_valor` | TEXT | SÍ | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_tipos_origen` 🆕
> Catálogo **transversal** de sistemas de origen de datos (ubibot, shelly, sistema, teltonika…). Usado en alertas, logs y auditorías — no exclusivo del módulo de alertas.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_tipo_origen` | TINYINT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(30) | NO | UNIQUE (ej: `ubibot`, `shelly`, `sistema`) |
| `descripcion` | VARCHAR(255) | SÍ | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |

> **Nota:** TINYINT porque el catálogo de orígenes crece lentamente (máx. 255 entradas).

---

#### `gen_cofiguracion_grupos`
> Grupos de parámetros de configuración del sistema (jwt, email, ubibot, alertSystem…).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_cofiguracion_grupos` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(50) | NO | UNIQUE |
| `descripcion` | TEXT | SÍ | |
| `orden` | INT | NO | DEFAULT 0 — ordenamiento en UI |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_cofiguracion_parametros`
> Definición de parámetros de configuración con rutas anidadas tipo `jwt.secret`.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_cofiguracion_parametros` | INT UNSIGNED AI | NO | PK |
| `id_cofiguracion_grupos` | INT UNSIGNED | NO | FK → `gen_cofiguracion_grupos` RESTRICT |
| `id_tipo_parametro` | INT UNSIGNED | NO | FK → `gen_tipos_parametros` RESTRICT |
| `ruta_completa` | VARCHAR(255) | NO | UNIQUE (ej: `jwt.secret`, `email.host`) |
| `nombre_parametro` | VARCHAR(100) | NO | Último segmento de la ruta |
| `nivel_anidacion` | INT | NO | DEFAULT 1 — profundidad de la ruta |
| `ruta_padre` | VARCHAR(255) | SÍ | Ruta del nodo padre (NULL = raíz) |
| `es_sensible` | TINYINT(1) | NO | DEFAULT 0 — 1 = encriptado en `valores` |
| `descripcion` | TEXT | SÍ | |
| `valor_default` | TEXT | SÍ | |
| `validacion_regex` | VARCHAR(255) | SÍ | |
| `es_requerido` | TINYINT(1) | NO | DEFAULT 1 |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `gen_cofiguracion_valores`
> Valores reales de configuración con historial y versionado.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_cofiguracion_valores` | INT UNSIGNED AI | NO | PK |
| `id_cofiguracion_parametros` | INT UNSIGNED | NO | FK → `gen_cofiguracion_parametros` RESTRICT |
| `valor` | TEXT | NO | Valor (encriptado si `es_sensible=1` en el parámetro) |
| `version` | INT | NO | DEFAULT 1 — incrementa con cada cambio |
| `activo` | TINYINT(1) | NO | DEFAULT 1 — solo 1 activo por parámetro (UNIQUE KEY) |
| `valido_desde` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |
| `valido_hasta` | DATETIME | SÍ | NULL = aún vigente |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

> **Unique constraint:** `(id_cofiguracion_parametros, activo)` — garantiza que solo exista un valor activo por parámetro.

---

#### `gen_horario_operacional` 🆕
> Horario operacional por día de la semana (7 filas fijas: Lunes=1 … Domingo=7). Controla cuándo se envían notificaciones y alertas.
> Los parámetros globales `respetar_feriados` y `criticas_ignoran_horario` residen en `gen_cofiguracion_*` (no en esta tabla).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_horario_operacional` | INT UNSIGNED AI | NO | PK |
| `dia_semana` | TINYINT UNSIGNED | NO | UNIQUE — 1=Lunes … 7=Domingo |
| `nombre_dia` | VARCHAR(20) | NO | Nombre en español |
| `hora_inicio` | TIME | NO | Hora de inicio del horario operacional |
| `hora_fin` | TIME | NO | Hora de fin del horario operacional |
| `activo` | TINYINT(1) | NO | DEFAULT 1 — 0 = día fuera del horario (ej: Domingo) |
| `fecha_actualizacion` | DATETIME | NO | ON UPDATE CURRENT_TIMESTAMP |

---

### Tablas de Reportería (`rep_`)

#### `rep_tipo_reporte`
> Catálogo de tipos de reporte disponibles en el sistema.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_tipo_reporte` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(100) | NO | UNIQUE |
| `descripcion` | VARCHAR(255) | NO | |

---

#### `rep_plantillas`
> Plantillas de reporte referenciadas por reportes programados y generados.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_plantilla` | INT UNSIGNED AI | NO | PK |
| `clave_plantilla` | VARCHAR(100) | NO | UNIQUE — identificador interno de código |
| `id_tipo_reporte` | INT UNSIGNED | NO | FK → `rep_tipo_reporte` RESTRICT |
| `nombre` | VARCHAR(100) | NO | UNIQUE |
| `descripcion` | VARCHAR(255) | NO | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `rep_reportes_programados` ✏️
> Configuración de reportes automatizados vía `node-cron`. Persiste el estado de scheduling para restaurar jobs al reiniciar el servicio.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_reporte_programado` | INT UNSIGNED AI | NO | PK |
| `id_plantilla` | INT UNSIGNED | NO | FK → `rep_plantillas` RESTRICT |
| `nombre` | VARCHAR(100) | NO | UNIQUE |
| `descripcion` | VARCHAR(255) | NO | |
| `expresion_cron` | VARCHAR(100) | NO | 🆕 Expresión cron de node-cron (ej: `0 8 * * 1-5`) |
| `activo` | TINYINT(1) | NO | 🆕 DEFAULT 1 — job activo y programado |
| `proxima_ejecucion` | DATETIME | SÍ | 🆕 Estado persistido para restaurar al reiniciar servicio |
| `ultima_ejecucion` | DATETIME | SÍ | 🆕 Fecha/hora de la última ejecución |
| `ultima_ejecucion_estado` | ENUM('exitoso','fallido','omitido') | SÍ | 🆕 Estado de la última ejecución |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

**Índices adicionales:** `activo`, `proxima_ejecucion` — para consultas del scheduler.

---

#### `rep_reportes_generados`
> Registro de cada reporte generado, ya sea manual, programado o por API.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_reporte_generado` | INT UNSIGNED AI | NO | PK |
| `id_plantilla` | INT UNSIGNED | NO | FK → `rep_plantillas` RESTRICT |
| `nombre_reporte` | VARCHAR(100) | NO | UNIQUE |
| `ruta_archivo` | VARCHAR(255) | NO | Ruta en filesystem/S3 |
| `tamanio_bytes` | INT | NO | |
| `estado_generacion` | ENUM('pendiente','generando','completado','fallido','expirado') | NO | DEFAULT 'pendiente' |
| `fuente` | ENUM('manual','programado','api','otro') | NO | DEFAULT 'manual' |
| `fecha_descarga` | DATETIME | SÍ | Primera descarga del archivo |
| `fecha_expiracion` | DATETIME | SÍ | NULL hasta que el archivo sea eliminado por TTL |
| `id_reporte_programado` | INT UNSIGNED | SÍ | FK → `rep_reportes_programados` ON DELETE SET NULL |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

### Tablas Ubibot (`ubi_`)

#### `ubi_canal`
> Canales de sensores Ubibot con umbrales de temperatura y estado operacional.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_canal` | INT UNSIGNED AI | NO | PK |
| `id_ubicacion_real` | INT UNSIGNED | NO | FK → `gen_ubicaciones_reales` RESTRICT |
| `canal_id` | INT | NO | UNIQUE — ID natural en Ubibot API |
| `nombre` | VARCHAR(100) | NO | |
| `id_producto` / `id_dispositivo` | VARCHAR | NO | Identificadores en Ubibot |
| `latitud` / `longitud` | DECIMAL | NO | Coordenadas del sensor |
| `firmware` / `mac_address` | VARCHAR | NO | Datos de hardware |
| `en_linea` | TINYINT(1) | NO | DEFAULT 1 |
| `id_preset` | INT UNSIGNED | SÍ | FK → `ubi_grupo` — preset de grupo asignado |
| `umbral_min` | DECIMAL(5,2) | SÍ | Override individual de temp. mínima. NULL = usa `temperatura_minima` de `ubi_grupo` |
| `umbral_max` | DECIMAL(5,2) | SÍ | Override individual de temp. máxima. NULL = usa `temperatura_maxima` de `ubi_grupo` |
| `ultima_alerta_enviada` | DATETIME | SÍ | |
| `fuera_linea_desde` | DATETIME | SÍ | NULL = actualmente en línea |
| `serial` | VARCHAR(20) | SÍ | `full_serial` de Ubibot |
| `ultima_lectura_ubibot` | DATETIME | SÍ | `last_entry_date` de API — detecta sensores silenciosos |
| `ultima_ip` | VARCHAR(45) | SÍ | `last_ip` de API — diagnóstico de red |
| `puntaje_salud` | TINYINT UNSIGNED | SÍ | `device_health.score` 0-100 — mantenimiento preventivo |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `ubi_lecturas_sensor`
> Lecturas periódicas de sensores Ubibot (tabla de alta volumetría).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_lectura_sensor` | INT UNSIGNED AI | NO | PK |
| `id_canal` | INT UNSIGNED | NO | FK → `ubi_canal` ON DELETE CASCADE |
| `temperatura` | DECIMAL(8,4) | NO | Interior — field1 |
| `humedad` | DECIMAL(8,4) | NO | field2 |
| `luz` | DECIMAL(12,4) | NO | field3 |
| `voltaje` | DECIMAL(8,4) | NO | field4 |
| `temperatura_externa` | DECIMAL(8,4) | SÍ | Sonda externa — field8 (**dato principal de negocio**) |
| `fecha_lectura_externa` | DATETIME | SÍ | Timestamp de field8 |
| `wifi_rssi` | SMALLINT | SÍ | dBm — field5 |
| `en_linea_lectura` | TINYINT(1) | SÍ | Estado del canal al momento de la lectura |
| `fecha_lectura` | DATETIME | NO | Timestamp de field1 (base para índices) |
| `fecha_creacion` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |

**Índices:** `id_canal`, `fecha_lectura`, `(id_canal, fecha_lectura)` — optimizado para consultas por canal en rango de fechas.

---

#### `ubi_grupo`
> Presets reutilizables de umbrales de temperatura para canales Ubibot (grupo base).
> Los valores de `temperatura_minima`/`temperatura_maxima` actúan como defaults; cada canal puede sobreescribirlos individualmente via `ubi_canal.umbral_min`/`umbral_max`.
> Lógica de resolución: `COALESCE(c.umbral_min, g.temperatura_minima)` — override individual tiene prioridad sobre el grupo.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_preset` | INT UNSIGNED AI | NO | PK |
| `nombre_preset` | VARCHAR(100) | NO | UNIQUE |
| `temperatura_minima` / `temperatura_maxima` | DECIMAL(5,2) | NO | CHECK: -50°C a 150°C; min < max |
| `es_predeterminado` | TINYINT(1) | NO | DEFAULT 0 |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `creado_por` / `actualizado_por` | VARCHAR(100) | NO | Usuario que gestionó el preset |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `ubi_contador_ciclos`
> Contadores diarios de ciclos de temperatura por canal Ubibot.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_contador_ciclo` | INT UNSIGNED AI | NO | PK |
| `fecha_ciclos` | DATETIME | NO | UNIQUE con `id_canal` |
| `id_canal` | INT UNSIGNED | NO | FK → `ubi_canal` ON DELETE CASCADE |
| `numero_ciclos` | DECIMAL(3,1) | NO | DEFAULT 0 |
| `tiempo_en_positivo` | INT | NO | Minutos con temperatura positiva |
| `porcentaje_tiempo` | DECIMAL(6,3) | NO | % del tiempo con temperatura positiva |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

### Tablas de Inteligencia Artificial (`ai_`)

#### `ai_costos_sesion`
> Sesiones de consultas IA con costos acumulados en USD.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_sesion` | BIGINT UNSIGNED AI | NO | PK |
| `id_usuario` | INT UNSIGNED | NO | FK → `gen_usuario` ON DELETE CASCADE |
| `fecha_inicio` | DATETIME | SÍ | DEFAULT CURRENT_TIMESTAMP |
| `fecha_fin` | DATETIME | SÍ | NULL = sesión activa |
| `modelo_utilizado` | VARCHAR(50) | NO | ej: `gpt-4o-mini` |
| `total_tokens_entrada` / `total_tokens_salida` | INT | NO | DEFAULT 0 |
| `costo_total_usd` | DECIMAL(10,4) | NO | DEFAULT 0.0000 |
| `cantidad_consultas` | INT | NO | DEFAULT 0 |
| `camaras_consultadas` | TEXT | SÍ | JSON array de nombres de cámaras |
| `exitoso` | TINYINT(1) | NO | DEFAULT 1 |
| `mensaje_error` | TEXT | SÍ | |

---

### Tablas de Mediciones Eléctricas (`sem_`)

#### `sem_tipos_parametros`
> Catálogo de tipos de parámetros del módulo eléctrico (independiente de `gen_tipos_parametros`).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_tipo_parametro` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(100) | NO | UNIQUE (ej: PRECIO_KWH, INTERVALO_RECOLECCION) |
| `descripcion` | TEXT | SÍ | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `sem_grupos`
> Grupos lógicos de dispositivos Shelly para agrupación de consumo energético.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_grupo` | INT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(100) | NO | UNIQUE |
| `descripcion` | TEXT | SÍ | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `sem_dispositivos`
> Dispositivos Shelly registrados con su ubicación física y grupo de consumo.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_dispositivo_shelly` | INT UNSIGNED AI | NO | PK |
| `shelly_id` | VARCHAR(12) | NO | UNIQUE — ID natural del dispositivo |
| `nombre` | VARCHAR(255) | NO | |
| `tipo` | VARCHAR(50) | SÍ | ej: `shelly_plug`, `shelly_em` |
| `id_ubicacion_real` | INT UNSIGNED | SÍ | FK → `gen_ubicaciones_reales` RESTRICT |
| `id_grupo` | INT UNSIGNED | SÍ | FK → `sem_grupos` ON DELETE SET NULL |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `sem_configuracion`
> Parámetros de configuración del módulo eléctrico con historial de valores vigentes.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_configuracion` | INT UNSIGNED AI | NO | PK |
| `id_tipo_parametro` | INT UNSIGNED | NO | FK → `sem_tipos_parametros` RESTRICT |
| `nombre_parametro` | VARCHAR(100) | NO | ej: `precio_kwh_punta` |
| `valor` | TEXT | NO | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `valido_desde` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |
| `valido_hasta` | DATETIME | SÍ | NULL = vigente |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `sem_totales_hora`
> Totales horarios de consumo energético por dispositivo Shelly (alta volumetría).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_totales_hora` | BIGINT UNSIGNED AI | NO | PK |
| `shelly_id` | VARCHAR(12) | NO | UNIQUE con `hora_local` — FK → `sem_dispositivos` ON DELETE CASCADE |
| `hora_local` | DATETIME(6) | NO | |
| `energia_activa_total` | DECIMAL(15,3) | NO | Wh |
| `energia_reactiva_total` | DECIMAL(15,3) | SÍ | VARh |
| `potencia_maxima` / `potencia_minima` | DECIMAL(10,2) | SÍ | W |
| `precio_kwh_periodo` | DECIMAL(10,2) | NO | |
| `costo_total` | DECIMAL(15,2) | NO | |
| `lecturas_validas` | INT | NO | |
| `calidad_datos` | DECIMAL(5,2) | SÍ | |
| `lecturas_limite_apagado` / `_consumo_bajo` / `_consumo_medio` / `_consumo_alto` | INT | NO | DEFAULT 0 — clasificación de lecturas |
| `cantidad_datos` | INT | NO | DEFAULT 0 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `sem_totales_dia`
> Totales diarios de consumo energético por dispositivo Shelly.

Similar a `sem_totales_hora` pero con `fecha_local DATE` (UNIQUE con `shelly_id`) y `precio_kwh_promedio` en lugar de `precio_kwh_periodo`. Agrega `horas_con_datos INT`.

---

#### `sem_totales_mes`
> Totales mensuales de consumo energético por dispositivo Shelly.

Similar a `sem_totales_dia` pero con `año INT` + `mes INT` (UNIQUE compuesto con `shelly_id`) en lugar de `fecha_local`. Agrega `dias_con_datos INT`.

---

#### `sem_mediciones`
> Mediciones brutas de energía por fase eléctrica (tabla de alta volumetría).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_medicion` | BIGINT UNSIGNED AI | NO | PK |
| `shelly_id` | VARCHAR(12) | NO | FK → `sem_dispositivos` ON DELETE CASCADE |
| `timestamp_utc` / `timestamp_local` | DATETIME | NO | Timestamps original (UTC) y local (Santiago) |
| `fase` | ENUM('A','B','C','TOTAL') | NO | DEFAULT 'TOTAL' |
| `voltaje` | DECIMAL(6,2) | SÍ | V |
| `corriente` | DECIMAL(8,4) | SÍ | A |
| `potencia_activa` / `potencia_reactiva` / `potencia_aparente` | DECIMAL(10,2) | SÍ | W / VAR / VA |
| `factor_potencia` | DECIMAL(5,4) | SÍ | -1 a 1 |
| `frecuencia` | DECIMAL(5,2) | SÍ | Hz |
| `energia_activa` / `energia_reactiva` | DECIMAL(15,3) | SÍ | Wh / VARh acumulados |
| `calidad_lectura` | ENUM('NORMAL','ESTIMADO','INVALIDO') | NO | DEFAULT 'NORMAL' |
| `fecha_creacion` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |

**Índices:** `(shelly_id, timestamp_local)`, `timestamp_local`, `fase`, `calidad_lectura`.

---

### Tablas de Alertas y Notificaciones (`ale_`)

#### `ale_tipo_alerta` 🆕
> Catálogo de tipos de alerta. Reemplaza el antiguo ENUM en `ale_seguimiento` para permitir extensibilidad sin `ALTER TABLE`.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_tipo_alerta` | TINYINT UNSIGNED AI | NO | PK |
| `nombre` | VARCHAR(50) | NO | UNIQUE (ej: `temperatura`, `desconexion`) |
| `descripcion` | VARCHAR(255) | SÍ | |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |

---

#### `ale_seguimiento` ✏️
> Registro genérico de alertas del sistema. Desacoplado de Ubibot: los datos específicos por tipo se almacenan en tablas hijas `ale_datos_*`.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_alerta` | INT UNSIGNED AI | NO | PK |
| `id_tipo_alerta` | TINYINT UNSIGNED | NO | 🆕 FK → `ale_tipo_alerta` RESTRICT (antes ENUM) |
| `id_origen_tipo` | TINYINT UNSIGNED | NO | 🆕 FK → `gen_tipos_origen` RESTRICT |
| `origen_id` | INT UNSIGNED | SÍ | 🆕 ID del dispositivo en su tabla nativa |
| `estado` | ENUM('pendiente','confirmado','resuelto','falsa_alarma') | NO | DEFAULT 'pendiente' |
| `severidad` | ENUM('baja','media','critica') | NO | DEFAULT 'media' |
| `datos_alerta` | JSON | SÍ | Metadatos adicionales no estructurados |
| `es_falsa_alarma` | TINYINT(1) | NO | DEFAULT 0 |
| `notificado_push` | TINYINT(1) | NO | DEFAULT 0 |
| `tiempo_respuesta_minutos` | DECIMAL(10,2) | SÍ | Generación → confirmación |
| `tiempo_resolucion_minutos` | DECIMAL(10,2) | SÍ | Generación → resolución |
| `fecha_alerta` | DATETIME | NO | DEFAULT CURRENT_TIMESTAMP |
| `fecha_confirmacion` / `fecha_resolucion` | DATETIME | SÍ | |

> **Eliminado en Block 1:** `id_canal` (Ubibot-specific), `tipo_alerta ENUM`, `valor_temperatura`, `umbral_minimo`, `umbral_maximo` — migrados a tablas `ale_datos_*`.

---

#### `ale_datos_temperatura` 🆕
> Datos específicos de alertas de temperatura (relación **1:1** con `ale_seguimiento`). Almacena el contexto de temperatura al momento de dispararse la alerta.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_ale_datos_temperatura` | INT UNSIGNED AI | NO | PK |
| `id_alerta` | INT UNSIGNED | NO | **UNIQUE** — FK → `ale_seguimiento` ON DELETE CASCADE |
| `id_canal` | INT UNSIGNED | SÍ | FK → `ubi_canal` ON DELETE SET NULL (NULL si canal fue eliminado) |
| `valor_temperatura` | DECIMAL(5,2) | NO | Temperatura media cuando se disparó la alerta |
| `umbral_minimo` / `umbral_maximo` | DECIMAL(5,2) | NO | Umbrales configurados al momento de la alerta |

> **UNIQUE KEY** en `id_alerta` garantiza la relación estricta 1:1 con `ale_seguimiento`.

---

#### `ale_datos_desconexion` 🆕
> Datos específicos de alertas de desconexión de sensores (relación **1:1** con `ale_seguimiento`).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_ale_datos_desconexion` | INT UNSIGNED AI | NO | PK |
| `id_alerta` | INT UNSIGNED | NO | **UNIQUE** — FK → `ale_seguimiento` ON DELETE CASCADE |
| `id_canal` | INT UNSIGNED | SÍ | FK → `ubi_canal` ON DELETE SET NULL |
| `ultima_lectura_antes` | DATETIME | NO | Timestamp de la última lectura antes de la desconexión |
| `primera_lectura_tras_reconexion` | DATETIME | SÍ | NULL mientras sigue desconectado |
| `duracion_desconexion_minutos` | DECIMAL(10,2) | SÍ | NULL mientras sigue desconectado |
| `umbral_minutos_configurado` | INT UNSIGNED | NO | Threshold en minutos que disparó la alerta |
| `lecturas_perdidas_estimadas` | INT UNSIGNED | SÍ | Lecturas que deberían haber llegado durante la desconexión |
| `ultimo_valor_temperatura` | DECIMAL(5,2) | SÍ | Última temperatura registrada antes de la desconexión (contexto) |

---

#### `ale_metricas_resumen`
> Métricas agregadas de alertas por día y opcionalmente por hora.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_metrica` | INT UNSIGNED AI | NO | PK |
| `fecha` | DATE | NO | UNIQUE con `hora` |
| `hora` | TINYINT | SÍ | NULL = resumen diario completo |
| `total_alertas_temperatura` / `total_alertas_desconexion` | INT | NO | DEFAULT 0 |
| `promedio_tiempo_respuesta` / `promedio_tiempo_resolucion` | DECIMAL(10,2) | SÍ | Minutos |
| `minimo_tiempo_respuesta` / `maximo_tiempo_respuesta` | DECIMAL(10,2) | SÍ | Minutos |
| `alertas_pendientes` / `_confirmadas` / `_resueltas` / `_falsa_alarma` | INT | NO | DEFAULT 0 |
| `push_enviados` / `push_fallidos` | INT | NO | DEFAULT 0 |
| `tasa_entrega_push` | DECIMAL(5,2) | SÍ | % de notificaciones push entregadas |
| `total_alertas_criticas` | INT | NO | DEFAULT 0 |
| `promedio_tiempo_respuesta_critica` | DECIMAL(10,2) | SÍ | Minutos — solo alertas críticas |
| `canales_alertados_unicos` | INT | NO | DEFAULT 0 |
| `id_canal_top` | INT UNSIGNED | SÍ | Canal con más alertas en el período |
| `alertas_canal_top` | INT | SÍ | Cantidad de alertas del canal top |
| `fecha_actualizacion` | DATETIME | NO | ON UPDATE CURRENT_TIMESTAMP |

---

#### `ale_push_suscripciones`
> Suscripciones Web Push de usuarios para notificaciones.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_suscripcion` | INT UNSIGNED AI | NO | PK |
| `id_usuario` | INT UNSIGNED | NO | FK → `gen_usuario` ON DELETE CASCADE |
| `endpoint` | VARCHAR(500) | NO | UNIQUE — URL push (CHECK `LIKE 'https://'`) |
| `p256dh` | VARCHAR(255) | NO | Clave pública de encriptación |
| `auth` | VARCHAR(255) | NO | Secret de autenticación |
| `tipo_dispositivo` | ENUM('escritorio','movil','tablet','desconocido') | NO | DEFAULT 'desconocido' |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `ultima_conexion` | DATETIME | SÍ | |
| `ultima_notificacion_enviada` | DATETIME | SÍ | |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `ale_preferencias_push`
> Preferencias de notificación push por suscripción (relación **1:1** con `ale_push_suscripciones`).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_preferencia` | INT UNSIGNED AI | NO | PK |
| `id_suscripcion` | INT UNSIGNED | NO | **UNIQUE** — FK → `ale_push_suscripciones` ON DELETE CASCADE |
| `dnd_habilitado` | TINYINT(1) | NO | DEFAULT 0 — modo No Molestar |
| `hora_inicio_dnd` / `hora_fin_dnd` | TIME | SÍ | Rango horario DND |
| `dias_dnd` | JSON | SÍ | Array de días de la semana para DND |
| `permitir_alertas_criticas` | TINYINT(1) | NO | DEFAULT 1 — críticas ignoran DND |
| `tipos_alerta_habilitados` | JSON | SÍ | NULL = todos los tipos habilitados |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

---

#### `ale_suscripciones_notificacion` 🆕
> Suscripciones unificadas por usuario, tipo de alerta, origen y **canal** (email o push). Reemplaza la antigua `ale_suscripciones_email`: una sola tabla para email y push.

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_suscripcion_notificacion` | INT UNSIGNED AI | NO | PK |
| `id_usuario` | INT UNSIGNED | NO | FK → `gen_usuario` ON DELETE CASCADE |
| `id_tipo_alerta` | TINYINT UNSIGNED | NO | FK → `ale_tipo_alerta` RESTRICT |
| `id_origen_tipo` | TINYINT UNSIGNED | NO | FK → `gen_tipos_origen` RESTRICT |
| `canal` | ENUM('email','push') | NO | Canal de entrega |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `ultima_notificacion_enviada` | DATETIME | SÍ | |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

**UNIQUE** `(id_usuario, id_tipo_alerta, id_origen_tipo, canal)`.

---

#### `ale_horarios_alerta_canal` 🆕
> Horario **base** de envío por tipo de alerta, canal y día. Definido por administradores. `dia_semana`: 1=Lun … 7=Dom; **0 = día feriado** (regla distinta en feriados).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_horario_alerta_canal` | INT UNSIGNED AI | NO | PK |
| `id_tipo_alerta` | TINYINT UNSIGNED | NO | FK → `ale_tipo_alerta` RESTRICT |
| `canal` | ENUM('email','push') | NO | |
| `dia_semana` | TINYINT(1) | NO | 1–7 Lun–Dom; **0 = feriado** |
| `hora_inicio` / `hora_fin` | TIME | NO | Ventana de envío |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `respeta_horario_operacional` | TINYINT(1) | NO | DEFAULT 1 — intersección con `gen_horario_operacional` |
| `respeta_feriados` | TINYINT(1) | NO | DEFAULT 1 — no enviar en feriados (según global) |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

**UNIQUE** `(id_tipo_alerta, canal, dia_semana)`.

---

#### `ale_horarios_usuario` 🆕
> Horario **personalizado** por usuario para un (tipo de alerta, canal, día). Si el usuario tiene al menos una fila para (id_usuario, id_tipo_alerta, canal), se usa esta tabla como horario efectivo; si no, se usa `ale_horarios_alerta_canal` (base).

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id_horario_usuario` | INT UNSIGNED AI | NO | PK |
| `id_usuario` | INT UNSIGNED | NO | FK → `gen_usuario` ON DELETE CASCADE |
| `id_tipo_alerta` | TINYINT UNSIGNED | NO | FK → `ale_tipo_alerta` RESTRICT |
| `canal` | ENUM('email','push') | NO | |
| `dia_semana` | TINYINT(1) | NO | 0=feriado, 1–7 Lun–Dom |
| `hora_inicio` / `hora_fin` | TIME | NO | Ventana de envío |
| `activo` | TINYINT(1) | NO | DEFAULT 1 |
| `respeta_horario_operacional` / `respeta_feriados` | TINYINT(1) | NO | DEFAULT 1 |
| `fecha_creacion` / `fecha_actualizacion` | DATETIME | NO | Timestamps de auditoría |

**UNIQUE** `(id_usuario, id_tipo_alerta, canal, dia_semana)`.

---

**Tablas de alertas eliminadas (alineación al modelo unificado):**
- `ale_suscripciones_email` — reemplazada por `ale_suscripciones_notificacion` (canal='email').
- `log_ale_suscripciones_email` — reemplazada por `log_ale_suscripciones_notificacion`.

---

### Tablas de Auditoría y Log (`log_`)

> **Fuente:** [`SQL_FILES/01_creacion_desde_cero/02_tablas_log.sql`](../SQL_FILES/01_creacion_desde_cero/02_tablas_log.sql)

#### Log de infraestructura (sin FK a tablas de dominio)

| Tabla | Propósito | Columnas clave |
|-------|-----------|----------------|
| `log_general` | Log general de SPs, funciones y eventos | `origen`, `mensaje`, `datos JSON`, `fecha_creacion DATETIME(6)` |
| `log_triggers` | Ejecuciones de triggers con datos antes/después | `trigger_nombre`, `tabla_afectada`, `tipo_operacion ENUM`, `datos_anteriores JSON`, `datos_nuevos JSON`, `cambiado_por` |
| `log_eventos` | Resultados de eventos del scheduler MySQL | `evento_nombre`, `resultado ENUM('EXITOSO','SIN_CAMBIOS','ERROR')`, `mensaje`, `datos JSON` |
| `log_stored_procedures` | Auditoría de SPs y funciones | `sp_nombre`, `tipo_operacion ENUM`, `tabla_afectada`, `id_registro`, `datos_anteriores JSON`, `datos_nuevos JSON` |
| `log_errores` | Errores capturados por `DECLARE HANDLER` | `origen`, `tipo_origen ENUM('TRIGGER','STORED_PROCEDURE','EVENTO','FUNCION','APLICACION')`, `codigo_error`, `mensaje_error`, `datos_contexto JSON` |

---

#### Log operacional (con FK a tablas de dominio)

| Tabla | Propósito | FKs |
|-------|-----------|-----|
| `log_rep_ejecucion` | Historial de ejecuciones de reportes programados | → `rep_reportes_programados` ON DELETE CASCADE · → `rep_reportes_generados` ON DELETE SET NULL |
| `log_ai_consultas` | Consultas a IA (incluye FULLTEXT en `texto_consulta`) | → `ai_costos_sesion` ON DELETE CASCADE · → `gen_usuario` ON DELETE CASCADE |

---

#### Log de datos base (audit trail de tablas seed)

Siguen el patrón `log_[tabla]` con columnas uniformes: `id_log_* BIGINT UNSIGNED AI`, `tipo_operacion ENUM('INSERT','UPDATE','DELETE')`, `id_registro INT UNSIGNED NULL`, `datos_anteriores JSON`, `datos_nuevos JSON`, `cambiado_por VARCHAR(100) DEFAULT 'SYSTEM'`, `fecha_creacion DATETIME(6)`.

> **Nota de diseño:** `id_registro` NO tiene FK a la tabla origen — las tablas de auditoría deben sobrevivir a la eliminación del registro padre. La referencia queda preservada en `datos_anteriores`/`datos_nuevos`.

| Tabla de log | Tabla auditada |
|--------------|----------------|
| `log_gen_usuario` | `gen_usuario` |
| `log_gen_permiso` | `gen_permiso` |
| `log_gen_usuario_permisos` | `gen_usuario_permisos` (PK compuesta → `id_registro NULL` siempre) |
| `log_gen_feriados_cl` | `gen_feriados_cl` |
| `log_gen_ubicaciones_reales` | `gen_ubicaciones_reales` |
| `log_gen_tipos_parametros` | `gen_tipos_parametros` |
| `log_gen_cofiguracion_grupos` | `gen_cofiguracion_grupos` |
| `log_gen_cofiguracion_parametros` | `gen_cofiguracion_parametros` |
| `log_gen_cofiguracion_valores` | `gen_cofiguracion_valores` |
| `log_rep_tipo_reporte` | `rep_tipo_reporte` |
| `log_rep_plantillas` | `rep_plantillas` |
| `log_sem_grupos` | `sem_grupos` |
| `log_sem_tipos_parametros` | `sem_tipos_parametros` |
| `log_sem_configuracion` | `sem_configuracion` |
| `log_sem_dispositivos` | `sem_dispositivos` |
| `log_ubi_canal` | `ubi_canal` |
| `log_ubi_grupo` | `ubi_grupo` |
| `log_ale_suscripciones_notificacion` | `ale_suscripciones_notificacion` |

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
│   ├── 01_tablas_base.sql       # Tablas gen_, rep_, ubi_, ai_, sem_, ale_
│   ├── 02_tablas_log.sql        # Tablas log_ (infraestructura + operacionales + audit trail)
│   ├── 03_triggers.sql          # Triggers de auditoría
│   └── 04_inserts_base.sql      # Seeds: configuración, catálogos, horarios
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
-- Tablas de alta volumetría — optimizar mensualmente
OPTIMIZE TABLE sem_mediciones;
OPTIMIZE TABLE sem_totales_hora;
OPTIMIZE TABLE ubi_lecturas_sensor;
OPTIMIZE TABLE ale_seguimiento;

-- Actualizar estadísticas del optimizador
ANALYZE TABLE sem_mediciones;
ANALYZE TABLE ubi_lecturas_sensor;
```

**Limpieza de datos antiguos**:
```sql
-- Ejemplo: Eliminar mediciones eléctricas mayores a 1 año
DELETE FROM sem_mediciones
WHERE fecha_creacion < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- Ejemplo: Archivar alertas resueltas con más de 6 meses
-- (considerar tabla de archivo separada antes de eliminar)
DELETE FROM ale_seguimiento
WHERE estado IN ('resuelto', 'falsa_alarma')
  AND fecha_alerta < DATE_SUB(NOW(), INTERVAL 6 MONTH);
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

**Última actualización**: 2026-03-09
**Versión**: 1.1.0
**Estado**: ✅ Sincronizado con SQL_FILES/01_creacion_desde_cero/
**Mantenido por**: Equipo TNS
