# APIs Externas - TNS Track

## 📋 Resumen Ejecutivo

### APIs Activas (8)

| Criticidad | API | Propósito | Tipo | Sección |
|------------|-----|-----------|------|---------|
| ⚠️ **CRÍTICA** | [Shelly Cloud](#️-shelly-cloud-api) | Datos eléctricos | REST | [Ver detalles](#️-shelly-cloud-api) |
| ⚠️ **CRÍTICA** | [Ubibot](#️-ubibot-api) | Datos temperatura | REST | [Ver detalles](#️-ubibot-api) |
| 🔶 **ALTA** | [OnPremise TNS](#️-onpremise-api-tns-interna) | API interna (Ubibot) | REST | [Ver detalles](#️-onpremise-api-tns-interna) |
| 🔶 **ALTA** | [SendGrid](#️-sendgrid-api) | Envío emails | REST/SDK | [Ver detalles](#️-sendgrid-api) |
| 🟢 **MEDIA** | [DeepSeek](#️-deepseek-api-ia) | Análisis IA | REST | [Ver detalles](#️-deepseek-api-ia) |
| 🟢 **MEDIA** | [QuickChart](#️-quickchart-api) | Gráficos PDF | REST | [Ver detalles](#️-quickchart-api) |
| 🟡 **BAJA** | [Mapbox](#️-mapbox-api) | Mapas GPS | REST/GL | [Ver detalles](#️-mapbox-api) |
| 🟡 **BAJA** | [PostHog](#️-posthog-analytics) | Analytics | SDK | [Ver detalles](#️-posthog-analytics) |

### APIs Legacy / Deshabilitadas (1)

| API | Estado | Razón | Sección |
|-----|--------|-------|---------|
| ~~Twilio SMS~~ | ⚠️ **LEGACY** | NO implementado - Reemplazado por Email + Push | [Ver detalles](#️-twilio-sms-api--legacy) |

> **Nota**: La funcionalidad SMS/Twilio fue eliminada del desarrollo inicial. Todas las notificaciones críticas se envían por **Email + Push Notifications**.

**Configuración operativa**: La fuente de verdad para credenciales y parámetros (API keys, intervalos, etc.) es la **base de datos** (tablas `gen_cofiguracion_*`). Los ejemplos en JSON que aparecen en este documento son referencia histórica o formato de ejemplo; el esquema y uso actual se documentan en [Configuracion.md](Configuracion.md) y [Base_de_Datos.md](Base_de_Datos.md).

---

## 1️⃣ Shelly Cloud API

### Información General
- **Proveedor**: Shelly (Allterco Robotics)
- **Tipo**: REST API
- **Autenticación**: Server Token (Bearer)
- **Documentación**: https://shelly-api-docs.shelly.cloud/

### Propósito en TNS Track
Recolección de datos de consumo eléctrico en tiempo real de dispositivos Shelly (enchufes inteligentes, medidores de energía).

### Configuración (unified-config.json)
```json
{
  "api": {
    "shelly_cloud": {
      "url": "https://shelly-33-eu.shelly.cloud/device/status",
      "auth_key": "YOUR_SERVER_TOKEN"
    }
  }
}
```

### Archivos Involucrados
- **Collector**: `/servicios/collectors/shelly-collector.js`
- **Adapter**: `/servicios/src/services/api/shelly-api-adapter.js`
- **Service**: `/servicios/src/services/database-service.js`
- **Routes**: `/servicios/src/routes/deviceRoutes.js`
- **Controller**: `/servicios/src/controllers/deviceController.js`

### Endpoints Utilizados
- `GET /device/status` → Estado actual de dispositivos
- `POST /device/relay/control` → Control de relés (on/off)

### Frecuencia de Consultas
- **Intervalo**: Configurable desde base de datos (predeterminado: 10 segundos)
- **Max Retries**: 3 intentos
- **Retry Delay**: 5 segundos
- **Timeout**: Configurable

> **Nota**: Los intervalos de recolección son **configurables desde la base de datos** (no hardcodeados). Esquema y uso en [Configuracion.md](Configuracion.md).

### Impacto en el Proyecto
**Funcionalidades Depend ientes**:
- Dashboard de Consumo Eléctrico
- Análisis de Consumo (Diario/Mensual/Anual)
- Alertas de Consumo Anómalo
- Reportes PDF de Energía
- Consumo por Categoría

**Almacenamiento BD**: Ver esquema completo en [Base_de_Datos.md](Base_de_Datos.md)

---

## 2️⃣ Ubibot API

### Información General
- **Proveedor**: Ubibot
- **Tipo**: REST API
- **Autenticación**: Account Key
- **Documentación Oficial**:
  - [Quick Start & Limits](https://www.ubibot.com/platform-api/1232/quick-start/)
  - [API Response Format](https://www.ubibot.com/platform-api/1223/response-format/)
  - [Getting Started with Platform APIs](https://www.ubibot.com/uncategorized/3125/how-to-get-started-with-platform-apis/)
  - [Platform API Category](https://www.ubibot.com/category/platform-api/)
  - [Support Center - API](https://support.ubibot.com/hc/en-us/sections/28387394373785-API-and-On-Premises-Platform)

### Propósito en TNS Track
Recolección de datos de temperatura de cámaras frigoríficas y ambientes controlados, incluyendo detección de ciclos de descongelamiento.

### Configuración
```json
{
  "api": {
    "ubibot": {
      "url": "https://api.ubibot.com/channels/",
      "account_key": "YOUR_ACCOUNT_KEY"
    }
  }
}
```

### Archivos Involucrados
- **Collector**: `/servicios/collectors/ubibot-collector.js`
- **Service**: `/servicios/src/services/ubibot/ubibotService.js`
- **Adapter**: `/servicios/src/services/ubibot/ubibot-service-adapter.js`
- **Routes**: `/servicios/src/routes/ubibotRoutes.js`
- **Controller**: `/servicios/src/controllers/ubibotController.js`

### Endpoints Utilizados
- `GET /channels/{channelId}` → Datos del canal
- `GET /channels/{channelId}/data` → Histórico de mediciones

### Frecuencia de Consultas
- **Intervalo**: Configurable desde base de datos (predeterminado: 1 minuto)
- **Retención**: 7 días en memoria

> **Nota**: Los intervalos de recolección son **configurables desde la base de datos** (no hardcodeados). Esquema y uso en [Configuracion.md](Configuracion.md).

### Impacto en el Proyecto
**Funcionalidades Dependientes**:
- Dashboard de Temperatura
- Análisis de Ciclos de Descongelamiento
- Alertas de Temperatura Fuera de Rango
- Reportes PDF de Temperatura
- Análisis de IA (predicción de patrones)

**Almacenamiento BD**: Ver esquema completo en [Base_de_Datos.md](Base_de_Datos.md)

---

## 3️⃣ OnPremise API (TNS Interna)

### Información General
- **Proveedor**: The Next Security (interno)
- **URL Base**: `http://tns.thenextsecurity.cl:8443`
- **Tipo**: REST API (basada en Ubibot)
- **Autenticación**: Requiere autenticación (Account Key + Token ID)
- **Estado**: ⚠️ DESHABILITADO (no completamente implementado)

### Propósito
- API interna que utiliza el mismo protocolo Ubibot pero con **proceso diferente** al Cloud API
- Recolección de datos desde servidor on-premise TNS
- Integración con sistemas legacy de TNS
- Recolección de datos de canales específicos

> **Nota**: Esta API sigue siendo Ubibot, solo que es un proceso diferente. Requiere autenticación igual que Ubibot Cloud. Actualmente está deshabilitada al no estar del todo implementada.

### Configuración
```json
{
  "api": {
    "onpremise": {
      "url": "http://tns.thenextsecurity.cl:8443/channels/",
      "enabled": false
    }
  }
}
```

### Archivos Involucrados
- **Collector**: `/servicios/collectors/onPremise-collector.js` (comentado)

---

## 4️⃣ SendGrid API

### Información General
- **Proveedor**: Twilio SendGrid
- **Tipo**: REST API / SDK Node.js (@sendgrid/mail ^8.1.4)
- **Autenticación**: API Key
- **Documentación**: https://docs.sendgrid.com/

### Propósito en TNS Track
- Envío de alertas de temperatura por email
- Envío de reportes PDF ejecutivos
- Notificaciones de sistema (registro, recuperación de contraseña)
- Resúmenes diarios/semanales/mensuales

### Configuración

> **Configuración en BD**: La configuración de SendGrid (API Key, remitente verificado "from", destinatarios) se gestiona en base de datos. Ver [Configuracion.md](Configuracion.md) y [Base_de_Datos.md](Base_de_Datos.md) para el esquema.

```json
{
  "email": {
    "SENDGRID_API_KEY": "SG.xxxxxxxxxxxxxxxx",
    "from": "alertas@thenextsecurity.cl",
    "defaultRecipients": ["admin@company.com"],
    "bccRecipients": ["backup@company.com"],
    "emergencyRecipient": "emergency@company.com"
  }
}
```

### Archivos Involucrados
- **Service**: `/servicios/src/services/email/emailService.js`
- **Base Service**: `/servicios/src/services/baseAlertService.js`
- **Controller**: `/servicios/src/controllers/notificationController.js`

### Tipos de Emails
1. **Alertas de Temperatura**: Template HTML con datos del sensor + gráficos QuickChart
2. **Reportes Ejecutivos**: PDF adjunto + resumen en body
3. **Notificaciones de Sistema**: Registro, reset password, confirmaciones

### Impacto en el Proyecto
**Funcionalidades Dependientes**:
- Sistema de Alertas v4.0.0 (canal email)
- Reportes Programados
- Autenticación de Usuarios

**Almacenamiento BD**: Ver esquema completo en [Base_de_Datos.md](Base_de_Datos.md)

---

## 5️⃣ DeepSeek API (IA)

### Información General
- **Proveedor**: DeepSeek
- **URL Base**: `https://api.deepseek.com`
- **Tipo**: REST API (OpenAI compatible)
- **SDK**: openai ^6.8.1
- **Autenticación**: API Key
- **Documentación**: Compatible con OpenAI API

### Propósito en TNS Track
- Análisis inteligente de datos de temperatura
- Predicciones de patrones de consumo
- Generación de insights y recomendaciones
- Detección de anomalías

### Configuración

> **Configuración en BD**: La configuración de DeepSeek (API Key, modelo, parámetros) se gestiona en base de datos. Ver [Configuracion.md](Configuracion.md) y [Base_de_Datos.md](Base_de_Datos.md) para el esquema.

```json
{
  "ai": {
    "DEEPSEEK_API_KEY": "sk-xxxxxxxxxxxxxxxx",
    "model": "deepseek-chat",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

### Archivos Involucrados
- **Service**: `/servicios/src/services/openaiService.js`
- **Controller**: `/servicios/src/controllers/aiAnalysisController.js`
- **Routes**: `/servicios/src/routes/aiAnalysisRoutes.js`
- **Cost Tracker**: `/servicios/src/services/aiCostTracker.js`
- **Data Service**: `/servicios/src/services/aiDataService.js`

### Casos de Uso
1. **Análisis de Temperatura**:
   - Predicción de ciclos de descongelamiento
   - Detección de patrones anómalos
   - Recomendaciones de optimización

2. **Análisis de Consumo**:
   - Identificación de picos inusuales
   - Proyecciones de consumo futuro
   - Sugerencias de ahorro energético

### Tracking de Costos
- Servicio: `aiCostTracker.js`
- Tokens contabilizados: Input + Output
- Storage en BD

---

## 6️⃣ QuickChart API

### Información General
- **Proveedor**: QuickChart.io
- **Tipo**: REST API (generación de imágenes)
- **SDK**: quickchart-js ^3.1.3
- **Autenticación**: No requiere (servicio público)
- **Documentación**: https://quickchart.io/documentation/

### Propósito en TNS Track
- Generación de gráficos para reportes PDF
- Embebido de gráficos en emails HTML
- Visualizaciones estáticas de métricas

### Archivos Involucrados
- **Templates**:
  - `/servicios/src/services/reports/templates/executiveAlertsTemplate.js`
  - `/servicios/src/services/reports/templates/executiveConsumptionTemplate.js`
  - `/servicios/src/services/reports/templates/executiveTemperatureTemplate.js`

### Tipos de Gráficos
1. **Gráficos de Línea**: Evolución temporal
2. **Gráficos de Barras**: Comparativas
3. **Gráficos de Torta**: Distribución

---

## 7️⃣ Mapbox API

### Información General
- **Proveedor**: Mapbox
- **Tipo**: REST API + GL JS (WebGL)
- **SDK**: mapbox-gl ^3.15.0
- **Autenticación**: Access Token
- **Documentación**: https://docs.mapbox.com/

### Propósito en TNS Track
- Visualización de ubicación de dispositivos
- Tracking GPS en tiempo real
- Visualización de zonas de cobertura
- Análisis de movimientos históricos

### Archivos Involucrados
- **Componentes**:
  - `/servicios/src/components/MapModal.js`
  - `/servicios/src/components/UbicacionTiempoRealInteriorV2.js`
  - `/servicios/src/components/LastKnownPositionV2.js`
  - `/servicios/src/components/HistoricalMovementsSearchV2.js`
- **Service Adapter**: `/servicios/src/services/api/mapbox-api-adapter.js`
- **Routes**: `/servicios/src/routes/gpsRoutes.js`, `/servicios/src/routes/gpsDataRoutes.js`

### Funcionalidades Mapbox
1. **Mapa Base**: Mapas interactivos
2. **Markers**: Indicadores de ubicación
3. **Popups**: Información de dispositivos
4. **Heatmaps**: Zonas de alta concentración
5. **Geocoding**: Coordenadas a direcciones

---

## 8️⃣ PostHog Analytics

### Información General
- **Proveedor**: PostHog
- **Tipo**: SDK JavaScript
- **SDK**: posthog-js ^1.276.0
- **Autenticación**: Project API Key
- **Documentación**: https://posthog.com/docs

### Propósito en TNS Track
- Tracking de eventos de usuario
- Analytics de uso de la aplicación
- Monitoreo de performance frontend
- A/B testing (futuro)

### Configuración (Frontend)
```javascript
posthog.init('phc_xxxxxxxxxxxxxxxx', {
  api_host: 'https://app.posthog.com'
});
```

### Archivos Involucrados
- **Service**: `/servicios/src/services/analyticsService.js`
- Múltiples componentes frontend

### Eventos Trackeados
- `user_login` → Inicio de sesión
- `dashboard_view` → Vista de dashboard
- `alert_acknowledged` → Alerta reconocida
- `report_generated` → Reporte generado
- `config_changed` → Cambio de configuración

---

## 📦 APIs Legacy

### 9️⃣ ~~Twilio SMS API~~ ⚠️ LEGACY

#### ⚠️ ESTADO: LEGACY - NO IMPLEMENTADO

**Esta funcionalidad ha sido eliminada del desarrollo inicial.**

#### Información General
- **Proveedor**: Twilio
- **Tipo**: REST API / SDK Node.js (twilio ^5.4.2)
- **Autenticación**: Account SID + Auth Token
- **Documentación**: https://www.twilio.com/docs/sms
- **Estado Actual**:
  - ❌ Servicio NO activo
  - ✅ Dependencia mantenida en `package.json` para uso futuro
  - 🔄 Notificaciones críticas se envían por **Email + Push**

#### Propósito Original (Deshabilitado)
- ~~Envío de alertas críticas por SMS~~
- ~~Notificaciones de emergencia~~
- ~~Confirmaciones de acciones críticas~~

#### Archivos Involucrados (Comentados/Eliminados)
- ~~**Service**: `/servicios/src/services/sms/smsService.js`~~
- ~~**Routes**: `/servicios/src/routes/smsRoutes.js`~~
- ~~**Controller**: `/servicios/src/controllers/notificationController.js`~~

> **Nota**: Si se requiere SMS en el futuro, la dependencia Twilio está disponible en `package.json`.

---

## 🔐 Gestión de API Keys

### ⚠️ MIGRACIÓN EN PROGRESO A BASE DE DATOS

**Estado Actual**: Las API Keys se están migrando desde archivos JSON (OBSOLETOS) a la base de datos para mayor seguridad y gestión centralizada.

### Ubicación Actual (⚠️ OBSOLETO)
- **Archivo Principal**: `/servicios/src/config/jsons/unified-config.json` ⚠️ **OBSOLETO**
- **Loader**: `/servicios/src/config/js_files/configLoader_Config.js` (revisa BD periódicamente)

> **Nota**: La configuración operativa vive en base de datos. Esquema y uso en [Configuracion.md](Configuracion.md).

### Configuración en base de datos (vigente)
- **Base de Datos MySQL**: Tablas `gen_cofiguracion_grupos`, `gen_cofiguracion_parametros`, `gen_cofiguracion_valores`
- **Config Loader**: Consulta BD al arranque y caché con TTL; ver [Configuracion.md](Configuracion.md)
- **Beneficios**: Gestión centralizada, cambios sin redeploy, auditabilidad

### 🚫 NO SE UTILIZAN VARIABLES DE ENTORNO (Por Diseño)

**Decisión arquitectónica: El proyecto NO utiliza archivos `.env` ni variables de entorno para configuración.**

**Razones**:
- Todas las configuraciones se manejan vía base de datos
- Permite gestión centralizada desde UI de administración
- Cambios de configuración sin necesidad de redeploy
- Mayor control y auditabilidad de cambios
- Configuración dinámica en tiempo real

> **Importante**: Esta es una decisión de diseño intencional documentada en [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md). NO es un error o falta de implementación.

### ⚠️ SEGURIDAD CRÍTICA
**NUNCA versionar en Git**:
- `unified-config.json` con keys reales ⚠️ **OBSOLETO** (siendo migrado a BD)
- Archivos con tokens/secrets
- Credenciales de base de datos (manejadas por el sistema)
- Archivos `.env` (no utilizados en este proyecto)

### Troubleshooting

Para problemas con API Keys, consultar [Troubleshooting.md](Troubleshooting.md) sección de APIs externas.

---

## 📊 Dependencias Críticas

### APIs CRÍTICAS (Sistema NO funciona sin ellas)
1. ⚠️ **Shelly Cloud API** → Sin datos eléctricos
2. ⚠️ **Ubibot API** → Sin datos de temperatura
3. 🔶 **SendGrid** → Alertas email no funcionan (alto impacto)

### APIs OPCIONALES (Sistema funciona con degradación)
4. ~~**Twilio SMS**~~ → ⚠️ LEGACY - No implementado (notificaciones vía Email + Push)
5. **DeepSeek IA** → Sin análisis inteligente (solo datos raw)
6. **QuickChart** → Reportes sin gráficos (solo texto)
7. **Mapbox** → Sin visualización de mapas (solo datos GPS)
8. **PostHog** → Sin analytics (no impacta funcionalidad)

---

## 📝 Mantenimiento y Troubleshooting

### Checklist al Agregar Nueva API
- [ ] Actualizar este documento (Apis_externas.md)
- [ ] Crear service adapter en `/servicios/src/services/api/`
- [ ] Agregar configuración en **base de datos** (NO en archivos JSON ⚠️ OBSOLETO)
- [ ] Si aplica, añadir parámetro o grupo en tablas `gen_cofiguracion_*` (ver [Configuracion.md](Configuracion.md))
- [ ] Actualizar [Troubleshooting.md](./Troubleshooting.md) con errores comunes de la nueva API
- [ ] Implementar manejo de errores y reintentos
- [ ] Agregar métricas de uso
- [ ] Documentar rate limits
- [ ] Actualizar [README.md](README.md)
- [ ] Actualizar [Base_de_Datos.md](Base_de_Datos.md) si requiere tablas nuevas
- [ ] Documentar troubleshooting en [Troubleshooting.md](Troubleshooting.md)

### Problemas Comunes

Para troubleshooting detallado de APIs externas, consultar:
- [Troubleshooting.md](Troubleshooting.md) - Sección "Problemas con APIs Externas"
- Errores de API Keys
- Problemas de conectividad
- Rate limiting
- Timeouts y reintentos

---

## 🔗 Referencias
- [README.md](./README.md)
- [Base_de_Datos.md](./Base_de_Datos.md)
- [Info_Github.md](./Info_Github.md)

**Última actualización**: 2026-01-26
**Versión**: 2.0.0
