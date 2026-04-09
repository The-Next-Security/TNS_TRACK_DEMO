# Changelog

**The Next Security - TNS Track Demo**

> **Formato**: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
> **Versionado**: [Semantic Versioning](https://semver.org/)

---

## [1.1.1] - 2026-04-07

### Added
- **Permiso `view_beacon_temperature`**: Nuevo permiso específico para el módulo
  Temperatura (Beacons), desacoplado de `view_temperature`. Creado en `gen_permiso`
  con ID 25 y asignado a los usuarios iniciales.

### Fixed
- **Auth race condition en page refresh**: `checkAuth()` ahora pasa el header
  `Authorization` explícitamente en la llamada a `/api/auth/validate`, eliminando
  la dependencia del interceptor de axios que se inicializa en el componente padre.
  Al hacer F5, ya no se pierden los permisos del usuario.
- **Crash en módulo Temperatura**: Guard defensivo `Array.isArray()` en `setData()`
  previene `TypeError: data.map is not a function` cuando el endpoint retorna un
  objeto en lugar de un array.

### Security
- **Dependencias actualizadas** — 5 PRs de Dependabot incorporados (#88, #89, #90, #91, #92):
  axios 1.14.0, dotenv 17.4.0, react-router 7.14.0, react-router-dom 7.14.0,
  mapbox-gl 3.21.0.

---

## [1.1.0] - 2026-04-03

### Added
- **Módulo IA con Google Gemini**: Migración completa de DeepSeek/OpenAI a Google Gemini 2.0 Flash.
  Nuevo orquestador ReAct con retry y backoff exponencial, herramientas de consulta cruzada y endpoint
  `POST /api/ia/consulta-avanzada` (#70, PR #69).
- **Sistema de Suscripciones Push**: Nueva tabla `ale_suscripciones_notificacion` con matriz Tipo×Origen,
  rutas bajo `/api/alerts/subscriptions` y UI de configuración por tipo y canal (#81).
- **Cuartiles de Consumo Eléctrico**: SP `stpr_calcular_cuartiles_consumo` y evento trimestral
  `evn_recalcular_cuartiles_consumo` para recalcular CONSUMO BAJO/MEDIO/ALTO cada 3 meses (#80).
- **Detección de Entorno Webpack**: Build automático producción/desarrollo según `NODE_ENV` (#81).
- **Endpoint temperatura por dispositivo**: `GET /api/temperatura/dispositivo/:id` (#81).
- **Log de análisis IA**: Nueva tabla `log_notification_analysis` para trazabilidad de análisis (#81).

### Changed
- **Migración completa a Axios**: Eliminado `httpInterceptor_Utils` y `socket.io-client`. Todas las
  llamadas HTTP migradas a axios en componentes, hooks y servicios (#81).
- **Métricas SQL alineadas al esquema real**: `stpr_calculate_hourly_metrics` y
  `stpr_generate_daily_metrics` actualizados para usar `ale_tipo_alerta` y `origen_id` (#81).
- **Sincronización temperatura**: `stpr_sync_alert_temperature_by_id` y
  `stpr_sync_alert_temperature_historical` usan upsert en `ale_datos_temperatura` (#81).
- **Backend IA sin loopback HTTP**: `temperatureDashboard_Service` consulta BD directamente,
  sin llamadas HTTP internas (#70).
- **Scripts de arranque**: `npm run comenzar` con detección automática de entorno (#81).

### Fixed
- Columnas de grupo alineadas: `sd.grupo_id` → `sd.id_grupo`, joins `sg.id` → `sg.id_grupo`
  en `device_Controller` y `totales_Controller` (#81).
- `DateTime.fromISO()` → `DateTime.fromSQL()` con zona `America/Santiago` en consumo eléctrico (#81).
- DatePicker oculto por stacking context (Framer Motion + backdrop-blur) → resuelto con `portalId` (#81).
- `userId` en `notificationHorarios_Controller` y `reportScheduler_Controller` (#81).
- Modal de sesión por expirar traducido al español (#81).
- `refreshToken` enviado correctamente en body al extender sesión (#81).
- Preferencias push normalizadas al cargar y al suscribir (#81).
- `MetricsAggregationJob` duplicado eliminado del arranque del servidor (#81).
- DEFINER incorrecto (`root@%`) corregido en todos los objetos MySQL de desarrollo:
  6 funciones, 26 SPs, 7 eventos recreados desde el repositorio (#79).

### Security
- **Dependencias actualizadas**: 30+ PRs de Dependabot aplicados post-v1.0.0
  ([#57], [#58], [#59], [#60], [#61], [#63], [#64], [#65], [#66], [#67], [#71], [#72], [#73], [#85]).
- Parches de seguridad: axios, webpack-bundle-analyzer, baseline-browser-mapping, pdfkit,
  react-router-dom, posthog-js, puppeteer, framer-motion, mapbox-gl.

---

## [1.0.0] - 2026-03-18

### Added
- **Base de Datos Robusta**: Implementación del esquema `tns_cool_track` desde cero con más de 50 tablas, incluyendo triggers de auditoría, stored procedures para métricas y eventos programados.
- **Sistema de Configuración Centralizado**: Nueva arquitectura que gestiona credenciales y parámetros operativos directamente en la base de datos, eliminando la dependencia de archivos JSON estáticos.
- **Arquitectura Modular de Collectors**: Implementación de recolectores independientes para Shelly Cloud (eléctrico) y Ubibot (temperatura), facilitando la escalabilidad del sistema.
- **Rediseño del Sistema de Alertas (v4.0.0)**: Nuevo motor de alertas multi-canal que incluye gestión de horario operacional global, catálogos extensibles y soporte nativo para Email y Push.
- **Reportería Ejecutiva Automatizada**: Sistema de generación de reportes PDF detallados utilizando PDFKit, Puppeteer y QuickChart.js para visualización de métricas.
- **Capacidades de PWA**: Soporte completo para aplicaciones web progresivas, incluyendo Service Workers para funcionamiento offline y notificaciones Push nativas.
- **Seguridad Avanzada**: Autenticación JWT con rotación de tokens, control de versiones de sesión y hashing robusto mediante Argon2id.
- **Análisis con IA**: Integración con DeepSeek para análisis inteligente de patrones de temperatura y detección de anomalías en cámaras frigoríficas.
- **Documentación Técnica Integral**: Creación de una suite completa de documentos que cubren desde arquitectura y decisiones técnicas hasta inventario de APIs y guías de troubleshooting.

### Changed
- **Estandarización de Nomenclatura**: Refactorización masiva de más de 150 archivos para seguir el estándar camelCase con sufijos descriptivos (`_Controller`, `_Service`, `_View`, etc.).
- **Unificación de Librería de Fechas**: Migración completa de moment, date-fns y dayjs hacia **Luxon** como estándar único para todo el proyecto, garantizando consistencia en zonas horarias.
- **Reorganización de Rutas API**: Reestructuración de todos los endpoints del backend organizados por dominios de negocio claros (energía, temperatura, reportes, ia, etc.).
- **Limpieza de Código Legacy**: Eliminación de módulos obsoletos (SMS/Twilio, contador de ciclos antiguo) y depuración de dependencias no utilizadas.

### Fixed
- **Estabilidad de Inicio**: Corrección de errores críticos que impedían el arranque del servicio debido a inconsistencias entre el código y el nuevo esquema de base de datos.
- **Sincronización de Sesiones**: Mejora en el manejo de expiración de sesiones y sincronización entre pestañas del navegador.

### Security
- **Gestión de Secretos**: Migración de todas las API Keys y credenciales críticas desde el código fuente hacia tablas de configuración seguras en la base de datos.
- **Dependencias Actualizadas**: Aplicación masiva de parches de seguridad y actualizaciones de librerías mediante 30 PRs de Dependabot ([#56], [#55], [#54], [#53], [#52], [#51], [#50], [#49], [#48], [#47], [#45], [#44], [#43], [#42], [#41], [#40], [#39], [#38], [#37], [#36], [#27], [#28], [#29], [#30], [#31], [#25], [#24], [#23], [#22], [#21]).

---

## 📅 Roadmap de Releases Futuros

Ver [ROADMAP.md](./ROADMAP.md) para la planificación de las siguientes versiones.

---

## 📖 Tipos de Cambios

- **Added** (Agregado): Nueva funcionalidad
- **Changed** (Cambiado): Cambios en funcionalidad existente
- **Deprecated** (Deprecado): Funcionalidad que será removida
- **Removed** (Eliminado): Funcionalidad removida
- **Fixed** (Corregido): Corrección de bugs
- **Security** (Seguridad): Cambios de seguridad

---

## 🔢 Versionado Semántico

- **MAJOR** (X.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0): Nueva funcionalidad compatible
- **PATCH** (0.0.X): Correcciones de bugs compatibles

---

## 🔗 Referencias

- **Keep a Changelog**: https://keepachangelog.com/en/1.0.0/
- **Semantic Versioning**: https://semver.org/
- **Issue Tracking**: [GitHub Issues](https://github.com/andresTNS/TNS_TRACK_DEMO/issues)

---

**Última actualización**: 2026-03-18
