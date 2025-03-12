const express = require('express');
const router = express.Router();
const tasasController = require('../controllers/tasasController');

// Ruta unificada para obtener datos por rango de fechas y campo específico
// Permite obtener todo el rango o solo los extremos usando el parámetro completo
// Ejemplo: /api/tasas/consulta?fechaDesde=2023-01-01&fechaHasta=2023-01-31&campo=tasaPasivaBNA&completo=true
router.get('/consulta', tasasController.consultarPorFechas);


module.exports = router;