const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth_Middleware');
const tokenService = require('../services/token_Service');

// Refresh rotation: lee refreshToken del body, verifica y emite nuevo par (accessToken, refreshToken)
router.post('/refresh', (req, res) => {
  try {
    const refresh = req.body && req.body.refreshToken ? req.body.refreshToken : null;
    if (!refresh) return res.status(401).json({ error: 'No refresh token' });
    const decoded = tokenService.verifyRefresh(refresh);
    // Revocar antiguo refresh
    if (decoded.jti) tokenService.revokeRefresh(decoded.jti);

    const payload = {
      userId: decoded.userId || decoded.id_Usuario || decoded.id,
      permissions: decoded.permissions,
      username: decoded.username,
      email: decoded.email,
    };

    const access = tokenService.signAccess(payload);
    const newRefresh = tokenService.signRefresh(payload);

    return res.json({
      accessToken: access,
      refreshToken: newRefresh,
      expiresIn: tokenService.ACCESS_TTL_SECONDS,
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout: el frontend limpia localStorage; opcionalmente revocar refresh si se envía en body
router.post('/logout', (req, res) => {
  try {
    const refresh = req.body && req.body.refreshToken ? req.body.refreshToken : null;
    if (refresh) {
      const decoded = tokenService.verifyRefresh(refresh);
      if (decoded && decoded.jti) tokenService.revokeRefresh(decoded.jti);
    }
  } catch (_) { /* ignorar errores al revocar — el frontend ya limpió localStorage */ }
  res.json({ success: true });
});

// Perfil actual
router.get('/me', authMiddleware.authenticate.bind(authMiddleware), (req, res) => {
  res.json({ user: req.user });
});

// ✅ Validar autenticación para PrivateRoute
router.get('/validate', authMiddleware.authenticate.bind(authMiddleware), async (req, res) => {
  // Calculate session metadata from JWT exp claim
  const expiresAtTimestamp = req.user.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeRemaining = Math.max(0, Math.floor((expiresAtTimestamp - now) / 1000)); // seconds

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // ✅ Obtener valores actualizados de la base de datos (especialmente ai_analysis)
  let aiAnalysisValue = false;
  let permissionsValue = req.user.permissions;

  try {
    const databaseService = require('../services/database_Service');
    const userId = req.user.userId || req.user.id;

    if (!userId) {
      console.error('[Auth] ⚠️ No se pudo obtener userId del token');
      aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
    } else if (!databaseService.pool) {
      console.error('[Auth] ⚠️ databaseService.pool no está inicializado');
      aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
    } else {
      const [users] = await databaseService.pool.query(
        `SELECT
          GROUP_CONCAT(DISTINCT p.nombre ORDER BY p.nombre SEPARATOR ',') as permissions,
          MAX(CASE WHEN p.nombre = 'ai_analysis' THEN 1 ELSE 0 END) as ai_analysis
        FROM gen_usuario g
        LEFT JOIN gen_usuario_permisos up ON g.id_usuario = up.id_usuario AND up.activo = 1
        LEFT JOIN gen_permiso p ON up.id_permiso = p.id_permiso AND p.activo = 1
        WHERE g.id_usuario = ? AND g.activo = 1
        GROUP BY g.id_usuario`,
        [userId]
      );

      if (users && users.length > 0 && users[0]) {
        permissionsValue = users[0].permissions;
        const rawAiAnalysis = users[0].ai_analysis;
        aiAnalysisValue = rawAiAnalysis === true || rawAiAnalysis === 1 || rawAiAnalysis === '1' || rawAiAnalysis === 1;
      } else {
        console.error('[Auth] ⚠️ No se encontraron usuarios en BD para userId:', userId);
        aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
      }
    }
  } catch (dbError) {
    console.error('[Auth] ⚠️ Error obteniendo valores actualizados de BD:', dbError.message);
    aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
  }

  const finalAiAnalysis = Boolean(aiAnalysisValue);

  const userData = {
    id: req.user.userId || req.user.id,
    username: req.user.username,
    email: req.user.email,
    permissions: permissionsValue,
    ai_analysis: finalAiAnalysis
  };

  const responseData = {
    valid: true,
    user: userData,
    session: {
      expiresAt: expiresAtTimestamp,
      expiresIn: timeRemaining,
      timeRemaining: timeRemaining
    }
  };

  if (!('ai_analysis' in responseData.user)) {
    console.error('[Auth] ❌ ERROR CRÍTICO: ai_analysis no está en responseData.user!');
    responseData.user.ai_analysis = false;
  }

  res.json(responseData);
});

// ✅ Extend session: usa refreshToken del body para emitir nuevo par de tokens
router.post('/extend-session', (req, res) => {
  try {
    const refresh = req.body && req.body.refreshToken ? req.body.refreshToken : null;

    if (!refresh) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    const decoded = tokenService.verifyRefresh(refresh);

    if (decoded.jti) {
      tokenService.revokeRefresh(decoded.jti);
    }

    const payload = {
      userId: decoded.userId || decoded.id_Usuario || decoded.id,
      permissions: decoded.permissions,
      username: decoded.username,
      email: decoded.email,
    };

    const newAccess = tokenService.signAccess(payload);
    const newRefresh = tokenService.signRefresh(payload);

    const expiresAtTimestamp = Date.now() + (tokenService.ACCESS_TTL_SECONDS * 1000);

    return res.json({
      success: true,
      accessToken: newAccess,
      refreshToken: newRefresh,
      expiresAt: expiresAtTimestamp,
      expiresIn: tokenService.ACCESS_TTL_SECONDS,
      message: 'Session extended successfully'
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
