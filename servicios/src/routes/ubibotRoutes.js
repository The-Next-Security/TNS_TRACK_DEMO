// src/routes/ubibotRoutes.js
const express = require("express");
const router = express.Router();
const ubibotController = require("../controllers/ubibotController.js");

router.get("/temperature-range-data", (req, res) =>
  ubibotController.getTemperatureRangeData(req, res)
);

router.get("/temperature-devices", (req, res) =>
  ubibotController.getTemperatureDevices(req, res)
);

router.post("/generate-defrost-report", async (req, res) => {
  try {
    // Log de los datos recibidos
    console.log("Datos recibidos para generar reporte:", req.body);
    await ubibotController.handleGenerateDefrostReport(req, res);
  } catch (error) {
    console.error("Error en la ruta de generación de reporte:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/generate-weekly-defrost-report", async (req, res) => {
  try {
    // Log de los datos recibidos
    console.log("Datos recibidos para generar reporte:", req.body);
    await ubibotController.handleGenerateWeeklyDefrostReport(req, res);
  } catch (error) {
    console.error("Error en la ruta de generación de reporte:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/defrost-analysis-data", (req, res) =>
  ubibotController.getDefrostAnalysisData(req, res)
);

router.get("/temperature-camaras-data", (req, res) =>
  ubibotController.getTemperatureCamarasData(req, res)
);

router.get("/weekly-defrost-analysis-data", (req, res) =>
  ubibotController.getWeeklyDefrostAnalysisData(req, res)
);
router.get("/temperature-dashboard-data", (req, res) =>
  ubibotController.getTemperatureDashboardData(req, res)
);

router.get("/ubibot-status", (req, res) =>
  ubibotController.getUbibotStatus(req, res)
);

// === NUEVAS RUTAS PARA GESTIÓN DE UMBRALES INDIVIDUALES ===

// Obtener umbrales de un canal específico
router.get("/channel/:channelId/thresholds", (req, res) =>
  ubibotController.getChannelThresholds(req, res)
);

// Actualizar umbrales de un canal específico
router.put("/channel/:channelId/thresholds", (req, res) =>
  ubibotController.updateChannelThresholds(req, res)
);

// Actualizar estado operativo de un canal
router.put("/channel/:channelId/operativa", (req, res) =>
  ubibotController.updateChannelOperativa(req, res)
);

// Obtener umbrales de todos los canales
router.get("/channels/thresholds", (req, res) =>
  ubibotController.getAllChannelsThresholds(req, res)
);

module.exports = router;
