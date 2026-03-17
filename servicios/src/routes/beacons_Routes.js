// src/routes/beacons_Routes.js
// MÓDULO FUTURO - Teltonika Beacons (stub 501)
// Dominio: Beacons — Reorganización Issue #11
// Montado en: /api/beacons

const express = require('express');
const router = express.Router();

const beaconsController = require('../controllers/beacons_Controller');

router.get('/estado-puertas', beaconsController.getDoorStatus.bind(beaconsController));
router.get('/entradas-salidas', beaconsController.getBeaconEntriesExits.bind(beaconsController));
router.get('/', beaconsController.getAllBeacons.bind(beaconsController));
router.get('/estado-deteccion', beaconsController.getBeaconDetectionStatus.bind(beaconsController));
router.get('/sectores-recientes', beaconsController.getLatestSectors.bind(beaconsController));
router.get('/activos', beaconsController.getActiveBeacons.bind(beaconsController));
router.get('/detecciones-antiguas', beaconsController.getOldestActiveBeaconDetections.bind(beaconsController));
router.get('/temperatura', beaconsController.getTemperatureData.bind(beaconsController));

module.exports = router;
