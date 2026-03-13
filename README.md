# TNS Track Demo
Sistema integral de monitoreo y control inteligente para gestión de temperatura y consumos de energía en tiempo real.

---

## 🎯 Propósito del Proyecto

**TNS Track** es un **sistema de demostración** desarrollado por **The Next Security** que sirve como:

1. **Demo para posibles clientes**: Showcase completo de capacidades de monitoreo y control inteligente
2. **Base sólida replicable**: Arquitectura probada y lista para replicar en proyectos productivos de clientes
3. **Referencia interna**: Plantilla de desarrollo y buenas prácticas para el equipo TNS

El sistema demuestra monitoreo y control en tiempo real de:

- **Temperatura**: Monitoreo de cámaras frigoríficas y ambientes controlados
- **Consumo Eléctrico**: Tracking de consumo energético de dispositivos
- **GPS/Ubicación**: Seguimiento de personal y activos en tiempo real
- **Alertas Inteligentes**: Sistema de notificaciones multi-canal (email, push)
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
**Uso exclusivo del equipo interno de The Next Security**.

---

## 📋 Convenciones

### Nomenclatura de Código

#### Archivos JavaScript
⚠️ **REGLA UNIVERSAL**: Todos los archivos deben seguir **camelCase + sufijo según tipo**

| Nombre | Tipo | Ejemplo |
|--------|------|---------|
| Collector | camelCase + "Collector" | `shellyCollector.js`, `ubibotCollector.js` |
| Service | camelCase + "Service" | `emailService.js`, `databaseService.js` |
| Routes | camelCase + "Routes" | `deviceRoutes.js`, `ubibotRoutes.js` |
| Controller | camelCase + "Controller" | `alertScheduleController.js` |
| Component | camelCase + sufijo descriptivo | `dashboardTemperaturaV2.js` |
| CSS | camelCase + ".css" | `mainStyles.css` |
| Utils/Helper | camelCase + "Utils" o "Helper" | `dateUtils.js`, `apiHelper.js` |

**Nota**: Estamos en proceso de refactorización para estandarizar toda la nomenclatura a esta convención.

#### Nomenclatura de Variables

| Nombre | Tipo | Ejemplo |
|--------|------|---------|
| Variables y funciones | camelCase | `userData`, `calculateTotal()` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_TIMEOUT` |
| Clases y Componentes | PascalCase | `UserProfile`, `AlertCard` |

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
│   │   │   ├── push/                   # Push notifications
│   │   │   └── reports/                # Generación de reportes
│   │   ├── controllers/                # Controladores de rutas
│   │   ├── routes/                     # Definición de endpoints
│   │   ├── middlewares/                # Middlewares de Express
│   │   ├── config/                     # Archivos de configuración
│   │   │   ├── js_files/               # Loaders y configuración JS
│   │   │   └── jsons/                  # ⚠️ LEGACY - Migrando a BD
│   │   ├── migrations/                 # Migraciones de BD
│   │   ├── jobs/                       # Cron jobs y tareas programadas
│   │   └── utils/                      # Utilidades compartidas
│   ├── public/                         # Archivos públicos
│   │   ├── service-worker.js           # Service Worker para PWA
│   │   ├── manifest.json               # Manifest de PWA
│   │   └── bundle.js                   # Bundle generado por Webpack
│   ├── specs/                          # ⚠️ DEPRECADO - Usar GitHub Issues
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

> **Nota**: Las convenciones de nomenclatura serán formalizadas y estandarizadas en Issues #1 (Creación de BD) y #3 (Tabla de configuración).

Ver detalles completos en [Base_de_Datos.md](./Base_de_Datos.md)

### Convenciones Git/GitHub
- **Branches**: `tipo/issue-numero-descripcion` (ej: `feature/2-documentacion-inicial`)
- **Commits**: Conventional Commits (ej: `feat(alertas): agregar sistema de notificaciones`)
- **Autoría**: **SIEMPRE reconocer la autoría de IAs** (Claude Code, ChatGPT, etc.) **y cualquier colaborador** que haya contribuido al commit
- **Co-Authored-By**: Incluir SIEMPRE en commits asistidos por IA: `Co-Authored-By: Claude <noreply@anthropic.com>`
- **PRs**: Requieren aprobación antes de merge
- **Issues**: Usar labels apropiados (`documentation`, `SQL`, etc.)
- **Especificaciones**: Usar GitHub Issues en lugar de carpeta `/specs`

Ver detalles completos en [Info_Github.md](./Info_Github.md)

---

## 🚀 Stack Tecnológico

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Base de Datos**: MySQL 8.0+ (Driver: mysql2 ^3.15.2)
- **Zona Horaria Base**: America/Santiago (Chile) - **SIEMPRE**
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
- `notificationController.js` - Notificaciones multi-canal
- `reportController.js` - Generación y gestión de reportes
- `aiAnalysisController.js` - Análisis con IA
- `alertScheduleController.js` - Configuración de horarios de alertas

### Rutas API

El sistema expone múltiples endpoints REST. Para el inventario completo y detallado de todos los endpoints, ver:

**[Endpoints_API.md](./Endpoints_API.md)** - Documentación completa de todos los endpoints internos

### Sistema de Configuración

⚠️ **IMPORTANTE - EN MIGRACIÓN A BASE DE DATOS**

El sistema está migrando de archivos de configuración a base de datos centralizada.

**Estado Actual (LEGACY)**:
- Carpeta: `/servicios/src/config/jsons/` - ⚠️ En proceso de eliminación
- Archivo: `unified-config.json` - Se está migrando a BD
- Solo quedará información que no pueda almacenarse en BD

**Configuración Vigente**:
```javascript
// config-loader.js - SIGUE VIGENTE
// Revisa periódicamente la BD para cambios de configuración
const configLoader = require('./src/config/js_files/config-loader');
```

**🚫 Decisión Técnica Crítica**: Por diseño arquitectónico, **NO se utilizan variables de entorno** (`.env`).

**Razones**:
- Toda configuración se gestiona desde base de datos de forma centralizada
- Permite gestión dinámica desde UI de administración sin redeploy
- Mayor control, auditabilidad y trazabilidad de cambios
- Configuración en tiempo real sin reinicios

Ver detalles completos en [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md)

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
Ver documentación completa en [Recursos_Tecnicos.md](./Recursos_Tecnicos.md)

---

## 🔌 APIs Externas (Resumen)

El proyecto integra **8 APIs externas**:

| API | Propósito | Criticidad |
|-----|-----------|------------|
| Shelly Cloud | Datos eléctricos | ⚠️ CRÍTICA |
| Ubibot | Datos de temperatura | ⚠️ CRÍTICA |
| OnPremise TNS | API interna legacy | 🔶 ALTA (deshabilitada) |
| SendGrid | Emails | 🔶 ALTA |
| DeepSeek | Análisis IA | 🟢 MEDIA |
| QuickChart | Gráficos PDF | 🟢 MEDIA |
| Mapbox | Mapas GPS | 🟡 BAJA |
| PostHog | Analytics | 🟡 BAJA |

Ver detalles completos en [Apis_externas.md](./Apis_externas.md)

---

## 🗄️ Base de Datos (Resumen)

- **Nombre**: `tns_cool_track`
- **Tipo**: MySQL 8.0+
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

### Principios de Desarrollo

El proyecto sigue estrictamente estos principios fundamentales:

1. **KISS (Keep It Simple, Stupid)**
   - Priorizar soluciones simples sobre complejidad innecesaria
   - Evitar over-engineering y abstracciones prematuras
   - Código fácil de entender = código fácil de mantener

2. **DRY (Don't Repeat Yourself)**
   - Evitar duplicación de código mediante modularización inteligente
   - Extraer lógica repetida a servicios reutilizables
   - Centralizar configuración y constantes

3. **Modularización Máxima**
   - Separar responsabilidades en módulos independientes
   - Un archivo = una responsabilidad clara
   - Facilitar testing y mantenimiento

### Decisiones Arquitectónicas

1. **Arquitectura Modular por Collectors**
2. **Migración de Configuración a Base de Datos** ⚠️ EN PROGRESO
3. **Sistema de Alertas v4.0.0 Modular**
4. **PWA con Service Workers**
5. **Reportes PDF con Templates Ejecutivos**
6. **React 19.2.0 + TailwindCSS**
7. **Express 5.1.0** (versión moderna)
8. **NO uso de Variables de Entorno** (por diseño)
9. **Zona Horaria Base: America/Santiago** (siempre)
10. **DeepSeek como Provider de IA**

**Ver detalles completos de cada decisión en:** [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md)

---

## 🛠️ Instalación y Ejecución

### Prerrequisitos
- Node.js >= 18.x
- MySQL 8.0+
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

# 2. Configurar unified-config.json (⚠️ LEGACY - migrando a BD)
cp src/config/jsons/unified-config.example.json src/config/jsons/unified-config.json
# Editar con tus credenciales de base de datos
```

### Ejecución en Desarrollo

**⚠️ COMANDO RECOMENDADO - USAR ESTE**:
```bash
# Comando único: limpia, instala dependencias, build y arranca todo
npm run comenzar
```

**Opciones alternativas** (solo si necesitas ejecutar por separado):
```bash
# Opción 1: Iniciar todo (webpack dev + backend) SIN clean ni build
npm run start-all

# Opción 2: Iniciar por separado manualmente
# Terminal 1 - Webpack Dev Server (frontend)
npm start

# Terminal 2 - Backend Node.js
npm run start-server
```

**Acceso**:
- **Aplicación**: [http://localhost:3000/tns_cool_track](http://localhost:3000/tns_cool_track)
- **Backend API**: http://localhost:1337/TNS_Cool_Track/api/

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

**Estructura del Equipo:**
- **andresTNS** - Jefe de Desarrolladores / Owner del Repositorio
- **Bufigol** - Developer
- **TNSTRACK** - Product Owner
- **felipecleverox** - Product Owner

---

## 📚 Documentación Adicional

### Documentos del Proyecto
- **[Base de Datos](./Base_de_Datos.md)** - Esquema completo, tablas, stored procedures, triggers
- **[APIs Externas](./Apis_externas.md)** - Documentación detallada de las 8 APIs utilizadas
- **[Gestión GitHub](./Info_Github.md)** - Workflow, convenciones de commits, branches y PRs
- **[Decisiones Técnicas](./Decisiones_Tecnicas.md)** - Decisiones arquitectónicas detalladas
- **[Endpoints API](./Endpoints_API.md)** - Inventario completo de endpoints internos
- **[Recursos Técnicos](./Recursos_Tecnicos.md)** - Enlaces y recursos técnicos
- **[Troubleshooting](./Troubleshooting.md)** - Guía de resolución de problemas

### Documentos Técnicos Internos
- ~~`/servicios/specs/`~~ - ⚠️ **DEPRECADO** - Usar GitHub Issues
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
- `unified-config.json` con keys reales (⚠️ LEGACY - migrando a BD)
- Archivos con tokens/secrets

**🚫 Decisión Técnica**: Por diseño arquitectónico, **NO se utilizan variables de entorno** (`.env`).

**Razones**:
- Toda configuración se gestiona desde base de datos de forma centralizada
- Permite gestión dinámica desde UI de administración sin redeploy
- Mayor control, auditabilidad y trazabilidad de cambios
- Configuración en tiempo real sin reinicios

Esta es una **decisión intencional documentada** en [Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md), NO un error o falta de implementación.

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

Para la guía completa de resolución de problemas, ver:

**[Troubleshooting.md](./Troubleshooting.md)** - Guía detallada con soluciones a problemas comunes

---

## 📝 Notas de Versión

Para el historial completo de cambios, ver:

**[CHANGELOG.md](./CHANGELOG.md)** - Registro detallado de todas las versiones y cambios

---

## 🚀 Roadmap Futuro

Para el plan de desarrollo y seguimiento de issues, ver:

**[ROADMAP.md](./ROADMAP.md)** - Planificación de features y tracking de progreso

---

## 📄 Licencia

**Uso Privado** - The Next Security

Este proyecto es de uso interno exclusivo para The Next Security y sus clientes autorizados.

---

**Última actualización**: 2026-01-26
**Versión de documentación**: 2.0.0
**Mantenido por**: Equipo TNS (andresTNS - Jefe de Desarrolladores, Bufigol - Developer)
