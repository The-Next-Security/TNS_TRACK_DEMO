const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const rateLimit = require('express-rate-limit');

// ✅ Rate limiting más estricto: 5 intentos cada 15 minutos (OWASP recomienda 5)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // ✅ Reducido de 20 a 5 intentos
  message: 'Demasiados intentos de login. Por favor, intenta nuevamente en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false
});
const usuariosController = require('../controllers/usuarios_Controller');

router.post('/login', loginLimiter, usuariosController.handleLogin.bind(usuariosController));

// Proteger rutas que requieren autenticación
router.get('/users', authMiddleware.authenticate.bind(authMiddleware),
    usuariosController.getUsers.bind(usuariosController)
);

// ✅ Crear nuevo usuario (requiere autenticación y permiso 'create_users')
router.post('/register', authMiddleware.authenticate.bind(authMiddleware),
    usuariosController.registerUser.bind(usuariosController)
);

// ✅ Actualizar datos de usuario existente (username, email, permissions)
router.put('/:userId', authMiddleware.authenticate.bind(authMiddleware),
    usuariosController.updateUser.bind(usuariosController)
);

// ✅ Cambiar contraseña de un usuario (incrementa tokenVersion)
router.patch('/:userId/password', authMiddleware.authenticate.bind(authMiddleware),
    usuariosController.changePassword.bind(usuariosController)
);

router.post('/request-password-reset', loginLimiter,
    usuariosController.requestPasswordReset.bind(usuariosController)
);

router.post('/reset-password',
    usuariosController.resetPassword.bind(usuariosController)
);

module.exports = router;