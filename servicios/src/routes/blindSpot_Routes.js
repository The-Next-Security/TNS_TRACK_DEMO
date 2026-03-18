// src/routes/blindSpotRoutes.js
const express = require('express');
const router = express.Router();
const blindSpotController = require('../controllers/blindSpot_Controller.js');

router.get('/blind-spot-intrusions',
    blindSpotController.handleBlindSpotIntrusions.bind(blindSpotController)
);

module.exports = router;