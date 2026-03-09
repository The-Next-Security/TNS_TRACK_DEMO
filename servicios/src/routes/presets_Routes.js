// src/routes/presetsRoutes.js

/**
 * @file presetsRoutes.js
 * @description Rutas REST para gestión de presets de temperatura
 * @author Backend Architect Expert
 * @date 2025-10-19
 */

const express = require("express");
const router = express.Router();
const presetsController = require("../controllers/presetsController");

// ============================================================================
// RUTAS CRUD BÁSICAS
// ============================================================================

/**
 * GET /api/presets
 * Obtiene todos los presets activos
 */
router.get("/presets", (req, res) =>
  presetsController.getAllPresets(req, res)
);

/**
 * GET /api/presets/:id
 * Obtiene un preset específico por ID
 */
router.get("/presets/:id", (req, res) =>
  presetsController.getPresetById(req, res)
);

/**
 * POST /api/presets
 * Crea un nuevo preset
 * Body: { name, min, max, color, icon, description, createdBy }
 */
router.post("/presets", (req, res) =>
  presetsController.createPreset(req, res)
);

/**
 * PUT /api/presets/:id
 * Actualiza un preset existente
 * Body: { name, min, max, color, icon, description, updatedBy }
 */
router.put("/presets/:id", (req, res) =>
  presetsController.updatePreset(req, res)
);

/**
 * DELETE /api/presets/:id
 * Elimina un preset (solo si no está en uso y no es preset por defecto)
 */
router.delete("/presets/:id", (req, res) =>
  presetsController.deletePreset(req, res)
);

// ============================================================================
// OPERACIONES ESPECIALES
// ============================================================================

/**
 * POST /api/presets/restore-defaults
 * Restaura los presets a los valores por defecto del sistema
 * Body: { restoredBy }
 */
router.post("/presets/restore-defaults", (req, res) =>
  presetsController.restoreDefaults(req, res)
);

/**
 * POST /api/presets/:id/apply-to-cameras
 * Aplica un preset a múltiples cámaras
 * Body: { cameraIds: [array of channel_ids], appliedBy }
 */
router.post("/presets/:id/apply-to-cameras", (req, res) =>
  presetsController.applyPresetToCameras(req, res)
);

/**
 * GET /api/presets/usage
 * Obtiene estadísticas de uso de cada preset (cuántas cámaras lo usan)
 */
router.get("/presets/usage", (req, res) =>
  presetsController.getPresetUsage(req, res)
);

module.exports = router;
