# Roadmap - Planificación de Desarrollo

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-01-26
> **Versión**: 2.1.0
> **Propósito**: Planificación realista basada en GitHub Issues

---

## 📋 Índice

1. [Visión del Proyecto](#visión-del-proyecto)
2. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
3. [FASE 0: Planificación y Fundamentos](#fase-0-planificación-y-fundamentos) (🟡 EN PROGRESO)
4. [Fases Futuras](#fases-futuras)
5. [Tracking de Issues](#tracking-de-issues)
6. [Principios de Desarrollo](#principios-de-desarrollo)

---

## Visión del Proyecto

### Propósito
TNS Track Demo es un **sistema de demostración** desarrollado por **The Next Security** que sirve como:

1. **Demo para posibles clientes**: Showcase completo de capacidades de monitoreo y control inteligente
2. **Base sólida replicable**: Arquitectura probada y lista para replicar en proyectos productivos de clientes
3. **Referencia interna**: Plantilla de desarrollo y buenas prácticas para el equipo TNS

### Alcance Actual
El proyecto demuestra capacidades de monitoreo en tiempo real de:
- Temperatura (cámaras frigoríficas, ambientes controlados)
- Consumo eléctrico (dispositivos inteligentes)
- GPS/Ubicación (personal y activos)
- Alertas inteligentes (multi-canal: email + push)
- Reportes ejecutivos (PDF automatizados)

---

## Estado Actual del Proyecto

### 🚧 Proyecto en FASE 0 - Sin Releases Oficiales

**⚠️ IMPORTANTE**: El proyecto NO tiene releases oficiales aún.

Aunque existen features implementadas (Collectors, Alertas v4.0, Reportes PDF, PWA, JWT), el proyecto está en **FASE 0: Planificación y Fundamentos** enfocada en:
- Establecer convenciones y estándares
- Documentar arquitectura existente
- Definir alcance y prioridades
- Crear fundamentos sólidos para desarrollo futuro

**Primer Release (v0.1.0)**: Después de completar FASE 0

Ver [CHANGELOG.md](./CHANGELOG.md) para detalles de estado de releases.

### Stack Tecnológico Actual

**Sin Release Formal** - Arquitectura existente:

- **Backend**: Node.js + Express 5.1.0 + MySQL 8.0+
- **Frontend**: React 19.2.0 + TailwindCSS 3.4.18 + Webpack 5.102.1
- **Autenticación**: JWT (jsonwebtoken 9.0.2) + Argon2 + Bcrypt
- **Notificaciones**: SendGrid (email) + Web Push
- **Reportes**: PDFKit + Puppeteer + QuickChart.js
- **IA**: DeepSeek (vía OpenAI SDK 6.8.1)
- **APIs Externas**: Shelly Cloud + Ubibot + Mapbox + PostHog

### Características Implementadas (Sin Release)

- Sistema de collectors modulares (Shelly, Ubibot)
- Sistema de alertas v4.0.0 multi-canal
- Generación de reportes PDF ejecutivos
- PWA con Service Workers y Push Notifications
- Autenticación JWT con token rotation
- Base de datos MySQL con 50+ tablas
- Zona horaria: America/Santiago (Chile) - SIEMPRE
- 🚫 NO usa variables de entorno (configuración en BD por diseño)

---

## FASE 0: Planificación y Fundamentos

**Estado**: 🟡 EN PROGRESO
**Completitud**: 0/7 sub-issues completados (0%)
**Milestone**: [FASE 0 - Planificación y Fundamentos](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/9)
**Issue Principal**: #9

### Objetivo de FASE 0

Establecer fundamentos sólidos ANTES del primer release (v0.1.0):
- Convenciones de nomenclatura formalizadas
- Documentación completa y actualizada
- Configuración migrada a base de datos
- Alcance del proyecto definido claramente
- Roadmap y prioridades establecidas

### Sub-Issues de FASE 0

| # | Issue | Estado | Prioridad | Blocker |
|---|-------|--------|-----------|---------|
| #1 | Creación de base de datos desde cero | 🔴 OPEN | S (Máxima) | **BLOCKER** para #3 |
| #2 | Documentación inicial | 🟡 EN PROGRESO | S (Máxima) | - |
| #3 | Tabla de configuración centralizada | 🔴 OPEN | S (Máxima) | Depende de #1 |
| #4 | Análisis y definición de alcance completo | 🔴 OPEN | M (Alta) | - |
| #5 | Configuración de entorno de desarrollo | 🔴 OPEN | M (Alta) | - |
| #6 | Revisión de arquitectura actual | 🔴 OPEN | L (Media) | - |
| #8 | Establecer roadmap y prioridades | 🔴 OPEN | M (Alta) | - |

### Orden de Implementación Recomendado

**Secuencia óptima basada en dependencias**:

1. **Issue #1** (BLOCKER) - Creación de BD desde cero
   - **Por qué primero**: Issue #3 depende de esto
   - **Impacto**: Formaliza estructura y convenciones de BD
   - **Owner**: andresTNS

2. **Issue #2** (EN PROGRESO) - Documentación inicial
   - **Estado actual**: 90% completado (8/9 archivos)
   - **Pendiente**: ROADMAP.md reformateo (este archivo)
   - **Owner**: Claude Code + andresTNS

3. **Issue #3** - Tabla de configuración
   - **Depende de**: #1 (estructura BD formalizada)
   - **Impacto**: Elimina JSONs legacy, centraliza config
   - **Owner**: andresTNS

4. **Issue #4** - Análisis y definición de alcance
   - **Por qué después de doc**: Requiere contexto completo
   - **Impacto**: Define límites claros del demo
   - **Owner**: TNSTRACK + felipecleverox (POs)

5. **Issue #5** - Configuración de entorno dev
   - **Por qué después de #1 y #3**: Requiere BD y config finales
   - **Impacto**: Onboarding de nuevos developers
   - **Owner**: andresTNS

6. **Issue #6** - Revisión de arquitectura
   - **Por qué después de todo**: Requiere contexto completo
   - **Impacto**: Valida decisiones técnicas actuales
   - **Owner**: andresTNS

7. **Issue #8** - Roadmap y prioridades
   - **Por qué al final**: Requiere alcance definido (#4)
   - **Impacto**: Define trabajo post-FASE 0
   - **Owner**: andresTNS + POs

### Criterios de Aceptación para Completar FASE 0

**Para cerrar Issue #9 y avanzar a v0.1.0, TODOS estos deben cumplirse**:

- ✅ Base de datos creada con convenciones formalizadas (Issue #1)
- ✅ Documentación completa actualizada y aprobada (Issue #2)
- ✅ Configuración 100% migrada a BD, JSONs eliminados (Issue #3)
- ✅ Alcance del demo claramente definido y documentado (Issue #4)
- ✅ Entorno de desarrollo documentado y reproducible (Issue #5)
- ✅ Arquitectura revisada y decisiones validadas (Issue #6)
- ✅ Roadmap post-FASE 0 definido con prioridades (Issue #8)

### Métricas de Éxito FASE 0

- ⭐ **0 ambigüedades** en alcance del proyecto
- ⭐ **100% convenciones** documentadas (BD, código, Git)
- ⭐ **0 configuración** en archivos JSON (todo en BD)
- ⭐ **Documentación aprobada** por andresTNS y POs
- ⭐ **Arquitectura validada** técnicamente

### Progreso Actual FASE 0

**Completitud Global**: 0/7 issues cerrados

**Issue #2 (Documentación) - 90% completado**:
- ✅ Decisiones_Tecnicas.md
- ✅ Recursos_Tecnicos.md
- ✅ Troubleshooting.md
- ✅ Base_de_Datos.md
- ✅ Apis_externas.md
- ✅ Endpoints_API.md
- ✅ README.md
- ✅ CHANGELOG.md
- 🔄 ROADMAP.md (este archivo - en progreso)

**Issues restantes**: 6 de 7 (86% del trabajo de FASE 0)

---

## Fases Futuras

**⚠️ IMPORTANTE**: Las fases siguientes están PENDIENTES de definición formal en Issue #8.

La planificación detallada de fases post-FASE 0 se realizará una vez completado Issue #8 (Establecer roadmap y prioridades) como parte del cierre de FASE 0.

### Áreas de Trabajo Identificadas (No Priorizadas Aún)

Las siguientes áreas han sido identificadas como posibles trabajos futuros, pero **NO tienen issues creados ni prioridades asignadas**:

#### Refactorización y Limpieza
- Migración de configuración a BD (⚠️ EN PROGRESO como parte de Issue #3)
- Estandarización de nomenclatura a camelCase + sufijo
- Unificación de librería de fechas (4 librerías actuales: moment, luxon, date-fns, dayjs)
- Limpieza de carpeta `/specs` (usar GitHub Issues)
- Remoción de código comentado y obsoleto

#### Testing y Calidad
- Tests unitarios (Jest)
- Tests de integración
- Tests E2E (Cypress/Playwright - decisión pendiente)
- Linting automatizado (ESLint + Prettier)
- Pre-commit hooks (Husky)

#### Infraestructura y DevOps
- Dockerización (Dockerfile + docker-compose)
- CI/CD (GitHub Actions)
- Secrets manager (AWS Secrets Manager / HashiCorp Vault - decisión pendiente)
- Monitoreo y logging (Winston/Pino - decisión pendiente)
- APM Tool (New Relic / Datadog / Sentry - decisión pendiente)

#### Documentación Avanzada
- Swagger/OpenAPI spec automatizada
- Storybook para componentes React
- Guías de deployment y rollback
- Runbooks operacionales

#### Features Avanzados
- Multi-tenancy (múltiples clientes en misma instancia)
- Webhooks salientes
- Rate limiting avanzado por usuario/endpoint
- Analytics dashboard interno

**Timeline**: TBD (se definirá en Issue #8 al completar FASE 0)

**Decisiones Técnicas Pendientes**:
| Decisión | Responsable | Opciones |
|----------|-------------|----------|
| Framework testing E2E | andresTNS | Cypress vs Playwright |
| Secrets Manager | andresTNS | AWS Secrets Manager vs HashiCorp Vault |
| Logging Solution | andresTNS | Winston vs Pino |
| APM Tool | andresTNS | New Relic vs Datadog vs Sentry |
| Librería de fechas única | andresTNS | date-fns vs Luxon vs Day.js |

---

## Tracking de Issues

### Convención de Labels

**Prioridades**:
- **S (Máxima)**: Bloqueadores, fundamentos críticos
- **M (Alta)**: Importante, debe hacerse pronto
- **L (Media)**: Deseable, puede esperar
- **XL (Baja)**: Nice to have, largo plazo

**Fases**:
- `phase:0-foundation` - FASE 0: Planificación y Fundamentos
- `phase:1-refactor` - Refactorización y limpieza (futuro)
- `phase:2-testing` - Testing y calidad (futuro)
- `phase:3-infra` - Infraestructura DevOps (futuro)
- `phase:4-docs` - Documentación avanzada (futuro)
- `phase:5-advanced` - Features avanzados (futuro)

**Tipos**:
- `type:feature` - Nueva funcionalidad
- `type:refactor` - Refactorización
- `type:docs` - Documentación
- `type:bug` - Corrección de bug
- `type:chore` - Tareas de mantenimiento

### Milestone Actual

**Único milestone activo**:
- **FASE 0 - Planificación y Fundamentos** (Issue #9)
  - Estado: 🟡 EN PROGRESO
  - Completitud: 0/7 sub-issues (0%)
  - Blocker: Issue #1

**Milestones futuros**: Se definirán en Issue #8 al completar FASE 0

---

## Principios de Desarrollo

### Metodología

Todos los cambios al proyecto deben seguir:

1. **KISS (Keep It Simple, Stupid)**
   - Priorizar soluciones simples sobre complejidad innecesaria
   - Evitar over-engineering y abstracciones prematuras
   - Código fácil de entender = código fácil de mantener

2. **DRY (Don't Repeat Yourself)**
   - Evitar duplicación mediante modularización inteligente
   - Extraer lógica repetida a servicios reutilizables
   - Centralizar configuración y constantes

3. **Modularización Máxima**
   - Separar responsabilidades en módulos independientes
   - Un archivo = una responsabilidad clara
   - Facilitar testing y mantenimiento

Ver [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md) para decisiones arquitectónicas completas.

### Definition of Done

Un issue se considera completo cuando:
- ✅ Código implementado (si aplica)
- ✅ Tests escritos y pasando (cuando haya suite de tests)
- ✅ Documentación actualizada
- ✅ Code review aprobado por andresTNS
- ✅ Validado por Product Owners (si aplica)
- ✅ Issue cerrado en GitHub

### Convenciones de Commits

**Formato obligatorio**:
```
tipo(módulo): descripción corta

Detalles de cambios realizados.
Explicación técnica si es necesario.

Issue: #123
PR: #456 (si aplica)

🤖 Generado con Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Autoría IA**: SIEMPRE reconocer cuando Claude Code u otra IA contribuyó al commit.

Ver [Info_Github.md](./Info_Github.md) para convenciones completas.

---

## Referencias

- **GitHub Issues**: https://github.com/andresTNS/TNS_TRACK_DEMO/issues
- **Milestone FASE 0**: [Issue #9](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/9)
- **Decisiones Técnicas**: [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Info GitHub**: [Info_Github.md](./Info_Github.md)

---

## 📞 Feedback y Sugerencias

Para proponer cambios al roadmap:
1. Crear issue en GitHub con label `type:feature-request`
2. Discutir con andresTNS (Jefe de Desarrolladores)
3. Validar con Product Owners (TNSTRACK, felipecleverox) si aplica

**Nota**: Durante FASE 0, el foco está en completar fundamentos. Features nuevos se evaluarán después de Issue #8.

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-01-26
