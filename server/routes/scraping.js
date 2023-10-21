const express = require('express');
const {verificaAutenticacion} = require('./middleware');
const router = express.Router();

const tasasController = require('../controllers/scrapingController');
const promotionController = require('../controllers/promotionController');
const filesController = require('../controllers/filesController');

const {findAndUpdateTasasByName} = require('../handlers/scrapingHandler');

router.get('/tasas', findAndUpdateTasasByName);

// router.get('/emailusers', verificaAutenticacion, promotionController.emailUsers);

// router.get('/tasasdashboard', verificaAutenticacion, tasasController.tasasDashboard);

// router.get('/filesnames', verificaAutenticacion, filesController.getNames)

// router.get('/logger', verificaAutenticacion, filesController.getLogger)
// router.get('/logger-app', verificaAutenticacion, filesController.getLoggerApp)
// router.post('/emailpromotion', verificaAutenticacion, promotionController.emailPromotion);
// router.post('/emailpromotion-erase', verificaAutenticacion, promotionController.emailPromotionErase);

module.exports = router;