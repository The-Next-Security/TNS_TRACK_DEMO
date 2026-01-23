---
name: ♻️ Refactorización
about: Mejorar código existente sin cambiar su funcionalidad
title: '[REFACTOR] '
labels: 'refactoring'
assignees: ''
---

## ♻️ Idea General

[Descripción clara del código a refactorizar]

## 🎯 Objetivo

[¿Qué se busca mejorar con esta refactorización?]

- [ ] **Mejorar legibilidad del código**
- [ ] **Reducir complejidad ciclomática**
- [ ] **Eliminar código duplicado (DRY)**
- [ ] **Mejorar performance**
- [ ] **Aplicar patrones de diseño**
- [ ] **Mejorar mantenibilidad**
- [ ] **Reducir deuda técnica**
- [ ] **Simplificar lógica (KISS)**
- [ ] **Modularizar código**
- [ ] **Otro**: [especificar]

---

## 📋 Problema Actual

### Descripción del Código Actual

[Explicar qué hace el código actual y por qué necesita refactorización]

### Problemas Identificados

- **Problema 1**: [Descripción]
- **Problema 2**: [Descripción]
- **Problema 3**: [Descripción]

### Métricas Actuales (si aplica)

- **Líneas de código**: [cantidad]
- **Complejidad ciclomática**: [valor]
- **Código duplicado**: [% o líneas]
- **Performance**: [tiempo de ejecución actual]
- **Cobertura de tests**: [%]

---

## 💡 Solución Propuesta

### Enfoque de Refactorización

[Descripción detallada de cómo se va a refactorizar]

### Principios a Aplicar

- [ ] **SOLID**
  - [ ] Single Responsibility Principle
  - [ ] Open/Closed Principle
  - [ ] Liskov Substitution Principle
  - [ ] Interface Segregation Principle
  - [ ] Dependency Inversion Principle
- [ ] **DRY** (Don't Repeat Yourself)
- [ ] **KISS** (Keep It Simple, Stupid)
- [ ] **YAGNI** (You Aren't Gonna Need It)

### Patrones de Diseño (si aplica)

[¿Se aplicará algún patrón de diseño? Factory, Strategy, Observer, etc.]

---

## 📁 Archivos a Modificar

### Archivos de Código

- [ ] `ruta/archivo1.js` → [Descripción del cambio]
- [ ] `ruta/archivo2.js` → [Descripción del cambio]
- [ ] `ruta/archivo3.js` → [Descripción del cambio]

### Archivos a Crear (si es necesario)

- [ ] `ruta/nuevo_archivo.js` → [Propósito del nuevo archivo]

### Archivos a Eliminar (si es necesario)

- [ ] `ruta/archivo_antiguo.js` → [Razón de eliminación]

---

## 🔄 Plan de Refactorización

### Fase 1: Preparación

- [ ] Asegurar cobertura de tests existente
- [ ] Documentar comportamiento actual
- [ ] Crear branch de refactorización

### Fase 2: Refactorización Incremental

1. **Paso 1**: [Descripción]
2. **Paso 2**: [Descripción]
3. **Paso 3**: [Descripción]
4. **Paso 4**: [Descripción]

### Fase 3: Validación

- [ ] Todos los tests existentes pasan
- [ ] Tests nuevos agregados (si aplica)
- [ ] Funcionalidad verificada manualmente
- [ ] Performance verificada (no debe degradarse)

---

## 🧪 Testing

### Tests Existentes

- [ ] **Tests unitarios existentes**: [cantidad]
- [ ] **Tests de integración existentes**: [cantidad]
- [ ] **Todos los tests pasan**: ✅ / ❌

### Tests Nuevos a Agregar

- [ ] Test 1: [Descripción]
- [ ] Test 2: [Descripción]

### Pruebas Manuales Requeridas

1. [Escenario de prueba 1]
2. [Escenario de prueba 2]

---

## ⚡ Impacto en Performance

### Performance Actual

```
Operación X: [tiempo actual]
Operación Y: [tiempo actual]
```

### Performance Esperada

```
Operación X: [tiempo esperado]
Operación Y: [tiempo esperado]
```

### Medición

[¿Cómo se medirá el impacto en performance?]

---

## 📊 Métricas de Mejora

### Antes de la Refactorización

- **Líneas de código**: [cantidad]
- **Complejidad ciclomática**: [valor]
- **Código duplicado**: [%]
- **Cobertura de tests**: [%]

### Después de la Refactorización (objetivo)

- **Líneas de código**: [cantidad esperada]
- **Complejidad ciclomática**: [valor esperado]
- **Código duplicado**: [% esperado]
- **Cobertura de tests**: [% esperado]

---

## ✅ Criterios de Aceptación

- [ ] Código refactorizado sigue convenciones del proyecto
- [ ] Nomenclatura camelCase + sufijos aplicada
- [ ] Comentarios en español donde sea necesario
- [ ] JSDoc actualizado (si aplica)
- [ ] Todos los tests existentes pasan sin modificación
- [ ] Tests nuevos agregados (si aplica)
- [ ] Funcionalidad NO cambia (mismo comportamiento)
- [ ] Performance NO se degrada (verificado)
- [ ] Código duplicado eliminado
- [ ] Complejidad reducida (medible)
- [ ] Un commit por archivo modificado
- [ ] Documentación actualizada (si aplica)

---

## 🚨 Riesgos

### Riesgos Identificados

- [ ] 🔴 **Alto Riesgo** - Código crítico de producción
- [ ] 🟠 **Medio Riesgo** - Múltiples dependencias
- [ ] 🟢 **Bajo Riesgo** - Código aislado

### Mitigación de Riesgos

[¿Cómo se mitigarán los riesgos? Feature flags, rollout gradual, etc.]

### Plan de Rollback

[¿Cómo se revertirá la refactorización si algo sale mal?]

---

## 🔗 Issues Relacionados

- Relacionado con #[número]
- Depende de #[número]
- Reduce deuda técnica de #[número]

---

## 📌 Notas Adicionales

[Cualquier información adicional relevante]

### Referencias

- [Link a documentación relevante]
- [Link a patrón de diseño aplicado]
- [Link a artículo sobre best practices]

---

**Principios del Proyecto**:
- **KISS**: Keep It Simple, Stupid
- **DRY**: Don't Repeat Yourself
- **Modularización**: Código altamente modular
- **Convenciones**: camelCase + sufijos
- **Comentarios**: Español
