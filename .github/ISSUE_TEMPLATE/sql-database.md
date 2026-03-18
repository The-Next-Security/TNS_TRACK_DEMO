---
name: 🗄️ SQL / Base de Datos
about: Cambios en estructura de base de datos, stored procedures, triggers, o queries
title: '[SQL] '
labels: 'SQL - BBDD'
assignees: ''
---

## 🗄️ Idea General

[Descripción clara del cambio en base de datos]

## 🎯 Objetivo

[¿Qué problema resuelve o qué mejora aporta este cambio?]

## 📊 Tipo de Cambio

- [ ] **Crear nueva(s) tabla(s)**
- [ ] **Modificar tabla(s) existente(s)** (agregar/eliminar columnas)
- [ ] **Crear/Modificar índices**
- [ ] **Crear/Modificar stored procedure(s)**
- [ ] **Crear/Modificar trigger(s)**
- [ ] **Crear/Modificar vista(s)**
- [ ] **Migración de datos**
- [ ] **Optimización de queries**
- [ ] **Otro**: [especificar]

---

## 📋 Detalle de Cambios

### Tablas Involucradas

#### Nueva(s) Tabla(s)

**Tabla**: `[prefijo]_nombre_tabla`
- **Prefijo**: `gen_` / `rep_` / `ale_` / `sem_` / `ubi_` ([ver convenciones Issue #1](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/1))
- **Propósito**: [Descripción]

**Columnas**:
```sql
CREATE TABLE [prefijo]_nombre_tabla (
    id_[nombre] INT PRIMARY KEY AUTO_INCREMENT,
    columna1 VARCHAR(255) NOT NULL,
    columna2 DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Tabla(s) Existente(s) a Modificar

**Tabla**: `[nombre_tabla_existente]`
- **Cambio**: [Agregar columna X / Modificar tipo de columna Y / Eliminar columna Z]

```sql
ALTER TABLE [nombre_tabla]
ADD COLUMN nueva_columna VARCHAR(100) AFTER columna_existente;
```

### Índices

**Convención**: `[tipo]_[tabla]_[columna]` o `[tipo]_[tabla]_[col1]-[col2]` para compuestos

**Índices a crear**:
```sql
-- Índice simple
CREATE INDEX idx_[tabla]_[columna] ON [tabla]([columna]);

-- Índice compuesto
CREATE INDEX idx_[tabla]_[col1]-[col2] ON [tabla]([col1], [col2]);

-- Índice único
CREATE UNIQUE INDEX uk_[tabla]_[columna] ON [tabla]([columna]);
```

**Justificación de índices**:
- `idx_X`: [Por qué se necesita, qué queries optimiza]

### Foreign Keys

**Convención**: `fk_[tabla_origen]_[col_origen]_[tabla_destino]_[col_destino]`

```sql
ALTER TABLE [tabla_origen]
ADD CONSTRAINT fk_[tabla_origen]_[col]_[tabla_destino]_[col]
FOREIGN KEY ([columna_origen]) REFERENCES [tabla_destino]([columna_destino])
ON DELETE [CASCADE/RESTRICT/SET NULL]
ON UPDATE [CASCADE/RESTRICT];
```

### Stored Procedures

**Nombre**: `sp_[accion]_[entidad]`

```sql
DELIMITER //
CREATE PROCEDURE sp_nombre_procedure(
    IN param1 INT,
    OUT resultado VARCHAR(255)
)
BEGIN
    -- Lógica del procedimiento
END //
DELIMITER ;
```

**Propósito**: [Qué hace este stored procedure]

### Triggers

**Nombre**: `trg_[tabla]_[accion]_[momento]` (ej: `trg_usuario_audit_after_insert`)

```sql
DELIMITER //
CREATE TRIGGER trg_nombre_trigger
AFTER INSERT ON [tabla]
FOR EACH ROW
BEGIN
    -- Lógica del trigger
END //
DELIMITER ;
```

**Propósito**: [Qué hace este trigger]

---

## 🔄 Migración de Datos

- [ ] **No requiere migración de datos**
- [ ] **Requiere migración de datos**

**Si requiere migración**:

### Script de Migración

```sql
-- Ejemplo: Migrar datos de tabla antigua a nueva estructura
INSERT INTO nueva_tabla (col1, col2)
SELECT old_col1, old_col2
FROM tabla_antigua
WHERE condicion;
```

### Plan de Rollback

```sql
-- Script para revertir cambios si es necesario
DROP TABLE IF EXISTS nueva_tabla;
-- ...
```

---

## ⚡ Impacto en Performance

### Queries Afectadas

[Listar queries SQL que se verán impactadas por estos cambios]

### Estimación de Tamaño

- **Registros esperados**: [cantidad aproximada]
- **Crecimiento estimado**: [X registros/día]
- **Tamaño en disco**: [MB/GB estimado]

### Análisis con EXPLAIN

```sql
EXPLAIN SELECT ...
-- Pegar resultado del EXPLAIN aquí
```

---

## 📁 Archivos a Crear/Modificar

### Scripts SQL

- [ ] `servicios/src/db/migrations/YYYY-MM-DD_descripcion.sql` → Script de creación/migración
- [ ] `servicios/src/db/rollback/YYYY-MM-DD_descripcion_rollback.sql` → Script de rollback

### Archivos de Aplicación

- [ ] `servicios/src/models/[modelo].js` → [Descripción]
- [ ] `servicios/src/services/[servicio].js` → [Descripción]
- [ ] `servicios/src/config/db_config.js` → [Descripción]

### Documentación

- [ ] `Base_de_Datos.md` → Actualizar con nuevas tablas/cambios

---

## ✅ Criterios de Aceptación

- [ ] Script SQL probado en entorno de desarrollo
- [ ] Convenciones de nomenclatura seguidas (Issue #1)
- [ ] Índices justificados y probados con EXPLAIN
- [ ] Foreign keys configuradas correctamente (ON DELETE/UPDATE)
- [ ] Script de rollback creado y probado
- [ ] Migración de datos (si aplica) probada
- [ ] Documentación actualizada en `Base_de_Datos.md`
- [ ] Queries optimizadas (sin N+1, sin full table scans innecesarios)
- [ ] Archivos de aplicación actualizados para usar nueva estructura

---

## 🧪 Plan de Testing

### Testing en Development

```bash
# Pasos para probar en development
mysql -u usuario -p database_dev < script.sql
# Verificar cambios
SHOW TABLES;
DESCRIBE [tabla];
# Probar queries
SELECT ...
```

### Testing en Production (cuando aplique)

- [ ] Backup completo antes de ejecutar
- [ ] Ejecutar en horario de baja demanda
- [ ] Plan de rollback listo
- [ ] Monitoreo de performance post-cambio

---

## 🔗 Issues Relacionados

- Relacionado con #1 (Convenciones de BD)
- Relacionado con #[número]
- Depende de #[número]

---

## ⚠️ Riesgos y Consideraciones

### Riesgos Identificados

- [ ] 🔴 **Alto Riesgo** - Modifica datos críticos / Downtime
- [ ] 🟠 **Medio Riesgo** - Puede afectar performance
- [ ] 🟢 **Bajo Riesgo** - Solo agregar datos/tablas nuevas

### Consideraciones de Seguridad

- [ ] Datos sensibles involucrados (requiere encriptación)
- [ ] Permisos de usuario afectados
- [ ] Auditoría requerida

### Compatibilidad hacia Atrás

- [ ] ✅ **Backward compatible** - No rompe código existente
- [ ] ❌ **Breaking change** - Requiere actualizar código de aplicación

---

## 📌 Notas Adicionales

[Cualquier información adicional relevante]

---

**Base de Datos**: `tns_cool_track` (MySQL)
**Zona Horaria**: America/Santiago
**Charset**: utf8mb4_unicode_ci
