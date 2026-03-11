# Endpoints API - TNS Track Demo

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-03-11
> **Versión**: 2.1.0

---

## 📋 URLs del Sistema

### Backend API
- **Base URL**: `http://localhost:1337/TNS_Cool_Track/api/`
- **Puerto**: 1337
- **Prefijo de Ruta**: `/TNS_Cool_Track/api/`

### Frontend
- **URL**: `http://localhost:3000/tns_cool_track`
- **Puerto**: 3000 (con proxy a backend en 1337)
- **Prefijo de Ruta**: `/tns_cool_track`

> **Nota**: Todas las rutas del sistema utilizan el prefijo `/TNS_Cool_Track/` (backend) o `/tns_cool_track` (frontend) de forma estándar.

---

## 📋 Índice de Endpoints

1. [Información General](#información-general)
2. [Autenticación](#autenticación)
3. [Usuarios](#usuarios)
4. [Dispositivos](#dispositivos)
5. [Configuración](#configuración)
6. [Análisis y Datos](#análisis-y-datos)
7. [Alertas](#alertas)
8. [Reportes](#reportes)
9. [GPS y Ubicación](#gps-y-ubicación)
10. [Push Notifications](#push-notifications)
11. [IA y Análisis Avanzado](#ia-y-análisis-avanzado)
12. [Otros](#otros)

---

## Información General

### Autenticación

La mayoría de los endpoints requieren **autenticación vía JWT Bearer Token**. Los tokens se envían automáticamente vía **HTTP-only cookies**:
- `access`: Access token (duración: **1 hora**)
- `refresh`: Refresh token (duración: 7 días)

**Headers**:
```
Authorization: Bearer <access_token>
```

### Formato de Respuestas

Todas las respuestas siguen formato JSON:

**Éxito:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "error": "Mensaje de error descriptivo",
  "details": { ... } // Opcional
}
```

---

## Autenticación

### POST `/TNS_Cool_Track/api/auth/refresh`
Renueva tokens usando el refresh token.

**Cookies Requeridas**: `refresh`

**Response**:
```json
{
  "success": true
}
```

**Cookies Seteadas**: `access`, `refresh` (nuevos tokens)

---

### POST `/TNS_Cool_Track/api/auth/logout`
Cierra sesión y limpia cookies de autenticación.

**Response**:
```json
{
  "success": true
}
```

---

### GET `/TNS_Cool_Track/api/auth/me`
Obtiene perfil del usuario autenticado.

**Headers**: Requiere autenticación

**Response**:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@tns.cl",
    "permissions": "admin",
    "ai_analysis": true
  }
}
```

---

### GET `/TNS_Cool_Track/api/auth/validate`
Valida sesión actual y retorna metadata de sesión.

**Headers**: Requiere autenticación

**Response**:
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@tns.cl",
    "permissions": "admin",
    "ai_analysis": true
  },
  "session": {
    "expiresAt": 1705934567890,
    "expiresIn": 3600,
    "timeRemaining": 3600
  }
}
```

**Cache Headers**: `no-store, no-cache` (CRÍTICO para SessionManager)

---

### POST `/TNS_Cool_Track/api/auth/extend-session`
Extiende sesión actual renovando tokens (token rotation).

**Cookies Requeridas**: `refresh`

**Response**:
```json
{
  "success": true,
  "expiresAt": 1705938167890,
  "expiresIn": 3600,
  "message": "Session extended successfully"
}
```

---

## Usuarios

### Base Path: `/TNS_Cool_Track/api/usuarios`

_(Detalles de endpoints de usuarios a completar según usuariosRoutes.js)_

---

## Dispositivos

### Base Path: `/TNS_Cool_Track/api/devices`

Gestión de dispositivos IoT (Shelly, Ubibot, etc.)

_(Detalles de endpoints de dispositivos a completar según deviceRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/ubibot`

Endpoints específicos para dispositivos Ubibot.

_(Detalles de endpoints de Ubibot a completar según ubibotRoutes.js)_

---

## Configuración

### Base Path: `/TNS_Cool_Track/api/config`

Gestión de configuración del sistema (migrando a BD desde unified-config.json).

_(Detalles de endpoints de configuración a completar según configRoutes.js)_

---

## Análisis y Datos

### Base Path: `/TNS_Cool_Track/api/analysis`

Análisis de datos de sensores y dispositivos.

_(Detalles de endpoints de análisis a completar según analysisRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/totals`

Totales y estadísticas agregadas.

_(Detalles de endpoints de totales a completar según totalesRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/powerAnalysis`

Análisis de consumo eléctrico.

_(Detalles de endpoints de powerAnalysis a completar según powerAnalysisRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/consumo`

Categorías de consumo eléctrico.

_(Detalles de endpoints de consumo a completar según consumoCategoriaRoutes.js)_

---

## Alertas

### Base Path: `/TNS_Cool_Track/api/alerts`

Sistema de gestión de alertas (temperatura, humedad, conectividad). Canales: email (SendGrid) y push (Web Push). Ver [Decisiones_Tecnicas.md](Decisiones_Tecnicas.md) (sección Notificaciones) y rutas/controladores en `alertTrackingRoutes.js`, `alertScheduleRoutes.js`.

_(Detalles de endpoints de alertas a completar según alertTrackingRoutes.js y alertScheduleRoutes.js)_

---

### Base Path: `/api` (Presets)

Sistema de gestión de presets de temperatura.

_(Detalles de endpoints de presets a completar según presetsRoutes.js)_

---

## Reportes

### Base Path: `/TNS_Cool_Track/api/reports`

Sistema de generación de reportes PDF con templates ejecutivos.

**Feature**: 004 - Generación de Reportes

_(Detalles de endpoints de reportes a completar según reportsRoutes.js)_

---

## GPS y Ubicación

### Base Path: `/TNS_Cool_Track/api/gps`

Gestión de datos GPS.

_(Detalles de endpoints de GPS a completar según gpsRoutes.js)_

---

### Base Path: `/gps-data`

**Nota**: Este endpoint NO está bajo `/api` por razones históricas.

_(Detalles de endpoints de GPS data a completar según gpsDataRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/beacons`

Gestión de beacons de ubicación.

_(Detalles de endpoints de beacons a completar según beaconsRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/blindspot`

Gestión de zonas ciegas (blind spots).

_(Detalles de endpoints de blind spots a completar según blindSpotRoutes.js)_

---

## Push Notifications

### Base Path: `/TNS_Cool_Track/api/push`

Sistema de Push Notifications para PWA (Web Push).

**Tecnología**: Web Push 3.6.7

_(Detalles de endpoints de push notifications a completar según pushNotificationRoutes.js)_

---

## IA y Análisis Avanzado

### Base Path: `/TNS_Cool_Track/api/v1/ai-analysis`

AI Cold Chamber Analysis - Análisis de cámaras frías con IA.

**Feature**: 005 - AI Analysis
**Provider**: DeepSeek

_(Detalles de endpoints de IA a completar según aiAnalysisRoutes.js)_

---

## Otros

### Base Path: `/TNS_Cool_Track/api/personal`

Gestión de personal.

_(Detalles de endpoints de personal a completar según personalRoutes.js)_

---

### Base Path: `/TNS_Cool_Track/api/sectores`

Gestión de sectores/áreas.

_(Detalles de endpoints de sectores a completar según sectoresRoutes.js)_

---

### ~~Base Path: `/api/sms`~~ ⚠️ DEPRECADO

**Nota**: SMS/Twilio fue **completamente removido del sistema**. Este endpoint ya no está disponible.

**Canales soportados**: Email (SendGrid) + Push Notifications (Web Push)

---

## 📊 Resumen de Endpoints

| Categoría | Base Path | Descripción | Estado |
|-----------|-----------|-------------|--------|
| **Autenticación** | `/api/auth` | Login, logout, refresh, validación | ✅ Activo |
| **Usuarios** | `/api/usuarios` | Gestión de usuarios | ✅ Activo |
| **Dispositivos** | `/api/devices` | Gestión de dispositivos IoT | ✅ Activo |
| **Ubibot** | `/api/ubibot` | Dispositivos Ubibot específicos | ✅ Activo |
| **Configuración** | `/api/config` | Configuración del sistema | 🟡 Migrando a BD |
| **Análisis** | `/api/analysis` | Análisis de datos | ✅ Activo |
| **Totales** | `/api/totals` | Estadísticas agregadas | ✅ Activo |
| **Power Analysis** | `/api/powerAnalysis` | Análisis de consumo eléctrico | ✅ Activo |
| **Consumo** | `/api/consumo` | Categorías de consumo | ✅ Activo |
| **Alertas** | `/api/alerts` | Sistema de alertas v4.0.0 | ✅ Activo |
| **Presets** | `/api` (presets) | Presets de temperatura | ✅ Activo |
| **Reportes** | `/api/reports` | Generación de PDFs | ✅ Activo |
| **GPS** | `/api/gps` | Datos GPS | ✅ Activo |
| **GPS Data** | `/gps-data` | Datos GPS (path legacy) | ✅ Activo |
| **Beacons** | `/api/beacons` | Beacons de ubicación | ✅ Activo |
| **Blind Spots** | `/api/blindspot` | Zonas ciegas | ✅ Activo |
| **Push** | `/api/push` | Push notifications PWA | ✅ Activo |
| **IA Analysis** | `/api/v1/ai-analysis` | Análisis con IA (DeepSeek) | ✅ Activo |
| **Personal** | `/api/personal` | Gestión de personal | ✅ Activo |
| **Sectores** | `/api/sectores` | Gestión de sectores | ✅ Activo |
| ~~**SMS**~~ | ~~`/api/sms`~~ | ~~Notificaciones SMS~~ | ❌ REMOVIDO |

**Total de categorías activas**: 19

---

## 🔒 Seguridad

### Rate Limiting
Endpoints sensibles tienen **rate limiting** configurado:
- Login: 5 intentos por 15 minutos
- Refresh: 10 requests por 15 minutos

### CORS
Configurado en `server.js`:
```javascript
{
  origin: ["http://localhost:3000", "https://tns.thenextsecurity.cl"],
  credentials: true
}
```

### Autenticación
- JWT tokens con rotación automática
- HTTP-only cookies (protección XSS)
- Expiración configurable

---

## 📝 Notas de Implementación

### Doble Path (Raíz + /TNSTrack)
Todos los endpoints API están montados en **dos paths** simultáneamente:
```javascript
app.use("/api/...", router);
app.use("/TNSTrack/api/...", router);
```

**Razón**: Compatibilidad entre entorno de desarrollo y producción.

### Migración de Configuración
El sistema está **migrando de archivos JSON a base de datos**:
- ⚠️ `/api/config` está en transición
- ✅ `configLoader_Config.js` ya lee de BD
- 🟡 `unified-config.json` es LEGACY

---

## 🚀 Próximas Mejoras

- [ ] Documentación completa de cada endpoint con ejemplos
- [ ] Swagger/OpenAPI spec generada automáticamente
- [ ] Versionado de API (actualmente solo `/api/v1/ai-analysis` usa versionado)
- [ ] Tests de integración para todos los endpoints

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-01-22

---

## 📖 Referencias

- **Autenticación**: Ver `authRoutes.js` para detalles de implementación
- **Alertas**: Ver [Decisiones_Tecnicas.md](Decisiones_Tecnicas.md) (Notificaciones) y `alertTrackingRoutes.js`, `alertScheduleRoutes.js`
- **Reportes**: Ver rutas y controladores de reportes en `servicios/src`
- **Base de Datos**: Ver [Base_de_Datos.md](./Base_de_Datos.md)
