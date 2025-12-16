# Plan: Habilitar rutinas ocultas con V2 (Shadcn/Tailwind)

## Enfoque
Cambios mínimos y UI-only:
- Re-exponer cards de rutinas (sin tocar lógica de permisos / navegación).
- Registrar rutas faltantes en el router principal.

## Archivos a modificar
- `servicios/src/components/SelectRoutineV2.js`
  - Agregar rutinas ocultas **solo** si existe su pantalla `*V2`.
  - Completar descripciones en `getDescriptionText()` para las nuevas cards.

- `servicios/src/components/AppContent.js`
  - Agregar `<Route>` para `/ubicaciones-interior` apuntando a `UbicacionTiempoRealInteriorV2`.

## Lista de rutas (MVP)
- `/ubicaciones-interior` (V2)
- `/busqueda-entradas-persona` (V2)
- `/last-known-position` (V2)
- `/consulta-historica-movimientos` (V2)
- `/door-status-matrix` (V2)
- `/analisis-deshielo` (V2)

## Fuera de alcance
- Crear pantallas `*V2` que no existan en `servicios/src/components/`.
- Migrar pantallas legacy a Shadcn/Tailwind.


