---
name: 📊 Métricas de Éxito
about: Template para documentar métricas de éxito y criterios de aceptación de una fase o feature
title: '[MÉTRICAS] '
labels: 'documentation'
assignees: ''
---

## 📊 Métricas de Éxito - [Nombre de la Fase/Feature]

> **Fase/Feature:** [Nombre]
> **Issue Padre:** #[NUMERO]
> **Fecha de Inicio:** YYYY-MM-DD
> **Fecha Objetivo:** YYYY-MM-DD
> **Estado:** 🔴 Pendiente / 🟡 En Progreso / 🟢 Completado

---

## 🎯 Objetivo Medible

[Descripción clara y concisa del objetivo que se quiere lograr]

**Resultado esperado:** [Qué se debe lograr en términos medibles]

---

## ✅ Criterios de Aceptación

### Criterios Funcionales

- [ ] **Criterio 1:** [Descripción específica]
  - ✅ Resultado esperado: [Descripción]
  - 📏 Métrica: [Cómo se mide]
  - 🎯 Valor objetivo: [Número/porcentaje/estado]

- [ ] **Criterio 2:** [Descripción específica]
  - ✅ Resultado esperado: [Descripción]
  - 📏 Métrica: [Cómo se mide]
  - 🎯 Valor objetivo: [Número/porcentaje/estado]

- [ ] **Criterio 3:** [Descripción específica]
  - ✅ Resultado esperado: [Descripción]
  - 📏 Métrica: [Cómo se mide]
  - 🎯 Valor objetivo: [Número/porcentaje/estado]

### Criterios de Calidad

- [ ] **Calidad del Código**
  - ✅ Nomenclatura consistente (100% archivos camelCase + sufijo)
  - ✅ Comentarios en español donde sea necesario
  - ✅ JSDoc completo para funciones públicas
  - ✅ Sin código comentado/muerto

- [ ] **Documentación**
  - ✅ README.md actualizado
  - ✅ Base_de_Datos.md actualizado (si aplica)
  - ✅ Decisiones_Tecnicas.md actualizado (si aplica)
  - ✅ Comentarios inline explicativos

- [ ] **Testing** (si aplica)
  - ✅ Tests unitarios agregados
  - ✅ Tests de integración agregados
  - ✅ Tests E2E agregados
  - ✅ Todos los tests pasando

### Criterios Técnicos

- [ ] **Performance**
  - 📏 Tiempo de respuesta: [valor objetivo]
  - 📏 Uso de memoria: [valor objetivo]
  - 📏 Queries optimizadas: [criterio]

- [ ] **Seguridad**
  - 🔒 Zero credenciales hardcodeadas
  - 🔒 Validación de inputs implementada
  - 🔒 Manejo de errores seguro

- [ ] **Escalabilidad**
  - 📈 Soporta [N] operaciones concurrentes
  - 📈 Preparado para [escenario de crecimiento]
  - 📈 Sin cuellos de botella identificados

---

## 📏 Métricas Cuantitativas

### Antes de la Implementación

| Métrica | Valor Actual | Fecha Medición |
|---------|--------------|----------------|
| [Métrica 1] | [Valor] | YYYY-MM-DD |
| [Métrica 2] | [Valor] | YYYY-MM-DD |
| [Métrica 3] | [Valor] | YYYY-MM-DD |
| [Métrica 4] | [Valor] | YYYY-MM-DD |

### Después de la Implementación (Objetivo)

| Métrica | Valor Objetivo | Mejora Esperada |
|---------|----------------|-----------------|
| [Métrica 1] | [Valor] | +/- X% |
| [Métrica 2] | [Valor] | +/- X% |
| [Métrica 3] | [Valor] | +/- X% |
| [Métrica 4] | [Valor] | +/- X% |

### Resultados Reales (Post-Implementación)

| Métrica | Valor Real | Mejora Real | ✅/❌ |
|---------|------------|-------------|-------|
| [Métrica 1] | [Valor] | +/- X% | ✅/❌ |
| [Métrica 2] | [Valor] | +/- X% | ✅/❌ |
| [Métrica 3] | [Valor] | +/- X% | ✅/❌ |
| [Métrica 4] | [Valor] | +/- X% | ✅/❌ |

---

## 📊 Métricas de Código

### Archivos Impactados

- **Archivos creados:** [N]
- **Archivos modificados:** [N]
- **Archivos eliminados:** [N]
- **Líneas agregadas:** +[N]
- **Líneas eliminadas:** -[N]

### Complejidad

- **Complejidad ciclomática antes:** [N]
- **Complejidad ciclomática después:** [N]
- **Código duplicado antes:** [X%]
- **Código duplicado después:** [X%]

---

## 🗄️ Métricas de Base de Datos (si aplica)

### Estructura

- **Tablas nuevas:** [N]
- **Columnas agregadas:** [N]
- **Índices creados:** [N]
- **Stored procedures nuevos:** [N]
- **Triggers nuevos:** [N]

### Performance

- **Query más lenta antes:** [Xms]
- **Query más lenta después:** [Xms]
- **Tamaño BD antes:** [XMB]
- **Tamaño BD después:** [XMB]

---

## ⚡ Métricas de Performance

### Tiempos de Respuesta

| Operación | Antes | Objetivo | Real | ✅/❌ |
|-----------|-------|----------|------|-------|
| [Operación 1] | [Xms] | [Yms] | [Zms] | ✅/❌ |
| [Operación 2] | [Xms] | [Yms] | [Zms] | ✅/❌ |
| [Operación 3] | [Xms] | [Yms] | [Zms] | ✅/❌ |

### Recursos

| Recurso | Antes | Objetivo | Real | ✅/❌ |
|---------|-------|----------|------|-------|
| Uso CPU | [X%] | [Y%] | [Z%] | ✅/❌ |
| Uso RAM | [XMB] | [YMB] | [ZMB] | ✅/❌ |
| Uso Disco | [XMB] | [YMB] | [ZMB] | ✅/❌ |

---

## 🎯 Impacto en Proyecto

### Impacto Positivo Esperado

- ✅ [Beneficio 1]
- ✅ [Beneficio 2]
- ✅ [Beneficio 3]

### Riesgos Mitigados

- 🔒 [Riesgo mitigado 1]
- 🔒 [Riesgo mitigado 2]
- 🔒 [Riesgo mitigado 3]

### Deuda Técnica Reducida

- 🧹 [Deuda técnica eliminada 1]
- 🧹 [Deuda técnica eliminada 2]
- 🧹 [Deuda técnica eliminada 3]

---

## 📋 Checklist de Validación

### Pre-Implementación

- [ ] Métricas baseline documentadas
- [ ] Objetivos cuantificables definidos
- [ ] Criterios de éxito acordados con POs
- [ ] Plan de medición establecido

### Durante Implementación

- [ ] Métricas monitoreadas continuamente
- [ ] Desviaciones documentadas y justificadas
- [ ] Ajustes realizados según necesidad
- [ ] Comunicación constante con stakeholders

### Post-Implementación

- [ ] Métricas finales documentadas
- [ ] Comparación antes/después realizada
- [ ] Lecciones aprendidas documentadas
- [ ] Recomendaciones para futuras fases

---

## 🔗 Referencias

**Issues Relacionados:**
- Issue Padre: #[NUMERO]
- Sub-Issues: #X, #Y, #Z

**Documentación:**
- [Enlace a documentación relevante]
- [Enlace a decisiones técnicas]
- [Enlace a roadmap]

**Commits Relevantes:**
- [hash] - [descripción]
- [hash] - [descripción]

---

## 📌 Notas Adicionales

[Cualquier información adicional relevante sobre las métricas]

### Cambios en Métricas

**Fecha:** YYYY-MM-DD
**Cambio:** [Descripción del cambio en métricas]
**Razón:** [Justificación del cambio]

---

**Última actualización:** YYYY-MM-DD
**Zona Horaria:** America/Santiago
**Responsable de Medición:** [Nombre]
