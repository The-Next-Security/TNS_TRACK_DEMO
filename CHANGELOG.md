# Changelog

**The Next Security - TNS Track Demo**

> **Formato**: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
> **Versionado**: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### 🚧 Estado del Proyecto

**El proyecto NO tiene releases oficiales aún.**

Este es un sistema de demostración en desarrollo activo. Antes del primer release (v0.1.0), debemos completar la **FASE 0: Planificación y Fundamentos** documentada en [ROADMAP.md](./ROADMAP.md).

### En Progreso (FASE 0)

**Ver Issue #9 para tracking completo de FASE 0**

Trabajos actuales en desarrollo:
- **Issue #1**: Creación de base de datos desde cero (convenciones y estructura)
- **Issue #2**: Documentación inicial del proyecto (en progreso)
- **Issue #3**: Tabla de configuración centralizada (migración desde JSONs)
- **Issue #4**: Análisis y definición de alcance completo
- **Issue #5**: Configuración de entorno de desarrollo
- **Issue #6**: Revisión de arquitectura actual
- **Issue #8**: Establecer roadmap y prioridades

### Cambios Recientes (Sin Release)

#### Documentación (Issue #2 - En Progreso)
- ✅ `Decisiones_Tecnicas.md` - Decisiones arquitectónicas documentadas
- ✅ `Recursos_Tecnicos.md` - Enlaces a documentación técnica
- ✅ `Troubleshooting.md` - Guía de resolución de problemas
- ✅ `Base_de_Datos.md` - Documentación de estructura BD
- ✅ `Apis_externas.md` - Documentación de 8 APIs externas
- ✅ `Endpoints_API.md` - Inventario de endpoints internos
- 🔄 `README.md` - Actualización con 22 correcciones (2026-01-26)
- 🔄 `CHANGELOG.md` - Este archivo (reformateado 2026-01-26)
- ⏳ `ROADMAP.md` - Pendiente de reformateo

#### Arquitectura Actual
**Stack Técnico (Sin Release Formal)**:
- **Backend**: Node.js + Express 5.1.0 + MySQL 8.0+
- **Frontend**: React 19.2.0 + TailwindCSS 3.4.18
- **Autenticación**: JWT (jsonwebtoken 9.0.2) + Argon2 + Bcrypt
- **Notificaciones**: SendGrid (email) + Web Push
- **Reportes**: PDFKit + Puppeteer + QuickChart.js
- **IA**: DeepSeek (vía OpenAI SDK 6.8.1)
- **Collectors**: Shelly Cloud API + Ubibot API

**Características Implementadas (Sin Release)**:
- Sistema de collectors modulares (Shelly, Ubibot)
- Sistema de alertas v4.0.0 multi-canal
- Generación de reportes PDF ejecutivos
- PWA con Service Workers y Push Notifications
- Autenticación JWT con token rotation
- Base de datos MySQL con 50+ tablas

**Migraciones en Progreso**:
- ⚠️ Configuración: De `unified-config.json` → Base de datos (Issue #3)
- ⚠️ Nomenclatura: Estandarización a camelCase + sufijo
- ⚠️ Especificaciones: De carpeta `/specs/` → GitHub Issues

**Decisiones Técnicas Críticas**:
- 🚫 **NO se utilizan variables de entorno** (`.env`) por diseño
- ✅ Toda configuración centralizada en base de datos
- ✅ Zona horaria: America/Santiago (Chile) - SIEMPRE
- ✅ Autoría IA reconocida en todos los commits

---

## 📅 Roadmap de Releases Futuros

### [0.1.0] - Primer Release Oficial

**Prerrequisitos**: Completar FASE 0 (Issue #9)

**Contenido planeado**:
- Base de datos creada y documentada (Issue #1)
- Configuración migrada completamente a BD (Issue #3)
- Documentación completa y validada (Issue #2)
- Convenciones establecidas y documentadas
- Entorno de desarrollo configurado (Issue #5)
- Arquitectura revisada y aprobada (Issue #6)

**Fecha**: TBD (depende de completar FASE 0)

Ver [ROADMAP.md](./ROADMAP.md) para planificación completa.

---

## 📖 Tipos de Cambios

Este changelog sigue [Keep a Changelog](https://keepachangelog.com/en/1.0.0/):

- **Added** (Agregado): Nueva funcionalidad
- **Changed** (Cambiado): Cambios en funcionalidad existente
- **Deprecated** (Deprecado): Funcionalidad que será removida
- **Removed** (Eliminado): Funcionalidad removida
- **Fixed** (Corregido): Corrección de bugs
- **Security** (Seguridad): Cambios de seguridad

---

## 🔢 Versionado Semántico

El proyecto seguirá [Semantic Versioning](https://semver.org/) desde v0.1.0:

- **MAJOR** (X.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0): Nueva funcionalidad compatible
- **PATCH** (0.0.X): Correcciones de bugs compatibles

---

## 📝 Notas

- **Estado actual**: Sin releases oficiales (en desarrollo de FASE 0)
- **Zona horaria**: America/Santiago (Chile)
- **Autoría**: Commits incluyen reconocimiento de IA y colaboradores
- **Convenciones**: Ver [Info_Github.md](./Info_Github.md) para detalles

---

## 🔗 Referencias

- **Formato**: https://keepachangelog.com/en/1.0.0/
- **Versionado**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/
- **Roadmap**: [ROADMAP.md](./ROADMAP.md)
- **Issue Tracking**: [GitHub Issues](https://github.com/andresTNS/TNS_TRACK_DEMO/issues)

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última actualización**: 2026-01-26
