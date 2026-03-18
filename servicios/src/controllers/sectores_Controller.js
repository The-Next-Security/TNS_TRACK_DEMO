// MÓDULO FUTURO - Teltonika Sectores
// Pendiente de desarrollo en releases posteriores cuando se integre el hardware Teltonika.
// Tablas requeridas: sectores, configuracion, devices, personal (no existen en schema actual)

class sectoresController {
  async getAllSectores(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Sectores no disponible en esta versión.',
      module: 'sectores',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getMapWithQuadrantsInformation(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Sectores no disponible en esta versión.',
      module: 'sectores',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }
}

module.exports = new sectoresController();
