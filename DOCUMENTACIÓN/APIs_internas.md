# APIs internas — TNS Track

> Documentación de endpoints internos del backend que exponen configuración o datos para el frontend y otros consumidores. Se irá ampliando según se mejoren los endpoints del proyecto.

---

## Inventario de endpoints montados (post-Issue #11)

| Dominio | Ruta base | Rutas/Archivo | Controlador |
|---------|-----------|---------------|-------------|
| Dispositivos | /api/devices | device_Routes | device_Controller |
| Config | /api/config | config_Routes | tariffConfigController |
| Totales | /api/totals | totales_Routes | totales_Controller |
| Usuarios | /api/usuarios | usuarios_Routes | usuarios_Controller |
| Personal | /api/personal | personal_Routes | personal_Controller |
| Power Analysis | /api/powerAnalysis | powerAnalysis_Routes | powerAnalysis_Controller |
| GPS | /api/gps | gps_Routes | gps_Controller |
| Ubibot | /api/ubibot | ubibot_Routes | ubibot_Controller |
| Blindspot | /api/blindspot | blindSpot_Routes | blindSpot_Controller |
| Auth | /api/auth | auth_Routes | auth_Controller |
| Consumo | /api/consumo | consumoCategoria_Routes | consumoCategoria_Controller |
| Push | /api/push | pushNotification_Routes | pushNotification_Controller |
| Alertas | /api/alerts | alertTracking_Routes | alertTracking_Controller |
| Presets | /api/presets | presets_Routes | presets_Controller |
| Reportes | /api/reports | reports_Routes | report_Controller |
| IA Análisis | /api/ia/analisis | aiAnalysis_Routes | aiAnalysis_Controller |

**Dominios reservados (no montados):** /api/sectores, /api/beacons — ver Issue #26.

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

**Implementación:** Controlador `tariffConfigController.getMapboxConfig` (rutas en `configRoutes.js`).
