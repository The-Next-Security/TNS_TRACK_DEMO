# Decisiones Técnicas Clave

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-03-11
> **Versión**: 2.1.0
> **Propósito**: Documentar todas las decisiones arquitectónicas y técnicas del proyecto

---

## 📋 Índice

1. [Arquitectura Modular por Collectors](#1-arquitectura-modular-por-collectors)
2. [PWA con Service Workers](#2-pwa-con-service-workers)
3. [React 19.2.0 + TailwindCSS](#3-react-1920--tailwindcss)
4. [Express 5.1.0 (versión moderna)](#4-express-510-versión-moderna)
5. [NO uso de Variables de Entorno](#5-no-uso-de-variables-de-entorno)
6. [Zona Horaria Base: America/Santiago](#6-zona-horaria-base-americasantiago)
7. [DeepSeek como Provider de IA](#7-deepseek-como-provider-de-ia)
8. [Notificaciones: Email + Push (NO SMS)](#8-notificaciones-email--push-no-sms)
9. [MySQL como Base de Datos Principal](#9-mysql-como-base-de-datos-principal)

---

## Principios de Desarrollo

Todas las decisiones técnicas se basan en estos tres principios fundamentales:

### 1. KISS (Keep It Simple, Stupid)
- **Descripción**: Priorizar simplicidad sobre complejidad innecesaria
- **Aplicación**: Evitar sobre-ingeniería, elegir soluciones directas y comprensibles
- **Ejemplo**: Usar funciones simples en lugar de patrones complejos cuando la funcionalidad lo permite

### 2. DRY (Don't Repeat Yourself)
- **Descripción**: Evitar duplicación de código mediante modularización
- **Aplicación**: Extraer lógica común a funciones/servicios reutilizables
- **Ejemplo**: Servicios compartidos como `emailService.js`, `databaseService.js`

### 3. Modularización Máxima
- **Descripción**: Separar responsabilidades en módulos independientes y testables
- **Aplicación**: Cada módulo tiene una responsabilidad única y bien definida
- **Ejemplo**: Patrón de Collectors independientes por cada fuente de datos

---

## 1. Arquitectura Modular por Collectors

### Contexto
Necesitábamos una forma escalable y mantenible de integrar múltiples fuentes de datos de dispositivos IoT (Shelly, Ubibot, etc.) sin crear un monolito acoplado.

### Decisión
Implementar un patrón de **Collectors modulares** donde cada fuente de datos tiene su propio módulo independiente.

### Estructura
```
/servicios/src/
├── collectors/
│   ├── shellyCollector.js      # Collector para dispositivos Shelly
│   ├── ubibotCollector.js      # Collector para dispositivos Ubibot
│   └── [futuroCollector].js    # Fácilmente extensible
```

### Estado Actual
✅ **Implementado** - Collectors activos: Shelly, Ubibot

---

## 2. PWA con Service Workers

### Contexto
Se requería que la aplicación funcionara offline y pudiera instalarse como app nativa en dispositivos móviles.

### Decisión
Implementar **Progressive Web App (PWA)** con Service Workers para:
- Funcionalidad offline
- Instalación en dispositivos
- Push notifications
- Caché estratégica de assets

### Implementación
```
/servicios/public/
├── service-worker.js           # Service Worker principal
├── manifest.json               # Manifest PWA
└── icons/                      # Iconos para instalación
```

### Estado Actual
✅ **Implementado** - PWA completamente funcional con push notifications

---

## 3. React 19.2.0 + TailwindCSS

### Contexto
Se necesitaba un framework moderno y performante para el frontend con desarrollo ágil de UI.

### Decisión
- **React 19.2.0**: Última versión estable con mejoras de performance
- **TailwindCSS**: Utility-first CSS para desarrollo rápido y consistente

### Estado Actual
✅ **Implementado** - Frontend completo en React 19.2.0 + TailwindCSS

---

## 4. Express 5.1.0 (versión moderna)

### Contexto
El backend requería un framework estable, performante y con soporte de la comunidad.

### Decisión
Usar **Express 5.1.0** (versión moderna) en lugar de versiones anteriores o frameworks alternativos.

### Estado Actual
✅ **Implementado** - Backend corriendo en Express 5.1.0

---

## 5. NO uso de Variables de Entorno

### Contexto
Típicamente, aplicaciones Node.js usan archivos `.env` para configuración. Sin embargo, esto genera problemas de:
- Sincronización entre ambientes
- Configuración fragmentada
- Dificultad para auditar cambios

### Decisión
**Por diseño, NO se utilizan variables de entorno** (`.env`).

### Rationale
- Toda configuración se gestiona desde **base de datos centralizada**
- Configuración dinámica sin reinicio de servidor
- Auditoría completa de cambios vía SQL
- Una única fuente de verdad

### Excepciones
- ⚠️ Solo configuración de arranque crítica puede ir en archivos de configuración

### Estado Actual
✅ **Implementado** - No se usan variables de entorno `.env`

---

## 6. Zona Horaria Base: America/Santiago

### Contexto
El sistema puede usarse desde distintas zonas horarias, pero los servidores y datos deben tener una zona horaria de referencia consistente.

### Decisión
**SIEMPRE usar America/Santiago (Chile) como zona horaria base del sistema**.

### Implementación
```javascript
// Backend - timezone configurado en config
timezone: 'America/Santiago'

// Uso con moment-timezone (legacy) o Luxon (estándar)
const moment = require('moment-timezone');
moment.tz('America/Santiago');
```

> **Nota**: El proyecto está estandarizando en **Luxon** (Issue #5); moment se mantiene temporalmente en partes del código hasta completar la migración.

### Estado Actual
✅ **Implementado** - Timezone base configurado en `America/Santiago`

---

## 7. DeepSeek como Provider de IA

### Contexto
El sistema requiere capacidades de IA para análisis de datos y generación de insights.

### Decisión
Usar **DeepSeek** como proveedor de servicios de IA.

### Implementación
```javascript
// Configuración DeepSeek en base de datos
aiProvider: 'deepseek'
```

### Estado Actual
✅ **Implementado** - DeepSeek configurado como provider de IA

---

## 8. Notificaciones: Email + Push (NO SMS)

### Contexto
El sistema original consideraba SMS vía Twilio como canal de notificación, pero se decidió eliminarlo.

### Decisión
**NO usar SMS/Twilio**. Canales de notificación soportados:
- ✅ **Email** (vía SendGrid)
- ✅ **Push Notifications** (vía Web Push)

### Rationale
- SMS tiene costos elevados por mensaje
- Email y Push son suficientes para el caso de uso
- Mejor experiencia de usuario con notificaciones ricas (push)

### Implementación
```javascript
// Servicios de notificación
emailService.js       // SendGrid Mail 8.1.4
pushService.js        // Web Push 3.6.7
```

### Estado Actual
✅ **Implementado** - SMS/Twilio completamente removido del sistema

---

## 9. MySQL como Base de Datos Principal

### Contexto
Se necesitaba una base de datos relacional robusta, performante y con buen soporte.

### Decisión
Usar **MySQL** (NO MariaDB) como base de datos principal.

### Driver
```json
"mysql2": "^3.15.2"
```

### Estado Actual
✅ **Implementado** - MySQL 8.x corriendo en producción

---

## 📝 Historial de Cambios

> **Nota**: Para historial detallado de cambios del proyecto, ver [CHANGELOG.md](./CHANGELOG.md)

| Fecha | Decisión | Responsable |
|-------|----------|-------------|
| 2026-03-10 | Luxon como librería estándar de fechas (Issue #5) | andresTNS |
| 2026-01-26 | Documentación actualizada según feedback Issue #2 | andresTNS, Bufigol |
| 2026-01-22 | Documentación completa de decisiones técnicas | andresTNS, Bufigol |
| 2026-01-15 | Eliminación de SMS/Twilio | andresTNS |
| 2026-01-10 | Migración a BD iniciada | andresTNS |

---

## 🔄 Decisiones en Revisión

| Decisión | Estado | Issue | Posible Impacto |
|----------|--------|-------|-----------------|
| _Ninguna decisión en revisión actualmente_ | - | - | - |

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-03-11
