// src/routes/ia_Routes.js
// Dominio: Inteligencia Artificial — Reorganización Issue #11
// Montado en: /api/ia

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares');

const aiAnalysisController = require('../controllers/aiAnalysis_Controller');

/**
 * Middleware de permiso de IA — copiado del archivo original aiAnalysis_Routes.js
 * Verifica que el usuario tenga permiso de análisis IA antes de acceder a las rutas.
 */
function requireAIPermission(req, res, next) {
  let hasPermission = false;
  if (req.user) {
    if (req.user.ai_analysis === true || req.user.ai_analysis === 1) {
      hasPermission = true;
    } else if (req.user.permissions) {
      if (typeof req.user.permissions === 'string') {
        hasPermission = req.user.permissions.split(',').map(p => p.trim()).includes('ai_analysis');
      } else if (Array.isArray(req.user.permissions)) {
        hasPermission = req.user.permissions.includes('ai_analysis');
      } else if (typeof req.user.permissions === 'object') {
        hasPermission = req.user.permissions.ai_analysis === true;
      }
    }
    if (req.user.role === 'admin' && process.env.NODE_ENV !== 'production') {
      hasPermission = true;
    }
  }
  if (!hasPermission) {
    console.log(`[IARoutes] Permission denied for user ${req.user?.userId || req.user?.id}`);
    return res.status(403).json({
      success: false, error: 'Forbidden',
      message: 'AI Analysis permission required. Please contact your administrator to request access.'
    });
  }
  next();
}

// Aplicar auth a todas las rutas
router.use(authMiddleware.authenticate.bind(authMiddleware));
// Aplicar permiso IA a todas las rutas
router.use(requireAIPermission);

router.get('/camaras', aiAnalysisController.getChambers.bind(aiAnalysisController));
router.post('/consulta', aiAnalysisController.query.bind(aiAnalysisController));
router.get('/sesiones', aiAnalysisController.getSessions.bind(aiAnalysisController));
router.get('/preguntas-sugeridas', aiAnalysisController.getSuggestedQuestions.bind(aiAnalysisController));

module.exports = router;
