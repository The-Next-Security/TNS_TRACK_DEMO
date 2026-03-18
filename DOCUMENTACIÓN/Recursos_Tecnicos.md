# Recursos Técnicos

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-03-11
> **Versión**: 2.1.0
> **Propósito**: Enlaces y recursos técnicos del proyecto

---

## 📋 Índice

1. [Recursos Internos del Proyecto](#recursos-internos-del-proyecto)
2. [Documentación Oficial de Tecnologías](#documentación-oficial-de-tecnologías)
3. [APIs Externas](#apis-externas)
4. [Librerías y Frameworks](#librerías-y-frameworks)
5. [Herramientas de Desarrollo](#herramientas-de-desarrollo)
6. [Tutoriales y Guías](#tutoriales-y-guías)

---

## Recursos Internos del Proyecto

### Documentación del Proyecto

#### Documentación Principal
- **[README.md](./README.md)** - Documentación general del proyecto
- **[Base_de_Datos.md](./Base_de_Datos.md)** - Esquema de base de datos, tablas, stored procedures, triggers
- **[Apis_externas.md](./Apis_externas.md)** - Documentación de las 8 APIs externas utilizadas
- **[Info_Github.md](./Info_Github.md)** - Workflow Git, convenciones de commits, branches y PRs
- **[Estandares_Nomenclatura.md](./Estandares_Nomenclatura.md)** - Estándares de nomenclatura de archivos JS y componentes React
- **[Estandares_Nomenclatura_SQL.md](./Estandares_Nomenclatura_SQL.md)** - Estándares de nomenclatura SQL y base de datos

#### Documentación Técnica
- **[Decisiones_Tecnicas.md](./Decisiones_Tecnicas.md)** - Decisiones arquitectónicas y técnicas
- **[Endpoints_API.md](./Endpoints_API.md)** - Inventario completo de endpoints internos
- **[Troubleshooting.md](./Troubleshooting.md)** - Guía de resolución de problemas
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios
- **[ROADMAP.md](./ROADMAP.md)** - Planificación de features

---

### Scripts SQL
- **`/SQL_FILES/01_creacion_desde_cero/`** - Scripts de creación de base de datos
- **`/SQL_FILES/02_actualizaciones/`** - Scripts de actualización de esquema

---

## Documentación Oficial de Tecnologías

### Backend

#### Node.js
- **Documentación Oficial**: https://nodejs.org/docs/
- **Versión Utilizada**: >= 18.x
- **Guías**: https://nodejs.org/en/docs/guides/

#### Express
- **Documentación Oficial**: https://expressjs.com/
- **Versión Utilizada**: 5.1.0
- **API Reference**: https://expressjs.com/en/5x/api.html
- **Migración 4.x → 5.x**: https://expressjs.com/en/guide/migrating-5.html

#### MySQL
- **Documentación Oficial**: https://dev.mysql.com/doc/
- **Versión Utilizada**: >= 8.x
- **Driver (mysql2)**: https://github.com/sidorares/node-mysql2
- **SQL Reference**: https://dev.mysql.com/doc/refman/8.0/en/

---

### Frontend

#### React
- **Documentación Oficial**: https://react.dev/
- **Versión Utilizada**: 19.2.0
- **Quick Start**: https://react.dev/learn
- **API Reference**: https://react.dev/reference/react

#### TailwindCSS
- **Documentación Oficial**: https://tailwindcss.com/docs
- **Versión Utilizada**: 3.4.18
- **Cheat Sheet**: https://nerdcave.com/tailwind-cheat-sheet
- **Customization**: https://tailwindcss.com/docs/configuration

#### Webpack
- **Documentación Oficial**: https://webpack.js.org/
- **Versión Utilizada**: 5.102.1
- **Configuration**: https://webpack.js.org/configuration/
- **Dev Server**: https://webpack.js.org/configuration/dev-server/

---

## APIs Externas

### Shelly Cloud API
- **Documentación**: https://shelly-api-docs.shelly.cloud/
- **API v2**: https://shelly-api-docs.shelly.cloud/gen2/
- **Autenticación**: API Key-based
- **Uso en Proyecto**: `shellyCollector.js`

### Ubibot API
- **Documentación**: https://www.ubibot.com/platform-api-introduction/
- **Portal**: https://www.ubibot.com/
- **Autenticación**: API Key + Account Key
- **Uso en Proyecto**: `ubibotCollector.js`

### SendGrid (Email)
- **Documentación**: https://docs.sendgrid.com/
- **API v3**: https://docs.sendgrid.com/api-reference
- **Node.js Library**: https://github.com/sendgrid/sendgrid-nodejs
- **Versión Utilizada**: 8.1.4

### DeepSeek (IA)
- **Documentación**: https://platform.deepseek.com/docs
- **API**: https://platform.deepseek.com/api-docs
- **Modelos**: https://platform.deepseek.com/models
- **Uso en Proyecto**: AI Cold Chamber Analysis (Feature 005)

### Google Fonts
- **Catálogo**: https://fonts.google.com/
- **API**: https://developers.google.com/fonts
- **Implementación**: Auto-hosted para performance

---

## Librerías y Frameworks

### Gestión de Fechas

**Librería estándar del proyecto**: [Luxon](https://moment.github.io/luxon/) (decisión documentada en [Issue #5](https://github.com/andresTNS/TNS_TRACK_DEMO/issues/5)). Todo el código nuevo debe usar Luxon; el resto de librerías se mantienen solo hasta completar la migración.

#### Luxon (estándar)
- **Documentación**: https://moment.github.io/luxon/
- **Versión Utilizada**: 3.5.0
- **API Docs**: https://moment.github.io/luxon/api-docs/
- **Zona horaria**: America/Santiago (soporte nativo)

#### Moment.js / Moment Timezone (legacy — en proceso de migración)
- **Moment.js**: https://momentjs.com/docs/ — 2.30.1
- **Moment Timezone**: https://momentjs.com/timezone/ — 0.5.46
- **Estado**: En proceso de reemplazo por Luxon (Issue #5). No usar en código nuevo.

#### date-fns (legacy — en proceso de migración)
- **Documentación**: https://date-fns.org/ — 4.1.0
- **Estado**: Usado como adaptador de Chart.js en algunos componentes; en proceso de migración a chartjs-adapter-luxon. No usar en código nuevo.

#### Day.js (legacy — en proceso de migración)
- **Documentación**: https://day.js.org/ — 1.11.13
- **Estado**: En proceso de reemplazo por Luxon (Issue #5). No usar en código nuevo.

---

### UI Components

#### Radix UI
- **Documentación**: https://www.radix-ui.com/primitives/docs/overview/introduction
- **Componentes Utilizados**:
  - Accordion: https://www.radix-ui.com/primitives/docs/components/accordion
  - Alert Dialog: https://www.radix-ui.com/primitives/docs/components/alert-dialog
  - Checkbox: https://www.radix-ui.com/primitives/docs/components/checkbox
  - Dialog: https://www.radix-ui.com/primitives/docs/components/dialog
  - Dropdown Menu: https://www.radix-ui.com/primitives/docs/components/dropdown-menu
  - Progress: https://www.radix-ui.com/primitives/docs/components/progress
  - Select: https://www.radix-ui.com/primitives/docs/components/select
  - Switch: https://www.radix-ui.com/primitives/docs/components/switch
  - Toast: https://www.radix-ui.com/primitives/docs/components/toast
  - Tooltip: https://www.radix-ui.com/primitives/docs/components/tooltip

#### React Toastify
- **Documentación**: https://fkhadra.github.io/react-toastify/introduction
- **Versión Utilizada**: 11.0.3
- **Playground**: https://fkhadra.github.io/react-toastify/playground

#### Framer Motion
- **Documentación**: https://www.framer.com/motion/
- **Versión Utilizada**: 12.23.22
- **Examples**: https://www.framer.com/motion/examples/

---

### Gráficos y Visualización

#### Chart.js
- **Documentación**: https://www.chartjs.org/docs/latest/
- **Versión Utilizada**: 4.5.1
- **Getting Started**: https://www.chartjs.org/docs/latest/getting-started/

#### React Chart.js 2
- **Documentación**: https://react-chartjs-2.js.org/
- **Versión Utilizada**: 5.3.0
- **Examples**: https://react-chartjs-2.js.org/examples

#### Recharts
- **Documentación**: https://recharts.org/en-US/
- **Versión Utilizada**: 2.15.0
- **Examples**: https://recharts.org/en-US/examples

#### QuickChart.js
- **Documentación**: https://quickchart.io/documentation/
- **Versión Utilizada**: 3.1.3
- **Uso en Proyecto**: Generación de gráficos en reportes PDF

---

### PWA y Service Workers

#### Web Push
- **Documentación**: https://github.com/web-push-libs/web-push
- **Versión Utilizada**: 3.6.7
- **Guía**: https://web.dev/push-notifications-overview/

#### Service Workers
- **Documentación MDN**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Uso en Proyecto**: `/servicios/public/service-worker.js`

---

### Autenticación y Seguridad

#### JSON Web Tokens (JWT)
- **Documentación**: https://github.com/auth0/node-jsonwebtoken
- **Versión Utilizada**: 9.0.2
- **jwt-decode**: https://github.com/auth0/jwt-decode (4.0.0)

#### Argon2
- **Documentación**: https://github.com/ranisalt/node-argon2
- **Versión Utilizada**: 0.44.0
- **Password Hashing**: Argon2id algorithm

#### Bcrypt
- **Documentación**: https://github.com/kelektiv/node.bcrypt.js
- **Versión Utilizada**: 6.0.0

---

### Reportes PDF

#### PDFKit
- **Documentación**: https://pdfkit.org/
- **Versión Utilizada**: 0.16.0
- **Guía**: https://pdfkit.org/docs/getting_started.html

#### Puppeteer
- **Documentación**: https://pptr.dev/
- **Versión Utilizada**: 24.26.1
- **API**: https://pptr.dev/api

---

### Utilidades

#### Axios
- **Documentación**: https://axios-http.com/docs/intro
- **Versión Utilizada**: 1.12.2

#### Joi (Validación)
- **Documentación**: https://joi.dev/api/
- **Versión Utilizada**: 17.13.3

#### Express Validator
- **Documentación**: https://express-validator.github.io/docs
- **Versión Utilizada**: 7.2.1

#### Node Cron
- **Documentación**: https://github.com/node-cron/node-cron
- **Versión Utilizada**: 4.2.1

#### Node Schedule
- **Documentación**: https://github.com/node-schedule/node-schedule
- **Versión Utilizada**: 2.1.1

#### Cron Parser
- **Documentación**: https://github.com/harrisiirak/cron-parser
- **Versión Utilizada**: 4.9.0

---

## Herramientas de Desarrollo

### Control de Versiones
- **Git**: https://git-scm.com/doc
- **GitHub**: https://docs.github.com/
- **Repositorio**: https://github.com/andresTNS/TNS_TRACK_DEMO

### Gestión de Paquetes
- **npm**: https://docs.npmjs.com/
- **Versión Mínima**: >= 9.x

### Build y Bundling
- **Webpack**: https://webpack.js.org/
- **Babel**: https://babeljs.io/docs/
- **PostCSS**: https://postcss.org/

### Linting y Formato
- **ESLint**: https://eslint.org/docs/latest/
- **Autoprefixer**: https://github.com/postcss/autoprefixer

---

## Tutoriales y Guías

### Tutoriales de Node.js + Express
- **Node.js Best Practices**: https://github.com/goldbergyoni/nodebestpractices
- **Express.js Tutorial**: https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs

### Tutoriales de React
- **React Tutorial**: https://react.dev/learn/tutorial-tic-tac-toe
- **React Hooks**: https://react.dev/reference/react/hooks
- **React Performance**: https://react.dev/learn/render-and-commit

### Tutoriales de TailwindCSS
- **TailwindCSS Tutorial**: https://tailwindcss.com/docs/installation
- **Tailwind UI Components**: https://tailwindui.com/components

### Tutoriales de MySQL
- **MySQL Tutorial**: https://dev.mysql.com/doc/mysql-tutorial-excerpt/8.0/en/
- **MySQL Performance**: https://dev.mysql.com/doc/refman/8.0/en/optimization.html

### PWA y Service Workers
- **PWA Guide**: https://web.dev/progressive-web-apps/
- **Service Workers**: https://web.dev/service-workers-intro/
- **Push Notifications**: https://web.dev/push-notifications-overview/

---

## 🔍 Búsqueda de Recursos

### Stack Overflow
- **Tag: node.js**: https://stackoverflow.com/questions/tagged/node.js
- **Tag: express**: https://stackoverflow.com/questions/tagged/express
- **Tag: react**: https://stackoverflow.com/questions/tagged/reactjs
- **Tag: mysql**: https://stackoverflow.com/questions/tagged/mysql

### GitHub
- **Buscar código similar**: https://github.com/search?type=code
- **Explorar repositorios**: https://github.com/explore

---

## 📚 Libros y Cursos Recomendados

### Node.js
- **"Node.js Design Patterns" - Mario Casciaro**: Patrones de diseño en Node.js
- **"Node.js Web Development" - David Herron**: Desarrollo web con Node.js

### React
- **"Learning React" - Alex Banks & Eve Porcello**: Introducción a React
- **"React Design Patterns and Best Practices" - Michele Bertoli**: Patrones de diseño

### MySQL
- **"High Performance MySQL" - Baron Schwartz**: Optimización de MySQL
- **"Learning MySQL" - Seyed Tahaghoghi**: Introducción a MySQL

---

## 🛠️ Herramientas Útiles

### Testing de APIs
- **Postman**: https://www.postman.com/
- **Insomnia**: https://insomnia.rest/
- **cURL**: https://curl.se/

### Gestión de Base de Datos
- **MySQL Workbench**: https://www.mysql.com/products/workbench/
- **DBeaver**: https://dbeaver.io/
- **phpMyAdmin**: https://www.phpmyadmin.net/

### Debugging
- **Chrome DevTools**: https://developer.chrome.com/docs/devtools/
- **Node.js Inspector**: https://nodejs.org/en/docs/inspector
- **React DevTools**: https://react.dev/learn/react-developer-tools

### Monitoreo
- **PM2**: https://pm2.keymetrics.io/ (Process Manager para Node.js)
- **New Relic**: https://newrelic.com/ (APM)
- **Sentry**: https://sentry.io/ (Error tracking)

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-01-26

---

## 📝 Notas

- Este documento se actualiza periódicamente con nuevos recursos útiles
- Si encuentras un recurso útil, agrégalo a este documento
- Verifica siempre las versiones de las librerías antes de actualizar
