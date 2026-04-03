# Gestión GitHub - TNS Track

## 🐙 Información del Repositorio
- **URL**: https://github.com/andresTNS/TNS_TRACK_DEMO
- **Visibilidad**: Privado (uso exclusivo equipo TNS)
- **Organización**: andresTNS
- **Equipo Principal**: Bufigol, andresTNS

---

## 📋 Convenciones de Issues

### Labels Disponibles
| Label | Color | Descripción |
|-------|-------|-------------|
| `analytics` | 🟢 #28a745 | Analytics y métricas |
| `architecture` | 🟠 #ff6600 | Arquitectura y diseño del sistema |
| `back-end` | 🔵 #0366d6 | Backend y servicios |
| `bug` | 🔴 #d73a4a | Algo no funciona correctamente |
| `bug-prevention` | 🟡 #fbca04 | Prevención de bugs futuros |
| `dependencies` | 🟣 #8b00ff | Gestión de dependencias |
| `documentation` | 🔵 #0075ca | Mejoras o adiciones de documentación |
| `duplicate` | ⚪ #cfd3d7 | Issue o PR duplicado |
| `enhancement` | 🟢 #a2eeef | Nueva funcionalidad o mejora |
| `front-end` | 🟦 #1d76db | Frontend y UI |
| `good first issue` | 🟣 #7057ff | Bueno para principiantes |
| `help wanted` | 🟢 #008672 | Se necesita ayuda externa |
| `IMPORTANT` | 🔴 #ff0000 | ⚠️ PRIORIDAD MÁXIMA - Issues que requieren atención inmediata |
| `invalid` | ⚫ #e4e669 | No es válido o no procede |
| `npm` | 🔴 #cb3837 | Gestión de paquetes npm |
| `question` | 🟣 #d876e3 | Pregunta o consulta |
| `refactoring` | 🟠 #ff9933 | Refactorización de código |
| `Release` | 🟢 #00ff00 | Release y versionado |
| `security` | 🔴 #ee0701 | Seguridad y vulnerabilidades |
| `SQL - BBDD` | 🔴 #ec5e39 | Base de datos y SQL |
| `technical-debt` | 🟤 #b60205 | Deuda técnica |
| `wontfix` | ⚪ #ffffff | No se trabajará en esto |

### Formato de Issues

#### Template Recomendado
```markdown
## Idea general
[Descripción del problema o feature]

## Archivos a crear/modificar
- Archivo1.md → Descripción
- Archivo2.js → Descripción

## Criterios de aceptación
- [ ] Criterio 1
- [ ] Criterio 2

## Notas adicionales
[Contexto relevante]
```

### Nomenclatura de Títulos
- **Features**: `[FEATURE] Nombre descriptivo`
- **Bugs**: `[BUG] Descripción del problema`
- **Documentación**: `[DOCS] Qué documentar`
- **Refactor**: `[REFACTOR] Qué mejorar`
- **SQL/BD**: `[SQL] Descripción del cambio`
- **Release**: `[RELEASE] Paso a producción [v.XX.YY.ZZ]`

**Ejemplos**:
- ✅ `[DOCS] Documentación Inicial`
- ✅ `[SQL] Creación de la base de datos desde cero`
- ✅ `[FEATURE] Sistema de alertas v4.0`
- ✅ `[BUG] Error en cálculo de promedios de temperatura`
- ✅ `[RELEASE] Paso a producción [v.0.2.0]`

### Templates de Issues y PRs

El repositorio cuenta con templates predefinidos para estandarizar la creación de issues y pull requests:

#### Templates Disponibles
- **Issue Template**: `.github/ISSUE_TEMPLATE/issue_template.md`
  - Estructura: Idea general, Archivos a crear/modificar, Criterios de aceptación, Notas adicionales
  - Uso: Automático al crear nuevo issue en GitHub

- **Pull Request Template**: `.github/pull_request_template.md`
  - Estructura: Descripción, Tipo de cambio, Issue relacionado, Checklist de validación
  - Uso: Automático al crear nuevo PR en GitHub

> **Recomendación**: Utilizar siempre estos templates para mantener consistencia en la documentación del proyecto.

---

## 🌿 Convenciones de Branches

### Estrategia de Branching
**Modelo**: GitHub Flow simplificado

### Ramas Principales
- `main` → Producción estable
- `dev` → Desarrollo activo (rama por defecto actualmente)

### Ramas de Feature/Fix
**Formato**: `tipo/descripcion-corta`

> **Nota**: El número de issue NO va en el nombre de la rama. Debe estar incorporado en cada mensaje de commit.

**Tipos de rama**:
- `feature/` → Nuevas funcionalidades
- `fix/` → Correcciones de bugs
- `docs/` → Cambios de documentación
- `refactor/` → Refactorización de código
- `hotfix/` → Fixes urgentes en producción
- `chore/` → Tareas de mantenimiento

**Ejemplos**:
```bash
feature/documentacion-inicial
feature/creacion-base-datos
fix/alertas-duplicadas
docs/actualizar-readme
refactor/collectors-pattern
hotfix/critical-db-connection
chore/actualizar-dependencias
```

### Reglas de Branches
1. ✅ Crear rama desde `dev` (salvo hotfixes desde `main`)
2. ✅ Número de issue DEBE estar en cada commit, NO en el nombre de rama
3. ✅ Usar kebab-case
4. ✅ Eliminar rama después de merge
5. ❌ NO commitear directamente a `main` (SOLO acceso vía PR)
6. ❌ NO commitear directamente a `dev` sin PR (excepto emergencias)

> **Importante**: `main` es la rama más protegida. Solo se accede a través de Pull Requests aprobados por @felipecleverox O @TNSTRACK (al menos uno).

---

## 🔄 Workflow de Desarrollo

### Proceso Estándar

1. **Crear/Asignar Issue**
   - Asignar a persona responsable
   - Agregar labels apropiados
   - Definir criterios de aceptación

2. **Crear Branch**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/documentacion-inicial
   ```
   > Nota: El número de issue (#2) irá en los mensajes de commit, no en el nombre de la rama.

3. **Desarrollo**
   - Commits frecuentes y descriptivos
   - Seguir convenciones de código

4. **Commits**
   - Formato: Conventional Commits
   - Referenciar issue

5. **Push y PR**
   ```bash
   git push origin feature/documentacion-inicial
   # Crear PR en GitHub
   ```

6. **Code Review**
   - Al menos 1 aprobación (recomendado)
   - Resolver comentarios

7. **Merge**
   - Usar "Squash and merge" o "Merge commit"
   - Eliminar branch automáticamente

8. **Cerrar Issue**
   - Verificar criterios cumplidos
   - Agregar comentario de cierre

---

## 💬 Convenciones de Commits

### Formato Obligatorio
```
tipo(módulo): descripción corta

Detalles de cambios realizados.
Explicación técnica si es necesario.

Issue: #123
PR: #456 (si aplica)

🤖 Generado con Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Tipos de Commit
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `feat(alertas): agregar sistema SMS` |
| `fix` | Corrección de bug | `fix(collectors): corregir timeout` |
| `docs` | Documentación | `docs(readme): actualizar APIs` |
| `style` | Formato | `style(services): aplicar prettier` |
| `refactor` | Refactorización | `refactor(database): modularizar queries` |
| `test` | Tests | `test(alertas): agregar tests unitarios` |
| `chore` | Mantenimiento | `chore(deps): actualizar dependencias` |
| `perf` | Performance | `perf(collectors): optimizar polling` |

### Autoría IA
⚠️ **SIEMPRE reconocer cuando Claude Code u otra IA contribuyó al commit.**

### Reglas
1. ✅ Verbos en infinitivo ("agregar", "corregir")
2. ✅ Primera línea <= 72 caracteres
3. ✅ Referenciar issue: `Issue: #numero` o `Closes: #numero`
4. ✅ **Un commit por cada archivo creado/eliminado/modificado** con explicación del porqué
5. ✅ Incluir autoría IA cuando aplique
6. ❌ NO commits genéricos ("cambios", "fix")
7. ❌ NO mezclar múltiples propósitos o archivos en un mismo commit

---

## 🔀 Pull Requests

### Template
```markdown
## Descripción
[Breve descripción]

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva feature
- [ ] Breaking change
- [ ] Documentación

## Issue relacionado
Closes #[numero]

## Checklist
- [ ] Código sigue convenciones
- [ ] Auto-review realizado
- [ ] Código comentado en áreas complejas
- [ ] Documentación actualizada
- [ ] Sin nuevos warnings
- [ ] Funcionalidad existente no afectada

## Screenshots (si aplica)
[Capturas]
```

### Reglas
1. ✅ Título descriptivo
2. ✅ Descripción completa
3. ✅ Referenciar issue(s)
4. ✅ Asignar reviewer
5. ✅ Resolver conflictos antes de review
6. ❌ NO auto-merge sin aprobación

---

## 📊 Listado de Issues

### Issues Abiertos — FASE 1 (próximo release)

| Número del Issue | Estado | Descripción Breve | Labels | Branch de Trabajo |
|------------------|--------|-------------------|--------|-------------------|
| [#83](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/83) | 🟡 OPEN | Mejoras arquitectura agente IA | `architecture`, `enhancement` | Por definir |
| [#46](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/46) | 🟡 OPEN | Warning dependencia react-datepicker | `bug`, `dependencies`, `technical-debt` | Por definir |
| [#33](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/33) | 🟡 OPEN | Fallo runtime updateChannelThresholds | `bug`, `back-end` | Por definir |
| [#32](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/32) | 🟡 OPEN | Migrar parametrizaciones a ubi_presets | `refactoring`, `SQL - BBDD` | Por definir |
| [#26](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/26) | 🟡 OPEN | Endpoints Sectores y Beacons Teltonika | `feature`, `back-end` | Por definir |

### Issues Cerrados en v1.1.0

| Número del Issue | Descripción Breve | Release |
|------------------|-------------------|---------|
| [#81](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/81) | ✅ Bugs varios fix/bugs-varios (axios, SQL, push, sesión) | v1.1.0 |
| [#80](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/80) | ✅ Cuartiles de consumo y evento trimestral | v1.1.0 |
| [#79](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/79) | ✅ DEFINER MySQL desalineado dev↔prod | v1.1.0 |
| [#70](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/70) | ✅ Módulo IA migrado a Google Gemini 2.0 Flash | v1.1.0 |

> **Nota**: Para ver la lista completa actualizada de issues, visitar [Issues del repositorio](https://github.com/andresTNS/TNS_TRACK_DEMO/issues)

---

> **Nota sobre Versionado**: El versionado del proyecto se documenta en [README.md](README.md) y se gestiona mediante [CHANGELOG.md](CHANGELOG.md) siguiendo [Semantic Versioning](https://semver.org/) y [Keep a Changelog](https://keepachangelog.com/).

---

## 📁 Archivos Git

### .gitignore
```gitignore
# Dependencias
node_modules/

# Variables de entorno
.env
.env.local
.env.production

# Configuración sensible
servicios/src/config/jsons/unified-config.json

# Builds
dist/
build/
public/bundle*.js

# Logs
logs/
*.log

# IDEs
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### Archivos Versionados
- ✅ `package.json`
- ✅ `server.js`
- ✅ `/servicios/src/**/*.js`
- ✅ `/SQL_FILES/**/*.sql`
- ✅ `*.md`

---

## 🔒 Permisos

### Colaboradores
1. **andresTNS** (Owner)
   - Permisos completos
   - Configuración del repositorio
   - Gestión de colaboradores

2. **Bufigol** (Collaborator)
   - Push a branches
   - Crear/cerrar issues
   - Crear PRs
   - Merge a dev

### Protección de Branches

> **Nota**: Las recomendaciones detalladas de protección de branches se documentarán en un issue separado.

**Para `main` (rama principal de producción)**:
- ✅ **SOLO acceso vía Pull Requests**
- ✅ **Requiere aprobación de @felipecleverox O @TNSTRACK** (al menos uno)
- [ ] Requiere CI/CD passing (pendiente configuración)
- [ ] Prohibir force push
- [ ] Prohibir delete

**Para `dev`**:
- [ ] Requiere PR (recomendado)
- [ ] Permitir force push solo a owners

---

> **Nota sobre Comunicación**: Las convenciones de comunicación están integradas en cada sección anterior (Issues, PRs, Commits). Usar @menciones, agregar contexto relevante y mantener comentarios constructivos en todas las interacciones.

---

## 📚 Referencias

- [README.md](./README.md)
- [Base_de_Datos.md](./Base_de_Datos.md)
- [Apis_externas.md](./Apis_externas.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [SemVer](https://semver.org/)

---

**Última actualización**: 2026-04-03
**Versión**: 2.1.0
