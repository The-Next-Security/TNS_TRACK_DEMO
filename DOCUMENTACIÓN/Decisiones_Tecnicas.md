# Decisiones Técnicas Clave

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-03-11
> **Versión**: 2.1.0
> **Propósito**: Documentar todas las decisiones arquitectónicas y técnicas del proyecto

---

## 📋 Índice

1. [Arquitectura Modular por Collectors](#1-arquitectura-modular-por-collectors)
2. [PWA con Service Workers](#2-pwa-con-service-workers)
3. [React 19.2.0 + TailwindCSS](#3-react-1920--tailwindcss)
4. [Express 5.1.0 (versión moderna)](#4-express-510-versión-moderna)
5. [NO uso de Variables de Entorno](#5-no-uso-de-variables-de-entorno)
6. [Zona Horaria Base: America/Santiago](#6-zona-horaria-base-americasantiago)
7. [DeepSeek como Provider de IA](#7-deepseek-como-provider-de-ia)
8. [Notificaciones: Email + Push (NO SMS)](#8-notificaciones-email--push-no-sms)
9. [MySQL como Base de Datos Principal](#9-mysql-como-base-de-datos-principal)
10. [Estandarización de Librería de Fechas con Luxon](#10-estandarización-de-librería-de-fechas-con-luxon)
11. [Modelo unificado de notificaciones y horarios](#11-modelo-unificado-de-notificaciones-y-horarios)

---

## Principios de Desarrollo

Todas las decisiones técnicas se basan en estos tres principios fundamentales:

### 1. KISS (Keep It Simple, Stupid)
- **Descripción**: Priorizar simplicidad sobre complejidad innecesaria
- **Aplicación**: Evitar sobre-ingeniería, elegir soluciones directas y comprensibles
- **Ejemplo**: Usar funciones simples en lugar de patrones complejos cuando la funcionalidad lo permite

### 2. DRY (Don't Repeat Yourself)
- **Descripción**: Evitar duplicación de código mediante modularización
- **Aplicación**: Extraer lógica común a funciones/servicios reutilizables
- **Ejemplo**: Servicios compartidos como `emailService.js`, `databaseService.js`

### 3. Modularización Máxima
- **Descripción**: Separar responsabilidades en módulos independientes y testables
- **Aplicación**: Cada módulo tiene una responsabilidad única y bien definida
- **Ejemplo**: Patrón de Collectors independientes por cada fuente de datos

---

## 1. Arquitectura Modular por Collectors

### Contexto
Necesitábamos una forma escalable y mantenible de integrar múltiples fuentes de datos de dispositivos IoT (Shelly, Ubibot, etc.) sin crear un monolito acoplado.

### Decisión
Implementar un patrón de **Collectors modulares** donde cada fuente de datos tiene su propio módulo independiente.

### Estructura
```
/servicios/src/
├── collectors/
│   ├── shellyCollector.js      # Collector para dispositivos Shelly
│   ├── ubibotCollector.js      # Collector para dispositivos Ubibot
│   └── [futuroCollector].js    # Fácilmente extensible
```

### Estado Actual
✅ **Implementado** - Collectors activos: Shelly, Ubibot

---

## 2. PWA con Service Workers

### Contexto
Se requería que la aplicación funcionara offline y pudiera instalarse como app nativa en dispositivos móviles.

### Decisión
Implementar **Progressive Web App (PWA)** con Service Workers para:
- Funcionalidad offline
- Instalación en dispositivos
- Push notifications
- Caché estratégica de assets

### Implementación
```
/servicios/public/
├── service-worker.js           # Service Worker principal
├── manifest.json               # Manifest PWA
└── icons/                      # Iconos para instalación
```

### Estado Actual
✅ **Implementado** - PWA completamente funcional con push notifications

---

## 3. React 19.2.0 + TailwindCSS

### Contexto
Se necesitaba un framework moderno y performante para el frontend con desarrollo ágil de UI.

### Decisión
- **React 19.2.0**: Última versión estable con mejoras de performance
- **TailwindCSS**: Utility-first CSS para desarrollo rápido y consistente

### Estado Actual
✅ **Implementado** - Frontend completo en React 19.2.0 + TailwindCSS

---

## 4. Express 5.1.0 (versión moderna)

### Contexto
El backend requería un framework estable, performante y con soporte de la comunidad.

### Decisión
Usar **Express 5.1.0** (versión moderna) en lugar de versiones anteriores o frameworks alternativos.

### Estado Actual
✅ **Implementado** - Backend corriendo en Express 5.1.0

---

## 5. NO uso de Variables de Entorno

### Contexto
Típicamente, aplicaciones Node.js usan archivos `.env` para configuración. Sin embargo, esto genera problemas de:
- Sincronización entre ambientes
- Configuración fragmentada
- Dificultad para auditar cambios

### Decisión
**Por diseño, NO se utilizan variables de entorno** (`.env`).

### Rationale
- Toda configuración se gestiona desde **base de datos centralizada**
- Configuración dinámica sin reinicio de servidor
- Auditoría completa de cambios vía SQL
- Una única fuente de verdad

### Excepciones
- ⚠️ Solo configuración de arranque crítica puede ir en archivos de configuración

### Estado Actual
✅ **Implementado** - No se usan variables de entorno `.env`

---

## 6. Zona Horaria Base: America/Santiago

### Contexto
El sistema puede usarse desde distintas zonas horarias, pero los servidores y datos deben tener una zona horaria de referencia consistente.

### Decisión
**SIEMPRE usar America/Santiago (Chile) como zona horaria base del sistema**.

### Implementación
```javascript
// Backend - timezone configurado en config
timezone: 'America/Santiago'

// Uso con Luxon (única librería de fechas del proyecto)
const { DateTime } = require('luxon');
DateTime.now().setZone('America/Santiago');
```

> **Nota**: El proyecto está estandarizando en **Luxon** (Issue #5); moment se mantiene temporalmente en partes del código hasta completar la migración.

### Estado Actual
✅ **Implementado** - Timezone base configurado en `America/Santiago`

---

## 7. DeepSeek como Provider de IA

### Contexto
El sistema requiere capacidades de IA para análisis de datos y generación de insights.

### Decisión
Usar **DeepSeek** como proveedor de servicios de IA.

### Implementación
```javascript
// Configuración DeepSeek en base de datos
aiProvider: 'deepseek'
```

### Estado Actual
✅ **Implementado** - DeepSeek configurado como provider de IA

---

## 8. Notificaciones: Email + Push (NO SMS)

### Contexto
El sistema original consideraba SMS vía Twilio como canal de notificación, pero se decidió eliminarlo.

### Decisión
**NO usar SMS/Twilio**. Canales de notificación soportados:
- ✅ **Email** (vía SendGrid)
- ✅ **Push Notifications** (vía Web Push)

### Rationale
- SMS tiene costos elevados por mensaje
- Email y Push son suficientes para el caso de uso
- Mejor experiencia de usuario con notificaciones ricas (push)

### Implementación
```javascript
// Servicios de notificación
emailService.js       // SendGrid Mail 8.1.4
pushService.js        // Web Push 3.6.7
```

### Estado Actual
✅ **Implementado** - SMS/Twilio completamente removido del sistema

---

## 11. Modelo unificado de notificaciones y horarios

### Contexto
Las suscripciones de notificación y los criterios de envío estaban repartidos entre email (ale_suscripciones_email) y push, con lógica de horario duplicada y sin horarios configurables por tipo de alerta ni por usuario.

### Decisión
- **Una sola tabla de suscripciones:** `ale_suscripciones_notificacion` por usuario/tipo/origen y **canal** (email o push). Reemplaza `ale_suscripciones_email`.
- **Horarios base por tipo y canal:** `ale_horarios_alerta_canal` definidos por administradores (tipo de alerta, canal, día de la semana). **dia_semana = 0** indica regla para **día feriado** (permite ventana distinta en feriados).
- **Horarios personalizados por usuario:** `ale_horarios_usuario`. Si el usuario tiene filas para (usuario, tipo, canal), se usa esta tabla como horario efectivo; si no, se usa el horario base.
- **Un único servicio de decisión:** `notificationSchedule_Service.shouldSendNotification()` responde “¿enviar o no?” usando horario efectivo (usuario si existe, si no base), ventana, intersección con `gen_horario_operacional`, feriados (`gen_feriados_cl`) y, para push, DND (`ale_preferencias_push`).
- **Eliminación de tablas obsoletas:** `ale_suscripciones_email` y `log_ale_suscripciones_email` (y triggers asociados) eliminados; creación desde cero y migración alineadas al modelo unificado.

### Rationale
- Un solo lugar para decidir envío; email y push comparten suscripciones y reglas de ventana.
- Administradores definen cuándo se envían alertas por tipo (ej. temperatura fuera de horario laboral; feriados todas las horas); usuarios pueden sobrescribir con sus propias ventanas.

### Estado Actual
✅ **Implementado** - Modelo unificado en BD, servicio único de decisión, APIs y frontend para horarios base (admin) y horarios usuario (mis horarios).

---

## 9. MySQL como Base de Datos Principal

### Contexto
Se necesitaba una base de datos relacional robusta, performante y con buen soporte.

### Decisión
Usar **MySQL** (NO MariaDB) como base de datos principal.

### Driver
```json
"mysql2": "^3.15.2"
```

### Estado Actual
✅ **Implementado** - MySQL 8.x corriendo en producción

---

## 10. Estandarización de Librería de Fechas con Luxon

### Contexto
El proyecto utilizaba simultáneamente cuatro librerías de manejo de fechas (**moment**, **moment-timezone**, **date-fns**, **dayjs**), lo que generaba redundancia, bundle inflado, inconsistencia en formatos y mayor superficie de mantenimiento. El análisis del Issue #5 identificó ~54 archivos afectados en backend y frontend.

### Decisión
Usar **Luxon** como **única** librería de fechas en todo el proyecto (backend y frontend).

### Rationale
- El wrapper central `date_Utils.js` y varios controllers ya utilizaban Luxon; parte del trabajo estaba hecho.
- Soporte **nativo** de zonas horarias (sin paquete adicional), alineado con la decisión de zona base **America/Santiago** (sección 6).
- API inmutable y moderna; reemplazo directo de patrones como `moment().tz('America/Santiago')` y `moment.utc().tz()`.
- Existe **chartjs-adapter-luxon** para reemplazar `chartjs-adapter-date-fns` en los componentes que usan Chart.js.

### Alcance
- Migrar todos los usos de **moment**, **moment-timezone**, **dayjs** y **date-fns** a Luxon.
- Sustituir **chartjs-adapter-date-fns** por **chartjs-adapter-luxon**.
- Crear o ampliar utilidades centralizadas de fechas (`date_Utils.js` y las que se definan) para apoyo al resto del proyecto.
- Eliminar dependencias redundantes de `package.json` una vez completada la migración.

### Implementación
```javascript
// Zona base (alineado con sección 6)
const { DateTime } = require('luxon');
DateTime.now().setZone('America/Santiago');

// Formato estándar
DateTime.fromISO(date).toFormat('yyyy-MM-dd HH:mm:ss');
```

### Estado Actual
✅ **Implementado** — Luxon como única librería de fechas (Issue #5). Chart.js con chartjs-adapter-luxon; zona America/Santiago en backend y frontend.

### Referencias
- **Issue**: [#5 — REFACTOR Estandarizar Librería de Fechas](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/5)
- Parte de **#9** (FASE 0 - Planificación y Fundamentos)

---

## 11. Refactor de rutas API (Issue #11)

### Contexto
La API del backend heredó múltiples endpoints de un proyecto anterior, incluyendo módulos legacy y rutas parcialmente integradas (dashboards, contador de ciclos, ingesta GPS antigua, sectores/beacons, etc.). Esto generaba ruido, complejidad y endpoints que ya no formaban parte del producto real.

### Decisión

- Eliminar los módulos y endpoints obsoletos:
  - Capa de `/api/dashboard` (archivo `dashboard_Routes.js` y controladores de dashboard eléctrico/temperatura).
  - Módulo de contador de ciclos de descongelamiento (`contadorCiclos_Routes.js`, `contadorCiclos_Controller.js`, `contadorCiclos_Utils.js` y el componente `ContadorCiclosDescongelamiento`).
  - Endpoint legacy `POST /gps-data` (`gpsData_Routes.js` y su montaje en `server.js`).
  - Rutas actuales de `/api/sectores` y `/api/beacons`, junto con su uso directo en la SPA. Los dominios quedan reservados para un rediseño futuro del apartado de sectores y beacons.

- Reagrupar análisis bajo el dominio que analizan:
  - Eliminar el dominio genérico `/api/analysis` y mantener `/api/powerAnalysis` como punto único para el análisis de temperatura y potencia (alineado con `TemperaturePowerAnalysis_View`).
  - Regla general: cualquier análisis futuro debe exponerse bajo el dominio que analiza (ej: `/api/temperatura/analisis/...`, `/api/alertas/analisis/...`).

- Ajustar dominios de Temperatura e IA:
  - Mantener a corto plazo el dominio `/api/ubibot` por compatibilidad, documentando que el dominio de negocio es **temperatura** y que Ubibot es un detalle de implementación. En refactors futuros, los endpoints se reexpondrán bajo `/api/temperatura/...`.
  - Sustituir el dominio `/api/v1/ai-analysis` por `/api/ia/analisis`, eliminando el versionado explícito en la URL y actualizando servidor y frontend.

### Estado Actual
✅ Implementado — Limpieza de endpoints legacy y ajuste de dominios según Issue #11.

---

## 12. Alineación total endpoints con BD (ubi_canal + id_preset, reportería)

### Contexto
Plan de alineación de todos los endpoints con el esquema de BD definido en SQL_FILES y Base_de_Datos.md. Incluye migración de tablas legacy a rep_*, ubi_*, sem_*, etc.

### Decisiones aplicadas

- **ubi_canal ↔ ubi_grupo (antes ubi_presets_temperatura):** Se añadió FK `id_preset` en ubi_canal; se eliminaron `temperatura_minima_umbral`, `temperatura_maxima_umbral`, `fecha_actualizacion_umbral`, `usuario_actualizacion_umbral`. Los umbrales se obtienen siempre por JOIN con ubi_grupo. Al cambiar un preset, todos los canales que lo usan se actualizan implícitamente.
- **Reportería:** Se añadieron columnas a rep_plantillas (max_dispositivos, max_dias, admite_comparativo, tiempo_estimado_segundos) y rep_reportes_generados (id_usuario, fecha_inicio_periodo, fecha_fin_periodo, ids_dispositivos, config_reporte, tiempo_generacion_segundos, mensaje_error_generacion).
- **Presets:** presets_Controller migrado de temperature_presets a ubi_grupo. SP stpr_apply_preset_to_cameras actualizado para usar UPDATE id_preset.
- **GPS/blindspot/sectores/beacons:** Sin cambios en esquema; dominios reservados (Issue #26 para sectores/beacons).

### Estado Actual
✅ Parcialmente implementado — Esquema SQL, SP, triggers, ubibot_Service, presets_Controller, Base_de_Datos.md, inventario en APIs_internas.md.

---

## 13. Rename ubi_presets_temperatura → ubi_grupo + modelo dual de umbrales (Issues #32 y #33)

### Contexto
Issue #32: Los endpoints `GET/POST /api/config/teltonica/temperatura-umbrales` referencian la tabla `parametrizaciones` que no existe en el nuevo schema. Issue #33: `updateChannelThresholds` fallaba en runtime con "Unknown column" porque `ubi_canal` no tenía columnas `threshold_min`/`threshold_max`.

### Decisiones aplicadas

- **Rename `ubi_presets_temperatura` → `ubi_grupo`:** Nombre genérico que refleja mejor el rol de la tabla (grupo de configuración), no acoplado al dominio de temperatura. Afecta tabla, log, trigger, SPs, controllers y services.
- **Modelo dual de umbrales:** Se agregan columnas `umbral_min`/`umbral_max` en `ubi_canal` como override individual (NULL por defecto). Lógica de resolución: `COALESCE(c.umbral_min, g.temperatura_minima)` — el override individual tiene prioridad; si es NULL, se usa el default del grupo.
- **Issue #32 → HTTP 501:** Los endpoints Teltonika de temperatura-umbrales retornan 501 Not Implemented hasta que se planifique la migración con prefijo `tel_` en BD. `Configuration_View.js` maneja el 501 de forma graceful sin crashear el resto del formulario.
- **Sin migration script:** BD se crea desde cero; solo se actualizaron SQL_FILES.

### Estado Actual
✅ Implementado — SQL_FILES, controllers (presets, ubibot, aiAnalysis), services (notification, aiData, ubibot_Adapter, temperatureAggregation), frontend (DashboardTemperatura_View, Configuration_View), documentación.

---

## 14. Reorganización completa de endpoints por dominios de negocio (Issue #11 — Fase final)

### Contexto
Tras la limpieza inicial de rutas legacy (Decisión #11), el backend mantenía una organización inconsistente: dominios de negocio mezclados en archivos de rutas distintos, prefijos de URL acoplados a detalles de implementación (`/api/ubibot`, `/api/alerts`, `/api/reports`), controladores duplicados o sin montar, y módulos Teltonika futuros causando errores 500 en producción. El Issue #11 declaró la reorganización como completada pero la segunda fase quedó pendiente.

### Decisión

**Estructura de dominios adoptada:**
| Prefijo | Dominio | Reemplaza |
|---------|---------|-----------|
| `/api/energia` | Energía eléctrica (Shelly) | `/api/devices`, `/api/totals`, `/api/consumo` |
| `/api/temperatura` | Temperatura (Ubibot) + presets | `/api/ubibot`, `/api/presets` |
| `/api/reportes` | Todos los reportes + descongelamiento | `/api/reports` + endpoints defrost de `/api/ubibot` |
| `/api/analisis` | Análisis cruzado temperatura+potencia | `/api/powerAnalysis` |
| `/api/ia` | Inteligencia Artificial | `/api/ia/analisis` |
| `/api/alertas` | Tracking de alertas | `/api/alerts` |
| `/api/config` | Configuración (5 archivos separados) | `/api/config` (monolítico) |
| `/api/beacons` | FUTURO Teltonika — stub 501 | — |
| `/api/sectores` | FUTURO Teltonika — stub 501 | — |

**Acciones aplicadas:**
- Eliminados 4 controladores muertos: `config_Controller` (copia exacta de `semConfig_Controller`), `analysis_Controller` (versión obsoleta con bug hardcodeado `'Reefer A'`), `system_Controller` y `group_Controller` (no montados, métodos `databaseService` inexistentes).
- Eliminados 11 archivos de rutas obsoletos reemplazados por los 13 nuevos dominio-específicos.
- Implementado método real `bulkUpdateChannelThresholds` en `ubibot_Controller` (faltaba; el frontend lo llamaba produciendo 404).
- Módulos futuros Teltonika (GPS, BlindSpot, Personal, Beacons, Sectores) → responden HTTP 501 en todos sus métodos.
- Frontend (28 componentes) sincronizado con los nuevos paths; cero referencias a URLs antiguas en código activo.

### Alternativas Consideradas
- **Mantener prefijos originales con aliases**: Descartado — perpetúa la deuda técnica y no resuelve la incoherencia de dominio.
- **Reorganización incremental por dominio**: Descartado — mayor riesgo de inconsistencias parciales; la reorganización completa en un único PR es más segura.

### Estado Actual
✅ Implementado — 13 nuevos archivos de rutas, `server.js` actualizado, 28 componentes frontend sincronizados, controladores muertos eliminados.

---

## 📝 Historial de Cambios

> **Nota**: Para historial detallado de cambios del proyecto, ver [CHANGELOG.md](./CHANGELOG.md)

| Fecha | Decisión | Responsable |
|-------|----------|-------------|
| 2026-03-17 | Reorganización completa de endpoints por dominios de negocio (Issue #11 — Fase final): 13 dominios, 28 componentes sincronizados, 4 controladores muertos eliminados | andresTNS, Bufigol |
| 2026-03-12 | Alineación endpoints con BD: ubi_canal+id_preset (Opción A), rep_plantillas/rep_reportes_generados, presets | andresTNS, Bufigol |
| 2026-03-11 | Modelo unificado de notificaciones: ale_suscripciones_notificacion, horarios base/custom, servicio único de decisión; eliminación ale_suscripciones_email | Plan Notificaciones unificadas |
| 2026-03-11 | Estandarización de fechas: Luxon como única librería (Issue #5) | andresTNS, Bufigol |
| 2026-01-26 | Documentación actualizada según feedback Issue #2 | andresTNS, Bufigol |
| 2026-01-22 | Documentación completa de decisiones técnicas | andresTNS, Bufigol |
| 2026-01-15 | Eliminación de SMS/Twilio | andresTNS |
| 2026-01-10 | Migración a BD iniciada | andresTNS |

---

## 🔄 Decisiones en Revisión

| Decisión | Estado | Issue | Posible Impacto |
|----------|--------|-------|-----------------|
| _Ninguna decisión en revisión actualmente_ | - | - | - |

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-03-17
