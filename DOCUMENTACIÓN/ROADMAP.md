# Roadmap - Planificación de Desarrollo

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-03-18
> **Versión**: 3.0.0
> **Propósito**: Planificación estratégica del ciclo de vida del producto

---

## 📋 Índice

1. [Visión del Proyecto](#visión-del-proyecto)
2. [Historial de Fases](#historial-de-historial-de-fases)
3. [FASE 1: Estabilidad e Integración Hardware (PRÓXIMAMENTE)](#fase-1-estabilidad-e-integración-hardware-próximamente)
4. [Principios de Desarrollo](#principios-de-desarrollo)

---

## Visión del Proyecto

### Propósito
TNS Track Demo es un **sistema de demostración** desarrollado por **The Next Security** que sirve como showcase de capacidades de monitoreo inteligente, actuando como base sólida y replicable para proyectos productivos.

---

## Historial de Fases

### ✅ FASE 0: Planificación y Fundamentos (COMPLETADO)
**Release**: [v1.0.0] - 2026-03-18

Fase enfocada en establecer una base técnica profesional y documentada.

**Hitos alcanzados**:
- **Issue #1**: Creación de base de datos robusta desde cero.
- **Issue #2**: Documentación técnica integral del sistema.
- **Issue #3**: Centralización de configuración en base de datos.
- **Issue #4**: Estandarización de nomenclatura (camelCase + sufijos).
- **Issue #5**: Unificación de manejo de fechas con Luxon.
- **Issue #6**: Limpieza profunda de código legacy y dependencias.
- **Issue #8**: Gestión de secretos alineada con la arquitectura de BD.

---

## FASE 1: Estabilidad e Integración Hardware (PRÓXIMAMENTE)

**Estado**: ⚪ PLANIFICADO
**Objetivo**: Resolver deuda técnica acumulada y expandir la integración con hardware Teltonika.

### Objetivos Principales

| ID | Tarea / Issue | Tipo | Prioridad |
|---|---|---|---|
| #46 | Corregir warning de dependencia crítica en `react-datepicker` | Bug | Alta |
| #33 | Corregir fallo en runtime de `updateChannelThresholds` | Bug | Alta |
| #32 | Migrar parametrizaciones restantes a `ubi_presets` | Refactor | Media |
| #26 | Desarrollar endpoints para vistas de Sectores y Beacons (Teltonika) | Feature | Media |
| #8 | Mejoras de UX/UI en Dashboard Principal | Enhancement | Baja |

---

## Principios de Desarrollo

### Metodología

1. **KISS (Keep It Simple, Stupid)**: Priorizar soluciones directas.
2. **DRY (Don't Repeat Yourself)**: Modularización y servicios compartidos.
3. **Modularización Máxima**: Un archivo = una responsabilidad clara.

### Definition of Done (DoD)
Un issue se considera completo cuando:
- ✅ Código implementado y funcional.
- ✅ Documentación actualizada.
- ✅ Code review aprobado por andresTNS.
- ✅ Issue cerrado en GitHub.

---

## Referencias

- **GitHub Issues**: https://github.com/andresTNS/TNS_TRACK_DEMO/issues
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Decisiones Técnicas**: [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md)

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-03-18
