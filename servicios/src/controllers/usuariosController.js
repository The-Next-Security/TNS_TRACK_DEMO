// src/controllers/usuariosController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const argon2 = require("argon2");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const config = require("../config/js_files/config-loader");
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
      // 1) Buscar usuario en tabla local `users` por email
      const [user] = await databaseService.pool.query(
        "SELECT id, username, email, password, permissions, tokenVersion, ai_analysis FROM users WHERE email = ?",
        [email]
      );

      let localUser = user && user[0] ? user[0] : null;
      let validPassword = false;

      if (!localUser) {
        console.log(`[Login] ❌ Usuario no encontrado para email: ${email}`);
      } else {
        console.log(`[Login] ✅ Usuario encontrado: ${localUser.username} (ID: ${localUser.id})`);
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
            "UPDATE users SET password = ? WHERE id = ?",
            [newHash, localUser.id]
          );
        } catch (_) { /* best-effort */ }
      }

      const tokenService = require("../services/tokenService");
      const authMiddleware = require("../middlewares/authMiddleware");
      const payload = {
        userId: localUser.id,
        permissions: localUser.permissions,
        username: localUser.username,
        email: localUser.email,
        tokenVersion: localUser.tokenVersion || 0, // ✅ Incluir versión del token
        ai_analysis: localUser.ai_analysis || false, // ✅ Include AI analysis permission
      };
      const access = tokenService.signAccess(payload);
      const refresh = tokenService.signRefresh(payload);
      authMiddleware.setAuthCookies(req, res, access, refresh);

      console.log(`[Login] Login exitoso para: ${localUser.email} (ID: ${localUser.id})`);

      res.json({
        user: {
          id: localUser.id,
          username: localUser.username,
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
        "SELECT id, username, email, permissions, ai_analysis FROM users"
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

      // ✅ Verificar si el username ya existe
      const [existingUsername] = await databaseService.pool.query(
        "SELECT id FROM users WHERE username = ?",
        [sanitizedUsername]
      );

      if (existingUsername.length > 0) {
        console.log(`[RegisterUser] ❌ Username ya existe: ${sanitizedUsername}`);
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario ya está en uso'
        });
      }

      // ✅ Verificar si el email ya existe
      const [existingEmail] = await databaseService.pool.query(
        "SELECT id FROM users WHERE email = ?",
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

      // ✅ Insertar nuevo usuario (incluyendo ai_analysis)
      const aiAnalysisValue = ai_analysis === true || ai_analysis === 1 || ai_analysis === 'true' ? 1 : 0;
      const [result] = await databaseService.pool.query(
        "INSERT INTO users (username, password, email, permissions, tokenVersion, ai_analysis) VALUES (?, ?, ?, ?, 0, ?)",
        [sanitizedUsername, hashedPassword, sanitizedEmail, permissions, aiAnalysisValue]
      );

      console.log(`[RegisterUser] ✅ Usuario creado exitosamente: ${sanitizedUsername} (ID: ${result.insertId})`);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        userId: result.insertId
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
        "SELECT id, username, email FROM users WHERE id = ?",
        [userId]
      );

      if (existingUser.length === 0) {
        console.log(`[UpdateUser] ❌ Usuario no encontrado con ID: ${userId}`);
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // ✅ Verificar si el nuevo username ya existe (excepto si es el mismo usuario)
      const [usernameConflict] = await databaseService.pool.query(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [sanitizedUsername, parseInt(userId, 10)]
      );

      if (usernameConflict.length > 0) {
        console.log(`[UpdateUser] ❌ Username ya existe: ${sanitizedUsername}`);
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario ya está en uso por otro usuario'
        });
      }

      // ✅ Verificar si el nuevo email ya existe (excepto si es el mismo usuario)
      const [emailConflict] = await databaseService.pool.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [sanitizedEmail, parseInt(userId, 10)]
      );

      console.log(`[UpdateUser] 🔍 Verificando email conflict:`, {
        email: sanitizedEmail,
        userId: userId,
        userIdInt: parseInt(userId, 10),
        conflictsFound: emailConflict.length,
        conflictIds: emailConflict.map(u => u.id)
      });

      if (emailConflict.length > 0) {
        console.log(`[UpdateUser] ❌ Email ya existe: ${sanitizedEmail}`);
        return res.status(400).json({
          success: false,
          error: 'El email ya está registrado por otro usuario'
        });
      }

      // ✅ Actualizar usuario (SIN modificar password, incluyendo ai_analysis)
      const aiAnalysisValue = ai_analysis === true || ai_analysis === 1 || ai_analysis === 'true' ? 1 : 0;
      
      console.log(`[UpdateUser] 🔍 ai_analysis recibido:`, ai_analysis, `(tipo: ${typeof ai_analysis})`);
      console.log(`[UpdateUser] 🔍 aiAnalysisValue calculado:`, aiAnalysisValue);
      
      const [updateResult] = await databaseService.pool.query(
        "UPDATE users SET username = ?, email = ?, permissions = ?, ai_analysis = ? WHERE id = ?",
        [sanitizedUsername, sanitizedEmail, permissions, aiAnalysisValue, parseInt(userId, 10)]
      );
      
      console.log(`[UpdateUser] 🔍 Resultado del UPDATE:`, updateResult);
      console.log(`[UpdateUser] 🔍 Rows affected:`, updateResult.affectedRows);
      console.log(`[UpdateUser] 🔍 Changed rows:`, updateResult.changedRows);

      // Verificar que se guardó correctamente
      const [verifyResult] = await databaseService.pool.query(
        "SELECT ai_analysis FROM users WHERE id = ?",
        [parseInt(userId, 10)]
      );
      console.log(`[UpdateUser] 🔍 Verificación post-UPDATE - ai_analysis en BD:`, verifyResult[0]?.ai_analysis);

      console.log(`[UpdateUser] ✅ Usuario actualizado exitosamente: ${sanitizedUsername} (ID: ${userId})`);

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
        "SELECT id, username, tokenVersion FROM users WHERE id = ?",
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
      const currentTokenVersion = user.tokenVersion || 0;

      // ✅ Hash de contraseña con argon2id
      const hashedPassword = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 19456, // 19 MiB
        timeCost: 2,
        parallelism: 1
      });

      // ✅ Actualizar contraseña E incrementar tokenVersion para invalidar sesiones anteriores
      await databaseService.pool.query(
        "UPDATE users SET password = ?, tokenVersion = ? WHERE id = ?",
        [hashedPassword, currentTokenVersion + 1, userId]
      );

      console.log(`[ChangePassword] ✅ Contraseña actualizada exitosamente para usuario: ${user.username} (ID: ${userId})`);
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

      const resetTokenExpiry = Date.now() + 3600000; // 1 hora de validez

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
