// src/controllers/presetsController.js

/**
 * @file presetsController.js
 * @description Controlador para la gestión de presets de temperatura
 * @author Backend Architect Expert
 * @date 2025-10-19
 *
 * Este controlador maneja todas las operaciones CRUD para los presets de temperatura,
 * reemplazando el sistema temporal de localStorage con persistencia en base de datos MySQL.
 */

const databaseService = require("../services/database_Service");

class PresetsController {
  /**
   * GET /api/presets
   * Obtiene todos los presets activos disponibles
   */
  async getAllPresets(req, res) {
    console.log("[PresetsController] getAllPresets: Solicitud recibida");

    try {
      const query = `
        SELECT
          preset_id as id,
          preset_name as name,
          preset_min as min,
          preset_max as max,
          preset_color as color,
          preset_icon as icon,
          preset_description as description,
          is_default,
          created_at,
          created_by,
          updated_at,
          updated_by
        FROM temperature_presets
        WHERE is_active = 1
        ORDER BY is_default DESC, preset_name ASC
      `;

      const results = await databaseService.query(query);

      console.log(`[PresetsController] getAllPresets: ${results.length} presets encontrados`);

      res.json({
        success: true,
        count: results.length,
        presets: results.map(preset => ({
          id: preset.id,
          name: preset.name,
          min: parseFloat(preset.min),
          max: parseFloat(preset.max),
          color: preset.color,
          icon: preset.icon,
          description: preset.description,
          isDefault: preset.is_default === 1,
          createdAt: preset.created_at,
          createdBy: preset.created_by,
          updatedAt: preset.updated_at,
          updatedBy: preset.updated_by
        }))
      });

    } catch (error) {
      console.error("❌ Error obteniendo presets:", error.message);
      res.status(500).json({
        success: false,
        error: "Error del servidor al obtener presets",
        details: error.message
      });
    }
  }

  /**
   * GET /api/presets/:id
   * Obtiene un preset específico por ID
   */
  async getPresetById(req, res) {
    console.log("[PresetsController] getPresetById: Solicitud recibida");

    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "ID de preset inválido"
        });
      }

      const query = `
        SELECT
          preset_id as id,
          preset_name as name,
          preset_min as min,
          preset_max as max,
          preset_color as color,
          preset_icon as icon,
          preset_description as description,
          is_default,
          is_active,
          created_at,
          created_by,
          updated_at,
          updated_by
        FROM temperature_presets
        WHERE preset_id = ?
      `;

      const results = await databaseService.query(query, [id]);

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Preset con ID ${id} no encontrado`
        });
      }

      const preset = results[0];

      res.json({
        success: true,
        preset: {
          id: preset.id,
          name: preset.name,
          min: parseFloat(preset.min),
          max: parseFloat(preset.max),
          color: preset.color,
          icon: preset.icon,
          description: preset.description,
          isDefault: preset.is_default === 1,
          isActive: preset.is_active === 1,
          createdAt: preset.created_at,
          createdBy: preset.created_by,
          updatedAt: preset.updated_at,
          updatedBy: preset.updated_by
        }
      });

    } catch (error) {
      console.error("❌ Error obteniendo preset:", error.message);
      res.status(500).json({
        success: false,
        error: "Error del servidor al obtener preset",
        details: error.message
      });
    }
  }

  /**
   * POST /api/presets
   * Crea un nuevo preset de temperatura
   */
  async createPreset(req, res) {
    console.log("[PresetsController] createPreset: Solicitud recibida");

    try {
      const { name, min, max, color, icon, description, createdBy } = req.body;

      // Validaciones
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: "El nombre del preset es requerido"
        });
      }

      if (min === undefined || max === undefined) {
        return res.status(400).json({
          success: false,
          error: "Se requieren valores de temperatura mínima y máxima"
        });
      }

      const minValue = parseFloat(min);
      const maxValue = parseFloat(max);

      if (isNaN(minValue) || isNaN(maxValue)) {
        return res.status(400).json({
          success: false,
          error: "Los valores de temperatura deben ser números válidos"
        });
      }

      if (minValue >= maxValue) {
        return res.status(400).json({
          success: false,
          error: "La temperatura mínima debe ser menor que la máxima"
        });
      }

      if (minValue < -60 || maxValue > 60) {
        return res.status(400).json({
          success: false,
          error: "Las temperaturas deben estar entre -60°C y 60°C"
        });
      }

      if (maxValue - minValue < 2) {
        return res.status(400).json({
          success: false,
          error: "La diferencia entre mínimo y máximo debe ser al menos 2°C"
        });
      }

      // Verificar nombre único
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM temperature_presets
        WHERE preset_name = ? AND is_active = 1
      `;
      const checkResult = await databaseService.query(checkQuery, [name.trim()]);

      if (checkResult[0].count > 0) {
        return res.status(409).json({
          success: false,
          error: "Ya existe un preset activo con ese nombre"
        });
      }

      // Insertar nuevo preset
      const insertQuery = `
        INSERT INTO temperature_presets (
          preset_name,
          preset_min,
          preset_max,
          preset_color,
          preset_icon,
          preset_description,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await databaseService.query(insertQuery, [
        name.trim(),
        minValue,
        maxValue,
        color || 'from-blue-500 to-cyan-500',
        icon || 'Thermometer',
        description || '',
        createdBy || 'API'
      ]);

      console.log(`[PresetsController] createPreset: Preset creado con ID ${result.insertId}`);

      // Obtener el preset recién creado
      const getQuery = `
        SELECT
          preset_id as id,
          preset_name as name,
          preset_min as min,
          preset_max as max,
          preset_color as color,
          preset_icon as icon,
          preset_description as description,
          is_default,
          created_at,
          created_by
        FROM temperature_presets
        WHERE preset_id = ?
      `;

      const newPreset = await databaseService.query(getQuery, [result.insertId]);

      res.status(201).json({
        success: true,
        message: "Preset creado exitosamente",
        preset: {
          id: newPreset[0].id,
          name: newPreset[0].name,
          min: parseFloat(newPreset[0].min),
          max: parseFloat(newPreset[0].max),
          color: newPreset[0].color,
          icon: newPreset[0].icon,
          description: newPreset[0].description,
          isDefault: newPreset[0].is_default === 1,
          createdAt: newPreset[0].created_at,
          createdBy: newPreset[0].created_by
        }
      });

    } catch (error) {
      console.error("❌ Error creando preset:", error.message);

      // Error de constraint de nombre único
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: "Ya existe un preset con ese nombre"
        });
      }

      res.status(500).json({
        success: false,
        error: "Error del servidor al crear preset",
        details: error.message
      });
    }
  }

  /**
   * PUT /api/presets/:id
   * Actualiza un preset existente
   */
  async updatePreset(req, res) {
    console.log("[PresetsController] updatePreset: Solicitud recibida");

    try {
      const { id } = req.params;
      const { name, min, max, color, icon, description, updatedBy } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "ID de preset inválido"
        });
      }

      // Verificar que el preset existe
      const checkQuery = `
        SELECT preset_id, is_default
        FROM temperature_presets
        WHERE preset_id = ?
      `;
      const checkResult = await databaseService.query(checkQuery, [id]);

      if (checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: `Preset con ID ${id} no encontrado`
        });
      }

      // Validaciones similares a create
      if (name && !name.trim()) {
        return res.status(400).json({
          success: false,
          error: "El nombre del preset no puede estar vacío"
        });
      }

      if (min !== undefined && max !== undefined) {
        const minValue = parseFloat(min);
        const maxValue = parseFloat(max);

        if (isNaN(minValue) || isNaN(maxValue)) {
          return res.status(400).json({
            success: false,
            error: "Los valores de temperatura deben ser números válidos"
          });
        }

        if (minValue >= maxValue) {
          return res.status(400).json({
            success: false,
            error: "La temperatura mínima debe ser menor que la máxima"
          });
        }

        if (minValue < -60 || maxValue > 60) {
          return res.status(400).json({
            success: false,
            error: "Las temperaturas deben estar entre -60°C y 60°C"
          });
        }

        if (maxValue - minValue < 2) {
          return res.status(400).json({
            success: false,
            error: "La diferencia entre mínimo y máximo debe ser al menos 2°C"
          });
        }
      }

      // Verificar nombre único (excepto el mismo preset)
      if (name) {
        const uniqueCheckQuery = `
          SELECT COUNT(*) as count
          FROM temperature_presets
          WHERE preset_name = ? AND preset_id != ? AND is_active = 1
        `;
        const uniqueResult = await databaseService.query(uniqueCheckQuery, [name.trim(), id]);

        if (uniqueResult[0].count > 0) {
          return res.status(409).json({
            success: false,
            error: "Ya existe otro preset activo con ese nombre"
          });
        }
      }

      // Construir query de actualización dinámicamente
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('preset_name = ?');
        values.push(name.trim());
      }
      if (min !== undefined) {
        updates.push('preset_min = ?');
        values.push(parseFloat(min));
      }
      if (max !== undefined) {
        updates.push('preset_max = ?');
        values.push(parseFloat(max));
      }
      if (color !== undefined) {
        updates.push('preset_color = ?');
        values.push(color);
      }
      if (icon !== undefined) {
        updates.push('preset_icon = ?');
        values.push(icon);
      }
      if (description !== undefined) {
        updates.push('preset_description = ?');
        values.push(description);
      }

      updates.push('updated_by = ?');
      values.push(updatedBy || 'API');

      values.push(id);

      const updateQuery = `
        UPDATE temperature_presets
        SET ${updates.join(', ')}
        WHERE preset_id = ?
      `;

      await databaseService.query(updateQuery, values);

      console.log(`[PresetsController] updatePreset: Preset ${id} actualizado`);

      // Obtener preset actualizado
      const getQuery = `
        SELECT
          preset_id as id,
          preset_name as name,
          preset_min as min,
          preset_max as max,
          preset_color as color,
          preset_icon as icon,
          preset_description as description,
          is_default,
          updated_at,
          updated_by
        FROM temperature_presets
        WHERE preset_id = ?
      `;

      const updatedPreset = await databaseService.query(getQuery, [id]);

      res.json({
        success: true,
        message: "Preset actualizado exitosamente",
        preset: {
          id: updatedPreset[0].id,
          name: updatedPreset[0].name,
          min: parseFloat(updatedPreset[0].min),
          max: parseFloat(updatedPreset[0].max),
          color: updatedPreset[0].color,
          icon: updatedPreset[0].icon,
          description: updatedPreset[0].description,
          isDefault: updatedPreset[0].is_default === 1,
          updatedAt: updatedPreset[0].updated_at,
          updatedBy: updatedPreset[0].updated_by
        }
      });

    } catch (error) {
      console.error("❌ Error actualizando preset:", error.message);

      // Error de constraint
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: "Ya existe un preset con ese nombre"
        });
      }

      res.status(500).json({
        success: false,
        error: "Error del servidor al actualizar preset",
        details: error.message
      });
    }
  }

  /**
   * DELETE /api/presets/:id
   * Elimina un preset (soft delete marcando como inactivo)
   */
  async deletePreset(req, res) {
    console.log("[PresetsController] deletePreset: Solicitud recibida");

    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "ID de preset inválido"
        });
      }

      // Intentar eliminar (triggers validarán si está en uso o es default)
      const deleteQuery = `
        DELETE FROM temperature_presets
        WHERE preset_id = ?
      `;

      await databaseService.query(deleteQuery, [id]);

      console.log(`[PresetsController] deletePreset: Preset ${id} eliminado`);

      res.json({
        success: true,
        message: "Preset eliminado exitosamente"
      });

    } catch (error) {
      console.error("❌ Error eliminando preset:", error.message);

      // Errores de triggers
      if (error.sqlState === '45000') {
        return res.status(400).json({
          success: false,
          error: error.sqlMessage || "No se puede eliminar el preset"
        });
      }

      res.status(500).json({
        success: false,
        error: "Error del servidor al eliminar preset",
        details: error.message
      });
    }
  }

  /**
   * POST /api/presets/restore-defaults
   * Restaura los presets a valores por defecto del sistema
   */
  async restoreDefaults(req, res) {
    console.log("[PresetsController] restoreDefaults: Solicitud recibida");

    try {
      const { restoredBy } = req.body;

      // Llamar al procedimiento almacenado
      const query = `CALL sp_restore_default_presets(?)`;

      const [results] = await databaseService.pool.query(query, [restoredBy || 'API']);

      console.log("[PresetsController] restoreDefaults: Presets restaurados");

      res.json({
        success: true,
        message: results[0][0].message,
        activePresets: results[0][0].active_presets
      });

    } catch (error) {
      console.error("❌ Error restaurando presets por defecto:", error.message);
      res.status(500).json({
        success: false,
        error: "Error del servidor al restaurar presets",
        details: error.message
      });
    }
  }

  /**
   * POST /api/presets/:id/apply-to-cameras
   * Aplica un preset a múltiples cámaras
   */
  async applyPresetToCameras(req, res) {
    console.log("[PresetsController] applyPresetToCameras: Solicitud recibida");

    try {
      const { id } = req.params;
      const { cameraIds, appliedBy } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "ID de preset inválido"
        });
      }

      if (!cameraIds || !Array.isArray(cameraIds) || cameraIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Se requiere una lista de IDs de cámaras"
        });
      }

      // Convertir array a CSV para el procedimiento almacenado
      const cameraIdsCsv = cameraIds.join(',');

      // Llamar al procedimiento almacenado
      const query = `CALL sp_apply_preset_to_cameras(?, ?, ?)`;

      const [results] = await databaseService.pool.query(query, [
        id,
        cameraIdsCsv,
        appliedBy || 'API'
      ]);

      const result = results[0][0];

      console.log(`[PresetsController] applyPresetToCameras: ${result.message}`);

      res.json({
        success: true,
        message: result.message,
        camerasUpdated: result.cameras_updated,
        appliedMin: parseFloat(result.applied_min),
        appliedMax: parseFloat(result.applied_max)
      });

    } catch (error) {
      console.error("❌ Error aplicando preset a cámaras:", error.message);

      // Errores del procedimiento almacenado
      if (error.sqlState === '45000') {
        return res.status(400).json({
          success: false,
          error: error.sqlMessage || "Error aplicando preset"
        });
      }

      res.status(500).json({
        success: false,
        error: "Error del servidor al aplicar preset",
        details: error.message
      });
    }
  }

  /**
   * GET /api/presets/usage
   * Obtiene estadísticas de uso de presets (cuántas cámaras usan cada uno)
   */
  async getPresetUsage(req, res) {
    console.log("[PresetsController] getPresetUsage: Solicitud recibida");

    try {
      const query = `
        SELECT
          preset_id,
          preset_name,
          preset_min,
          preset_max,
          is_default,
          cameras_using,
          camera_names
        FROM v_preset_usage
      `;

      const results = await databaseService.query(query);

      res.json({
        success: true,
        usage: results.map(row => ({
          presetId: row.preset_id,
          presetName: row.preset_name,
          min: parseFloat(row.preset_min),
          max: parseFloat(row.preset_max),
          isDefault: row.is_default === 1,
          camerasUsing: row.cameras_using,
          cameraNames: row.camera_names ? row.camera_names.split(', ') : []
        }))
      });

    } catch (error) {
      console.error("❌ Error obteniendo uso de presets:", error.message);
      res.status(500).json({
        success: false,
        error: "Error del servidor al obtener uso de presets",
        details: error.message
      });
    }
  }
}

module.exports = new PresetsController();
