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
| `documentation` | 🔵 #0075ca | Mejoras o adiciones de documentación |
| `good first issue` | 🟣 #7057ff | Bueno para principiantes |
| `SQL` | 🔴 #ec5e39 | Issues relacionados con base de datos |

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

**Ejemplos**:
- ✅ `[DOCS] Documentación Inicial`
- ✅ `[SQL] Creación de la base de datos desde cero`
- ✅ `[FEATURE] Sistema de alertas v4.0`
- ✅ `[BUG] Error en cálculo de promedios de temperatura`

---

## 🌿 Convenciones de Branches

### Estrategia de Branching
**Modelo**: GitHub Flow simplificado

### Ramas Principales
- `main` → Producción estable
- `dev` → Desarrollo activo (rama por defecto actualmente)

### Ramas de Feature/Fix
**Formato**: `tipo/issue-numero-descripcion-corta`

**Tipos de rama**:
- `feature/` → Nuevas funcionalidades
- `fix/` → Correcciones de bugs
- `docs/` → Cambios de documentación
- `refactor/` → Refactorización de código
- `hotfix/` → Fixes urgentes en producción

**Ejemplos**:
```bash
feature/2-documentacion-inicial
feature/1-creacion-base-datos
fix/alertas-duplicadas
docs/actualizar-readme
refactor/collectors-pattern
hotfix/critical-db-connection
```

### Reglas de Branches
1. ✅ Crear rama desde `dev` (salvo hotfixes desde `main`)
2. ✅ Nombre debe referenciar issue cuando aplique
3. ✅ Usar kebab-case
4. ✅ Eliminar rama después de merge
5. ❌ NO commitear directamente a `main`
6. ❌ NO commitear directamente a `dev` sin PR (excepto emergencias)

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
   git checkout -b feature/2-documentacion-inicial
   ```

3. **Desarrollo**
   - Commits frecuentes y descriptivos
   - Seguir convenciones de código

4. **Commits**
   - Formato: Conventional Commits
   - Referenciar issue

5. **Push y PR**
   ```bash
   git push origin feature/2-documentacion-inicial
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

### Formato: Conventional Commits
```
tipo(ámbito): descripción corta

Descripción detallada (opcional)

Refs: #numero-issue
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

### Ejemplos Completos
```bash
# Feature simple
git commit -m "feat(docs): agregar documentación inicial

Creación de README.md, Base_de_Datos.md, Apis_externas.md e Info_Github.md

Refs: #2"

# Fix con contexto
git commit -m "fix(email): corregir formato de destinatarios

El servicio no manejaba arrays vacíos correctamente.

Refs: #45"
```

### Reglas
1. ✅ Verbos en infinitivo ("agregar", "corregir")
2. ✅ Primera línea <= 72 caracteres
3. ✅ Referenciar issue: `Refs: #numero` o `Closes: #numero`
4. ❌ NO commits genéricos ("cambios", "fix")
5. ❌ NO mezclar múltiples propósitos

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

### Issues Abiertos

#### Issue #2: Documentación Inicial
- **Estado**: OPEN
- **Asignados**: Bufigol, andresTNS
- **Labels**: `documentation`, `good first issue`
- **Archivos**:
  - ✅ README.md
  - ✅ Base_de_Datos.md
  - ✅ Apis_externas.md
  - ✅ Info_Github.md
- **Branch**: `docs/2-documentacion-inicial`

#### Issue #1: Creación de la base de datos desde cero
- **Estado**: OPEN
- **Asignados**: Bufigol, andresTNS
- **Labels**: `good first issue`, `SQL`
- **Branch**: `feature/1-creacion-base-datos`

---

## 🏷️ Versionado (SemVer)

### Formato
`vMAJOR.MINOR.PATCH`

- **MAJOR**: Cambios incompatibles
- **MINOR**: Funcionalidad compatible
- **PATCH**: Bug fixes compatibles

### Prefijos Pre-release
- `v0.x.x` → Desarrollo inicial
- `v1.x.x-beta` → Beta testing
- `v1.x.x-rc.1` → Release candidate

### Milestones Recomendados
- `v0.1.0` → Documentación inicial
- `v0.2.0` → Base de datos creada
- `v0.3.0` → Sistema de alertas funcional
- `v1.0.0` → Primera versión en producción

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

### Protección de Branches (Recomendado)

**Para `main`**:
- [ ] Requiere PR
- [ ] Requiere 1 aprobación
- [ ] Requiere CI/CD passing
- [ ] Prohibir force push
- [ ] Prohibir delete

**Para `dev`**:
- [ ] Requiere PR (recomendado)
- [ ] Permitir force push solo a owners

---

## 📞 Comunicación

### Canales
- **Issues**: Discusión técnica
- **PRs**: Code review
- **[Otro]**: Comunicación general

### Convenciones de Comentarios

**En Issues**:
- Usar @menciones
- Agregar contexto
- Cerrar con resumen

**En PRs**:
- Comentarios constructivos
- Sugerir cambios específicos
- Aprobar cuando esté listo

---

## 📚 Referencias

- [README.md](./README.md)
- [Base_de_Datos.md](./Base_de_Datos.md)
- [Apis_externas.md](./Apis_externas.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [SemVer](https://semver.org/)

---

**Última actualización**: 2025-01-21  
**Versión**: 1.0.0  
**Mantenido por**: Equipo TNS (Bufigol, andresTNS)
