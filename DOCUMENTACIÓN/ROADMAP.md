# Roadmap - Planificación de Desarrollo

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-03-11
> **Versión**: 2.2.0
> **Propósito**: Planificación realista basada en GitHub Issues

---

## 📋 Índice

1. [Visión del Proyecto](#visión-del-proyecto)
2. [Estado Actual del Proyecto](#estado-actual-del-proyecto)
3. [FASE 0: Planificación y Fundamentos](#fase-0-planificación-y-fundamentos)
4. [Tracking de Issues](#tracking-de-issues)
5. [Principios de Desarrollo](#principios-de-desarrollo)

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
**Completitud**: 5/7 sub-issues completados (71%)
**Milestone**: [FASE 0 - Planificación y Fundamentos](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/9)
**Issue Principal**: #9
**Pendientes**: #5 (Librería de fechas), #6 (Cleanup legacy)

### Objetivo de FASE 0

Establecer fundamentos sólidos ANTES del primer release (v0.1.0):
- Convenciones de nomenclatura formalizadas
- Documentación completa y actualizada
- Configuración migrada a base de datos
- Alcance del proyecto definido claramente
- Roadmap y prioridades establecidas

### Sub-Issues de FASE 0

| # | Issue | Estado | Prioridad |
|---|-------|--------|-----------|
| #1 | [SQL] Creación de la base de datos desde cero | ✅ CLOSED | S (Máxima) |
| #2 | Documentación inicial | ✅ CLOSED | S (Máxima) |
| #3 | [SQL] Creación de tabla de configuración | ✅ CLOSED | S (Máxima) |
| #4 | [REFACTOR] Estandarización de Nomenclatura del Proyecto Completo | ✅ CLOSED | M (Alta) |
| #5 | [REFACTOR] Estandarizar Librería de Fechas en Todo el Proyecto | 🟡 OPEN | M (Alta) |
| #6 | [REFACTOR] Cleanup de Código Legacy y Archivos Obsoletos | 🟡 OPEN | L (Media) |
| #8 | [SQL][REFACTOR] Gestión de Secretos y Migración a Base de Datos | ✅ CLOSED | M (Alta) — obsoleto, absorbido por #3 |

### Orden de Implementación (realizado y pendiente)

**Completados** (5/7):

1. **Issue #1** — Creación de BD desde cero (convenciones, tablas, índices, SPs, eventos). Blocker histórico de #3.
2. **Issue #2** — Documentación inicial (README, Base_de_Datos, Apis_externas, Info_Github, Decisiones_Tecnicas, Endpoints_API, Recursos_Tecnicos, Troubleshooting, CHANGELOG, ROADMAP).
3. **Issue #3** — Tabla de configuración centralizada (`gen_cofiguracion_*`). Estructura en BD lista; migración del config-loader en curso según contexto del issue.
4. **Issue #4** — Estandarización de nomenclatura (camelCase + sufijos en backend/frontend). Documentación en `Estandares_Nomenclatura.md` y `Estandares_Nomenclatura_SQL.md`.
5. **Issue #8** — Gestión de secretos en BD. Cerrado como obsoleto; alcance absorbido por la arquitectura de configuración del Issue #3.

**Pendientes** (2/7):

6. **Issue #5** — Estandarizar librería de fechas en todo el proyecto (Luxon como estándar; eliminar moment, dayjs, date-fns donde aplique).
7. **Issue #6** — Cleanup de código legacy (carpeta `/specs` y archivos obsoletos ya eliminados; pendiente limpieza de comentarios y código comentado en el código).

### Criterios de Aceptación para Completar FASE 0

**Para cerrar Issue #9 y avanzar a v0.1.0, TODOS estos deben cumplirse**:

- ✅ Base de datos creada con convenciones formalizadas (Issue #1)
- ✅ Documentación completa actualizada y aprobada (Issue #2)
- ✅ Configuración migrada a BD; estructura y tablas en uso (Issue #3)
- ✅ Nomenclatura estandarizada en el proyecto (Issue #4)
- ⏳ Una sola librería de fechas en todo el proyecto — Luxon (Issue #5)
- ⏳ Código legacy y comentarios obsoletos eliminados (Issue #6)
- ✅ Gestión de secretos/credenciales alineada con BD (Issue #8, absorbido por #3)

### Métricas de Éxito FASE 0

- ⭐ **0 ambigüedades** en alcance del proyecto
- ⭐ **100% convenciones** documentadas (BD, código, Git)
- ⭐ **0 configuración** en archivos JSON (todo en BD)
- ⭐ **Documentación aprobada** por andresTNS y POs
- ⭐ **Arquitectura validada** técnicamente

### Progreso Actual FASE 0

**Completitud Global**: 5/7 issues cerrados (71%)

**Issues cerrados**: #1 (BD desde cero), #2 (Documentación inicial), #3 (Tabla de configuración), #4 (Estandarización de nomenclatura), #8 (Gestión de secretos — absorbido por #3).

**Issues abiertos**: #5 (Librería de fechas — Luxon), #6 (Cleanup código legacy).

La documentación en `DOCUMENTACIÓN/` se mantiene al día con el estado de los issues; este ROADMAP refleja el estado actual en GitHub (2026-03-11).

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
  - Completitud: 5/7 sub-issues (71%)
  - Pendientes: #5 (fechas), #6 (cleanup legacy)

**Milestones futuros**: Se definirán al cerrar FASE 0 (Issue #9).

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

**Nota**: Durante FASE 0, el foco está en completar los dos issues pendientes (#5, #6). Los features nuevos se evaluarán al cerrar FASE 0.

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-03-11
