# Spec: Habilitar rutinas ocultas con V2 (Shadcn/Tailwind)

## Contexto / Problema
En el selector de rutinas (`servicios/src/components/SelectRoutineV2.js`) existen aplicaciones “ocultas” (comentadas) que no están disponibles para los usuarios, aun cuando algunas ya cuentan con pantallas `*V2` migradas a Shadcn/UI + Tailwind.

## Objetivo
Habilitar en el selector **solo** las rutinas ocultas que ya tienen su pantalla `*V2` en `servicios/src/components/`, manteniendo la lógica actual y el look & feel consistente con el resto de pantallas V2.

## Alcance
### In-scope
- Re-exponer en `/select-routine` las rutinas ocultas con `*V2` existente.
- Asegurar que el router del frontend registre las rutas faltantes para esas rutinas.
- Mantener el esquema de permisos existente (`routine.permission`).

### Out-of-scope (este sprint)
- Crear nuevas pantallas `*V2` para componentes legacy sin V2 (`Temperatura.js`, `Presencia.js`, `SmsData.js`).
- Crear pantallas V2 inexistentes para rutas como `/dashboard`, `/blind-spot-intrusions`, `/inteligencia-de-datos`.
- Cambios a backend/servicios/consultas, validaciones, transformaciones de datos o lógica de hooks en pantallas V2.

## Rutinas a habilitar (solo si existe `*V2`)
- `/ubicaciones-interior` → `UbicacionTiempoRealInteriorV2`
- `/busqueda-entradas-persona` → `PersonSearchV2`
- `/last-known-position` → `LastKnownPositionV2`
- `/consulta-historica-movimientos` → `HistoricalMovementsSearchV2`
- `/door-status-matrix` → `DoorStatusMatrixV2`
- `/analisis-deshielo` → `DefrostAnalysisV2`

## Criterios de aceptación
- En `/select-routine` aparecen cards para las rutinas V2 habilitadas.
- Al clickear una card (con permiso), navega a la ruta correcta y la pantalla carga.
- Si el usuario no tiene permiso, el comportamiento actual se mantiene (no se navega y se muestra el mensaje existente).
- No se exponen rutinas sin `*V2` en este sprint.

## Riesgos / Consideraciones
- Las rutas pueden existir en menús secundarios (ej. `SideNavV2`) pero no estar registradas en el router principal (`AppContent.js`).
- Permisos: asegurar que se usen los mismos `permission` que ya existen/usa el sistema (no inventar nuevos).


