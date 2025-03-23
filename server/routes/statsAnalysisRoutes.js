// server/routes/statsAnalysisRoutes.js
const express = require('express');
const router = express.Router();
const statsAnalysisController = require('../controllers/statsAnalysisController');
const authMiddleware = require('../middlewares/auth');

// Middleware para verificar autenticación
const { verificaAutenticacion } = authMiddleware;

// Ruta para obtener el resumen del dashboard
router.get('/dashboard', verificaAutenticacion, statsAnalysisController.getDashboardSummary);
router.get('/dashboard/:userId', verificaAutenticacion, statsAnalysisController.getDashboardSummary);

// Ruta para obtener analíticas completas
router.get('/analytics', verificaAutenticacion, statsAnalysisController.getUserAnalytics);
router.get('/analytics/:userId', verificaAutenticacion, statsAnalysisController.getUserAnalytics);

// Ruta para obtener análisis por categoría
router.get('/category/:category', verificaAutenticacion, statsAnalysisController.getCategoryAnalysis);
router.get('/:userId/category/:category', verificaAutenticacion, statsAnalysisController.getCategoryAnalysis);

// Ruta para generar o regenerar analíticas
router.post('/generate', verificaAutenticacion, statsAnalysisController.generateUserAnalytics);
router.post('/generate/:userId', verificaAutenticacion, statsAnalysisController.generateUserAnalytics);

// Ruta para generar analíticas de todos los usuarios (solo admin)
router.post('/generate-all', verificaAutenticacion, statsAnalysisController.generateAllAnalytics);

module.exports = router;