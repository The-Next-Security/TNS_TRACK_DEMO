# Decisiones Técnicas Clave

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-01-26
> **Versión**: 2.0.0
> **Propósito**: Documentar todas las decisiones arquitectónicas y técnicas del proyecto

---

## 📋 Índice

1. [Arquitectura Modular por Collectors](#1-arquitectura-modular-por-collectors)
2. [Migración de Configuración a Base de Datos](#2-migración-de-configuración-a-base-de-datos)
3. [Sistema de Alertas Modular](#3-sistema-de-alertas-modular)
4. [PWA con Service Workers](#4-pwa-con-service-workers)
5. [Reportes PDF con Templates Ejecutivos](#5-reportes-pdf-con-templates-ejecutivos)
6. [React 19.2.0 + TailwindCSS](#6-react-1920--tailwindcss)
7. [Express 5.1.0 (versión moderna)](#7-express-510-versión-moderna)
8. [NO uso de Variables de Entorno](#8-no-uso-de-variables-de-entorno)
9. [Zona Horaria Base: America/Santiago](#9-zona-horaria-base-americasantiago)
10. [DeepSeek como Provider de IA](#10-deepseek-como-provider-de-ia)
11. [Notificaciones: Email + Push (NO SMS)](#11-notificaciones-email--push-no-sms)
12. [MySQL como Base de Datos Principal](#12-mysql-como-base-de-datos-principal)

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

### Ventajas
- ✅ **Escalabilidad**: Agregar nuevas fuentes de datos solo requiere crear un nuevo collector
- ✅ **Mantenibilidad**: Bugs en un collector no afectan a otros
- ✅ **Testabilidad**: Cada collector puede testearse independientemente
- ✅ **Claridad**: Lógica de integración está aislada y bien definida

### Desventajas
- ⚠️ Requiere mantener convención de nombres y estructura consistente
- ⚠️ Puede crear código duplicado si no se extraen helpers comunes

### Estado Actual
✅ **Implementado** - Collectors activos: Shelly, Ubibot

---

## 2. Migración de Configuración a Base de Datos

### Contexto
Originalmente, el sistema usaba archivos JSON estáticos (`unified-config.json`) para configuración. Esto generaba problemas en ambientes distribuidos y requería reiniciar el servidor para cambios.

### Decisión
Migrar **toda la configuración dinámica a base de datos** MySQL, manteniendo solo configuración de arranque en archivos.

### Implementación
```javascript
// config-loader.js - Revisa periódicamente la BD
const configLoader = require('./src/config/js_files/config-loader');
```

### Estado de Migración
- 🟡 **EN PROGRESO**
- ⚠️ `/servicios/src/config/jsons/` marcado como **LEGACY**
- ⚠️ `unified-config.json` será eliminado cuando migración esté completa
- ✅ `config-loader.js` ya implementado y funcional

### Ventajas
- ✅ Cambios de configuración en tiempo real (sin reinicio)
- ✅ Configuración centralizada para múltiples instancias
- ✅ Auditoría de cambios de configuración vía SQL
- ✅ Respaldo automático con backups de BD

### Desventajas
- ⚠️ Dependencia de BD para arranque del sistema
- ⚠️ Migración gradual requiere mantener ambos sistemas temporalmente

---

## 3. Sistema de Alertas Modular

> **Nota**: Esta sección será actualizada con detalles específicos cuando se completen Issues #1 (Creación de BD) y #3 (Tabla de configuración).

### Contexto
Las versiones anteriores del sistema de alertas eran monolíticas y difíciles de extender. Se necesitaba un sistema flexible que soportara múltiples tipos de alertas, canales de notificación y condiciones complejas.

### Decisión
Implementar **Sistema de Alertas Modular** con arquitectura modular basada en:
- **Plantillas reutilizables**
- **Canales de notificación independientes**
- **Condiciones configurables**

### Estructura
```
/servicios/src/components/alerts/
├── README.md                    # Documentación completa del sistema
├── alertScheduleController.js   # Controlador principal
├── templates/                   # Plantillas de alertas
└── channels/                    # Canales de notificación (email, push)
```

### Características Clave
- ✅ Configuración de alertas desde base de datos
- ✅ Soporte para múltiples condiciones (temperatura, humedad, conectividad)
- ✅ Múltiples canales simultáneos (email + push)
- ✅ Plantillas personalizables por tipo de alerta
- ✅ Programación flexible (cron-based)

### Estado Actual
✅ **Implementado y funcional** - en producción

---

## 4. PWA con Service Workers

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

### Ventajas
- ✅ Experiencia de usuario mejorada (funciona sin conexión)
- ✅ Instalable como app nativa (sin necesidad de stores)
- ✅ Push notifications en tiempo real
- ✅ Carga más rápida con caché estratégica

### Desventajas
- ⚠️ Complejidad adicional en debugging
- ⚠️ Requiere manejo cuidadoso de actualizaciones de cache

### Estado Actual
✅ **Implementado** - PWA completamente funcional con push notifications

---

## 5. Reportes PDF con Templates Ejecutivos

### Contexto
Los clientes requerían reportes profesionales en PDF con gráficos y branding corporativo para presentaciones ejecutivas.

### Decisión
Implementar sistema de **generación de PDFs con templates reutilizables** usando:
- **PDFKit** para generación de PDFs
- **QuickChart.js** para gráficos embebidos
- **Templates modulares** por tipo de reporte

### Estructura
```
/servicios/src/components/reports/
├── pdfGenerator.js              # Generador principal de PDFs
├── templates/                   # Templates por tipo de reporte
└── UX_TESTING_GUIDE.md         # Guía de testing UX
```

### Características
- ✅ Gráficos de temperatura con escala temporal
- ✅ Branding corporativo (logo, colores)
- ✅ Tablas de datos con formato profesional
- ✅ Exportable y compartible vía email

### Ventajas
- ✅ Reportes profesionales para clientes
- ✅ Templates reutilizables y personalizables
- ✅ Generación server-side (no depende del navegador)

### Estado Actual
✅ **Implementado** - Generación de reportes PDF funcional

---

## 6. React 19.2.0 + TailwindCSS

### Contexto
Se necesitaba un framework moderno y performante para el frontend con desarrollo ágil de UI.

### Decisión
- **React 19.2.0**: Última versión estable con mejoras de performance
- **TailwindCSS**: Utility-first CSS para desarrollo rápido y consistente

### Ventajas
- ✅ Desarrollo rápido de componentes con Tailwind
- ✅ Performance mejorada con React 19.2.0
- ✅ Ecosistema robusto de componentes
- ✅ Mantenibilidad con componentes reutilizables

### Desventajas
- ⚠️ Curva de aprendizaje para desarrolladores nuevos en utility-first CSS
- ⚠️ Tamaño de bundle puede crecer si no se optimiza correctamente

### Estado Actual
✅ **Implementado** - Frontend completo en React 19.2.0 + TailwindCSS

---

## 7. Express 5.1.0 (versión moderna)

### Contexto
El backend requería un framework estable, performante y con soporte de la comunidad.

### Decisión
Usar **Express 5.1.0** (versión moderna) en lugar de versiones anteriores o frameworks alternativos.

### Ventajas
- ✅ Framework maduro y estable con gran comunidad
- ✅ Middlewares probados y disponibles
- ✅ Performance mejorada en versión 5.x
- ✅ Fácil integración con MySQL y otras dependencias

### Desventajas
- ⚠️ No incluye opiniones sobre estructura (requiere organización manual)

### Estado Actual
✅ **Implementado** - Backend corriendo en Express 5.1.0

---

## 8. NO uso de Variables de Entorno

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

### Ventajas
- ✅ Configuración centralizada y auditada
- ✅ Cambios en tiempo real sin reinicio
- ✅ No hay "sorpresas" de configuración entre ambientes

### Desventajas
- ⚠️ Sistema depende completamente de BD para configuración
- ⚠️ Requiere migración manual inicial de configuración a BD

### Estado Actual
✅ **Implementado** - No se usan variables de entorno `.env`

---

## 9. Zona Horaria Base: America/Santiago

### Contexto
El sistema puede usarse desde distintas zonas horarias, pero los servidores y datos deben tener una zona horaria de referencia consistente.

### Decisión
**SIEMPRE usar America/Santiago (Chile) como zona horaria base del sistema**.

### Implementación
```javascript
// Backend - timezone configurado en config
timezone: 'America/Santiago'

// Uso con moment-timezone
const moment = require('moment-timezone');
moment.tz('America/Santiago');
```

### Ventajas
- ✅ Consistencia en todos los datos almacenados
- ✅ Evita confusión con horarios de verano (DST)
- ✅ Zona horaria del cliente principal (TNS está en Chile)

### Desventajas
- ⚠️ Requiere conversión manual si se expande a otras zonas horarias

### Estado Actual
✅ **Implementado** - Timezone base configurado en `America/Santiago`

---

## 10. DeepSeek como Provider de IA

### Contexto
El sistema requiere capacidades de IA para análisis de datos y generación de insights.

### Decisión
Usar **DeepSeek** como proveedor de servicios de IA.

### Implementación
```javascript
// Configuración DeepSeek en base de datos
aiProvider: 'deepseek'
```

### Ventajas
- ✅ Costos competitivos comparado con otros providers
- ✅ Performance adecuada para el caso de uso
- ✅ API simple de integrar

### Desventajas
- ⚠️ Dependencia de servicio externo

### Estado Actual
✅ **Implementado** - DeepSeek configurado como provider de IA

---

## 11. Notificaciones: Email + Push (NO SMS)

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

## 12. MySQL como Base de Datos Principal

### Contexto
Se necesitaba una base de datos relacional robusta, performante y con buen soporte.

### Decisión
Usar **MySQL** (NO MariaDB) como base de datos principal.

### Driver
```json
"mysql2": "^3.15.2"
```

### Ventajas
- ✅ Base de datos madura y probada
- ✅ Performance excelente para el caso de uso
- ✅ Herramientas de administración abundantes
- ✅ Soporte de transacciones ACID completo

### Desventajas
- ⚠️ Requiere configuración y mantenimiento de servidor DB

### Estado Actual
✅ **Implementado** - MySQL 8.x corriendo en producción

---

## 📝 Historial de Cambios

> **Nota**: Para historial detallado de cambios del proyecto, ver [CHANGELOG.md](./CHANGELOG.md)

| Fecha | Decisión | Responsable |
|-------|----------|-------------|
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
**Última revisión**: 2026-01-26
