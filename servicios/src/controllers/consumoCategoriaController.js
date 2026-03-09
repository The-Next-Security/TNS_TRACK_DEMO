// src/controllers/consumoCategoriaController.js (versión corregida)
const consumoCategoriaService = require('../services/consumoCategoria_Service');

class ConsumoCategoriaController {
  /**
   * Obtiene la categoría de consumo para un valor y dispositivo específicos
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getCategoriaConsumo(req, res) {
    try {
      const { valor, deviceId } = req.query;
      
      // Validación mejorada de los parámetros
      const valorNumerico = valor !== undefined ? parseFloat(valor) : null;
      
      if (valorNumerico === null || isNaN(valorNumerico)) {
        console.warn('Valor de consumo inválido:', valor);
        return res.json({
          success: true,
          data: {
            categoria: 0 // Considerar como apagado si el valor es inválido
          }
        });
      }

      if (!deviceId) {
        console.warn('deviceId no proporcionado o inválido');
        return res.json({
          success: true,
          data: {
            categoria: 0 // Considerar como apagado si no hay deviceId
          }
        });
      }

      // Obtener el grupo del dispositivo con manejo de errores mejorado
      let grupoId;
      try {
        grupoId = await consumoCategoriaService.getGrupoIdForDevice(deviceId);
      } catch (grupoError) {
        console.error('Error al obtener grupo para el dispositivo, usando grupo 1:', grupoError);
        grupoId = 1; // Usar grupo 1 como fallback
      }
      
      // Obtener la categoría con manejo de errores mejorado
      let categoria;
      try {
        categoria = await consumoCategoriaService.categorizarConsumo(valorNumerico, grupoId);
      } catch (categoriaError) {
        console.error('Error al categorizar consumo, usando categoría 0:', categoriaError);
        categoria = 0; // Usar categoría 0 (apagado) como fallback
      }
      
      return res.json({
        success: true,
        data: {
          categoria
        }
      });
    } catch (error) {
      console.error('Error al obtener categoría de consumo:', error);
      // Incluso en caso de error general, intentamos devolver una respuesta válida
      return res.json({
        success: true,
        data: {
          categoria: 0 // Considerar como apagado en caso de error general
        }
      });
    }
  }

  /**
   * Obtiene los umbrales de consumo para todos los grupos
   * Endpoint útil para debugging y para obtener todos los umbrales de una vez
   * @param {Object} req - Objeto de solicitud Express
   * @param {Object} res - Objeto de respuesta Express
   */
  async getUmbralesConsumo(req, res) {
    try {
      const umbrales = await consumoCategoriaService.getUmbralesConsumo();
      
      return res.json({
        success: true,
        data: umbrales
      });
    } catch (error) {
      console.error('Error al obtener umbrales de consumo:', error);
      // Crear un objeto de umbrales por defecto en caso de error
      const defaultUmbrales = {
        limiteApagado: 500,
        cuartilBajo: { '1': { valor: 3000, nombre_grupo: 'General' } },
        cuartilMedio: { '1': { valor: 4000, nombre_grupo: 'General' } },
        cuartilAlto: { '1': { valor: 5000, nombre_grupo: 'General' } }
      };
      
      return res.json({
        success: true,
        data: defaultUmbrales,
        message: 'Usando valores predeterminados debido a un error'
      });
    }
  }
}

module.exports = new ConsumoCategoriaController();