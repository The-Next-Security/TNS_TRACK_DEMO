# Changelog

**The Next Security - TNS Track Demo**

> **Formato**: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
> **Versionado**: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### En Progreso
- Migración de configuración de `unified-config.json` a base de datos
- Estandarización de nomenclatura de archivos (camelCase + sufijo)
- Documentación completa de endpoints API

---

## [0.2.0] - 2026-01-22

### Added (Agregado)
- **Documentación exhaustiva del proyecto**:
  - `Decisiones_Tecnicas.md` - 12+ decisiones arquitectónicas documentadas
  - `Endpoints_API.md` - Inventario completo de 19 categorías de endpoints
  - `Recursos_Tecnicos.md` - Enlaces a documentación de todas las tecnologías
  - `Troubleshooting.md` - Guía completa de resolución de problemas
  - `CHANGELOG.md` - Este archivo
  - `ROADMAP.md` - Planificación de features

- **Mejoras en autenticación**:
  - Endpoint `/api/auth/validate` - Validación de sesión con metadata
  - Endpoint `/api/auth/extend-session` - Extensión de sesión (token rotation)
  - Headers de no-cache en `/validate` para SessionManager
  - Lectura de `ai_analysis` desde BD en tiempo real (no solo JWT)

### Changed (Cambiado)
- **README.md completamente reescrito**:
  - Propósito actualizado: Demo para clientes + base para implementaciones
  - Público objetivo: Solo equipo interno TNS
  - Estructura de equipo actualizada con roles (Jefe Dev, POs, Developers)
  - Migración de secciones largas a archivos independientes
  - Zona horaria especificada: America/Santiago (Chile) - SIEMPRE
  - Documentación de convenciones Git con reconocimiento de IA

- **Stack Tecnológico actualizado**:
  - Base de datos especificada como MySQL (no MariaDB)
  - Express actualizado a 5.1.0 (versión moderna)
  - React actualizado a 19.2.0

- **Nomenclatura universal establecida**:
  - Regla aplicada: TODOS los archivos deben seguir camelCase + sufijo
  - Ejemplos: `shellyCollector.js`, `emailService.js`, `deviceRoutes.js`

### Removed (Eliminado)
- **SMS/Twilio completamente removido**:
  - Dependencia `twilio` eliminada de `package.json`
  - Servicio `sms/smsService.js` removido
  - Endpoint `/api/sms` removido
  - Referencias en documentación eliminadas
  - Canales soportados: Solo Email (SendGrid) + Push (Web Push)

- **Variables de entorno (.env)**:
  - Por decisión técnica, NO se utilizan variables de entorno
  - Toda configuración se gestiona desde base de datos

### Deprecated (Deprecado)
- **`/servicios/src/config/jsons/unified-config.json`**:
  - Marcado como LEGACY
  - En proceso de migración a base de datos
  - Solo quedará información que no pueda almacenarse en BD

- **`/servicios/specs/` folder**:
  - Marcado como DEPRECADO
  - Usar GitHub Issues en su lugar

---

## [0.1.0] - 2026-01-15

### Added (Agregado)
- **Sistema de Collectors modular**:
  - `shellyCollector.js` - Integración con dispositivos Shelly
  - `ubibotCollector.js` - Integración con dispositivos Ubibot
  - Arquitectura extensible para futuros collectors

- **Sistema de Alertas v4.0.0**:
  - Alertas configurables por tipo (temperatura, humedad, conectividad)
  - Múltiples canales de notificación (email, push)
  - Plantillas reutilizables
  - Programación flexible (cron-based)
  - Documentación completa en `/servicios/src/components/alerts/README.md`

- **Sistema de Reportes PDF**:
  - Generación de PDFs con templates ejecutivos
  - Gráficos embebidos con QuickChart.js
  - Branding corporativo (logo, colores)
  - Templates modulares por tipo de reporte
  - Guía UX en `/servicios/src/components/reports/UX_TESTING_GUIDE.md`

- **PWA (Progressive Web App)**:
  - Service Workers implementados
  - Manifest para instalación
  - Push Notifications funcionales
  - Funcionalidad offline

- **Autenticación JWT**:
  - Tokens con rotación automática
  - HTTP-only cookies (protección XSS)
  - Refresh tokens con expiración configurable
  - Middleware de autenticación robusto

- **Base de datos MySQL**:
  - Esquema completo con 50+ tablas
  - Stored procedures para lógica de negocio
  - Triggers para auditoría y validación
  - Scripts de creación en `/SQL_FILES/01_creacion_desde_cero/`

- **Documentación inicial**:
  - `README.md` - Documentación general del proyecto
  - `Base_de_Datos.md` - Esquema completo de base de datos
  - `Apis_externas.md` - Documentación de 8 APIs externas
  - `Info_Github.md` - Workflow Git y convenciones

### Technical Stack (Stack Técnico Inicial)
- **Backend**:
  - Node.js >= 18.x
  - Express 5.1.0
  - MySQL 8.x (driver: mysql2 3.15.2)

- **Frontend**:
  - React 19.2.0
  - TailwindCSS 3.4.18
  - Webpack 5.102.1
  - Radix UI components

- **Notificaciones**:
  - Email: SendGrid Mail 8.1.4
  - Push: Web Push 3.6.7

- **Seguridad**:
  - JWT: jsonwebtoken 9.0.2
  - Passwords: Argon2 0.44.0 + Bcrypt 6.0.0

- **Reportes**:
  - PDFKit 0.16.0
  - Puppeteer 24.26.1
  - QuickChart.js 3.1.3

- **IA**:
  - Provider: DeepSeek
  - OpenAI SDK: 6.8.1

---

## [0.0.1] - 2026-01-01

### Added (Agregado)
- Inicialización del proyecto
- Estructura básica de carpetas
- Configuración inicial de Node.js + Express
- Setup inicial de base de datos MySQL

---

## Tipos de Cambios

- **Added** (Agregado): Nueva funcionalidad
- **Changed** (Cambiado): Cambios en funcionalidad existente
- **Deprecated** (Deprecado): Funcionalidad que será removida en futuras versiones
- **Removed** (Eliminado): Funcionalidad removida
- **Fixed** (Corregido): Corrección de bugs
- **Security** (Seguridad): Cambios relacionados con vulnerabilidades

---

## Versionado Semántico

El proyecto sigue [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Cambios incompatibles con versiones anteriores
- **MINOR** (0.X.0): Nueva funcionalidad compatible con versiones anteriores
- **PATCH** (0.0.X): Correcciones de bugs compatibles con versiones anteriores

---

## Fechas de Release

| Versión | Fecha | Destacados |
|---------|-------|------------|
| **0.2.0** | 2026-01-22 | Documentación exhaustiva, eliminación SMS/Twilio, actualización stack |
| **0.1.0** | 2026-01-15 | Sistema de Collectors, Alertas v4.0.0, Reportes PDF, PWA funcional |
| **0.0.1** | 2026-01-01 | Inicialización del proyecto |

---

## Próximos Releases (Planificados)

### [0.3.0] - TBD
- Finalización de migración de configuración a BD
- Estandarización completa de nomenclatura
- Tests unitarios (Jest)
- Documentación completa de endpoints con ejemplos

### [0.4.0] - TBD
- Tests E2E (Cypress/Playwright)
- Dockerización de aplicación
- CI/CD con GitHub Actions

### [1.0.0] - TBD
- Primera versión estable para producción
- Documentación completa de API (Swagger/OpenAPI)
- Secrets manager (AWS Secrets Manager / HashiCorp Vault)

Ver [ROADMAP.md](./ROADMAP.md) para detalles completos de planificación.

---

## Notas

- **Zona horaria**: Todos los timestamps en este changelog usan America/Santiago (Chile)
- **Autoría**: Commits incluyen reconocimiento de IA y colaboradores cuando aplica
- **Convenciones**: Ver [Info_Github.md](./Info_Github.md) para convenciones de commits

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última actualización**: 2026-01-22

---

## Referencias

- **Formato**: https://keepachangelog.com/en/1.0.0/
- **Versionado**: https://semver.org/
- **Conventional Commits**: https://www.conventionalcommits.org/
