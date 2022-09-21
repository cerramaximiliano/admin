const path = require('path');

const express = require('express');

const {verificaAutenticacion} = require('./middleware');

const tasasController = require('../controllers/scrapingtasas');
const userController = require('../controllers/users');
const promotionController = require('../controllers/promotionController');

const router = express.Router();

router.get('/tasas/', verificaAutenticacion,tasasController.downloadUrlFile);

router.post('/login', userController.usersLogin);

router.get('/home/', verificaAutenticacion, userController.usersHome);

router.post('/emailpromotion', verificaAutenticacion, promotionController.emailPromotion)

module.exports = router;