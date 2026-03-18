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
          id_preset as id,
          nombre_preset as name,
          temperatura_minima as min,
          temperatura_maxima as max,
          es_predeterminado as is_default,
          fecha_creacion as created_at,
          creado_por as created_by,
          fecha_actualizacion as updated_at,
          actualizado_por as updated_by
        FROM ubi_grupo
        WHERE activo = 1
        ORDER BY es_predeterminado DESC, nombre_preset ASC
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
          color: null,
          icon: null,
          description: null,
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
          id_preset as id,
          nombre_preset as name,
          temperatura_minima as min,
          temperatura_maxima as max,
          es_predeterminado as is_default,
          activo as is_active,
          fecha_creacion as created_at,
          creado_por as created_by,
          fecha_actualizacion as updated_at,
          actualizado_por as updated_by
        FROM ubi_grupo
        WHERE id_preset = ?
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
          color: null,
          icon: null,
          description: null,
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
        FROM ubi_grupo
        WHERE nombre_preset = ? AND activo = 1
      `;
      const checkResult = await databaseService.query(checkQuery, [name.trim()]);

      if (checkResult[0].count > 0) {
        return res.status(409).json({
          success: false,
          error: "Ya existe un preset activo con ese nombre"
        });
      }

      // Insertar nuevo preset (ubi_grupo)
      const insertQuery = `
        INSERT INTO ubi_grupo (
          nombre_preset,
          temperatura_minima,
          temperatura_maxima,
          creado_por,
          actualizado_por
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const result = await databaseService.query(insertQuery, [
        name.trim(),
        minValue,
        maxValue,
        createdBy || 'API',
        createdBy || 'API'
      ]);

      console.log(`[PresetsController] createPreset: Preset creado con ID ${result.insertId}`);

      // Obtener el preset recién creado
      const getQuery = `
        SELECT
          id_preset as id,
          nombre_preset as name,
          temperatura_minima as min,
          temperatura_maxima as max,
          es_predeterminado as is_default,
          fecha_creacion as created_at,
          creado_por as created_by
        FROM ubi_grupo
        WHERE id_preset = ?
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
          color: null,
          icon: null,
          description: null,
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
        SELECT id_preset, es_predeterminado as is_default
        FROM ubi_grupo
        WHERE id_preset = ?
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
          FROM ubi_grupo
          WHERE nombre_preset = ? AND id_preset != ? AND activo = 1
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
        updates.push('nombre_preset = ?');
        values.push(name.trim());
      }
      if (min !== undefined) {
        updates.push('temperatura_minima = ?');
        values.push(parseFloat(min));
      }
      if (max !== undefined) {
        updates.push('temperatura_maxima = ?');
        values.push(parseFloat(max));
      }

      updates.push('actualizado_por = ?');
      values.push(updatedBy || 'API');

      values.push(id);

      const updateQuery = `
        UPDATE ubi_grupo
        SET ${updates.join(', ')}
        WHERE id_preset = ?
      `;

      await databaseService.query(updateQuery, values);

      console.log(`[PresetsController] updatePreset: Preset ${id} actualizado`);

      // Obtener preset actualizado
      const getQuery = `
        SELECT
          id_preset as id,
          nombre_preset as name,
          temperatura_minima as min,
          temperatura_maxima as max,
          es_predeterminado as is_default,
          fecha_actualizacion as updated_at,
          actualizado_por as updated_by
        FROM ubi_grupo
        WHERE id_preset = ?
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
          color: null,
          icon: null,
          description: null,
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
        DELETE FROM ubi_grupo
        WHERE id_preset = ?
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
      const query = `CALL stpr_restore_default_presets(?)`;

      const [results] = await databaseService.pool.query(query, [restoredBy || 'API']);

      console.log("[PresetsController] restoreDefaults: Presets restaurados");

      res.json({
        success: true,
        message: results[0][0].mensaje,
        activePresets: results[0][0].presets_activos
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
      const query = `CALL stpr_apply_preset_to_cameras(?, ?, ?)`;

      const [results] = await databaseService.pool.query(query, [
        id,
        cameraIdsCsv,
        appliedBy || 'API'
      ]);

      const result = results[0][0];

      console.log(`[PresetsController] applyPresetToCameras: ${result.message}`);

      res.json({
        success: true,
        message: result.mensaje,
        camerasUpdated: result.canales_actualizados,
        appliedMin: parseFloat(result.temperatura_minima_aplicada),
        appliedMax: parseFloat(result.temperatura_maxima_aplicada)
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
          p.id_preset AS preset_id,
          p.nombre_preset AS preset_name,
          p.temperatura_minima AS preset_min,
          p.temperatura_maxima AS preset_max,
          p.es_predeterminado AS is_default,
          COUNT(c.id_canal) AS cameras_using,
          GROUP_CONCAT(c.nombre ORDER BY c.nombre) AS camera_names
        FROM ubi_grupo p
        LEFT JOIN ubi_canal c ON c.id_preset = p.id_preset AND c.activo = 1
        WHERE p.activo = 1
        GROUP BY p.id_preset
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
          camerasUsing: parseInt(row.cameras_using, 10) || 0,
          cameraNames: row.camera_names ? row.camera_names.split(',').map(s => s.trim()) : []
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
