# Changelog

**The Next Security - TNS Track Demo**

> **Formato**: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
> **Versionado**: [Semantic Versioning](https://semver.org/)

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
