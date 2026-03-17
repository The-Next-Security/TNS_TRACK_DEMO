// MÓDULO FUTURO - Teltonika Personal
// Pendiente de desarrollo en releases posteriores cuando se integre el módulo de personal Teltonika.
// Tablas requeridas: personal (no existe en schema actual tns_cool_track)

const databaseService = require('../services/database_Service');

class PersonalController {
  async getPersonal(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Personal no disponible en esta versión.',
      module: 'personal',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }
}

module.exports = new PersonalController();
