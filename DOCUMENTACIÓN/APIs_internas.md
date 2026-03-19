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
