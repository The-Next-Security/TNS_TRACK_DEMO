/**
 * Tariff Configuration Controller
 * Feature: 004-reportes-base-core Phase 9 (T104)
 *
 * Handles tariff configuration for electrical consumption reports
 * Tariffs stored in unified-config.json under "tariffs" key
 *
 * Also exposes other client-safe config from config-loader (BD): e.g. Mapbox (GET /api/config/mapbox).
 */

const configLoader = require('../config/js_files/config-loader');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/config/tariffs
 * Get current tariff configuration
 */
async function getTariffConfig(req, res) {
  try {
    console.log('[TariffConfig] Getting current tariff configuration');

    // Try to get from config-loader first
    let tariffs = configLoader.getValue('tariffs');

    // If not in config, return defaults
    if (!tariffs) {
      console.log('[TariffConfig] No tariff config found, returning defaults');
      tariffs = {
        punta: 150,      // CLP/kWh - Peak hours (18:00-23:00)
        valle: 80,       // CLP/kWh - Valley hours (23:00-06:00)
        fuera_punta: 100 // CLP/kWh - Off-peak hours (06:00-18:00)
      };
    }

    res.json({
      success: true,
      tariffs,
      currency: 'CLP',
      unit: 'kWh',
      timeRanges: {
        punta: { start: '18:00', end: '23:00', description: 'Horas Pico' },
        valle: { start: '23:00', end: '06:00', description: 'Horas Valle' },
        fuera_punta: { start: '06:00', end: '18:00', description: 'Horas Fuera de Pico' }
      }
    });

  } catch (error) {
    console.error('[TariffConfig] Error getting tariff config:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración de tarifas'
    });
  }
}

/**
 * PUT /api/config/tariffs
 * Update tariff configuration
 */
async function updateTariffConfig(req, res) {
  try {
    console.log('[TariffConfig] Updating tariff configuration:', req.body);

    const { punta, valle, fuera_punta } = req.body;

    // Validate required fields
    if (punta === undefined || valle === undefined || fuera_punta === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren las tres tarifas: punta, valle, fuera_punta'
      });
    }

    // Validate values are positive numbers
    if (punta <= 0 || valle <= 0 || fuera_punta <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Las tarifas deben ser valores positivos mayores a 0'
      });
    }

    // Validate values are reasonable (between 1 and 1000 CLP/kWh)
    if (punta > 1000 || valle > 1000 || fuera_punta > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Las tarifas no pueden exceder 1000 CLP/kWh'
      });
    }

    // Update unified-config.json
    const configPath = path.join(__dirname, '../config/jsons/unified-config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    // Update tariffs section
    if (!config.tariffs) {
      config.tariffs = {};
    }

    config.tariffs = {
      punta: parseFloat(punta),
      valle: parseFloat(valle),
      fuera_punta: parseFloat(fuera_punta),
      updated_at: new Date().toISOString(),
      updated_by: req.user?.username || 'sistema'
    };

    // Write back to file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    // Reload config in configLoader
    configLoader.reloadConfig();

    console.log('[TariffConfig] Tariff configuration updated successfully');

    res.json({
      success: true,
      message: 'Configuración de tarifas actualizada exitosamente',
      tariffs: {
        punta: config.tariffs.punta,
        valle: config.tariffs.valle,
        fuera_punta: config.tariffs.fuera_punta
      }
    });

  } catch (error) {
    console.error('[TariffConfig] Error updating tariff config:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración de tarifas'
    });
  }
}

/**
 * POST /api/config/tariffs/validate
 * Validate tariff values without saving
 */
async function validateTariffConfig(req, res) {
  try {
    const { punta, valle, fuera_punta } = req.body;

    const errors = [];

    if (punta === undefined) errors.push('Falta tarifa "punta"');
    if (valle === undefined) errors.push('Falta tarifa "valle"');
    if (fuera_punta === undefined) errors.push('Falta tarifa "fuera_punta"');

    if (punta !== undefined && punta <= 0) errors.push('Tarifa "punta" debe ser mayor a 0');
    if (valle !== undefined && valle <= 0) errors.push('Tarifa "valle" debe ser mayor a 0');
    if (fuera_punta !== undefined && fuera_punta <= 0) errors.push('Tarifa "fuera_punta" debe ser mayor a 0');

    if (punta !== undefined && punta > 1000) errors.push('Tarifa "punta" no puede exceder 1000');
    if (valle !== undefined && valle > 1000) errors.push('Tarifa "valle" no puede exceder 1000');
    if (fuera_punta !== undefined && fuera_punta > 1000) errors.push('Tarifa "fuera_punta" no puede exceder 1000');

    if (errors.length > 0) {
      return res.json({
        valid: false,
        errors
      });
    }

    res.json({
      valid: true,
      message: 'Configuración válida'
    });

  } catch (error) {
    console.error('[TariffConfig] Error validating tariff config:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar configuración de tarifas'
    });
  }
}

/**
 * POST /api/config/tariffs/reset
 * Reset tariffs to default values
 */
async function resetTariffConfig(req, res) {
  try {
    console.log('[TariffConfig] Resetting tariff configuration to defaults');

    const defaultTariffs = {
      punta: 150,
      valle: 80,
      fuera_punta: 100,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.username || 'sistema',
      reset: true
    };

    // Update unified-config.json
    const configPath = path.join(__dirname, '../config/jsons/unified-config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configRaw);

    config.tariffs = defaultTariffs;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

    // Reload config
    configLoader.reloadConfig();

    console.log('[TariffConfig] Tariff configuration reset successfully');

    res.json({
      success: true,
      message: 'Configuración de tarifas restablecida a valores por defecto',
      tariffs: {
        punta: defaultTariffs.punta,
        valle: defaultTariffs.valle,
        fuera_punta: defaultTariffs.fuera_punta
      }
    });

  } catch (error) {
    console.error('[TariffConfig] Error resetting tariff config:', error);
    res.status(500).json({
      success: false,
      error: 'Error al restablecer configuración de tarifas'
    });
  }
}

/**
 * GET /api/config/mapbox
 * Devuelve la configuración de Mapbox para el cliente (token y estilo).
 * Origen: config-loader (BD, rutas mapbox.access_token y mapbox.style_url).
 * Sin autenticación: el token de cliente es público una vez en el navegador.
 */
async function getMapboxConfig(req, res) {
  try {
    const accessToken = configLoader.getValue('mapbox.access_token') ?? null;
    const styleUrl =
      configLoader.getValue('mapbox.style_url') || 'mapbox://styles/mapbox/streets-v11';

    res.json({ accessToken, styleUrl });
  } catch (error) {
    console.error('[TariffConfig] Error getting Mapbox config:', error.message);
    res.status(500).json({
      error: 'Configuración no disponible'
    });
  }
}

module.exports = {
  getTariffConfig,
  updateTariffConfig,
  validateTariffConfig,
  resetTariffConfig,
  getMapboxConfig
};

