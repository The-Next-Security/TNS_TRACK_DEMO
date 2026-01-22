# APIs Externas - TNS Track

## 📋 Resumen de APIs Utilizadas

| API | Propósito | Tipo | Criticidad | Documentación |
|-----|-----------|------|------------|---------------|
| Shelly Cloud | Datos eléctricos | REST | ⚠️ CRÍTICA | https://shelly-api-docs.shelly.cloud/ |
| Ubibot | Datos temperatura | REST | ⚠️ CRÍTICA | https://www.ubibot.com/ |
| OnPremise TNS | API interna | REST | 🔶 ALTA | http://tns.thenextsecurity.cl:8443 |
| SendGrid | Envío emails | REST/SDK | 🔶 ALTA | https://docs.sendgrid.com/ |
| Twilio | Envío SMS | REST/SDK | 🔶 ALTA | https://www.twilio.com/docs |
| DeepSeek | Análisis IA | REST | 🟢 MEDIA | https://api.deepseek.com |
| QuickChart | Gráficos PDF | REST | 🟢 MEDIA | https://quickchart.io/documentation/ |
| Mapbox | Mapas GPS | REST/GL | 🟡 BAJA | https://docs.mapbox.com/ |
| PostHog | Analytics | SDK | 🟡 BAJA | https://posthog.com/docs |

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
- **Intervalo**: 10 segundos (configurable en `unified-config.json`)
- **Max Retries**: 3 intentos
- **Retry Delay**: 5 segundos
- **Timeout**: Configurable

### Impacto en el Proyecto
**Funcionalidades Depend ientes**:
- Dashboard de Consumo Eléctrico
- Análisis de Consumo (Diario/Mensual/Anual)
- Alertas de Consumo Anómalo
- Reportes PDF de Energía
- Consumo por Categoría

**Almacenamiento BD**: `energy_data`, `total_energy`, `device_names`

---

## 2️⃣ Ubibot API

### Información General
- **Proveedor**: Ubibot
- **Tipo**: REST API
- **Autenticación**: Account Key
- **Documentación**: https://www.ubibot.com/

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
- **Intervalo**: 1 minuto (configurable)
- **Retención**: 7 días en memoria

### Impacto en el Proyecto
**Funcionalidades Dependientes**:
- Dashboard de Temperatura
- Análisis de Ciclos de Descongelamiento
- Alertas de Temperatura Fuera de Rango
- Reportes PDF de Temperatura
- Análisis de IA (predicción de patrones)

**Almacenamiento BD**: `temperature_data`, `devices_ubibot`, `defrost_cycles`, `temperature_thresholds`

---

## 3️⃣ OnPremise API (TNS Interna)

### Información General
- **Proveedor**: The Next Security (interno)
- **URL Base**: `http://tns.thenextsecurity.cl:8443`
- **Tipo**: REST API
- **Autenticación**: N/A (red interna)
- **Estado**: ⚠️ DESHABILITADO (comentado en server.js línea 14)

### Propósito
- API de respaldo para recolección de datos
- Integración con sistemas legacy de TNS
- Recolección de datos de canales específicos

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

**Almacenamiento BD**: `alert_notification_config`

---

## 5️⃣ Twilio SMS API

### Información General
- **Proveedor**: Twilio
- **Tipo**: REST API / SDK Node.js (twilio ^5.4.2)
- **Autenticación**: Account SID + Auth Token
- **Documentación**: https://www.twilio.com/docs/sms

### Propósito en TNS Track
- Envío de alertas críticas por SMS
- Notificaciones de emergencia
- Confirmaciones de acciones críticas

### Configuración
```json
{
  "sms": {
    "TWILIO_ACCOUNT_SID": "ACxxxxxxxxxxxxxxxx",
    "TWILIO_AUTH_TOKEN": "your_auth_token",
    "TWILIO_PHONE_NUMBER": "+56912345678",
    "emergencyRecipient": "+56987654321"
  }
}
```

### Archivos Involucrados
- **Service**: `/servicios/src/services/sms/smsService.js`
- **Routes**: `/servicios/src/routes/smsRoutes.js`
- **Controller**: `/servicios/src/controllers/notificationController.js`

### Tipos de SMS
1. **Alertas Críticas**: Temperatura fuera de rango crítico
2. **Notificaciones de Emergencia**: Fallo de sistemas
3. **Confirmaciones**: Acciones de usuarios privilegiados

---

## 6️⃣ DeepSeek API (IA)

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

## 7️⃣ QuickChart API

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

## 8️⃣ Mapbox API

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

## 9️⃣ PostHog Analytics

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

## 🔐 Gestión de API Keys

### Ubicación
- **Archivo Principal**: `/servicios/src/config/jsons/unified-config.json`
- **Variables de Entorno**: `.env` (no versionado)
- **Loader**: `/servicios/src/config/js_files/config-loader.js`

### Buenas Prácticas Implementadas
1. ✅ API keys NO hardcodeadas en código
2. ✅ Uso de archivo de configuración centralizado
3. ✅ `.env` incluido en `.gitignore`
4. ✅ Validación de API keys al inicio
5. ⚠️ **Pendiente**: Secrets manager para producción

### ⚠️ SEGURIDAD CRÍTICA
**NUNCA versionar en Git**:
- `unified-config.json` con keys reales
- `.env` con credenciales
- Archivos con tokens/secrets

---

## 📊 Dependencias Críticas

### APIs CRÍTICAS (Sistema NO funciona sin ellas)
1. ⚠️ **Shelly Cloud API** → Sin datos eléctricos
2. ⚠️ **Ubibot API** → Sin datos de temperatura
3. 🔶 **SendGrid** → Alertas email no funcionan (alto impacto)

### APIs OPCIONALES (Sistema funciona con degradación)
4. **Twilio SMS** → Alertas SMS no disponibles (fallback a email)
5. **DeepSeek IA** → Sin análisis inteligente (solo datos raw)
6. **QuickChart** → Reportes sin gráficos (solo texto)
7. **Mapbox** → Sin visualización de mapas (solo datos GPS)
8. **PostHog** → Sin analytics (no impacta funcionalidad)

---

## 📝 Mantenimiento

### Checklist al Agregar Nueva API
- [ ] Actualizar este documento
- [ ] Crear service adapter en `/servicios/src/services/api/`
- [ ] Agregar configuración en `unified-config.json`
- [ ] Implementar manejo de errores y reintentos
- [ ] Agregar métricas de uso
- [ ] Documentar rate limits
- [ ] Actualizar README.md

---

## 🔗 Referencias
- [README.md](./README.md)
- [Base_de_Datos.md](./Base_de_Datos.md)
- [Info_Github.md](./Info_Github.md)

**Última actualización**: 2025-01-21  
**Versión**: 1.0.0  
**Mantenido por**: Equipo TNS
