const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const tokenService = require('../services/tokenService');
const devAuthBypass = require('../middleware/devAuthBypass');

// Dev-only auth bypass (inject mock user in development)
router.use(devAuthBypass);

// Refresh rotation: usa cookie 'refresh', verifica y emite nuevo par (access, refresh)
router.post('/refresh', (req, res) => {
  try {
    const refresh = req.cookies && req.cookies.refresh ? req.cookies.refresh : null;
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

    authMiddleware.setAuthCookies(req, res, access, newRefresh);
    return res.json({ success: true });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout: limpiar cookies
router.post('/logout', (req, res) => {
  authMiddleware.clearAuthCookies(res);
  res.json({ success: true });
});

// Perfil actual (usar middleware en cadena para que Express maneje errores correctamente)
router.get('/me', authMiddleware.authenticate.bind(authMiddleware), (req, res) => {
  res.json({ user: req.user });
});

// ✅ Validar autenticación para PrivateRoute (nuevo endpoint)
router.get('/validate', authMiddleware.authenticate.bind(authMiddleware), async (req, res) => {
  // Calculate session metadata from JWT exp claim
  const expiresAtTimestamp = req.user.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const timeRemaining = Math.max(0, Math.floor((expiresAtTimestamp - now) / 1000)); // seconds

  // 🔥 CRITICAL: Prevent caching to ensure SessionManager receives fresh session metadata
  // Feature: 003-fix-session-expiry-handling
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // ✅ Obtener valores actualizados de la base de datos (especialmente ai_analysis)
  // Esto asegura que los cambios recientes se reflejen sin necesidad de re-login
  let aiAnalysisValue = false; // Valor por defecto
  let permissionsValue = req.user.permissions;
  
  try {
    const databaseService = require('../services/database-service');
    const userId = req.user.userId || req.user.id;
    
    if (!userId) {
      console.error('[Auth] ⚠️ No se pudo obtener userId del token');
      // Usar valor del JWT como fallback
      aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
    } else if (!databaseService.pool) {
      console.error('[Auth] ⚠️ databaseService.pool no está inicializado');
      // Usar valor del JWT como fallback
      aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
    } else {
      const [users] = await databaseService.pool.query(
        'SELECT permissions, ai_analysis FROM users WHERE id = ?',
        [userId]
      );
      
      if (users && users.length > 0 && users[0]) {
        // Usar valores actualizados de la base de datos
        permissionsValue = users[0].permissions;
        const rawAiAnalysis = users[0].ai_analysis;
        aiAnalysisValue = rawAiAnalysis === true || rawAiAnalysis === 1 || rawAiAnalysis === '1' || rawAiAnalysis === 1;
      } else {
        console.error('[Auth] ⚠️ No se encontraron usuarios en BD para userId:', userId);
        // Usar valor del JWT como fallback
        aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
      }
    }
  } catch (dbError) {
    console.error('[Auth] ⚠️ Error obteniendo valores actualizados de BD:', dbError.message);
    // Usar valor del JWT como fallback
    aiAnalysisValue = req.user.ai_analysis === true || req.user.ai_analysis === 1 || req.user.ai_analysis === '1' || false;
  }
  
  // Asegurar que ai_analysis siempre sea un booleano
  const finalAiAnalysis = Boolean(aiAnalysisValue);
  
  // Construir objeto user con ai_analysis explícitamente incluido
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
  
  // Verificación final antes de enviar
  if (!('ai_analysis' in responseData.user)) {
    console.error('[Auth] ❌ ERROR CRÍTICO: ai_analysis no está en responseData.user!');
    responseData.user.ai_analysis = false; // Forzar valor por defecto
  }
  
  res.json(responseData);
});

// ✅ Extend session endpoint (Feature: 003-fix-session-expiry-handling)
// Uses refresh token to issue new access + refresh tokens (token rotation)
router.post('/extend-session', (req, res) => {
  try {
    const refresh = req.cookies && req.cookies.refresh ? req.cookies.refresh : null;

    if (!refresh) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify refresh token
    const decoded = tokenService.verifyRefresh(refresh);

    // Revoke old refresh token (token rotation security)
    if (decoded.jti) {
      tokenService.revokeRefresh(decoded.jti);
    }

    // Create payload for new tokens
    const payload = {
      userId: decoded.userId || decoded.id_Usuario || decoded.id,
      permissions: decoded.permissions,
      username: decoded.username,
      email: decoded.email,
    };

    // Sign new access and refresh tokens
    const newAccess = tokenService.signAccess(payload);
    const newRefresh = tokenService.signRefresh(payload);

    // Set new auth cookies
    authMiddleware.setAuthCookies(req, res, newAccess, newRefresh);

    // Calculate new expiration time
    const expiresAtTimestamp = Date.now() + (tokenService.ACCESS_TTL_SECONDS * 1000);

    return res.json({
      success: true,
      expiresAt: expiresAtTimestamp,
      expiresIn: tokenService.ACCESS_TTL_SECONDS,
      message: 'Session extended successfully'
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;


