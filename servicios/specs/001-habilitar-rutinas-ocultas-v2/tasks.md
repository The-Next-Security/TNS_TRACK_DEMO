# Tasks: Habilitar rutinas ocultas con V2 (Shadcn/Tailwind)

## Phase 1 — Spec/Plan
- [x] Crear `spec.md`
- [x] Crear `plan.md`
- [x] Crear `tasks.md`

## Phase 2 — Selector (UI)
- [ ] En `servicios/src/components/SelectRoutineV2.js`:
  - [ ] Agregar rutinas V2 a `routines` (solo las listadas en el spec).
  - [ ] Agregar textos en `getDescriptionText()` para las nuevas rutinas.
  - [ ] Verificar que el `permission` coincide con lo ya usado (ej. `SideNavV2`).

## Phase 3 — Router (wiring mínimo)
- [ ] En `servicios/src/components/AppContent.js`:
  - [ ] Registrar `/ubicaciones-interior` con `UbicacionTiempoRealInteriorV2`.

## Phase 4 — Smoke test
- [ ] Navegar desde `/select-routine` a cada ruta habilitada:
  - [ ] `/ubicaciones-interior`
  - [ ] `/busqueda-entradas-persona`
  - [ ] `/last-known-position`
  - [ ] `/consulta-historica-movimientos`
  - [ ] `/door-status-matrix`
  - [ ] `/analisis-deshielo`


