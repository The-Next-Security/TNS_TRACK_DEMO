const express = require('express');
const router = express.Router();
const aiAnalysisController = require('../controllers/aiAnalysis_Controller');
const authMiddleware = require('../middlewares/auth_Middleware');

/**
 * Middleware to check ai_analysis permission
 * FR-021: System MUST enforce permission checks before allowing any AI data access
 */
function requireAIPermission(req, res, next) {
  // Check if user has ai_analysis permission
  // Permissions can be: string (comma-separated), array, or object
  let hasPermission = false;
  
  if (req.user) {
    // Check direct ai_analysis field (from database column)
    if (req.user.ai_analysis === true || req.user.ai_analysis === 1) {
      hasPermission = true;
    }
    // Check permissions object/array
    else if (req.user.permissions) {
      if (typeof req.user.permissions === 'string') {
        // Comma-separated string
        hasPermission = req.user.permissions.split(',').map(p => p.trim()).includes('ai_analysis');
      } else if (Array.isArray(req.user.permissions)) {
        // Array of permissions
        hasPermission = req.user.permissions.includes('ai_analysis');
      } else if (typeof req.user.permissions === 'object') {
        // Object with permission flags
        hasPermission = req.user.permissions.ai_analysis === true;
      }
    }
    // Admin role bypass (for testing/development)
    if (req.user.role === 'admin' && process.env.NODE_ENV !== 'production') {
      hasPermission = true;
    }
  }
  
  if (!hasPermission) {
    console.log(`[AIAnalysisRoutes] Permission denied for user ${req.user?.userId || req.user?.id}`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'AI Analysis permission required. Please contact your administrator to request access.'
    });
  }
  
  next();
}

// Apply authentication to all routes
router.use(authMiddleware.authenticate.bind(authMiddleware));

// Apply permission check to all routes
router.use(requireAIPermission);

// Routes
router.post('/query', aiAnalysisController.query.bind(aiAnalysisController));
router.get('/sessions', aiAnalysisController.getSessions.bind(aiAnalysisController));
router.get('/suggested-questions', aiAnalysisController.getSuggestedQuestions.bind(aiAnalysisController));
router.get('/chambers', aiAnalysisController.getChambers.bind(aiAnalysisController));

module.exports = router;

