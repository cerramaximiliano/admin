// server/routes/statsAnalysisRoutes.js
const express = require('express');
const router = express.Router();
const statsAnalysisController = require('../controllers/statsAnalysisController');

// Ruta para obtener el resumen del dashboard
router.get('/dashboard', statsAnalysisController.getDashboardSummary);
router.get('/dashboard/:userId', statsAnalysisController.getDashboardSummary);

// Ruta para obtener analíticas completas
router.get('/analytics',  statsAnalysisController.getUserAnalytics);
router.get('/analytics/:userId',  statsAnalysisController.getUserAnalytics);

// Ruta para obtener análisis por categoría
router.get('/category/:category',  statsAnalysisController.getCategoryAnalysis);
router.get('/:userId/category/:category',  statsAnalysisController.getCategoryAnalysis);

// Ruta para generar o regenerar analíticas
router.post('/generate',  statsAnalysisController.generateUserAnalytics);
router.post('/generate/:userId',  statsAnalysisController.generateUserAnalytics);

// Ruta para generar analíticas de todos los usuarios (solo admin)
router.post('/generate-all',  statsAnalysisController.generateAllAnalytics);

module.exports = router;