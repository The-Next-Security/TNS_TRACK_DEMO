# Pre-Changelog — Registro de Cambios en Desarrollo

> **Propósito**: Registro automático de todos los merges a `dev` como borrador para el próximo release.
> **Actualización**: Automática via GitHub Actions en cada PR mergeado a `dev`.
> **Uso**: Al preparar un release, revisar y editar estas entradas para crear la entrada en `CHANGELOG.md`.

---

## Instrucciones para el Release

1. Revisar y editar las entradas de la sección **Unreleased**
2. Mover el contenido revisado al `CHANGELOG.md` con el número de versión correspondiente
3. Limpiar la sección Unreleased de este archivo (dejar solo el placeholder)
4. Hacer commit de ambos archivos en el PR de release

---

## Unreleased

### 2026-03-11 — @andresTNS ([#14](https://github.com/andresTNS/TNS_TRACK_DEMO/pull/14))
- **chore** `documentation, SQL - BBDD, back-end, analytics, front-end` | [REFACTOR] Migración a Luxon como única librería de fechas (Issue #5)


> ⚠️ _Entradas retroactivas — registradas manualmente al implementar el flujo de PRE_CHANGELOG. Los issues anteriores no pasaron por el flujo automático de PR → dev._

---

### 2026-03-10 — [#12 Rediseño Sistema de Alertas](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/12)
- **feat** `enhancement, SQL - BBDD, back-end, IMPORTANT, architecture, refactoring` | Rediseño Sistema de Alertas — Horario Operacional Global, Tipos de Alerta y Migración a Nuevo Esquema
  - Corrección de 4 bugs críticos que impedían el arranque del servicio (tablas `alert_schedule_config`, `feriados_cl`, `push_subscriptions` y `scheduled_reports` inexistentes en el nuevo esquema)
  - Nueva tabla `gen_horario_operacional` — centraliza el horario operacional global, reemplazando configuración duplicada en `gen_configuracion_*`
  - Nueva tabla catálogo `ale_tipo_alerta` — reemplaza el ENUM de `ale_seguimiento` para ser extensible sin necesidad de `ALTER TABLE`
  - Eliminación completa del módulo SMS obsoleto (`smsService`, `smsController`, `smsRoutes`, `SmsData`)
  - Migración de `pushNotificationService`, `reportSchedulerService` y `alertScheduleConfigService` al nuevo esquema de tablas

---

### 2026-03-10 — [#3 Creación de tabla de configuración](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/3)
- **feat** `enhancement, SQL - BBDD, back-end, IMPORTANT` | Creación del sistema de configuración centralizado en base de datos
  - Creación de tabla `sem_configuracion` para almacenar parámetros del sistema directamente en BD
  - Reemplaza el archivo `unified-config.json` como fuente de configuración del sistema
  - Sistema escalable: permite múltiples tipos y categorías de configuración sin modificar el esquema
  - Sub-issue de #1 (BD desde cero)

---

### 2026-03-09 — [#4 Estandarización de Nomenclatura del Proyecto](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/4)
- **refactor** `IMPORTANT, refactoring, technical-debt` | Estandarización de nomenclatura camelCase + sufijos en ~150 archivos del proyecto
  - Renombrado masivo de archivos JS/JSX aplicando sufijos descriptivos: `_Service`, `_Controller`, `_Utils`, `_Middleware`, `_Config`, `_Routes`, `_Hook`, `_Template`, `_Adapter`, `_Handler`, `_Job`, `_Constants`, `_View`
  - Actualización de todos los imports afectados en cascada
  - Creación de documentación de estándares de nomenclatura SQL y JavaScript/React
  - Eliminación de mezcla de estilos (snake_case, PascalCase, camelCase sin sufijo)

---

### 2026-03-03 — [#1 Creación de la base de datos desde cero](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/1)
- **feat** `good first issue, SQL - BBDD, IMPORTANT` | Creación del esquema completo de `tns_cool_track` como fuente de verdad del sistema
  - Diseño y creación de todas las tablas base del sistema (usuarios, permisos, dispositivos, sensores, alertas, reportes, logs)
  - Implementación de triggers de auditoría, stored procedures, funciones y eventos programados
  - Índices optimizados para queries frecuentes
  - Scripts de datos semilla (`04_inserts_base.sql`) con configuración inicial del sistema

---

### 2026-01-27 — [#8 Gestión de Secretos y Migración a Base de Datos](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/8)
- **refactor** `SQL - BBDD, refactoring, security, technical-debt` | Migración de credenciales desde archivos JSON a base de datos con encriptación AES-256
  - Creación de tablas `gen_secrets` y `gen_encryption_keys` para almacenamiento seguro de API keys y tokens
  - Refactorización de collectors (Shelly, Ubibot) y servicios (SendGrid, DeepSeek, Mapbox, PostHog) para usar `secretsService` centralizado
  - Eliminación de credenciales de archivos versionados
  - Preparación para gestión de secretos por ambiente (development/production)

---

### 2026-01-27 — [#2 Documentación Inicial](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/2)
- **docs** `documentation, good first issue, IMPORTANT, bug-prevention` | Creación de documentación inicial completa del proyecto
  - `README.md` — descripción general, objetivos, convenciones, stack tecnológico y arquitectura
  - `Base_de_Datos.md` — referencia de tablas, triggers, stored procedures y convenciones de BD
  - `Apis_externas.md` — catálogo de todas las APIs externas utilizadas y su impacto en el sistema
  - `Info_Github.md` — convenciones de issues, ramas, commits y flujo de trabajo en GitHub

---

### 2026-01-26 — [#7 Gestión de Secretos y Migración a Base de Datos](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/7)
- **refactor** `SQL - BBDD, refactoring, security, technical-debt` | Diseño e infraestructura inicial para gestión centralizada de secretos en BD
  - Definición del esquema de tablas `gen_secrets` y `gen_encryption_keys` con versionado y auditoría de acceso
  - Análisis de todos los puntos del sistema donde se usan credenciales en archivos planos
  - Establecimiento del patrón de migración para centralizar credenciales con encriptación AES-256
