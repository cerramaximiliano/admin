const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Importar todas las rutas específicas
const tasasRoutes = require('./tasasRoutes');
const tasksRoutes = require('./tasksRoutes');

// Configurar una ruta base para verificar que la API está funcionando
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API de Tasas funcionando correctamente',
    apiVersion: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Registrar todas las rutas
router.use('/tasas', tasasRoutes);
router.use('/tasks', tasksRoutes);

if (process.env.NODE_ENV === 'development') {
  const tasksDevRoutes = require('./tasksDevRoutes');
  const tasasDevRoutes = require('./tasasDevRoutes');
  router.use('/dev/tasks', tasksDevRoutes);
  router.use('/dev/tasas', tasasDevRoutes);
  logger.warn('¡ATENCIÓN! Rutas de desarrollo sin autenticación habilitadas en /api/dev/tasks y /api/dev/tasas');

}

// Aquí puedes agregar otras rutas cuando las necesites
// router.use('/otroRecurso', otroRecursoRoutes);

// Middleware para manejar rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

module.exports = router;