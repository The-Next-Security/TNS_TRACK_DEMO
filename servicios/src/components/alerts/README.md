# Alert Management System - Refactorización v4.0.0

## Descripción General

Este documento describe la refactorización completa del sistema de gestión de alertas, transformando código monolítico en una arquitectura modular, mantenible y escalable.

## Estructura del Proyecto

```
servicios/src/components/alerts/
├── constants/
│   └── alertConstants.js       # Constantes centralizadas
├── hooks/
│   ├── index.js               # Exportaciones centralizadas
│   ├── useAlertDetail.js      # Gestión de detalles de alerta
│   ├── useAlertActions.js     # Gestión de acciones de alerta
│   ├── useAlertFilters.js     # Gestión de filtros y paginación
│   └── useAlertList.js        # Obtención de lista de alertas
├── utils/
│   └── alertUtils.js          # Funciones utilitarias
├── components/
│   ├── index.js               # Exportaciones centralizadas
│   ├── InfoCard.js            # Card de información
│   ├── StatCard.js            # Card de estadísticas
│   ├── ActiveFilters.js       # Filtros activos
│   ├── EmptyState.js          # Estado vacío
│   ├── AlertDetailSkeleton.js # Skeleton del detalle
│   ├── TableSkeleton.js       # Skeleton de tabla
│   ├── ObservationTimeline.js # Timeline de observaciones
│   └── AlertActions.js        # Acciones de alerta
└── README.md                  # Este archivo
```

## Componentes Principales Refactorizados

### 1. AlertManagementV2.js

**Antes:** 1,145 líneas monolíticas
**Después:** 377 líneas modulares

**Mejoras:**
- Separación de lógica en custom hooks
- Extracción de componentes reutilizables
- Mejor organización de imports
- Código más legible y mantenible

### 2. AlertHistoryTable.js

**Antes:** 1,156 líneas monolíticas
**Después:** 725 líneas modulares

**Mejoras:**
- Uso de hooks para filtrado y paginación
- Componentes reutilizables para UI
- Separación de lógica de presentación
- Mejor manejo de estado

## Módulos Creados

### Constants (alertConstants.js)

Centraliza todas las configuraciones estáticas:

- `ALERT_STATUS_MAP` - Mapeo de estados de alerta
- `ALERT_TYPE_MAP` - Mapeo de tipos de alerta
- `ANIMATION_VARIANTS` - Variantes de animación Framer Motion
- `DATE_RANGE_OPTIONS` - Opciones de rango de fechas
- `PAGINATION_CONFIG` - Configuración de paginación
- `API_ENDPOINTS` - Endpoints de API
- `DEFAULT_VALUES` - Valores por defecto

**Beneficios:**
- Único punto de actualización para constantes
- Fácil mantenimiento
- Reutilización en múltiples componentes

### Custom Hooks

#### useAlertDetail

Gestiona el estado y carga de detalles de una alerta individual.

```javascript
const { alert, loading, updateAlertState } = useAlertDetail(alertId, toast);
```

**Responsabilidades:**
- Fetch de datos de alerta
- Gestión de estado de carga
- Actualización de estado local

#### useAlertActions

Gestiona todas las acciones sobre alertas (acknowledge, resolve, false alarm, observations).

```javascript
const {
  submitting,
  handleAcknowledge,
  handleResolve,
  handleFalseAlarm,
  handleAddObservation
} = useAlertActions(alertId, userEmail, toast, onSuccess);
```

**Responsabilidades:**
- Llamadas a API para acciones
- Manejo de estados de envío
- Callbacks de éxito/error

#### useAlertFilters

Gestiona filtros, búsqueda y paginación de alertas.

```javascript
const {
  filteredAlerts,
  activeFilters,
  currentAlerts,
  totalPages,
  // ... filtros individuales
} = useAlertFilters(alerts);
```

**Responsabilidades:**
- Filtrado por estado, tipo, sensor, ID
- Paginación
- Gestión de filtros activos

#### useAlertList

Obtiene y gestiona la lista completa de alertas desde la API.

```javascript
const {
  alerts,
  loading,
  stats,
  uniqueSensors,
  handleRefresh
} = useAlertList(dateRangeFilter, statusFilter, typeFilter);
```

**Responsabilidades:**
- Fetch de lista de alertas
- Cálculo de estadísticas
- Extracción de sensores únicos

### Utilities (alertUtils.js)

Funciones puras y reutilizables para procesamiento de datos:

**Formateo:**
- `formatDate()` - Formato corto de fecha
- `formatDateTime()` - Formato detallado de fecha
- `formatRelativeTime()` - Tiempo relativo (ej: "2 horas atrás")
- `formatResponseTime()` - Tiempo de respuesta legible

**Parsing:**
- `parseObservations()` - Convierte observaciones de varios formatos a array
- `parseObservationCount()` - Cuenta observaciones
- `getLatestObservationPreview()` - Preview de última observación

**Cálculos:**
- `getElapsedTime()` - Tiempo transcurrido desde creación
- `calculateAlertStats()` - Estadísticas de alertas
- `getDateRangeParams()` - Parámetros de rango de fechas
- `getUniqueSensors()` - Extrae sensores únicos

### Components

Componentes reutilizables pequeños y enfocados:

#### InfoCard
Tarjeta de información con icono, etiqueta y valor.

#### StatCard
Tarjeta de estadística con icono, valor y tendencia opcional.

#### ActiveFilters
Muestra filtros activos con opción de eliminar individual o todos.

#### EmptyState
Estado vacío con icono y mensaje personalizable.

#### AlertDetailSkeleton
Skeleton loader para vista de detalle.

#### TableSkeleton
Skeleton loader para tabla de historial.

#### ObservationTimeline
Timeline completo de eventos de alerta (creación, atención, observaciones, resolución).

#### AlertActions
Componente completo de acciones rápidas y diálogos (atender, resolver, falsa alarma, observaciones).

## Mejoras Implementadas

### 1. Separación de Responsabilidades

**Antes:**
```javascript
// Todo en un componente gigante
const AlertManagementV2 = () => {
  // 500 líneas de lógica mezclada
  // Estado, fetch, formateo, UI, todo junto
};
```

**Después:**
```javascript
// Componente limpio con responsabilidades claras
const AlertManagementV2 = () => {
  // Custom hooks para lógica
  const { alert, loading } = useAlertDetail(alertId, toast);
  const { handleAcknowledge } = useAlertActions(...);

  // Solo UI y composición
  return <AlertActions {...} />;
};
```

### 2. Reutilización de Código

Componentes y hooks ahora son reutilizables en otras partes de la aplicación.

### 3. Testing más Fácil

Hooks y utilidades pueden ser testeados de forma aislada.

### 4. Mejor Legibilidad

Código autodocumentado con JSDoc completo y nombres descriptivos.

### 5. Mantenibilidad

Cambios en constantes o lógica solo requieren editar un archivo.

## Funcionalidad Preservada

**Importante:** Esta refactorización NO cambia ninguna funcionalidad:

- ✅ Todas las llamadas a API permanecen idénticas
- ✅ Todas las estructuras de datos son las mismas
- ✅ Todo el comportamiento de UI es igual
- ✅ Todos los console.log de debugging se mantienen
- ✅ Todos los estilos Tailwind/Shadcn permanecen
- ✅ Todas las animaciones Framer Motion funcionan igual

## Guía de Migración

### Para Agregar una Nueva Constante

```javascript
// En alerts/constants/alertConstants.js
export const NUEVA_CONSTANTE = {
  // definición
};
```

### Para Agregar un Nuevo Tipo de Alerta

```javascript
// En alerts/constants/alertConstants.js
export const ALERT_TYPE_MAP = {
  ...existing,
  nuevo_tipo: {
    label: "Nuevo Tipo",
    icon: NuevoIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-800"
  }
};
```

### Para Agregar una Nueva Acción

```javascript
// En alerts/hooks/useAlertActions.js
const handleNuevaAccion = async () => {
  // implementación
};

return {
  ...existing,
  handleNuevaAccion
};
```

### Para Crear un Nuevo Componente Reutilizable

```javascript
// En alerts/components/NuevoComponente.js
/**
 * @fileoverview NuevoComponente
 * @description Descripción del componente
 */
export const NuevoComponente = ({ props }) => {
  // implementación
};

// En alerts/components/index.js
export { NuevoComponente } from './NuevoComponente';
```

## Consideraciones de Performance

### Optimizaciones Implementadas

1. **React.memo** - Componentes pesados están memoizados
2. **useCallback** - Callbacks están optimizados para evitar re-renders
3. **useMemo** - Cálculos costosos están memoizados
4. **Lazy Loading** - Componentes se cargan bajo demanda

### Recomendaciones Futuras

1. Implementar virtualización para listas muy largas
2. Implementar debounce en búsquedas
3. Agregar service worker para caché de API
4. Implementar React Query para mejor gestión de caché

## Debugging

Todos los console.log se mantienen para debugging:

- `[useAlertDetail]` - Logs del hook de detalle
- `[useAlertList]` - Logs del hook de lista
- `[AlertManagementV2]` - Logs del componente principal
- `[AlertHistoryTable]` - Logs de la tabla

## Próximos Pasos Recomendados

1. **Tests Unitarios**
   - Tests para cada hook
   - Tests para funciones utilitarias
   - Tests de componentes con React Testing Library

2. **Tests de Integración**
   - Tests E2E con Playwright/Cypress
   - Tests de flujos completos de usuario

3. **TypeScript**
   - Migrar a TypeScript para type safety
   - Agregar interfaces para tipos de datos

4. **Documentación**
   - Storybook para componentes
   - Documentación API con JSDoc mejorado

5. **Performance**
   - Análisis de bundle size
   - Code splitting más granular
   - Optimización de re-renders

## Soporte

Para preguntas o issues relacionados con esta refactorización, contactar al equipo de desarrollo.

---

**Versión:** 4.0.0
**Fecha:** Octubre 2025
**Autor:** Claude (Anthropic)
**Tipo:** Refactorización Mayor (Sin cambios de funcionalidad)
