// MÓDULO FUTURO - Teltonika Beacons
// Pendiente de desarrollo en releases posteriores cuando se integre el hardware Teltonika.
// Tablas requeridas: door_status, beacons, beacons_detection_status, sectores,
// gps_data, registro_temperaturas, FMC920_*, gh_5200_*, TAT240_* (no existen en schema actual)

class beaconsController {
  async getDoorStatus(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getBeaconEntriesExits(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getAllBeacons(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getBeaconDetectionStatus(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getLatestSectors(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getActiveBeacons(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getOldestActiveBeaconDetections(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }

  async getTemperatureData(req, res) {
    return res.status(501).json({
      success: false,
      message: 'Módulo Beacons no disponible en esta versión.',
      module: 'beacons',
      futureIssue: 'Pendiente de desarrollo en releases posteriores'
    });
  }
}

module.exports = new beaconsController();
