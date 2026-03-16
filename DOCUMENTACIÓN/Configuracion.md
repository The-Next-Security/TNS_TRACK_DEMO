# Sistema de Configuración — TNS Track

> **Última actualización:** 2026-03-04
> **Branch de implementación:** `feat/integracon-base-datos`
> **Implementado según** [Issue #3 — Creación de tabla de configuración](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/3) (cerrado).

---

## Descripción general

TNS Track centraliza todos sus parámetros de operación en la base de datos. Esto permite modificar valores — credenciales de APIs externas, configuración de alertas, parámetros JWT, etc. — sin necesidad de desplegar código ni reiniciar el servicio.

Los parámetros están organizados en **grupos funcionales** (jwt, email, api, alertas…). Cada parámetro tiene definido su nombre, tipo de dato, si es una credencial sensible y si es obligatorio para que el sistema arranque.

El único dato que no puede vivir en la BD son las credenciales de conexión a la propia BD. Esas viven en un archivo local que se excluye del control de versiones.

---

## Archivos clave

| Archivo | Rol |
|---|---|
| `src/config/jsons/connection-config.json` | Credenciales BD — **en .gitignore, nunca commitear** |
| `src/config/jsons/connection-config.template.json` | Template público con placeholders |
| `src/config/js_files/configLoader_Config.js` | Lógica de carga — Singleton |
| `src/config/js_files/baseConfigLoader_Config.js` | Clase base con caché y helpers |

---

## Credenciales de conexión (archivo local)

### Propósito

Proporcionar las credenciales mínimas para conectarse a la BD. Es el **único** dato que vive en disco y fuera de la BD. **Nunca debe commitearse**.

### Estructura del archivo

**Ruta:** `servicios/src/config/jsons/connection-config.json`

```json
{
  "_comentario": "Credenciales de conexión BD. Gitignored. NO commitear.",
  "environment": 0,
  "development": {
    "host": "localhost",
    "port": 3306,
    "username": "YOUR_DEV_USER",
    "password": "YOUR_DEV_PASSWORD",
    "database": "tns_cool_track",
    "pool": {
      "max_size": 10
    }
  },
  "production": {
    "host": "YOUR_PROD_HOST",
    "port": 3306,
    "username": "YOUR_PROD_USER",
    "password": "YOUR_PROD_PASSWORD",
    "database": "tns_cool_track",
    "pool": {
      "max_size": 20
    }
  }
}
```

### Campo `environment`

| Valor | Entorno activo |
|---|---|
| `0` | `development` |
| `1` | `production` |

Para cambiar de entorno, editar `"environment": 0` → `"environment": 1` y reiniciar el servicio.

### Setup inicial para un desarrollador nuevo

1. Copiar el template: `cp connection-config.template.json connection-config.json`
2. Rellenar las credenciales del entorno de desarrollo
3. Verificar que `connection-config.json` está en `.gitignore` antes de cualquier commit

---

## Tablas de configuración en base de datos

La configuración del sistema se gestiona a través de tres tablas relacionadas.

### `gen_cofiguracion_grupos`

Agrupa los parámetros por módulo o funcionalidad. Permite categorizar la configuración de forma ordenada.

| Columna | Tipo | Descripción |
|---|---|---|
| `id_cofiguracion_grupos` | INT PK | Identificador |
| `nombre` | VARCHAR(50) UNIQUE | Nombre del grupo (ej: `jwt`, `email`) |
| `descripcion` | TEXT | Propósito del grupo |
| `orden` | INT | Orden de visualización |
| `activo` | TINYINT(1) | 1 = activo |

### `gen_cofiguracion_parametros`

Define cada parámetro individual: su ruta de acceso, tipo de dato, si es una credencial sensible y si es obligatorio para que el sistema arranque.

| Columna | Tipo | Descripción |
|---|---|---|
| `id_cofiguracion_parametros` | INT PK | Identificador |
| `id_cofiguracion_grupos` | INT FK | Grupo al que pertenece |
| `id_tipo_parametro` | INT FK | Tipo de dato (ver tabla abajo) |
| `ruta_completa` | VARCHAR(255) UNIQUE | Path en notación punto: `jwt.secret` |
| `nombre_parametro` | VARCHAR(100) | Último segmento de la ruta: `secret` |
| `nivel_anidacion` | INT | Profundidad (1 = raíz, 2 = nivel1.param, …) |
| `ruta_padre` | VARCHAR(255) NULL | Ruta del nodo padre (`jwt`, NULL si es raíz) |
| `es_sensible` | TINYINT(1) | 1 = credencial o secreto — no se loguea |
| `es_requerido` | TINYINT(1) | 1 = obligatorio para el arranque del sistema |
| `valor_default` | TEXT NULL | Valor por defecto si no hay valor activo |
| `activo` | TINYINT(1) | 1 = parámetro activo |

### `gen_cofiguracion_valores`

Almacena el valor real de cada parámetro. Cada vez que se modifica un valor, se registra el historial completo de cambios.

| Columna | Tipo | Descripción |
|---|---|---|
| `id_cofiguracion_valores` | INT PK | Identificador |
| `id_cofiguracion_parametros` | INT FK | Parámetro al que corresponde |
| `valor` | TEXT | Valor actual (siempre texto; el sistema lo convierte al tipo correcto) |
| `version` | INT | Incrementa con cada cambio |
| `activo` | TINYINT(1) | Solo 1 valor activo por parámetro en cada momento |
| `valido_desde` | DATETIME | Fecha desde la que es válido |
| `valido_hasta` | DATETIME NULL | NULL = valor aún vigente |

### Tipos de parámetros (`gen_tipos_parametros`)

Los valores en BD se almacenan siempre como texto. El `id_tipo_parametro` determina cómo se convierte al tipo correcto en tiempo de carga:

| id | Tipo BD | Resultado | Ejemplo |
|---|---|---|---|
| 1 | STRING | Texto | `"sendgrid"`, `"HS256"` |
| 2 | BOOLEAN | Verdadero/Falso | `"true"` → `true` |
| 3 | STRING | Texto | (reservado) |
| 4 | JSON | Array u Objeto | `'["a","b"]'` → lista |
| 5 | JSON | Objeto | Recipients con arrays de teléfonos |
| 6 | FLOAT | Número decimal | `"1.5"` → `1.5` |
| 7 | INTEGER | Número entero | `"3306"` → `3306` |

---

## Grupos de configuración actuales

| Grupo | Rutas principales | Descripción |
|---|---|---|
| `system` | `system.environment` | Entorno activo (development/production) |
| `jwt` | `jwt.secret`, `jwt.expiresIn`, `jwt.algorithm`, `jwt.issuer`, `jwt.audience` | Autenticación JWT |
| `websocket` | `websocket.enabled`, `websocket.port`, `websocket.cors.*` | Servidor WebSocket |
| `email` | `email.provider`, `email.sendgrid_api_key`, `email.email_contacto.*` | Notificaciones email |
| `notifications` | `notifications.email.enabled`, `notifications.sms.enabled` | Canales de notificación |
| `mapbox` | `mapbox.access_token`, `mapbox.style_url`, `mapbox.config.*` | Mapa interactivo |
| `posthog` | `posthog.project_API_key`, `posthog.project_host_url` | Analytics |
| `ubibot` | `ubibot.account_key`, `ubibot.collectionInterval`, `ubibot.token_file` | Sensores Ubibot |
| `api` | `api.shelly_cloud.url`, `api.shelly_cloud.device_id`, `api.shelly_cloud.auth_key` | API Shelly Cloud |
| `alertSystem` | `alertSystem.intervals.*`, `alertSystem.businessHours.*` | Sistema de alertas |

---

## API del configLoader (referencia para desarrolladores)

El loader es un Singleton accesible desde cualquier módulo del servidor. Expone los siguientes métodos:

| Método | Tipo | Descripción |
|---|---|---|
| `initialize()` | async | Ejecutar **una sola vez** al arranque, antes de crear el servidor. Idempotente. |
| `getConfig()` | síncrono | Devuelve el objeto completo de configuración. Lanza error si se llama antes de `initialize()`. |
| `getValue('ruta.completa')` | síncrono | Acceso directo a un valor por ruta en notación punto. Devuelve `undefined` si no existe. |
| `hasConfig('ruta')` | síncrono | Verifica si existe un valor en la ruta especificada. Devuelve booleano. |
| `getConnectionConfig()` | síncrono | Devuelve solo las credenciales BD (del archivo local). |
| `reloadConfig()` | async | Recarga la configuración desde BD de forma explícita. |
| `getCurrentEnvironment()` | síncrono | Devuelve el entorno activo (`{ current: 0, name: "development" }`). |

---

## Caché

- **TTL:** 5 minutos
- **Renovación:** automática en background cuando expira, sin bloquear las lecturas
- **Invalidación manual:** vía `reloadConfig()`

---

## Arranque del sistema

Al iniciar el servidor, el configLoader realiza dos pasos en orden:

1. **Lee el archivo local** `connection-config.json` para obtener las credenciales de BD y el entorno activo.
2. **Consulta la base de datos** y carga todos los parámetros activos, convirtiéndolos al tipo de dato correspondiente según `gen_tipos_parametros`.

A partir de ese momento, cualquier módulo puede leer la configuración de forma síncrona.
