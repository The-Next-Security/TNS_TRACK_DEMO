# API de Gestión de Usuarios - Documentación

## Resumen

Se ha refactorizado el sistema de gestión de usuarios separando claramente las operaciones de **crear**, **actualizar** y **cambiar contraseña** en endpoints distintos.

## Endpoints Disponibles

### 1. Crear Usuario Nuevo
**POST** `/api/usuarios/register`

**Requiere:**
- Autenticación (JWT token en cookies)
- Permiso `create_users`

**Body:**
```json
{
  "username": "juanperez",
  "password": "MyP@ssw0rd123!",
  "email": "juan.perez@example.com",
  "permissions": "view_dashboard,view_reports"
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "userId": 42
}
```

**Errores Posibles:**
- `400` - Campos faltantes o inválidos
- `400` - Username o email ya existen
- `400` - Contraseña no cumple requisitos de fortaleza
- `403` - Usuario no tiene permiso `create_users`
- `500` - Error del servidor

---

### 2. Actualizar Datos de Usuario
**PUT** `/api/usuarios/:userId`

**Requiere:**
- Autenticación (JWT token en cookies)
- Permiso `create_users`

**URL Params:**
- `userId` - ID del usuario a actualizar

**Body:**
```json
{
  "username": "juan.perez.updated",
  "email": "juan.perez.new@example.com",
  "permissions": "admin,view_dashboard,view_reports,manage_devices"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente"
}
```

**Errores Posibles:**
- `400` - Campos faltantes o inválidos
- `400` - Username o email ya están en uso por otro usuario
- `403` - Usuario no tiene permiso `create_users`
- `404` - Usuario no encontrado
- `500` - Error del servidor

**Nota:** Este endpoint **NO modifica la contraseña**. Para cambiar contraseña usar el endpoint específico.

---

### 3. Cambiar Contraseña
**PATCH** `/api/usuarios/:userId/password`

**Requiere:**
- Autenticación (JWT token en cookies)
- Permiso `create_users`

**URL Params:**
- `userId` - ID del usuario

**Body:**
```json
{
  "newPassword": "NewP@ssw0rd456!"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente"
}
```

**Errores Posibles:**
- `400` - Password faltante o inválido
- `400` - Contraseña no cumple requisitos de fortaleza
- `403` - Usuario no tiene permiso `create_users`
- `404` - Usuario no encontrado
- `500` - Error del servidor

**Importante:** Al cambiar la contraseña, se incrementa `tokenVersion`, lo que **invalida todas las sesiones activas** del usuario. El usuario deberá iniciar sesión nuevamente.

---

## Requisitos de Contraseña

Todas las contraseñas deben cumplir con:

- ✅ Mínimo 8 caracteres
- ✅ Al menos una letra minúscula (a-z)
- ✅ Al menos una letra mayúscula (A-Z)
- ✅ Al menos un número (0-9)
- ✅ Al menos un símbolo especial (@$!%*?&.)

**Ejemplos válidos:**
- `MyP@ssw0rd123`
- `Secure!Pass99`
- `Admin$2024Pass`

**Ejemplos inválidos:**
- `password` (sin mayúsculas, números, símbolos)
- `PASSWORD123` (sin minúsculas ni símbolos)
- `Pass123` (muy corto, sin símbolos)

---

## Permisos Válidos

Los siguientes permisos son válidos (se pueden combinar separados por comas):

- `admin` - Administrador con acceso completo
- `create_users` - Crear y gestionar usuarios
- `view_reports` - Ver reportes
- `manage_devices` - Gestionar dispositivos
- `view_dashboard` - Ver dashboard
- `manage_notifications` - Gestionar notificaciones
- `view_analytics` - Ver analíticas

**Ejemplo de combinación:**
```
"admin,create_users,view_reports,manage_devices"
```

---

## Validaciones de Seguridad Implementadas

### Sanitización de Entrada
- Todos los campos de texto son sanitizados (trim, toLowerCase para email)
- Validación de formato de email con regex
- Validación de longitud mínima de username (3 caracteres)

### Prevención de Duplicados
- Verifica que username no exista antes de crear
- Verifica que email no exista antes de crear
- En actualizaciones, permite mantener el mismo username/email del usuario

### Hashing de Contraseñas
- Usa **argon2id** (recomendado por OWASP)
- Configuración segura:
  - `memoryCost: 19456` (19 MiB)
  - `timeCost: 2`
  - `parallelism: 1`

### Control de Acceso
- Todos los endpoints requieren autenticación
- Solo usuarios con permiso `create_users` pueden gestionar otros usuarios
- Validación de permisos contra whitelist

### Invalidación de Sesiones
- Al cambiar contraseña, se incrementa `tokenVersion`
- Todas las sesiones anteriores quedan invalidadas automáticamente
- El usuario debe iniciar sesión nuevamente

### Logging
- Todas las operaciones son loggeadas con timestamp
- Logs incluyen usuario que realiza la acción y resultado
- Errores son loggeados con detalles completos

---

## Ejemplos de Uso con cURL

### Crear Usuario
```bash
curl -X POST http://localhost:3000/api/usuarios/register \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -d '{
    "username": "testuser",
    "password": "Test@Pass123",
    "email": "test@example.com",
    "permissions": "view_dashboard,view_reports"
  }'
```

### Actualizar Usuario
```bash
curl -X PUT http://localhost:3000/api/usuarios/42 \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -d '{
    "username": "testuser_updated",
    "email": "test.updated@example.com",
    "permissions": "admin,view_dashboard"
  }'
```

### Cambiar Contraseña
```bash
curl -X PATCH http://localhost:3000/api/usuarios/42/password \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN" \
  -d '{
    "newPassword": "NewSecure@Pass456"
  }'
```

---

## Cambios en la Arquitectura

### Antes (Problemático)
```javascript
// Un solo endpoint manejaba ambos casos
POST /api/usuarios/register
Body: { userId?, username, password?, email, permissions }

// Lógica condicional basada en presencia de userId
if (userId) {
  // Update (sin password)
} else {
  // Create (con password)
}
```

### Después (Clean Architecture)
```javascript
// Endpoints separados con responsabilidades claras
POST   /api/usuarios/register         // Solo crear
PUT    /api/usuarios/:userId          // Solo actualizar datos
PATCH  /api/usuarios/:userId/password // Solo cambiar password
```

**Beneficios:**
- ✅ Código más mantenible y testeable
- ✅ Endpoints con responsabilidad única
- ✅ Validaciones específicas por operación
- ✅ Mejor control de permisos y auditoría
- ✅ Logs más claros y específicos
- ✅ Facilita implementar rate limiting por endpoint

---

## Migración Frontend

Si tu frontend actualmente usa el endpoint `POST /api/usuarios/register` con `userId` para actualizar:

**Cambiar de:**
```javascript
// Actualización (OLD)
fetch('/api/usuarios/register', {
  method: 'POST',
  body: JSON.stringify({
    userId: 42,
    username: 'updated',
    email: 'new@email.com',
    permissions: 'admin'
  })
});
```

**A:**
```javascript
// Actualización (NEW)
fetch('/api/usuarios/42', {
  method: 'PUT',
  body: JSON.stringify({
    username: 'updated',
    email: 'new@email.com',
    permissions: 'admin'
  })
});

// Cambio de contraseña (NEW - endpoint separado)
fetch('/api/usuarios/42/password', {
  method: 'PATCH',
  body: JSON.stringify({
    newPassword: 'NewSecure@Pass123'
  })
});
```

---

## Testing Checklist

- [ ] Crear usuario con todos los campos válidos → 201
- [ ] Crear usuario sin password → 400
- [ ] Crear usuario con password débil → 400
- [ ] Crear usuario con username duplicado → 400
- [ ] Crear usuario con email duplicado → 400
- [ ] Crear usuario sin permiso `create_users` → 403
- [ ] Actualizar usuario existente → 200
- [ ] Actualizar usuario inexistente → 404
- [ ] Actualizar a username ya en uso → 400
- [ ] Actualizar a email ya en uso → 400
- [ ] Cambiar contraseña válida → 200
- [ ] Cambiar contraseña débil → 400
- [ ] Cambiar contraseña de usuario inexistente → 404
- [ ] Verificar que tokenVersion se incrementa al cambiar password
- [ ] Verificar que sesiones anteriores se invalidan tras cambio de password
- [ ] Verificar logging de todas las operaciones

---

## Archivos Modificados

1. **`servicios/src/controllers/usuariosController.js`**
   - Refactorizado `registerUser()` - Solo crear usuarios
   - Nuevo `updateUser()` - Actualizar datos sin password
   - Nuevo `changePassword()` - Cambiar password con invalidación de sesiones

2. **`servicios/src/routes/usuariosRoutes.js`**
   - Agregado `PUT /:userId` → `updateUser`
   - Agregado `PATCH /:userId/password` → `changePassword`

3. **`servicios/src/utils/passwordValidator.js`**
   - Ya existente, cumple con todos los requisitos especificados

---

## Soporte

Para consultas o issues, referirse al equipo de desarrollo backend.
