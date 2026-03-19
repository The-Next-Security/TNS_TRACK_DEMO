// MÓDULO FUTURO - Teltonika GPS
// Pendiente de desarrollo en releases posteriores cuando se integre el hardware Teltonika.
// Tablas requeridas: gps_data (no existe en schema actual tns_cool_track)

class gpsController {
  async getHistoricalGpsData(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo GPS no disponible en esta versión.',
      module: 'gps',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getLastKnownPosition(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo GPS no disponible en esta versión.',
      module: 'gps',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getLatestGpsData(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo GPS no disponible en esta versión.',
      module: 'gps',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getGpsData(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo GPS no disponible en esta versión.',
      module: 'gps',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getPreviousValidPosition(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo GPS no disponible en esta versión.',
      module: 'gps',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }
}

module.exports = new gpsController();
