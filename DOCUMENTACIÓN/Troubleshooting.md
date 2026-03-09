# Troubleshooting - Guía de Resolución de Problemas

**The Next Security - TNS Track Demo**

> **Última actualización**: 2026-01-26
> **Versión**: 2.0.0
> **Propósito**: Soluciones a problemas comunes del sistema

---

## 📋 Índice

### Problemas de Instalación
- [Dependencias faltantes (npm install)](#-problema-module-not-found-durante-build)
- [Errores de compilación nativa (gyp)](#-error-gyp-err-build-error)
- [Permisos denegados (EACCES)](#-error-eacces-permission-denied)

### Problemas de Desarrollo
- [Puerto en uso (1337, 3000)](#problemas-de-puerto-y-servidor)
- [Webpack no arranca](#-problema-webpack-dev-server-no-arranca)
- [Out of memory durante build](#-problema-out-of-memory-durante-build)
- [Configuración no se carga](#-problema-configuración-no-se-carga)

### Problemas de Producción
- [Rendimiento lento](#diagnóstico-general)
- [Conexión BD perdida](#-problema-cannot-connect-to-database)
- [Tokens expiran rápido](#-problema-session-expires-too-quickly)
- [Reportes PDF fallan](#-problema-pdf-generation-fails)

### Problemas de Base de Datos
- [Cannot connect to database](#-problema-cannot-connect-to-database)
- [Access denied for user](#-problema-access-denied-for-user)
- [Table doesn't exist](#-problema-table-doesnt-exist)

### Problemas de APIs Externas
- [Shelly API key invalid](#-problema-api-key-invalid-shelly)
- [Ubibot API key invalid](#-problema-api-key-invalid-ubibot)
- [SendGrid email not sending](#-problema-sendgrid-email-not-sending)

### Problemas de Autenticación
- [Invalid token / Token expired](#-problema-invalid-token--token-expired)
- [Session expires too quickly](#-problema-session-expires-too-quickly)

### Otros Problemas Comunes
- [Push Notifications](#problemas-de-push-notifications)
- [Errores de Node.js](#errores-comunes-de-nodejs)
- [Diagnóstico General](#diagnóstico-general)

---

## Problemas de Instalación

### ❌ Problema: "Module not found" durante build

**Síntomas**:
- Error: `Module not found: Error: Can't resolve 'module-name'`

**Solución**:

```bash
# Instalar dependencia faltante
npm install module-name

# O si es devDependency
npm install module-name --save-dev

# Verificar package.json para asegurar que esté listada
```

---

### ❌ Error: "gyp ERR! build error"

**Síntomas**:
- Error al instalar dependencias nativas (bcrypt, argon2, etc.)

**Solución**:

**Linux**:
```bash
sudo apt-get install build-essential python3
```

**Mac**:
```bash
xcode-select --install
```

**Windows**:
```bash
npm install --global windows-build-tools
```

---

### ❌ Error: "EACCES: permission denied"

**Solución**:
```bash
# NO usar sudo para instalar paquetes
# En su lugar, configurar npm para usar directorio local:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile
```

---

### ❌ Error: "Cannot find module"

**Solución**:
```bash
npm install
# o específicamente:
npm install nombre-del-modulo
```

---

## Problemas de Desarrollo

### ❌ Problema: "Webpack dev server no arranca"

**Síntomas**:
- Error: `Cannot find module 'webpack'`
- Error: `Compilation failed`

**Solución**:

1. **Limpiar node_modules y reinstalar**:
```bash
cd servicios
rm -rf node_modules package-lock.json
npm install
```

2. **Verificar versiones de Node y npm**:
```bash
node --version  # Debe ser >= 18.x
npm --version   # Debe ser >= 9.x
```

3. **Limpiar caché de npm**:
```bash
npm cache clean --force
```

4. **Reinstalar específicamente webpack**:
```bash
npm install webpack webpack-cli webpack-dev-server --save-dev
```

---

### ❌ Problema: "Out of memory" durante build

**Síntomas**:
- Error: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`

**Solución**:

```bash
# Incrementar límite de memoria de Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# O editar script en package.json:
{
  "scripts": {
    "build": "node --max-old-space-size=4096 node_modules/.bin/webpack"
  }
}
```

---

### ❌ Problema: "Configuración no se carga"

**Síntomas**:
- Sistema usa valores por defecto
- Cambios en configuración no se reflejan

**Solución**:

**Si estás en migración a BD**:
1. Verificar que `configLoader_Config.js` esté leyendo de BD
2. Verificar conexión a BD funcionando
3. Verificar tabla de configuración existe

**Si usas unified-config.json (LEGACY)**:
```bash
# Verificar sintaxis JSON válida
cat servicios/src/config/jsons/unified-config.json | python -m json.tool

# Verificar permisos de lectura
chmod 644 servicios/src/config/jsons/unified-config.json

# Reiniciar servidor después de cambios
npm run start-server
```

---

## Problemas de Producción

### 🔍 Checklist de Diagnóstico

Cuando encuentres un error en producción, sigue estos pasos:

1. **Ver logs del servidor**:
```bash
# Logs de Node.js (servidor backend)
npm run start-server
# Ver console completo

# Logs de Webpack Dev Server
npm start
```

2. **Ver logs del navegador**:
- Abrir DevTools (F12)
- Tab Console
- Tab Network (para errores de API)

3. **Verificar estado de servicios**:
```bash
# MySQL
sudo systemctl status mysql

# Node.js procesos
ps aux | grep node

# Puertos en uso
lsof -i :1337
lsof -i :3000
```

4. **Verificar conexión a APIs externas**:
```bash
# Test de conectividad
ping api.shelly.cloud
ping api.ubibot.com
```

---

## Problemas de Base de Datos

### ❌ Problema: "Cannot connect to database"

**Síntomas**:
- Error al iniciar servidor: `ECONNREFUSED 127.0.0.1:3306`
- Logs: `Error connecting to database: connect ECONNREFUSED`

**Solución**:

1. **Verificar que MySQL esté corriendo**:
```bash
# En Linux/Mac
sudo systemctl status mysql
# o
sudo service mysql status

# Iniciar MySQL si está detenido
sudo systemctl start mysql
# o
sudo service mysql start
```

2. **Verificar credenciales en configuración**:
```bash
# Si aún usas unified-config.json (LEGACY)
cat servicios/src/config/jsons/unified-config.json

# Verificar:
# - usuario correcto
# - password correcto
# - host correcto (usualmente "localhost")
```

3. **Verificar que base de datos `tns_cool_track` existe**:
```bash
mysql -u root -p
```
```sql
SHOW DATABASES;
-- Si no existe:
CREATE DATABASE tns_cool_track;
```

4. **Verificar permisos del usuario**:
```sql
SHOW GRANTS FOR 'tu_usuario'@'localhost';
-- Otorgar permisos si es necesario:
GRANT ALL PRIVILEGES ON tns_cool_track.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

---

### ❌ Problema: "Access denied for user"

**Síntomas**:
- Error: `Access denied for user 'username'@'localhost' (using password: YES)`

**Solución**:

```sql
-- Conectar como root
mysql -u root -p

-- Crear usuario si no existe
CREATE USER 'tu_usuario'@'localhost' IDENTIFIED BY 'tu_password';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON tns_cool_track.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

---

### ❌ Problema: "Table doesn't exist"

**Síntomas**:
- Error: `Table 'tns_cool_track.devices' doesn't exist`

**Solución**:

```bash
# Ejecutar scripts de creación de tablas
cd TNS_TRACK_DEMO
mysql -u root -p tns_cool_track < SQL_FILES/01_creacion_desde_cero/01_tablas_base.sql
mysql -u root -p tns_cool_track < SQL_FILES/01_creacion_desde_cero/02_stored_procedures.sql
mysql -u root -p tns_cool_track < SQL_FILES/01_creacion_desde_cero/03_triggers.sql
```

---

## Problemas de APIs Externas

### ❌ Problema: "API key invalid" (Shelly)

**Síntomas**:
- Error: `Shelly API returned 401 Unauthorized`
- Logs: `Invalid API key for Shelly`

**Solución**:

1. **Verificar API key en configuración**:
```javascript
// unified-config.json (LEGACY) o base de datos
{
  "shelly": {
    "apiKey": "TU_API_KEY_AQUÍ"
  }
}
```

2. **Verificar formato de la key**:
- NO debe tener espacios al inicio o final
- Debe ser la key correcta de Shelly Cloud
- Verificar en: https://control.shelly.cloud/

3. **Verificar permisos de la key**:
- La key debe tener permisos de lectura de dispositivos
- Renovar key si es necesario en Shelly Cloud

4. **Test manual**:
```bash
curl -X GET "https://shelly-api.cloud/api/devices" \
  -H "Authorization: Bearer TU_API_KEY"
```

---

### ❌ Problema: "API key invalid" (Ubibot)

**Síntomas**:
- Error: `Ubibot API returned 401 Unauthorized`
- Logs: `Invalid API key for Ubibot`

**Solución**:

1. **Verificar credenciales**:
```javascript
// Ubibot requiere AMBOS:
{
  "ubibot": {
    "apiKey": "TU_ACCOUNT_KEY",
    "token": "TU_TOKEN_ID"
  }
}
```

2. **Obtener credenciales correctas**:
- Login en: https://www.ubibot.com/
- Account → Settings → API
- Copiar **Account Key** y **Token ID**

3. **Test manual**:
```bash
curl -X GET "https://api.ubibot.com/channels" \
  -H "account_key: TU_ACCOUNT_KEY" \
  -H "token_id: TU_TOKEN_ID"
```

---

### ❌ Problema: "SendGrid email not sending"

**Síntomas**:
- Emails no llegan
- Error: `SendGrid API error`

**Solución**:

1. **Verificar API key de SendGrid**:
```javascript
{
  "sendgrid": {
    "apiKey": "SG.xxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

2. **Verificar sender verificado**:
- SendGrid requiere **sender verification**
- Verificar en: https://app.sendgrid.com/settings/sender_auth

3. **Verificar logs de SendGrid**:
- https://app.sendgrid.com/email_activity

4. **Test manual**:
```bash
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@tns.cl"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

---

### ❌ Problema: "Port 1337 already in use"

**Síntomas**:
- Error al iniciar servidor: `EADDRINUSE: address already in use :::1337`

**Solución**:

**Opción 1: Matar proceso existente**
```bash
# Linux/Mac - Encontrar proceso
lsof -i :1337

# Matar proceso (reemplazar <PID> con el número que muestra lsof)
kill -9 <PID>

# Windows - Encontrar proceso
netstat -ano | findstr :1337

# Matar proceso (reemplazar <PID>)
taskkill /PID <PID> /F
```

**Opción 2: Cambiar puerto en configuración**
```javascript
// unified-config.json o base de datos
{
  "server": {
    "port": 1338  // Cambiar a otro puerto
  }
}
```

---

### ❌ Problema: "Port 3000 already in use" (Webpack Dev Server)

**Síntomas**:
- Error al iniciar webpack: `Port 3000 is already in use`

**Solución**:

```bash
# Encontrar y matar proceso
lsof -i :3000
kill -9 <PID>

# O cambiar puerto en webpack.config.js
# devServer.port = 3001
```

---

## Problemas de Autenticación

### ❌ Problema: "Invalid token" / "Token expired"

**Síntomas**:
- Error 401 en API calls
- Usuario expulsado de sesión
- Error: `jwt expired`

**Solución**:

1. **Re-login del usuario**:
- Cerrar sesión completamente
- Volver a iniciar sesión

2. **Verificar configuración de tokens**:
```javascript
// tokenService.js
ACCESS_TTL_SECONDS: 3600,  // 1 hora (ajustar si es necesario)
REFRESH_TTL_SECONDS: 604800  // 7 días
```

3. **Limpiar cookies manualmente**:
```javascript
// En DevTools Console
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

4. **Verificar sincronización de reloj del servidor**:
```bash
# Linux - Verificar hora del sistema
date

# Sincronizar si es necesario
sudo ntpdate pool.ntp.org
```

---

### ❌ Problema: "Session expires too quickly"

**Síntomas**:
- Usuario debe re-loguearse muy frecuentemente
- Sesión expira en minutos en lugar de horas

**Solución**:

```javascript
// Incrementar TTL de tokens en tokenService.js
const ACCESS_TTL_SECONDS = 7200;  // 2 horas
const REFRESH_TTL_SECONDS = 1209600;  // 14 días
```

---

## Problemas de Puerto y Servidor

## Problemas de Push Notifications

### ❌ Problema: "Push notifications no funcionan"

**Síntomas**:
- Usuario no recibe notificaciones push
- Error: `Push subscription failed`

**Solución**:

1. **Verificar HTTPS (producción)**:
- Push notifications requieren HTTPS en producción
- Solo funciona en localhost sin HTTPS

2. **Verificar permisos del navegador**:
```javascript
// DevTools Console
Notification.permission
// Debe retornar "granted"

// Si es "denied", usuario debe resetear permisos manualmente en configuración del navegador
```

3. **Verificar Service Worker registrado**:
```javascript
// DevTools Console
navigator.serviceWorker.getRegistrations()
  .then(registrations => console.log(registrations));
```

4. **Verificar VAPID keys configuradas**:
```javascript
// Configuración de web-push
{
  "webPush": {
    "publicKey": "...",
    "privateKey": "..."
  }
}
```

---

## Problemas de Reportes PDF

### ❌ Problema: "PDF generation fails"

**Síntomas**:
- Error al generar reporte
- PDF vacío o corrupto

**Solución**:

1. **Verificar Puppeteer instalado correctamente**:
```bash
npm install puppeteer
# o si hay problemas con Chromium:
npm install puppeteer --unsafe-perm=true --allow-root
```

2. **Instalar dependencias de Chromium (Linux)**:
```bash
# Ubuntu/Debian
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils
```

3. **Verificar permisos de escritura**:
```bash
# Directorio de reportes debe tener permisos de escritura
chmod -R 755 servicios/public/reports/
```

4. **Test manual de PDFKit**:
```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs');
const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));
doc.text('Hello World');
doc.end();
```

---

## Diagnóstico General

### 🛠️ Herramientas Útiles

#### Logs y Debugging
```bash
# Ver logs en tiempo real
tail -f /var/log/mysql/error.log  # MySQL
journalctl -u mysql -f            # MySQL (systemd)
```

#### Testing de Endpoints
```bash
# Test endpoint local
curl http://localhost:1337/api/auth/validate

# Test con autenticación
curl -X POST http://localhost:1337/api/auth/refresh \
  -H "Cookie: refresh=TU_REFRESH_TOKEN"
```

#### Debugging de JavaScript
```javascript
// En código Node.js
console.log('DEBUG:', variable);
console.trace('Stack trace aquí');

// En React (DevTools)
console.log('Component rendered:', props);
```

---

## 🚨 Problemas Críticos

### Si NADA funciona:

1. **Reset completo**:
```bash
cd servicios

# Detener todos los procesos
killall node

# Limpiar todo
rm -rf node_modules package-lock.json dist/

# Reinstalar desde cero
npm install

# Rebuild
npm run clean && npm run install-deps && npm run build

# Iniciar
npm run start-all
```

2. **Verificar integridad de base de datos**:
```sql
-- Conectar a MySQL
mysql -u root -p tns_cool_track

-- Verificar tablas
SHOW TABLES;

-- Verificar datos críticos
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM devices;
```

3. **Crear issue en GitHub**:
- Si el problema persiste, crear issue con:
  - Descripción del problema
  - Pasos para reproducir
  - Logs completos (servidor + navegador)
  - Versiones de Node.js, npm, MySQL

---

## 📞 Contacto

**Para problemas no resueltos**, contactar a:
- **andresTNS** - Jefe de Desarrolladores
- **GitHub Issues**: https://github.com/andresTNS/TNS_TRACK_DEMO/issues

---

**Mantenido por**: andresTNS (Jefe de Desarrolladores), Bufigol (Developer)
**Última revisión**: 2026-01-26
