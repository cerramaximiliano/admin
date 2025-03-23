// server/controllers/statsAnalysisController.js
const statsAnalysisService = require('../services/stats/statsAnalysisService');
const logger = require('../utils/logger');

/**
 * Obtiene el resumen de analíticas para el dashboard
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de usuario'
      });
    }
    
    const result = await statsAnalysisService.getDashboardSummary(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener resumen del dashboard',
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      summary: result.summary
    });
  } catch (error) {
    logger.error(`Error al obtener resumen del dashboard: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener resumen del dashboard',
      error: error.message
    });
  }
};

/**
 * Obtiene analíticas completas del usuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de usuario'
      });
    }
    
    const result = await statsAnalysisService.getUserAnalytics(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener analíticas del usuario',
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      analytics: result.analytics
    });
  } catch (error) {
    logger.error(`Error al obtener analíticas del usuario: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener analíticas',
      error: error.message
    });
  }
};

/**
 * Genera o regenera analíticas del usuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.generateUserAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de usuario'
      });
    }
    
    const result = await statsAnalysisService.generateUserAnalytics(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al generar analíticas del usuario',
        error: result.error
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Analíticas generadas correctamente'
    });
  } catch (error) {
    logger.error(`Error al generar analíticas del usuario: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al generar analíticas',
      error: error.message
    });
  }
};

/**
 * Genera analíticas para todos los usuarios (solo admin)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.generateAllAnalytics = async (req, res) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción'
      });
    }
    
    logger.info(`Iniciando generación de analíticas para todos los usuarios por solicitud de ${req.user.id}`);
    
    // Iniciar generación en segundo plano
    statsAnalysisService.generateAllUsersAnalytics()
      .catch(error => {
        logger.error(`Error en generación de analíticas en segundo plano: ${error.message}`);
      });
    
    res.status(200).json({
      success: true,
      message: 'Generación de analíticas iniciada en segundo plano'
    });
  } catch (error) {
    logger.error(`Error al iniciar generación de analíticas: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al iniciar generación de analíticas',
      error: error.message
    });
  }
};

/**
 * Obtiene análisis específico por categoría
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getCategoryAnalysis = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const category = req.params.category;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere ID de usuario'
      });
    }
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere categoría de análisis'
      });
    }
    
    // Obtener analíticas completas
    const result = await statsAnalysisService.getUserAnalytics(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Error al obtener analíticas del usuario',
        error: result.error
      });
    }
    
    const analytics = result.analytics;
    
    // Seleccionar los datos según la categoría solicitada
    let categoryData = null;
    switch (category) {
      case 'folders':
        categoryData = {
          distribution: analytics.folderStatusDistribution,
          resolutionTimes: analytics.averageResolutionTimes,
          upcomingDeadlines: analytics.upcomingDeadlines
        };
        break;
      case 'financial':
        categoryData = analytics.financialMetrics;
        break;
      case 'activity':
        categoryData = {
          activity: analytics.activityMetrics,
          trends: analytics.trendData
        };
        break;
      case 'tasks':
        categoryData = analytics.taskMetrics;
        break;
      case 'notifications':
        categoryData = analytics.notificationMetrics;
        break;
      case 'matters':
        categoryData = {
          distribution: analytics.matterDistribution,
          averageAmount: analytics.averageAmountByMatter,
          resolutionTime: analytics.resolutionTimeByMatter
        };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Categoría de análisis no válida'
        });
    }
    
    res.status(200).json({
      success: true,
      category,
      data: categoryData,
      lastUpdated: analytics.lastUpdated
    });
  } catch (error) {
    logger.error(`Error al obtener análisis por categoría: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener análisis por categoría',
      error: error.message
    });
  }
};

module.exports = exports;