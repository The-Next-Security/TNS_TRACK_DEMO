// src/controllers/usuariosController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const config = require("../config/js_files/configLoader_Config");
const databaseService = require("../../src/services/database-service");
const emailService = require("../services/email/emailService");
const { AuthenticationError } = require("../utils/errors");
const jwtConfig = require("../config/js_files/jwt-config");
const { validatePassword, formatPasswordErrors } = require("../utils/passwordValidator");

class usuariosController {
  /**
   * Configura SendGrid. Llamar desde boot() tras configLoader.initialize().
   */
  init() {
    const sendgridKey = config.getValue('email.sendgrid_api_key');
    if (!sendgridKey) {
      throw new Error('⚠️ SendGrid API Key no configurada en unified-config.json');
    }
    sgMail.setApiKey(sendgridKey);
  }
  async handleLogin(req, res, next) {
    const { email, password } = req.body;
    console.log(`[Login] Intento de login para email: ${email}`);

    try {
      // 1) Buscar usuario en gen_usuario por email, con permisos via JOIN
      const [user] = await databaseService.pool.query(
        `SELECT g.id_usuario, g.email, g.password, g.token_version,
          GROUP_CONCAT(DISTINCT p.nombre ORDER BY p.nombre SEPARATOR ',') as permissions,
          MAX(CASE WHEN p.nombre = 'ai_analysis' THEN 1 ELSE 0 END) as ai_analysis
        FROM gen_usuario g
        LEFT JOIN gen_usuario_permisos up ON g.id_usuario = up.id_usuario AND up.activo = 1
        LEFT JOIN gen_permiso p ON up.id_permiso = p.id_permiso AND p.activo = 1
        WHERE g.email = ? AND g.activo = 1
        GROUP BY g.id_usuario`,
        [email]
      );

      let localUser = user && user[0] ? user[0] : null;
      let validPassword = false;

      if (!localUser) {
        console.log(`[Login] ❌ Usuario no encontrado para email: ${email}`);
      } else {
        console.log(`[Login] ✅ Usuario encontrado: ${localUser.email} (ID: ${localUser.id_usuario})`);
      }

      if (localUser) {
        const storedHash = localUser.password || "";
        if (storedHash.startsWith("$2")) {
          validPassword = await bcrypt.compare(password, storedHash);
        } else if (storedHash.startsWith("$argon2")) {
          validPassword = await argon2.verify(storedHash, password);
        } else {
          validPassword = false;
        }
        console.log(`[Login] Validación de contraseña: ${validPassword ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
      }

      // 2) Si no existe usuario local o password inválida, devolver error
      if (!localUser || !validPassword) {
        console.log(`[Login] ❌ Login fallido para: ${email}`);
        return next(new AuthenticationError("Invalid credentials"));
      }
      // Rehash oportunista si era bcrypt
      if (localUser.password && localUser.password.startsWith("$2")) {
        try {
          const newHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
          await databaseService.pool.query(
            "UPDATE gen_usuario SET password = ? WHERE id_usuario = ?",
            [newHash, localUser.id_usuario]
          );
        } catch (_) { /* best-effort */ }
      }

      const tokenService = require("../services/tokenService");
      const authMiddleware = require("../middlewares/authMiddleware");
      const payload = {
        userId: localUser.id_usuario,
        permissions: localUser.permissions,
        username: localUser.email,
        email: localUser.email,
        tokenVersion: localUser.token_version || 0,
        ai_analysis: localUser.ai_analysis || false,
      };
      const access = tokenService.signAccess(payload);
      const refresh = tokenService.signRefresh(payload);
      authMiddleware.setAuthCookies(req, res, access, refresh);

      console.log(`[Login] Login exitoso para: ${localUser.email} (ID: ${localUser.id_usuario})`);

      res.json({
        user: {
          id: localUser.id_usuario,
          username: localUser.email,
          email: localUser.email,
          permissions: localUser.permissions,
          ai_analysis: localUser.ai_analysis || false,
        },
        // ✅ Tokens eliminados - ya están en cookies httpOnly
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req, res) {
    try {
      const [users] = await databaseService.pool.query(
        `SELECT g.id_usuario as id, g.email, g.email as username,
          GROUP_CONCAT(DISTINCT p.nombre ORDER BY p.nombre SEPARATOR ',') as permissions,
          MAX(CASE WHEN p.nombre = 'ai_analysis' THEN 1 ELSE 0 END) as ai_analysis
        FROM gen_usuario g
        LEFT JOIN gen_usuario_permisos up ON g.id_usuario = up.id_usuario AND up.activo = 1
        LEFT JOIN gen_permiso p ON up.id_permiso = p.id_permiso AND p.activo = 1
        WHERE g.activo = 1
        GROUP BY g.id_usuario`
      );
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).send("Server Error");
    }
  }

  /**
   * Crear nuevo usuario en el sistema
   * @route POST /api/usuarios/register
   * @requires Autenticación y permiso 'create_users'
   * @body {string} username - Nombre de usuario único
   * @body {string} password - Contraseña (debe cumplir requisitos de fortaleza)
   * @body {string} email - Email del usuario
   * @body {string} permissions - Permisos separados por comas
   */
  async registerUser(req, res) {
    const { username, password, email, permissions, ai_analysis } = req.body;

    console.log(`[RegisterUser] Intento de crear usuario: ${username}`);

    try {
      // ✅ Verificar que el usuario autenticado tenga permiso para crear usuarios
      const userPermissions = req.user?.permissions || '';
      
      // Manejar permisos como string (comma-separated) o array
      let hasPermission = false;
      if (typeof userPermissions === 'string') {
        hasPermission = userPermissions.includes('create_users');
      } else if (Array.isArray(userPermissions)) {
        hasPermission = userPermissions.includes('create_users');
      }
      
      if (!hasPermission) {
        console.log(`[RegisterUser] ❌ Usuario sin permisos: ${req.user?.username}`);
        console.log(`[RegisterUser] ❌ Permisos recibidos:`, userPermissions);
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para crear usuarios'
        });
      }

      // ✅ Validar que todos los campos requeridos estén presentes
      if (!username || !password || !email || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos (username, password, email, permissions)'
        });
      }

      // ✅ Sanitizar y validar entrada
      const sanitizedUsername = username.trim();
      const sanitizedEmail = email.trim().toLowerCase();

      if (sanitizedUsername.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario debe tener al menos 3 caracteres'
        });
      }

      // ✅ Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'El formato del email no es válido'
        });
      }

      // ✅ Validar fortaleza de la contraseña
      const validation = validatePassword(password);
      if (!validation.isValid) {
        console.log(`[RegisterUser] ❌ Contraseña débil para: ${sanitizedUsername}`);
        return res.status(400).json({
          success: false,
          error: 'Contraseña inválida',
          details: validation.errors
        });
      }

      // ✅ Validar que el array de permisos sea válido
      const validPermissions = [
        'create_users',
        'view_dashboard',
        'view_configuration',
        'view_interior',
        'search_interior',
        'view_presence',
        'view_exterior',
        'search_exterior',
        'view_blind_spot_intrusions',
        'view_door_status',
        'view_temperature',
        'view_temperature_camaras',
        'view_temperature_dashboard',
        'view_temp_params',
        'view_defrost_analysis',
        'view_temperature_reports',
        'view_data_intelligence',
        'view_temperature_data_intelligence',
        'view_sms',
        'view_alerts',
        'manage_alerts',
        'config_notifications'
      ];
      const requestedPermissions = permissions.split(',').map(p => p.trim()).filter(p => p); // Filtrar vacíos
      const invalidPermissions = requestedPermissions.filter(p => !validPermissions.includes(p));

      if (invalidPermissions.length > 0) {
        console.log(`[UpdateUser] ⚠️ Permisos inválidos detectados:`, invalidPermissions);
        return res.status(400).json({
          success: false,
          error: 'Permisos inválidos detectados',
          details: invalidPermissions
        });
      }

      // ✅ Verificar si el email ya existe (email actúa como username)
      const [existingEmail] = await databaseService.pool.query(
        "SELECT id_usuario FROM gen_usuario WHERE email = ?",
        [sanitizedEmail]
      );

      if (existingEmail.length > 0) {
        console.log(`[RegisterUser] ❌ Email ya existe: ${sanitizedEmail}`);
        return res.status(400).json({
          success: false,
          error: 'El email ya está registrado'
        });
      }

      // ✅ Hash de contraseña con argon2id (OWASP recomienda argon2id)
      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1
      });

      // ✅ Insertar usuario en gen_usuario (nombre usa sanitizedUsername de forma temporal)
      const [result] = await databaseService.pool.query(
        "INSERT INTO gen_usuario (nombre, apellido, password, email) VALUES (?, ?, ?, ?)",
        [sanitizedUsername, '', hashedPassword, sanitizedEmail]
      );

      const newUserId = result.insertId;

      // ✅ Combinar permisos: lista recibida + ai_analysis si aplica
      const permissionNames = [...requestedPermissions];
      const aiAnalysisIncluded = ai_analysis === true || ai_analysis === 1 || ai_analysis === 'true';
      if (aiAnalysisIncluded && !permissionNames.includes('ai_analysis')) {
        permissionNames.push('ai_analysis');
      }

      // ✅ Insertar permisos en gen_usuario_permisos
      if (permissionNames.length > 0) {
        await databaseService.pool.query(
          `INSERT INTO gen_usuario_permisos (id_usuario, id_permiso, activo)
           SELECT ?, id_permiso, 1 FROM gen_permiso
           WHERE nombre IN (?) AND activo = 1`,
          [newUserId, permissionNames]
        );
      }

      console.log(`[RegisterUser] ✅ Usuario creado exitosamente: ${sanitizedUsername} (ID: ${newUserId})`);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        userId: newUserId
      });

    } catch (error) {
      console.error(`[RegisterUser] ❌ Error al crear usuario:`, error);
      res.status(500).json({
        success: false,
        error: 'Error del servidor al crear el usuario'
      });
    }
  }

  /**
   * Actualizar datos de un usuario existente (username, email, permissions)
   * @route PUT /api/usuarios/:userId
   * @requires Autenticación y permiso 'create_users'
   * @param {number} userId - ID del usuario a actualizar
   * @body {string} username - Nuevo nombre de usuario
   * @body {string} email - Nuevo email
   * @body {string} permissions - Nuevos permisos separados por comas
   */
  async updateUser(req, res) {
    const { userId } = req.params;
    const { username, email, permissions, ai_analysis } = req.body;

    console.log('=== [UpdateUser] REQUEST RECEIVED ===');
    console.log(`[UpdateUser] userId param:`, userId);
    console.log(`[UpdateUser] username:`, username);
    console.log(`[UpdateUser] email:`, email);
    console.log(`[UpdateUser] permissions:`, permissions);
    console.log(`[UpdateUser] ai_analysis recibido en body:`, ai_analysis, `(tipo: ${typeof ai_analysis})`);
    console.log(`[UpdateUser] req.body completo:`, JSON.stringify(req.body, null, 2));
    console.log(`[UpdateUser] req.user:`, req.user);
    console.log('======================================');

    try {
      // ✅ Verificar que el usuario autenticado tenga permiso para modificar usuarios
      const userPermissions = req.user?.permissions || '';
      
      // Debug: Log para ver qué está recibiendo
      console.log(`[UpdateUser] 🔍 req.user:`, JSON.stringify(req.user, null, 2));
      console.log(`[UpdateUser] 🔍 userPermissions type:`, typeof userPermissions);
      console.log(`[UpdateUser] 🔍 userPermissions value:`, userPermissions);
      
      // Manejar permisos como string (comma-separated) o array
      let hasPermission = false;
      if (typeof userPermissions === 'string') {
        hasPermission = userPermissions.includes('create_users');
      } else if (Array.isArray(userPermissions)) {
        hasPermission = userPermissions.includes('create_users');
      }
      
      if (!hasPermission) {
        console.log(`[UpdateUser] ❌ Usuario sin permisos: ${req.user?.username}`);
        console.log(`[UpdateUser] ❌ Permisos recibidos:`, userPermissions);
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para modificar usuarios'
        });
      }

      // ✅ Validar que todos los campos requeridos estén presentes
      if (!username || !email || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos (username, email, permissions)'
        });
      }

      // ✅ Sanitizar entrada
      const sanitizedUsername = username.trim();
      const sanitizedEmail = email.trim().toLowerCase();

      if (sanitizedUsername.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario debe tener al menos 3 caracteres'
        });
      }

      // ✅ Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'El formato del email no es válido'
        });
      }

      // ✅ Validar que el array de permisos sea válido
      const validPermissions = [
        'create_users',
        'view_dashboard',
        'view_configuration',
        'view_interior',
        'search_interior',
        'view_presence',
        'view_exterior',
        'search_exterior',
        'view_blind_spot_intrusions',
        'view_door_status',
        'view_temperature',
        'view_temperature_camaras',
        'view_temperature_dashboard',
        'view_temp_params',
        'view_defrost_analysis',
        'view_temperature_reports',
        'view_data_intelligence',
        'view_temperature_data_intelligence',
        'view_sms',
        'view_alerts',
        'manage_alerts',
        'config_notifications'
      ];
      const requestedPermissions = permissions.split(',').map(p => p.trim()).filter(p => p); // Filtrar vacíos
      const invalidPermissions = requestedPermissions.filter(p => !validPermissions.includes(p));

      if (invalidPermissions.length > 0) {
        console.log(`[UpdateUser] ⚠️ Permisos inválidos detectados:`, invalidPermissions);
        return res.status(400).json({
          success: false,
          error: 'Permisos inválidos detectados',
          details: invalidPermissions
        });
      }

      // ✅ Verificar que el usuario a actualizar exista
      const [existingUser] = await databaseService.pool.query(
        "SELECT id_usuario, email FROM gen_usuario WHERE id_usuario = ?",
        [userId]
      );

      if (existingUser.length === 0) {
        console.log(`[UpdateUser] ❌ Usuario no encontrado con ID: ${userId}`);
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // ✅ Verificar si el nuevo email ya existe (excepto si es el mismo usuario)
      // email actúa como username, no hay campo username separado
      const [emailConflict] = await databaseService.pool.query(
        "SELECT id_usuario FROM gen_usuario WHERE email = ? AND id_usuario != ?",
        [sanitizedEmail, parseInt(userId, 10)]
      );

      console.log(`[UpdateUser] 🔍 Verificando email conflict:`, {
        email: sanitizedEmail,
        userId: userId,
        userIdInt: parseInt(userId, 10),
        conflictsFound: emailConflict.length,
        conflictIds: emailConflict.map(u => u.id_usuario)
      });

      if (emailConflict.length > 0) {
        console.log(`[UpdateUser] ❌ Email ya existe: ${sanitizedEmail}`);
        return res.status(400).json({
          success: false,
          error: 'El email ya está registrado por otro usuario'
        });
      }

      // ✅ Actualizar email en gen_usuario (nombre/apellido no se modifica en este endpoint)
      const [updateResult] = await databaseService.pool.query(
        "UPDATE gen_usuario SET email = ? WHERE id_usuario = ?",
        [sanitizedEmail, parseInt(userId, 10)]
      );

      console.log(`[UpdateUser] 🔍 Rows affected:`, updateResult.affectedRows);

      // ✅ Actualizar permisos: eliminar los actuales e insertar los nuevos
      const permissionNames = [...requestedPermissions];
      const aiAnalysisIncluded = ai_analysis === true || ai_analysis === 1 || ai_analysis === 'true';
      if (aiAnalysisIncluded && !permissionNames.includes('ai_analysis')) {
        permissionNames.push('ai_analysis');
      }

      await databaseService.pool.query(
        "DELETE FROM gen_usuario_permisos WHERE id_usuario = ?",
        [parseInt(userId, 10)]
      );

      if (permissionNames.length > 0) {
        await databaseService.pool.query(
          `INSERT INTO gen_usuario_permisos (id_usuario, id_permiso, activo)
           SELECT ?, id_permiso, 1 FROM gen_permiso
           WHERE nombre IN (?) AND activo = 1`,
          [parseInt(userId, 10), permissionNames]
        );
      }

      console.log(`[UpdateUser] ✅ Usuario actualizado exitosamente: ${sanitizedEmail} (ID: ${userId})`);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente'
      });

    } catch (error) {
      console.error(`[UpdateUser] ❌ Error al actualizar usuario:`, error);
      res.status(500).json({
        success: false,
        error: 'Error del servidor al actualizar el usuario'
      });
    }
  }

  /**
   * Cambiar contraseña de un usuario
   * @route PATCH /api/usuarios/:userId/password
   * @requires Autenticación y permiso 'create_users'
   * @param {number} userId - ID del usuario
   * @body {string} newPassword - Nueva contraseña (debe cumplir requisitos de fortaleza)
   */
  async changePassword(req, res) {
    const { userId } = req.params;
    const { newPassword } = req.body;

    console.log(`[ChangePassword] Intento de cambiar contraseña para usuario ID: ${userId}`);

    try {
      // ✅ Verificar que el usuario autenticado tenga permiso para modificar usuarios
      const userPermissions = req.user?.permissions || '';
      
      // Manejar permisos como string (comma-separated) o array
      let hasPermission = false;
      if (typeof userPermissions === 'string') {
        hasPermission = userPermissions.includes('create_users');
      } else if (Array.isArray(userPermissions)) {
        hasPermission = userPermissions.includes('create_users');
      }
      
      if (!hasPermission) {
        console.log(`[ChangePassword] ❌ Usuario sin permisos: ${req.user?.username}`);
        console.log(`[ChangePassword] ❌ Permisos recibidos:`, userPermissions);
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para cambiar contraseñas de usuarios'
        });
      }

      // ✅ Validar que la nueva contraseña esté presente
      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: 'La nueva contraseña es requerida'
        });
      }

      // ✅ Validar fortaleza de la contraseña
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        console.log(`[ChangePassword] ❌ Contraseña débil para usuario ID: ${userId}`);
        return res.status(400).json({
          success: false,
          error: 'Contraseña inválida',
          details: validation.errors
        });
      }

      // ✅ Verificar que el usuario exista
      const [existingUser] = await databaseService.pool.query(
        "SELECT id_usuario, email, token_version FROM gen_usuario WHERE id_usuario = ? AND activo = 1",
        [userId]
      );

      if (existingUser.length === 0) {
        console.log(`[ChangePassword] ❌ Usuario no encontrado con ID: ${userId}`);
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      const user = existingUser[0];
      const currentTokenVersion = user.token_version || 0;

      // ✅ Hash de contraseña con argon2id
      const hashedPassword = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1
      });

      // ✅ Actualizar contraseña E incrementar token_version para invalidar sesiones anteriores
      await databaseService.pool.query(
        "UPDATE gen_usuario SET password = ?, token_version = ? WHERE id_usuario = ?",
        [hashedPassword, currentTokenVersion + 1, userId]
      );

      console.log(`[ChangePassword] ✅ Contraseña actualizada exitosamente para usuario: ${user.email} (ID: ${userId})`);
      console.log(`[ChangePassword] 🔒 TokenVersion incrementado de ${currentTokenVersion} a ${currentTokenVersion + 1}`);

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error(`[ChangePassword] ❌ Error al cambiar contraseña:`, error);
      res.status(500).json({
        success: false,
        error: 'Error del servidor al cambiar la contraseña'
      });
    }
  }

  // Línea 168-192 en usuariosController.js
  async requestPasswordReset(req, res) {
    const { email } = req.body;

    try {
      // Generar token aleatorio (32 bytes = 64 caracteres hex)
      const plainToken = crypto.randomBytes(32).toString("hex");

      // Hashear el token con SHA-256 antes de guardarlo en BD
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');

      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora de validez (objeto Date → DATETIME en MySQL)

      const resetData = await databaseService.requestPasswordReset(
        email,
        hashedToken, // ✅ Guardar hash en BD
        resetTokenExpiry
      );

      // ✅ URL con prefijo /storage para React Router
      const resetUrl = `/TNSTrack/reset-password/${plainToken}`; // Enviar token plano por email

      // Determinar URL del frontend según entorno
      const appConfig = config.getConfig();
      const currentEnvIndex = appConfig.environment.current;
      const isProduction = currentEnvIndex === 1; // 0=development, 1=production

      const baseUrl = isProduction
        ? 'https://tns.thenextsecurity.cl'  // Producción
        : 'http://localhost:3000';           // Desarrollo

      // ✅ Respuesta genérica para no revelar si el email existe
      res.send("Si el email está registrado, recibirás instrucciones de recuperación");

      // Enviar email solo si el usuario existe
      if (resetData && resetData.email) {
        emailService.sendPasswordResetEmail(
          resetData.email,
          plainToken, // ✅ Enviar token plano por email
          `${baseUrl}${resetUrl}`
        ).catch(error => {
          // Loguear error del envío de email pero no afectar la respuesta al usuario
          console.error(
            "❌ Error al enviar email de restablecimiento de contraseña:",
            error.message || error
          );
        });
      }

    } catch (error) {
      console.error(
        "Error al solicitar restablecimiento de contraseña:",
        error
      );
      // ✅ Respuesta genérica incluso en caso de error
      res.send("Si el email está registrado, recibirás instrucciones de recuperación");
    }
  }


  async resetPassword(req, res) {
    const { token, newPassword } = req.body;
    try {
      // ✅ Validar fortaleza de la contraseña
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Contraseña inválida',
          details: validation.errors
        });
      }

      // ✅ Hashear el token recibido para comparar con BD
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // ✅ Hash de contraseña con argon2id (consistente con registerUser y changePassword)
      const hashedPassword = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1
      });

      const resetData = await databaseService.resetPassword(
        null,
        hashedPassword,
        hashedToken, // ✅ Pasar hash del token
        null
      );

      if (!resetData) {
        return res.status(400).send("Token inválido o expirado");
      }

      // Enviar email de confirmación
      await emailService.sendPasswordResetConfirmationEmail(resetData.email);

      res.send("Contraseña restablecida con éxito");
    } catch (error) {
      console.error("Error al restablecer la contraseña:", error);
      res.status(500).send("Error del servidor");
    }
  }
}

module.exports = new usuariosController();
