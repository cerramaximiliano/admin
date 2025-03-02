const express = require('express');
const router = express.Router();
const { verificaAutenticacion } = require('../middlewares/auth');
const tasasController = require('../controllers/tasasController');
const tasksController = require('../controllers/tasksController');
const filesController = require('../controllers/filesController');
const promotionController = require('../controllers/promotionController');
const userController = require('../controllers/users');

/**
 * Rutas para tasas
 */
router.get('/tasas/download', verificaAutenticacion, tasasController.downloadTasa);
router.get('/tasas/dashboard', verificaAutenticacion, tasasController.getTasasDashboard);
router.get('/tasas/periodo', verificaAutenticacion, tasasController.getTasasByPeriod);
router.get('/tasas/ultimos', verificaAutenticacion, tasasController.getUltimosTasasValues);
router.get('/tasas/check/:tipo', verificaAutenticacion, tasasController.checkTasasFechas);

/**
 * Rutas para tareas programadas
 */
router.get('/tasks', verificaAutenticacion, tasksController.getTasksList);
router.post('/tasks/:taskId/execute', verificaAutenticacion, tasksController.executeTask);
router.post('/tasks/:taskId/stop', verificaAutenticacion, tasksController.stopTask);
router.post('/tasks/:taskId/start', verificaAutenticacion, tasksController.startTask);

/**
 * Rutas para archivos
 */
router.get('/files/names', verificaAutenticacion, filesController.getNames);
router.get('/logger', verificaAutenticacion, filesController.getLogger);
router.get('/logger-app', verificaAutenticacion, filesController.getLoggerApp);

/**
 * Rutas para emails promocionales
 */
router.post('/emailpromotion', verificaAutenticacion, promotionController.emailPromotion);
router.post('/emailpromotion-erase', verificaAutenticacion, promotionController.emailPromotionErase);
router.get('/emailusers', verificaAutenticacion, promotionController.emailUsers);

/**
 * Rutas para usuarios
 */
router.post('/login', userController.usersLogin);
router.get('/home', verificaAutenticacion, userController.usersHome);
router.get('/users/dashboard', verificaAutenticacion, userController.usersDashboard);

module.exports = router;