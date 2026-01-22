# Roadmap - Planificación de Features

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-01-22
> **Versión**: 2.0.0
> **Propósito**: Planificación de desarrollo y tracking de progreso

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Estado Actual](#estado-actual)
3. [Fases de Desarrollo](#fases-de-desarrollo)
4. [Features por Prioridad](#features-por-prioridad)
5. [Tracking de Issues](#tracking-de-issues)
6. [Métricas de Progreso](#métricas-de-progreso)

---

## Resumen Ejecutivo

### Visión del Proyecto
TNS Track Demo es un **sistema de demostración** que sirve como:
1. **Demo para posibles clientes** - Showcase completo de capacidades
2. **Base sólida para futuras implementaciones** - Arquitectura lista para replicar

### Objetivos 2026
- ✅ Documentación exhaustiva completada
- 🟡 Migración de configuración a base de datos
- 🟡 Estandarización de nomenclatura de código
- 🔴 Testing automatizado (unitario + E2E)
- 🔴 Dockerización y CI/CD

---

## Estado Actual

### ✅ Completado (v0.2.0)

- [x] Sistema de Collectors modular (Shelly, Ubibot)
- [x] Sistema de Alertas v4.0.0
- [x] Reportes PDF con templates ejecutivos
- [x] PWA con push notifications
- [x] Autenticación JWT robusta
- [x] Documentación exhaustiva (README, Base_de_Datos, APIs, Decisiones, etc.)
- [x] Eliminación de SMS/Twilio
- [x] Actualización de stack tecnológico (React 19.2.0, Express 5.1.0)

### 🟡 En Progreso

- [ ] **Migración de Configuración a BD** (Issue #TBD)
  - Status: 40% completado
  - Bloqueador: Definir estructura final de tabla `config`
  - ETA: 2026-02-15

- [ ] **Estandarización de Nomenclatura** (Issue #TBD)
  - Status: 20% completado
  - Convención definida: camelCase + sufijo
  - Archivos por refactorizar: ~150
  - ETA: 2026-03-01

### 🔴 Pendiente

Ver [Fases de Desarrollo](#fases-de-desarrollo) abajo para features planificados.

---

## Fases de Desarrollo

### 📊 Fase 0: Fundación (COMPLETADA ✅)

**Timeline**: 2026-01-01 → 2026-01-22
**Objetivo**: Establecer base sólida y documentación

- [x] Sistema de Collectors implementado
- [x] Sistema de Alertas v4.0.0 funcional
- [x] Reportes PDF con templates ejecutivos
- [x] PWA con push notifications
- [x] Documentación exhaustiva creada
- [x] Decisiones técnicas documentadas

**Resultado**: Base sólida establecida ✅

---

### 🔧 Fase 1: Refactorización y Estabilización (EN PROGRESO 🟡)

**Timeline**: 2026-01-23 → 2026-03-31
**Objetivo**: Consolidar código y eliminar deuda técnica

#### Features Principales

- [ ] **Migración de Configuración a BD** (Priority: HIGH 🔴)
  - Migrar `unified-config.json` completamente a MySQL
  - Implementar UI de administración de config
  - Eliminar archivos JSON legacy
  - Auditoría de cambios de configuración
  - **Issue**: #TBD

- [ ] **Estandarización de Nomenclatura** (Priority: MEDIUM 🟡)
  - Renombrar ~150 archivos a camelCase + sufijo
  - Actualizar imports en todo el proyecto
  - Verificar que no rompa funcionalidad
  - **Issue**: #TBD

- [ ] **Estandarizar Librería de Fechas** (Priority: MEDIUM 🟡)
  - Eliminar redundancia: moment, luxon, date-fns, dayjs
  - Decidir librería única (recomendado: date-fns o luxon)
  - Migrar todo el código a librería elegida
  - **Issue**: #TBD

- [ ] **Cleanup de Código Legacy** (Priority: LOW 🟢)
  - Eliminar carpeta `/specs` (usar GitHub Issues)
  - Limpiar comentarios obsoletos
  - Remover código comentado no utilizado
  - **Issue**: #TBD

**Métrica de Éxito**:
- ✅ Zero archivos con nomenclatura no estándar
- ✅ Zero configuración en archivos JSON
- ✅ Una sola librería de fechas

---

### 🧪 Fase 2: Testing y Calidad (PENDIENTE 🔴)

**Timeline**: 2026-04-01 → 2026-06-30
**Objetivo**: Implementar testing automatizado completo

#### Features Principales

- [ ] **Tests Unitarios con Jest** (Priority: HIGH 🔴)
  - Setup de Jest + configuración
  - Tests para servicios críticos (emailService, databaseService, etc.)
  - Tests para collectors (shellyCollector, ubibotCollector)
  - Tests para controllers principales
  - **Objetivo**: 80% cobertura en código crítico
  - **Issue**: #TBD

- [ ] **Tests de Integración** (Priority: HIGH 🔴)
  - Tests de endpoints API
  - Tests de flujos completos (login, alertas, reportes)
  - Tests de integración con APIs externas (mocked)
  - **Issue**: #TBD

- [ ] **Tests E2E con Cypress/Playwright** (Priority: MEDIUM 🟡)
  - Setup de Cypress o Playwright
  - Tests de flujos de usuario críticos
  - Tests de PWA y push notifications
  - Tests de generación de reportes
  - **Issue**: #TBD

- [ ] **Linting y Code Quality** (Priority: LOW 🟢)
  - Setup de ESLint con reglas estrictas
  - Setup de Prettier para formato consistente
  - Pre-commit hooks con Husky
  - **Issue**: #TBD

**Métrica de Éxito**:
- ✅ 80%+ cobertura de tests en código crítico
- ✅ Suite de tests E2E pasando en CI
- ✅ Zero errores de linting

---

### 🐳 Fase 3: Infraestructura y DevOps (PENDIENTE 🔴)

**Timeline**: 2026-07-01 → 2026-09-30
**Objetivo**: Dockerizar y automatizar deployment

#### Features Principales

- [ ] **Dockerización** (Priority: HIGH 🔴)
  - Dockerfile para backend (Node.js + MySQL)
  - Dockerfile para frontend (build estático)
  - docker-compose.yml para desarrollo local
  - Multi-stage builds para optimización
  - **Issue**: #TBD

- [ ] **CI/CD con GitHub Actions** (Priority: HIGH 🔴)
  - Pipeline de tests automatizados
  - Pipeline de build y deployment
  - Deployment automático a staging en push a `dev`
  - Deployment manual a producción en tag
  - **Issue**: #TBD

- [ ] **Secrets Manager** (Priority: MEDIUM 🟡)
  - Implementar AWS Secrets Manager o HashiCorp Vault
  - Migrar API keys y credenciales
  - Rotación automática de secrets
  - **Issue**: #TBD

- [ ] **Monitoreo y Logging** (Priority: MEDIUM 🟡)
  - Implementar Winston para logging estructurado
  - Integración con Sentry para error tracking
  - Dashboards de monitoreo (Grafana/Prometheus)
  - **Issue**: #TBD

**Métrica de Éxito**:
- ✅ Deployment automatizado funcionando
- ✅ Zero secrets en código
- ✅ Error tracking activo

---

### 📚 Fase 4: Documentación Avanzada (PENDIENTE 🔴)

**Timeline**: 2026-10-01 → 2026-11-30
**Objetivo**: Documentación interactiva y automatizada

#### Features Principales

- [ ] **Swagger/OpenAPI Spec** (Priority: HIGH 🔴)
  - Generar spec automáticamente desde código
  - UI interactiva de documentación de API
  - Ejemplos de requests/responses
  - **Issue**: #TBD

- [ ] **Storybook para Componentes React** (Priority: MEDIUM 🟡)
  - Setup de Storybook
  - Stories para componentes principales
  - Documentación interactiva de UI
  - **Issue**: #TBD

- [ ] **Guías de Deployment** (Priority: LOW 🟢)
  - Guía de deployment a producción
  - Guía de rollback
  - Runbooks para operaciones comunes
  - **Issue**: #TBD

**Métrica de Éxito**:
- ✅ API docs generada automáticamente
- ✅ Storybook con 100% de componentes
- ✅ Runbooks documentados

---

### 🚀 Fase 5: Features Avanzados (FUTURO)

**Timeline**: 2026-12-01 → 2027-03-31
**Objetivo**: Expandir capacidades del sistema

#### Features Planificados

- [ ] **Multi-tenancy** (Priority: MEDIUM 🟡)
  - Soporte para múltiples clientes en misma instancia
  - Aislamiento de datos por tenant
  - Configuración por tenant
  - **Issue**: #TBD

- [ ] **Webhooks** (Priority: LOW 🟢)
  - Sistema de webhooks salientes
  - Subscripciones a eventos
  - Reintentos automáticos
  - **Issue**: #TBD

- [ ] **API Rate Limiting Avanzado** (Priority: LOW 🟢)
  - Rate limiting por usuario
  - Rate limiting por endpoint
  - Throttling inteligente
  - **Issue**: #TBD

- [ ] **Analytics Dashboard** (Priority: LOW 🟢)
  - Dashboard de uso del sistema
  - Métricas de APIs externas
  - Análisis de rendimiento
  - **Issue**: #TBD

**Métrica de Éxito**:
- ✅ Multi-tenancy funcional
- ✅ Webhooks en producción
- ✅ Analytics dashboard operativo

---

## Features por Prioridad

### 🔴 Prioridad ALTA (Crítico)

| Feature | Fase | ETA | Issue |
|---------|------|-----|-------|
| Migración de Configuración a BD | 1 | 2026-02-15 | #TBD |
| Tests Unitarios (Jest) | 2 | 2026-05-31 | #TBD |
| Tests de Integración | 2 | 2026-06-15 | #TBD |
| Dockerización | 3 | 2026-08-31 | #TBD |
| CI/CD con GitHub Actions | 3 | 2026-09-15 | #TBD |
| Swagger/OpenAPI Spec | 4 | 2026-10-31 | #TBD |

### 🟡 Prioridad MEDIA (Importante)

| Feature | Fase | ETA | Issue |
|---------|------|-----|-------|
| Estandarización de Nomenclatura | 1 | 2026-03-01 | #TBD |
| Estandarizar Librería de Fechas | 1 | 2026-03-15 | #TBD |
| Tests E2E (Cypress/Playwright) | 2 | 2026-06-30 | #TBD |
| Secrets Manager | 3 | 2026-08-15 | #TBD |
| Monitoreo y Logging | 3 | 2026-09-30 | #TBD |
| Storybook para Componentes | 4 | 2026-11-15 | #TBD |
| Multi-tenancy | 5 | 2027-02-28 | #TBD |

### 🟢 Prioridad BAJA (Deseable)

| Feature | Fase | ETA | Issue |
|---------|------|-----|-------|
| Cleanup de Código Legacy | 1 | 2026-03-31 | #TBD |
| Linting y Code Quality | 2 | 2026-06-30 | #TBD |
| Guías de Deployment | 4 | 2026-11-30 | #TBD |
| Webhooks | 5 | 2027-01-31 | #TBD |
| API Rate Limiting Avanzado | 5 | 2027-02-28 | #TBD |
| Analytics Dashboard | 5 | 2027-03-31 | #TBD |

---

## Tracking de Issues

### Convención de Labels

Usar estos labels en GitHub Issues para tracking:

- **`priority:high`** 🔴 - Crítico, debe hacerse pronto
- **`priority:medium`** 🟡 - Importante, planificado
- **`priority:low`** 🟢 - Deseable, nice to have

- **`phase:1-refactor`** - Parte de Fase 1: Refactorización
- **`phase:2-testing`** - Parte de Fase 2: Testing
- **`phase:3-infra`** - Parte de Fase 3: Infraestructura
- **`phase:4-docs`** - Parte de Fase 4: Documentación
- **`phase:5-advanced`** - Parte de Fase 5: Features Avanzados

- **`type:feature`** - Nueva funcionalidad
- **`type:refactor`** - Refactorización de código existente
- **`type:docs`** - Documentación
- **`type:bug`** - Corrección de bug
- **`type:chore`** - Tareas de mantenimiento

### Milestone Planning

Crear milestones en GitHub para cada fase:

- **Milestone: Fase 1 - Refactorización** (2026-Q1)
- **Milestone: Fase 2 - Testing** (2026-Q2)
- **Milestone: Fase 3 - Infraestructura** (2026-Q3)
- **Milestone: Fase 4 - Documentación** (2026-Q4)
- **Milestone: Fase 5 - Features Avanzados** (2027-Q1)

---

## Métricas de Progreso

### Objetivos Q1 2026 (Enero - Marzo)

- [x] ✅ Documentación exhaustiva completada (100%)
- [ ] 🟡 Migración de configuración a BD (40%)
- [ ] 🟡 Estandarización de nomenclatura (20%)
- [ ] 🔴 Librería de fechas estandarizada (0%)

**Progreso General Q1**: 40%

### Objetivos Q2 2026 (Abril - Junio)

- [ ] 🔴 Tests unitarios implementados (0%)
- [ ] 🔴 Tests de integración implementados (0%)
- [ ] 🔴 Tests E2E implementados (0%)

**Progreso General Q2**: 0%

### Objetivos Q3 2026 (Julio - Septiembre)

- [ ] 🔴 Dockerización completada (0%)
- [ ] 🔴 CI/CD implementado (0%)
- [ ] 🔴 Secrets manager configurado (0%)

**Progreso General Q3**: 0%

### Objetivos Q4 2026 (Octubre - Diciembre)

- [ ] 🔴 Swagger/OpenAPI spec generada (0%)
- [ ] 🔴 Storybook implementado (0%)

**Progreso General Q4**: 0%

---

## Decisiones Pendientes

Issues que requieren decisión técnica antes de implementar:

| Decisión | Responsable | Deadline | Opciones |
|----------|-------------|----------|----------|
| Librería de fechas única | andresTNS | 2026-02-01 | date-fns vs Luxon vs Day.js |
| Framework de testing E2E | andresTNS | 2026-04-01 | Cypress vs Playwright |
| Secrets Manager | andresTNS | 2026-07-01 | AWS Secrets Manager vs HashiCorp Vault |
| Logging Solution | andresTNS | 2026-07-15 | Winston vs Pino |
| APM Tool | andresTNS | 2026-08-01 | New Relic vs Datadog vs Sentry |

---

## Notas de Implementación

### Principios de Desarrollo

Todos los features deben seguir:
1. **KISS** - Keep It Simple, Stupid
2. **DRY** - Don't Repeat Yourself
3. **Modularización Máxima** - Separar responsabilidades

Ver [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md) para detalles.

### Definition of Done

Un feature se considera completo cuando:
- ✅ Código implementado y revisado
- ✅ Tests escritos y pasando
- ✅ Documentación actualizada
- ✅ Code review aprobado por andresTNS
- ✅ Deployed a staging
- ✅ Validado por POs (TNSTRACK/felipecleverox)

---

## Referencias

- **GitHub Issues**: https://github.com/andresTNS/TNS_TRACK_DEMO/issues
- **Decisiones Técnicas**: [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-01-22

---

## 📞 Feedback

Para sugerencias de features o cambios al roadmap:
- Crear issue en GitHub con label `type:feature-request`
- Contactar a andresTNS (Jefe de Desarrolladores)
- Discutir con POs (TNSTRACK, felipecleverox)
