# TNS Track Demo
Sistema integral de monitoreo y control inteligente para gestión de temperatura y consumos de energía en tiempo real.

---

## 🎯 Propósito del Proyecto

**TNS Track** es una plataforma web desarrollada por **The Next Security** para el monitoreo y control en tiempo real de:

- **Temperatura**: Monitoreo de cámaras frigoríficas y ambientes controlados
- **Consumo Eléctrico**: Tracking de consumo energético de dispositivos
- **GPS/Ubicación**: Seguimiento de personal y activos en tiempo real
- **Alertas Inteligentes**: Sistema de notificaciones multi-canal (email, SMS, push)
- **Reportes Ejecutivos**: Generación automática de informes en PDF

### Objetivos Principales
1. Reducir pérdidas por fallas en sistemas de refrigeración
2. Optimizar consumo energético mediante análisis inteligente
3. Mejorar tiempos de respuesta ante incidencias críticas
4. Proporcionar visibilidad completa del estado operacional
5. Facilitar toma de decisiones basada en datos

### Casos de Uso Principales
- Monitoreo de cadena de frío en industria alimentaria
- Control de temperatura en centros de datos
- Gestión de consumo energético en instalaciones industriales
- Tracking GPS de personal en terreno
- Sistema de alertas para situaciones críticas

### Público Objetivo
Sistema de uso interno para el equipo de **The Next Security** y sus clientes.

---

## 📋 Convenciones

### Nomenclatura de Código

#### Archivos JavaScript
- **Archivos generales**: camelCase (ej: `shellyCollector.js`, `emailService.js`)
- **Componentes React**: PascalCase + sufijo V2 (ej: `DashboardTemperaturaV2.js`)
- **Servicios**: kebab-case + "-service" (ej: `database-service.js`, `total-energy-service.js`)
- **Rutas**: camelCase + "Routes" (ej: `deviceRoutes.js`, `ubibotRoutes.js`)
- **Controladores**: camelCase + "Controller" (ej: `alertScheduleController.js`)
- **Collectors**: PascalCase + "Collector" (ej: `ShellyCollector`, `UbibotCollector`)

#### Nomenclatura de Variables
- **Variables y funciones**: camelCase (ej: `userData`, `calculateTotal()`)
- **Constantes**: UPPER_SNAKE_CASE (ej: `MAX_RETRIES`, `API_TIMEOUT`)
- **Componentes React**: PascalCase (ej: `UserProfile`, `AlertCard`)
- **Archivos CSS**: kebab-case (ej: `main-styles.css`)

### Estructura de Carpetas

```
TNS_TRACK_DEMO/
├── servicios/                          # Aplicación principal
│   ├── collectors/                     # Collectors de datos externos
│   │   ├── shelly-collector.js         # Collector de Shelly Cloud API
│   │   ├── ubibot-collector.js         # Collector de Ubibot API
│   │   └── onPremise-collector.js      # Collector de API interna TNS
│   ├── src/
│   │   ├── components/                 # Componentes React
│   │   │   ├── alerts/                 # Sistema de alertas v4.0
│   │   │   ├── consumption/            # Dashboards de consumo
│   │   │   ├── reports/                # Sistema de reportes
│   │   │   └── ui/                     # Componentes UI reutilizables
│   │   ├── services/                   # Servicios backend
│   │   │   ├── api/                    # Adapters de APIs externas
│   │   │   ├── email/                  # Servicio de emails
│   │   │   ├── sms/                    # Servicio de SMS
│   │   │   ├── push/                   # Push notifications
│   │   │   └── reports/                # Generación de reportes
│   │   ├── controllers/                # Controladores de rutas
│   │   ├── routes/                     # Definición de endpoints
│   │   ├── middlewares/                # Middlewares de Express
│   │   ├── config/                     # Archivos de configuración
│   │   │   ├── js_files/               # Loaders y configuración JS
│   │   │   └── jsons/                  # unified-config.json
│   │   ├── migrations/                 # Migraciones de BD
│   │   ├── jobs/                       # Cron jobs y tareas programadas
│   │   └── utils/                      # Utilidades compartidas
│   ├── public/                         # Archivos públicos
│   │   ├── service-worker.js           # Service Worker para PWA
│   │   ├── manifest.json               # Manifest de PWA
│   │   └── bundle.js                   # Bundle generado por Webpack
│   ├── specs/                          # Especificaciones de features
│   ├── server.js                       # Servidor Express principal
│   ├── package.json                    # Dependencias del proyecto
│   └── webpack.config.js               # Configuración de Webpack
├── SQL_FILES/                          # Scripts SQL
│   ├── 01_creacion_desde_cero/         # Scripts de creación de BD
│   └── 99_others/                      # Scripts varios
├── README.md                           # Este archivo
├── Base_de_Datos.md                    # Documentación de BD
├── Apis_externas.md                    # Documentación de APIs
└── Info_Github.md                      # Convenciones de GitHub
```

### Convenciones de Base de Datos
- **Charset**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Zona Horaria**: America/Santiago (Chile)
- **Base de datos**: `tns_cool_track`
- **Tablas**: snake_case (ej: `alert_tracking`, `device_names`)
- **Columnas**: snake_case (ej: `created_at`, `user_id`)
- **Primary Keys**: `id` (AUTO_INCREMENT)
- **Foreign Keys**: `{tabla}_id` (ej: `user_id`, `device_id`)

Ver detalles completos en [Base_de_Datos.md](./Base_de_Datos.md)

### Convenciones Git/GitHub
- **Branches**: `tipo/issue-numero-descripcion` (ej: `feature/2-documentacion-inicial`)
- **Commits**: Conventional Commits (ej: `feat(alertas): agregar sistema SMS`)
- **PRs**: Requieren aprobación antes de merge
- **Issues**: Usar labels apropiados (`documentation`, `SQL`, etc.)

Ver detalles completos en [Info_Github.md](./Info_Github.md)

---

## 🚀 Stack Tecnológico

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Base de Datos**: MySQL/MariaDB (Driver: mysql2 ^3.15.2)
- **Autenticación**:
  - JSON Web Tokens (jsonwebtoken ^9.0.2)
  - Encriptación: Argon2 ^0.44.0 + Bcrypt ^6.0.0
- **Cron Jobs**:
  - node-cron ^4.2.1
  - node-schedule ^2.1.1
- **Validación**:
  - express-validator ^7.2.1
  - Joi ^17.13.3
- **Rate Limiting**: express-rate-limit ^8.1.0
- **WebSockets**: socket.io-client ^4.8.1
- **HTTP Client**: axios ^1.12.2

### Frontend
- **Framework UI**: React 19.2.0
- **Routing**: React Router DOM 7.1.1
- **Build Tool**: Webpack 5.102.1
- **Transpilador**: Babel 7.28.x
- **UI Components**:
  - Radix UI (múltiples componentes)
  - Styled Components 6.1.14
  - Framer Motion 12.23.22 (animaciones)
- **Estilos**:
  - TailwindCSS 3.4.18
  - PostCSS 8.5.6
  - Autoprefixer 10.4.21
- **Gráficos**:
  - Chart.js 4.5.1
  - React ChartJS 2 ^5.3.0
  - Recharts 2.15.0
- **Mapas**: Mapbox GL 3.15.0
- **Iconos**: Lucide React 0.544.0
- **Formularios**: React DatePicker 7.6.0
- **Notificaciones**: React Toastify 11.0.3

### Herramientas y Servicios
- **Generación PDF**:
  - PDFKit 0.16.0
  - Puppeteer 24.26.1
- **Gráficos para PDFs**: QuickChart JS 3.1.3
- **Analytics**: PostHog JS 1.276.0
- **IA/LLM**:
  - OpenAI SDK 6.8.1
  - Tiktoken 1.0.22 (conteo de tokens)
- **Email**: SendGrid Mail 8.1.4
- **SMS**: Twilio 5.4.2
- **Push Notifications**: Web Push 3.6.7
- **CSV Parsing**: csv-parser 3.2.0
- **Fechas**:
  - date-fns 4.1.0
  - dayjs 1.11.13
  - luxon 3.5.0
  - moment-timezone 0.5.46
- **Utilidades**:
  - lodash (implícito en varios componentes)
  - dotenv 17.2.3

---

## 🏗️ Arquitectura del Sistema

### Patrón de Collectors

El sistema utiliza un patrón de **Collectors** para recolectar datos de fuentes externas:

#### ShellyCollector
- **Responsabilidad**: Recolección de datos eléctricos de dispositivos Shelly
- **API**: Shelly Cloud API
- **Frecuencia**: 10 segundos (configurable)
- **Características**:
  - Reintentos automáticos (max 3)
  - Métricas de éxito/fallo
  - Detección de desviación de intervalo
  - Almacenamiento en BD

#### UbibotCollector
- **Responsabilidad**: Recolección de datos de temperatura de sensores Ubibot
- **API**: Ubibot API
- **Frecuencia**: 1 minuto (configurable)
- **Características**:
  - Múltiples canales simultáneos
  - Detección de ciclos de descongelamiento
  - Almacenamiento histórico

#### OnPremiseCollector
- **Responsabilidad**: API interna TNS (legacy)
- **Estado**: Actualmente deshabilitado
- **API**: http://tns.thenextsecurity.cl:8443

### Servicios Principales

#### Servicios de Base de Datos
- `database-service.js` - Pool de conexiones MySQL
- `db/alertScheduleConfigService.js` - Configuración de horarios de alertas

#### Servicios de Energía
- `total-energy-service.js` - Totales de energía consumida
- `energy-averages-service.js` - Promedios y agregaciones
- `consumo-categoria-service.js` - Consumo por categoría
- `electricDashboardService.js` - Datos para dashboard eléctrico

#### Servicios de Temperatura
- `ubibot/ubibotService.js` - Procesamiento de datos Ubibot
- `ubibot/ubibot-service-adapter.js` - Adapter de API
- `temperatureDashboardService.js` - Datos para dashboard

#### Servicios de Notificaciones
- `email/emailService.js` - Envío de emails (SendGrid)
- `sms/smsService.js` - Envío de SMS (Twilio)
- `push/pushNotificationService.js` - Push notifications (Web Push)
- `notificationService.js` - Orquestador de notificaciones
- `baseAlertService.js` - Lógica base de alertas (v4.0.0)

#### Servicios de Reportes
- `reports/pdfGeneratorService.js` - Generación de PDFs
- `reports/reportSchedulerService.js` - Programación de reportes
- `reports/reportAnalyticsService.js` - Analytics de reportes
- `reports/aggregation/` - Servicios de agregación de datos
- `reports/templates/` - Templates ejecutivos (alertas, consumo, temperatura)
- `reportsApiService.js` - API de reportes

#### Servicios de IA
- `openaiService.js` - Integración con DeepSeek API
- `aiDataService.js` - Procesamiento de datos para IA
- `aiCostTracker.js` - Tracking de costos de API de IA

#### Servicios de Autenticación
- `jwt-service.js` - Generación y validación de JWT
- `tokenService.js` - Gestión de tokens de sesión

#### Otros Servicios
- `api/shelly-api-adapter.js` - Adapter de Shelly API
- `api/mapbox-api-adapter.js` - Adapter de Mapbox API
- `analyticsService.js` - Analytics (PostHog)
- `presetService.js` - Gestión de presets de usuario
- `alertScheduleService.js` - Servicio de horarios de alertas

### Controladores

Los controladores manejan la lógica de negocio y validación de endpoints:

- `usuariosController.js` - Gestión de usuarios
- `deviceController.js` - Gestión de dispositivos
- `ubibotController.js` - Endpoints de sensores Ubibot
- `energyController.js` - Endpoints de energía
- `totalesController.js` - Totales y agregaciones
- `analysisController.js` - Análisis de datos
- `powerAnalysisController.js` - Análisis de consumo eléctrico
- `contadorCiclosController.js` - Contador de ciclos de descongelamiento
- `notificationController.js` - Notificaciones multi-canal
- `reportController.js` - Generación y gestión de reportes
- `aiAnalysisController.js` - Análisis con IA
- `alertScheduleController.js` - Configuración de horarios de alertas

### Rutas API

El sistema expone múltiples endpoints REST:

- `/api/auth` - Autenticación (login, registro, reset password)
- `/api/usuarios` - Gestión de usuarios
- `/api/devices` - Dispositivos Shelly
- `/api/ubibot` - Sensores Ubibot
- `/api/config` - Configuración del sistema
- `/api/totales` - Totales de energía
- `/api/analysis` - Análisis de datos
- `/api/power-analysis` - Análisis de consumo
- `/api/gps` - Datos GPS
- `/api/gps-data` - Histórico GPS
- `/api/beacons` - Beacons de ubicación
- `/api/blind-spots` - Zonas de puntos ciegos
- `/api/personal` - Personal en terreno
- `/api/sms` - Envío de SMS
- `/api/sectores` - Sectores/zonas
- `/api/consumo-categoria` - Consumo por categoría
- `/api/push-notifications` - Push notifications
- `/api/alert-tracking` - Tracking de alertas
- `/api/alert-schedule` - Horarios de alertas
- `/api/presets` - Presets de usuario
- `/api/reports` - Generación de reportes
- `/api/ai-analysis` - Análisis con IA
- `/api/dashboard` - Datos de dashboards

Ver documentación completa en código de cada ruta.

### Sistema de Configuración Unificado

Todo el sistema se configura mediante `unified-config.json`:

```javascript
{
  "server": {
    "port": 1337,
    "cors": ["http://localhost:3000"]
  },
  "database": {
    "host": "localhost",
    "user": "root",
    "database": "tns_cool_track",
    "charset": "utf8mb4",
    "timezone": "America/Santiago"
  },
  "api": {
    "shelly_cloud": {
      "url": "https://shelly-33-eu.shelly.cloud/device/status",
      "auth_key": "YOUR_TOKEN"
    },
    "ubibot": {
      "url": "https://api.ubibot.com/channels/",
      "account_key": "YOUR_KEY"
    }
  },
  "email": {
    "SENDGRID_API_KEY": "SG.xxx",
    "from": "alertas@thenextsecurity.cl"
  },
  "sms": {
    "TWILIO_ACCOUNT_SID": "ACxxx",
    "TWILIO_AUTH_TOKEN": "xxx",
    "TWILIO_PHONE_NUMBER": "+56xxx"
  },
  "collection": {
    "intervalSeconds": 10
  }
}
```

**Loader**: `src/config/js_files/config-loader.js`

---

## 🔗 Enlaces de Interés

### Repositorio y Gestión
- **Repositorio GitHub**: https://github.com/andresTNS/TNS_TRACK_DEMO
- **Gestión de Issues**: [Info_Github.md](./Info_Github.md)

### Issues Activos
- **Issue #1**: Creación de la base de datos desde cero
- **Issue #2**: Documentación Inicial (este documento)

### Documentación del Proyecto
- **APIs Externas**: [Apis_externas.md](./Apis_externas.md) - Listado completo de APIs utilizadas
- **Base de Datos**: [Base_de_Datos.md](./Base_de_Datos.md) - Esquema y convenciones de BD
- **Gestión GitHub**: [Info_Github.md](./Info_Github.md) - Workflow y convenciones

### Recursos Técnicos
- **Shelly API Docs**: https://shelly-api-docs.shelly.cloud/
- **Ubibot**: https://www.ubibot.com/
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Twilio Docs**: https://www.twilio.com/docs
- **Mapbox Docs**: https://docs.mapbox.com/
- **PostHog Docs**: https://posthog.com/docs

---

## 🔌 APIs Externas (Resumen)

El proyecto integra **9 APIs externas**:

| API | Propósito | Criticidad |
|-----|-----------|------------|
| Shelly Cloud | Datos eléctricos | ⚠️ CRÍTICA |
| Ubibot | Datos de temperatura | ⚠️ CRÍTICA |
| OnPremise TNS | API interna legacy | 🔶 ALTA (deshabilitada) |
| SendGrid | Emails | 🔶 ALTA |
| Twilio | SMS | 🔶 ALTA |
| DeepSeek | Análisis IA | 🟢 MEDIA |
| QuickChart | Gráficos PDF | 🟢 MEDIA |
| Mapbox | Mapas GPS | 🟡 BAJA |
| PostHog | Analytics | 🟡 BAJA |

Ver detalles completos en [Apis_externas.md](./Apis_externas.md)

---

## 🗄️ Base de Datos (Resumen)

- **Nombre**: `tns_cool_track`
- **Tipo**: MySQL/MariaDB
- **Charset**: utf8mb4_unicode_ci
- **Zona Horaria**: America/Santiago

### Principales Tablas Identificadas
- `usuarios` - Usuarios del sistema
- `device_names` - Dispositivos Shelly
- `devices_ubibot` - Sensores Ubibot
- `alert_tracking` - Tracking de alertas
- `alert_metrics_hourly` - Métricas agregadas
- `scheduled_reports` - Reportes programados
- `energy_data` - Datos de consumo eléctrico
- `temperature_data` - Datos de temperatura
- `gps_data` - Datos GPS

Ver esquema completo en [Base_de_Datos.md](./Base_de_Datos.md)

---

## 🚦 Decisiones Técnicas Clave

### 1. Arquitectura Modular por Collectors
**Decisión**: Separar recolección de datos en Collectors independientes

**Razón**:
- Separación de responsabilidades por fuente de datos
- Facilita mantenimiento y testing
- Permite escalar fuentes de datos independientemente

**Impacto**:
- Mayor claridad en el código
- Facilita agregar nuevas fuentes de datos
- Permite configurar intervalos diferentes por fuente

---

### 2. Sistema de Configuración Unificado (`unified-config.json`)
**Decisión**: Centralizar toda configuración en un único archivo JSON

**Razón**:
- Evitar hardcodeo de credenciales en código
- Facilitar cambios de configuración sin modificar código
- Simplificar despliegue en diferentes entornos

**Impacto**:
- Configuración más mantenible
- Riesgo: archivo debe estar protegido (no versionarlo con keys reales)
- Facilita onboarding de nuevos desarrolladores

---

### 3. Sistema de Alertas v4.0.0 Modular
**Decisión**: Crear `baseAlertService.js` como clase base para email/SMS/push

**Razón**:
- Reutilización de lógica común (horarios, destinatarios, cooldown)
- Consistencia entre canales
- Reducción de duplicación de código

**Impacto**:
- Código más DRY
- Facilita agregar nuevos canales de notificación
- Mantenimiento centralizado de lógica de alertas

---

### 4. PWA con Service Workers
**Decisión**: Implementar Progressive Web App con service workers

**Razón**:
- Experiencia nativa en dispositivos móviles
- Push notifications sin app nativa
- Funcionamiento offline parcial

**Impacto**:
- Mejor UX en móviles
- Push notifications funcionan en iOS/Android
- Mayor engagement de usuarios

**Archivos**:
- `public/service-worker.js`
- `public/manifest.json`

---

### 5. Reportes PDF con Templates Ejecutivos
**Decisión**: Sistema de reportes con templates especializados por tipo

**Razón**:
- Automatización de generación de reportes
- Consistencia visual
- Profesionalización de outputs

**Impacto**:
- Reducción de trabajo manual
- Reportes programables automáticamente
- Mejor presentación a clientes

**Templates**:
- `executiveAlertsTemplate.js`
- `executiveConsumptionTemplate.js`
- `executiveTemperatureTemplate.js`

---

### 6. React 19.2.0 + TailwindCSS
**Decisión**: Stack moderno de frontend

**Razón**:
- React 19: Últimas optimizaciones de performance
- TailwindCSS: Desarrollo rápido y consistencia visual
- Componentes Radix UI: Accesibilidad out-of-the-box

**Impacto**:
- Desarrollo más rápido
- UI más consistente
- Mejor performance del frontend

---

### 7. Express 5.1.0 (versión moderna)
**Decisión**: Usar Express 5 en lugar de versiones anteriores

**Razón**:
- Mejor manejo de promesas (no necesita wrappers)
- Performance mejorado
- Router más robusto

**Impacto**:
- Menos boilerplate en async/await
- Código más limpio en controladores

---

### 8. Múltiples Librerías de Fechas
**Decisión**: Usar date-fns, dayjs, luxon y moment-timezone simultáneamente

**Estado**: ⚠️ Posible punto de mejora

**Razón** (histórica):
- Diferentes necesidades en diferentes partes del código
- Migraciones incompletas entre librerías

**Impacto**:
- Bundle más pesado
- Posible inconsistencia en manejo de zonas horarias
- **Recomendación futura**: Estandarizar en una sola (date-fns o luxon)

---

### 9. Argon2 + Bcrypt para Passwords
**Decisión**: Doble librería de hashing

**Razón posible**:
- Transición entre sistemas
- Compatibilidad con usuarios legacy

**Impacto**:
- Mayor seguridad
- Flexibilidad en autenticación

---

### 10. DeepSeek como Provider de IA
**Decisión**: Usar DeepSeek en lugar de OpenAI directamente

**Razón**:
- API compatible con OpenAI
- Posible ventaja de costo
- Mantenimiento de flexibilidad (fácil cambiar a OpenAI)

**Impacto**:
- SDK OpenAI funciona directamente
- Tracking de costos implementado

---

## 🛠️ Instalación y Ejecución

### Prerrequisitos
- Node.js >= 18.x
- MySQL/MariaDB >= 8.x
- npm >= 9.x

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/andresTNS/TNS_TRACK_DEMO.git
cd TNS_TRACK_DEMO/servicios

# Instalar dependencias
npm install

# Configurar base de datos
# 1. Crear base de datos (ver SQL_FILES/01_creacion_desde_cero/)
mysql -u root -p < ../SQL_FILES/01_creacion_desde_cero/01_tablas_base.sql

# 2. Configurar unified-config.json
cp src/config/jsons/unified-config.example.json src/config/jsons/unified-config.json
# Editar con tus credenciales

# 3. Configurar variables de entorno (opcional)
cp .env.example .env
# Editar con tus valores
```

### Ejecución en Desarrollo

```bash
# Opción 1: Iniciar todo (webpack dev + backend)
npm run start-all

# Opción 2: Iniciar por separado
# Terminal 1 - Webpack Dev Server (frontend)
npm start

# Terminal 2 - Backend Node.js
npm run start-server
```

**Acceso**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:1337

### Ejecución en Producción

```bash
# Build de producción
npm run build

# Iniciar servidor
npm run start-server
```

### Script de Inicio Completo

```bash
# Limpia, instala, builda e inicia todo
npm run comenzar
```

---

## 📦 Scripts Disponibles

```json
{
  "start": "webpack serve --mode development",
  "start-server": "node server.js",
  "start-all": "concurrently \"npm run start\" \"npm run start-server\"",
  "build": "webpack",
  "clean": "rimraf dist",
  "install-deps": "npm install",
  "comenzar": "npm run clean && npm run install-deps && npm run build && npm run start-all"
}
```

### Descripción de Scripts
- **`npm start`**: Inicia Webpack Dev Server (modo desarrollo, hot reload)
- **`npm run start-server`**: Inicia servidor Node.js/Express
- **`npm run start-all`**: Inicia ambos en paralelo (desarrollo)
- **`npm run build`**: Build de producción (genera bundles optimizados)
- **`npm run clean`**: Limpia carpeta dist/
- **`npm run install-deps`**: Instala dependencias
- **`npm run comenzar`**: Script completo de inicio (clean + install + build + start)

---

## 👥 Equipo

**The Next Security**

**Desarrolladores Asignados:**
- **Bufigol** - Developer
- **andresTNS** - Developer / Owner del Repositorio

---

## 📚 Documentación Adicional

### Documentos del Proyecto
- **[Base de Datos](./Base_de_Datos.md)** - Esquema completo, tablas, stored procedures, triggers
- **[APIs Externas](./Apis_externas.md)** - Documentación detallada de las 9 APIs utilizadas
- **[Gestión GitHub](./Info_Github.md)** - Workflow, convenciones de commits, branches y PRs

### Documentos Técnicos Internos
- `/servicios/specs/` - Especificaciones de features
- `/servicios/src/components/alerts/README.md` - Sistema de alertas v4.0
- `/servicios/src/components/reports/UX_TESTING_GUIDE.md` - Guía de testing UX

---

## 🔒 Seguridad

### Autenticación
- JWT tokens con expiración configurable
- HTTP-only cookies para tokens
- Rate limiting en endpoints sensibles

### Encriptación
- Passwords: Argon2 + Bcrypt
- Comunicación: HTTPS en producción (recomendado)

### Variables Sensibles
⚠️ **IMPORTANTE**: Nunca versionar en Git:
- `unified-config.json` con keys reales
- `.env` con credenciales
- Archivos con tokens/secrets

### CORS
Configurado en `server.js`:
```javascript
corsOptions = {
  origin: ["http://localhost:3000", "https://tns.thenextsecurity.cl"],
  credentials: true
}
```

---

## 🐛 Troubleshooting

### Problema: "Cannot connect to database"
**Solución**:
1. Verificar que MySQL esté corriendo
2. Verificar credenciales en `unified-config.json`
3. Verificar que base de datos `tns_cool_track` existe

### Problema: "API key invalid" (Shelly/Ubibot)
**Solución**:
1. Verificar keys en `unified-config.json`
2. Verificar formato de la key (no debe tener espacios)
3. Verificar que key tenga permisos adecuados

### Problema: "Port 1337 already in use"
**Solución**:
```bash
# Encontrar proceso
lsof -i :1337

# Matar proceso
kill -9 <PID>

# O cambiar puerto en unified-config.json
```

### Problema: Webpack dev server no arranca
**Solución**:
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Notas de Versión

### v0.1.0 (Actual)
- ✅ Documentación inicial completada
- ✅ Sistema de Collectors implementado
- ✅ Sistema de Alertas v4.0.0 funcional
- ✅ Reportes PDF con templates ejecutivos
- ✅ PWA con push notifications
- ⏳ Base de datos en proceso de documentación completa (Issue #1)

---

## 🚀 Roadmap Futuro

### Próximas Mejoras
- [ ] Estandarizar librería de fechas (eliminar redundancia)
- [ ] Implementar tests unitarios (Jest)
- [ ] Implementar tests E2E (Cypress/Playwright)
- [ ] Dockerizar aplicación
- [ ] CI/CD con GitHub Actions
- [ ] Documentación de API con Swagger/OpenAPI
- [ ] Secrets manager para producción (AWS Secrets Manager / HashiCorp Vault)

---

## 📄 Licencia

**Uso Privado** - The Next Security

Este proyecto es de uso interno exclusivo para The Next Security y sus clientes autorizados.

---

**Última actualización**: 2025-01-21
**Versión de documentación**: 1.0.0
**Mantenido por**: Equipo TNS (Bufigol, andresTNS)
