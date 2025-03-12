const express = require('express');
const router = express.Router();

// Importar todas las rutas específicas
const tasasRoutes = require('./tasasRoutes');

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