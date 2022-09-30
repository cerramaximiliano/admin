const path = require('path');
const express = require('express');
const {verificaAutenticacion} = require('./middleware');
const dotenv = require('dotenv');
dotenv.config()

const tasasController = require('../controllers/scrapingtasas');
const userController = require('../controllers/users');
const promotionController = require('../controllers/promotionController');
const filesController = require('../controllers/filesController');

const router = express.Router();
router.get('/tasas/', verificaAutenticacion,tasasController.downloadUrlFile);
router.post('/login', userController.usersLogin);
router.get('/home/', verificaAutenticacion, userController.usersHome);
router.post('/emailpromotion', verificaAutenticacion, promotionController.emailPromotion);
router.post('/emailpromotion-erase', verificaAutenticacion, promotionController.emailPromotionErase);
router.get('/emailusers', verificaAutenticacion, promotionController.emailUsers);
router.get('/tasasdashboard', verificaAutenticacion, tasasController.tasasDashboard);
router.get('/usersdashboard', verificaAutenticacion, userController.usersDashboard);
router.get('/filesnames', verificaAutenticacion, filesController.getNames)


module.exports = router;