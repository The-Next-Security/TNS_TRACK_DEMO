# APIs internas — TNS Track

> Documentación de endpoints internos del backend que exponen configuración o datos para el frontend y otros consumidores. Se irá ampliando según se mejoren los endpoints del proyecto.

---

## Inventario de endpoints montados (reorganización final Issue #11 — 2026-03-17)

| Dominio | Ruta base | Archivo de rutas | Controladores |
|---------|-----------|-----------------|---------------|
| Energía eléctrica | /api/energia | energia_Routes | device_Controller, energy_Controller, totales_Controller, consumoCategoria_Controller |
| Temperatura (Ubibot) | /api/temperatura | temperatura_Routes | ubibot_Controller, presets_Controller |
| Reportes | /api/reportes | reportes_Routes | report_Controller, reportScheduler_Controller, ubibot_Controller (defrost) |
| Análisis cruzado | /api/analisis | analisis_Routes | powerAnalysis_Controller |
| Inteligencia Artificial | /api/ia | ia_Routes | aiAnalysis_Controller |
| Alertas | /api/alertas | alertas_Routes | alertTracking_Controller |
| Config SEM | /api/config | semConfig_Routes | sem_ConfigController |
| Config Teltonika | /api/config | telConfig_Routes | tel_ConfigController |
| Config Alertas | /api/config | alertConfig_Routes | alertSchedule_Controller |
| Config Notificaciones | /api/config | notifConfig_Routes | notificationHorarios_Controller |
| Config Tarifas/Mapbox | /api/config | tariffConfig_Routes | tariffConfig_Controller |
| Usuarios | /api/usuarios | usuarios_Routes | usuarios_Controller |
| Autenticación | /api/auth | auth_Routes | auth_Controller |
| Push Notifications | /api/push | pushNotification_Routes | pushNotification_Controller |
| Suscripciones de Alerta | /api/alerts/subscriptions | alertSubscription_Routes | alertSubscription_Controller |
| GPS *(futuro)* | /api/gps | gps_Routes | gps_Controller → 501 |
| BlindSpot *(futuro)* | /api/blindspot | blindSpot_Routes | blindSpot_Controller → 501 |
| Personal *(futuro)* | /api/personal | personal_Routes | personal_Controller → 501 |
| Beacons *(futuro)* | /api/beacons | beacons_Routes | beacons_Controller → 501 |
| Sectores *(futuro)* | /api/sectores | sectores_Routes | sectores_Controller → 501 |

**Módulos futuros (Teltonika/BLE):** GPS, BlindSpot, Personal, Beacons y Sectores responden HTTP 501 en todos sus endpoints hasta que se planifique la integración hardware.

---

## Configuración (client-safe)

Endpoints que exponen valores de configuración permitidos para el cliente. Los datos provienen del configLoader (base de datos); no hay archivos de config adicionales en el frontend.

---

### GET /api/config/mapbox

**Propósito:** Exponer la configuración de Mapbox (token y estilo) para que el frontend pueda renderizar mapas (p. ej. pantalla de movimientos históricos).

**Autenticación:** No requerida. El token de Mapbox para uso en cliente es público una vez en el navegador.

**Respuesta (200 OK):**

```json
{
  "accessToken": "pk.eyJ1...",
  "styleUrl": "mapbox://styles/mapbox/streets-v11"
}
```

- `accessToken`: Token de acceso Mapbox. Puede ser `null` si no está configurado en la BD.
- `styleUrl`: URL del estilo del mapa. Valor por defecto si no hay en BD: `mapbox://styles/mapbox/streets-v11`.

**Origen de datos:** configLoader (tablas `gen_cofiguracion_*`), rutas `mapbox.access_token` y `mapbox.style_url`. Ver `DOCUMENTACIÓN/Configuracion.md` (grupo `mapbox`).

**Implementación:** Controlador `tariffConfigController.getMapboxConfig` (rutas en `tariffConfig_Routes.js`).

---

## Push Notifications (/api/push)

**Autenticación:** Todas las rutas requieren `Authorization: Bearer <token>` excepto `GET /vapid-public-key` (clave pública por diseño).

**Archivo de rutas:** `pushNotification_Routes.js`  
**Servicio:** `services/push/pushNotification_Service.js`

### GET /api/push/vapid-public-key

**Propósito:** Retorna la clave pública VAPID para que el Service Worker pueda suscribirse al push.  
**Autenticación:** No requerida.

**Respuesta (200 OK):**
```json
{ "publicKey": "BN..." }
```

---

### POST /api/push/subscribe

**Propósito:** Registra o actualiza un dispositivo para recibir push notifications. Crea automáticamente una fila en `ale_preferencias_push` con valores por defecto.

**Body:**
```json
{
  "subscription": { "endpoint": "https://...", "keys": { "p256dh": "...", "auth": "..." } },
  "existingSubscriptionId": null
}
```

> ⚠️ `userId` **no** se envía en el body — el backend lo extrae del JWT para evitar suplantación.

**Respuesta (200 OK):**
```json
{ "success": true, "subscriptionId": 42, "updated": false }
```

---

### POST /api/push/unsubscribe

**Propósito:** Desactiva (o elimina físicamente) la suscripción del dispositivo actual. Verifica que el endpoint pertenezca al usuario autenticado.

**Body:**
```json
{ "endpoint": "https://...", "hardDelete": false }
```

**Errores:** `404` si endpoint no existe · `403` si el endpoint pertenece a otro usuario.

---

### GET /api/push/stats

**Propósito:** Estadísticas globales del servicio push.  
**Autorización:** Usuario autenticado.

---

### POST /api/push/test-notification

**Propósito:** Envía una notificación push de prueba a todas las suscripciones activas del usuario.  
**Autorización:** Usuario autenticado.

**Body (opcional):**
```json
{ "title": "Prueba", "body": "Texto de la notificación" }
```

---

### GET /api/push/preferences/:subscriptionId

**Propósito:** Obtiene las preferencias DND del dispositivo. Si no existe fila en `ale_preferencias_push`, retorna defaults sin error.  
**Autorización:** Solo el propietario de la suscripción.

**Respuesta (200 OK):**
```json
{
  "success": true,
  "preferences": {
    "preferenceId": 5,
    "subscriptionId": 42,
    "dndEnabled": false,
    "dndStartTime": "22:00",
    "dndEndTime": "08:00",
    "dndDays": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "allowCriticalAlerts": true,
    "enabledAlertTypes": ["temperature","disconnection"]
  }
}
```

**Nota:** `preferenceId` puede ser `null` si se retornan defaults (sin fila en BD).

---

### POST /api/push/preferences/:subscriptionId

**Propósito:** Crea o actualiza las preferencias DND. Solo el propietario puede modificar.

---

### DELETE /api/push/preferences/:subscriptionId

**Propósito:** Elimina las preferencias personalizadas (restaura defaults). Solo el propietario.

---

### GET /api/push/subscriptions *(admin)*

**Propósito:** Lista todas las suscripciones push del sistema.  
**Autorización:** Requiere rol admin.

---

### POST /api/push/cleanup *(admin)*

**Propósito:** Limpia suscripciones inactivas o caducadas.  
**Autorización:** Requiere rol admin.

---

## Suscripciones de Alerta Push (/api/alerts/subscriptions)

**Propósito:** Gestiona qué tipos de alerta y orígenes recibe cada usuario por canal push. Popula la tabla `ale_suscripciones_notificacion` (canal='push'), que es la puerta de entrada al sistema de alertas — si no hay fila activa, `getPushSubscriptionsForAlertType()` no retorna el dispositivo y la alerta no se entrega.

**Autenticación:** Todas las rutas requieren `Authorization: Bearer <token>`.

**Archivos:**
- Rutas: `routes/alertSubscription_Routes.js`
- Controller: `controllers/alertSubscription_Controller.js`
- Servicio BD: `services/db/alertSubscription_Service.js`

---

### GET /api/alerts/subscriptions/lookups

**Propósito:** Retorna los catálogos necesarios para construir la matriz Tipo×Origen en la UI. Excluye el origen `sistema` (id=3) ya que no puede suscribirse manualmente.

**Respuesta (200 OK):**
```json
{
  "success": true,
  "data": {
    "tiposAlerta": [
      { "id_tipo_alerta": 1, "nombre": "temperatura", "descripcion": "..." },
      { "id_tipo_alerta": 2, "nombre": "desconexion", "descripcion": "..." }
    ],
    "origenes": [
      { "id_tipo_origen": 1, "nombre": "ubibot" },
      { "id_tipo_origen": 2, "nombre": "shelly" }
    ]
  }
}
```

---

### GET /api/alerts/subscriptions

**Propósito:** Retorna todas las suscripciones push (activas e inactivas) del usuario autenticado.

**Respuesta (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id_suscripcion_notificacion": 1, "id_tipo_alerta": 1, "id_tipo_origen": 1, "activo": 1 }
  ]
}
```

---

### POST /api/alerts/subscriptions/toggle

**Propósito:** Activa o desactiva una suscripción específica (un checkbox de la matriz). Usa `ON DUPLICATE KEY UPDATE` — es seguro llamarlo aunque no exista fila previa.

**Body:**
```json
{ "idTipoAlerta": 1, "idOrigenTipo": 1, "activo": true }
```

**Validaciones:** `idOrigenTipo !== 3` (sistema bloqueado).  
**Respuesta (200 OK):** `{ "success": true }`

---

### POST /api/alerts/subscriptions/batch

**Propósito:** Guarda toda la matriz de suscripciones de una vez. Útil para el botón "Guardar todo" de la UI.

**Body:**
```json
{
  "items": [
    { "idTipoAlerta": 1, "idOrigenTipo": 1, "activo": true },
    { "idTipoAlerta": 1, "idOrigenTipo": 2, "activo": false },
    { "idTipoAlerta": 2, "idOrigenTipo": 1, "activo": true }
  ]
}
```

**Validaciones:** filtra automáticamente `idOrigenTipo === 3` y valores no numéricos.  
**Respuesta (200 OK):** `{ "success": true, "processed": 3 }`
