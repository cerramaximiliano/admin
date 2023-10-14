// const path = require('path');
// const express = require('express');
// const {verificaAutenticacion} = require('./middleware');
// const dotenv = require('dotenv');
// dotenv.config()

// const tasasController = require('../controllers/scrapingtasas');
// const promotionController = require('../controllers/promotionController');
// const filesController = require('../controllers/filesController');

// const router = express.Router();
// router.get('/tasas/', verificaAutenticacion,tasasController.downloadUrlFile);
// router.post('/emailpromotion', verificaAutenticacion, promotionController.emailPromotion);
// router.post('/emailpromotion-erase', verificaAutenticacion, promotionController.emailPromotionErase);
// router.get('/emailusers', verificaAutenticacion, promotionController.emailUsers);
// router.get('/tasasdashboard', verificaAutenticacion, tasasController.tasasDashboard);
// router.get('/filesnames', verificaAutenticacion, filesController.getNames)
// router.get('/logger', verificaAutenticacion, filesController.getLogger)
// router.get('/logger-app', verificaAutenticacion, filesController.getLoggerApp)

// module.exports = router;