const path = require('path');
const moment = require('moment');
const Tasas = require('../models/tasas');
const TasasCheck = require('../models/tasas-check');
const bcraService = require('../services/scrapers/bcraService');
const bnaService = require('../services/scrapers/bnaService');
const logger = require('../utils/logger');

/**
 * Inicia la descarga y procesamiento de una tasa específica
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.downloadTasa = async (req, res) => {
  try {
    const { tasa } = req.query;
    
    if (!tasa) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'El parámetro tasa es requerido'
      });
    }
    
    let result;
    
    // Ejecutar el servicio correspondiente según el tipo de tasa
    switch (tasa) {
      case 'pasivaBCRA':
        result = await bcraService.downloadTasaPasivaBCRA();
        break;
      case 'cer':
        result = await bcraService.downloadCER();
        break;
      case 'icl':
        result = await bcraService.downloadICL();
        break;
      case 'pasivaBNA':
        result = await bnaService.downloadTasaPasivaBNA();
        break;
      case 'activaBNA':
        result = await bnaService.updateTasaActivaBNA();
        break;
      default:
        return res.status(400).json({
          ok: false,
          status: 400,
          error: `Tipo de tasa no soportado: ${tasa}`
        });
    }
    
    if (!result.success) {
      return res.status(500).json({
        ok: false,
        status: 500,
        error: result.error
      });
    }
    
    return res.status(200).json({
      ok: true,
      status: 200,
      message: `Tasa ${tasa} descargada y procesada correctamente`,
      result
    });
  } catch (error) {
    logger.error(`Error al descargar tasa: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al descargar tasa'
    });
  }
};

/**
 * Obtiene las tasas más recientes para el dashboard
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getTasasDashboard = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 15;
    
    const tasas = await Tasas.find({
      estado: true,
      fecha: {
        $lte: moment()
      }
    })
    .sort({ fecha: -1 })
    .limit(limit);
    
    return res.render(path.join(__dirname, '../views/') + 'tasas.ejs', {
      data: tasas
    });
  } catch (error) {
    logger.error(`Error al obtener tasas para dashboard: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener tasas para dashboard'
    });
  }
};

/**
 * Obtiene las tasas para un período específico
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getTasasByPeriod = async (req, res) => {
  try {
    const { startDate, endDate, tipo } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'Los parámetros startDate y endDate son requeridos'
      });
    }
    
    // Validar fechas
    const start = moment(startDate);
    const end = moment(endDate);
    
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }
    
    // Construir query
    const query = {
      fecha: {
        $gte: start.startOf('day').toDate(),
        $lte: end.endOf('day').toDate()
      }
    };
    
    // Si se especifica un tipo de tasa, agregar al query
    if (tipo) {
      query[tipo] = { $exists: true, $ne: null };
    }
    
    // Ejecutar consulta
    const tasas = await Tasas.find(query).sort({ fecha: 1 });
    
    return res.status(200).json({
      ok: true,
      status: 200,
      count: tasas.length,
      tasas
    });
  } catch (error) {
    logger.error(`Error al obtener tasas por período: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener tasas por período'
    });
  }
};

/**
 * Obtiene los últimos valores registrados para cada tipo de tasa
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getUltimosTasasValues = async (req, res) => {
  try {
    // Tipos de tasas para buscar
    const tiposTasas = [
      'tasaPasivaBCRA',
      'tasaPasivaBNA',
      'tasaActivaBNA',
      'cer',
      'icl',
      'tasaActivaCNAT2601',
      'tasaActivaCNAT2658'
    ];
    
    const result = {};
    
    // Para cada tipo de tasa, buscar el último valor
    for (const tipo of tiposTasas) {
      const query = {};
      query[tipo] = { $exists: true, $ne: null };
      
      const tasa = await Tasas.findOne(query)
        .sort({ fecha: -1 })
        .select(`fecha ${tipo}`);
      
      if (tasa) {
        result[tipo] = {
          fecha: moment(tasa.fecha).format('YYYY-MM-DD'),
          valor: tasa[tipo]
        };
      }
    }
    
    return res.status(200).json({
      ok: true,
      status: 200,
      tasas: result
    });
  } catch (error) {
    logger.error(`Error al obtener últimos valores de tasas: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener últimos valores de tasas'
    });
  }
};

/**
 * Verifica y actualiza las fechas para las tasas
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.checkTasasFechas = async (req, res) => {
  try {
    const { tipo } = req.params;
    
    // Verificar que el tipo existe
    const fieldExists = Object.keys(Tasas.schema.paths).includes(tipo);
    
    if (!fieldExists) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: `Tipo de tasa no válido: ${tipo}`
      });
    }
    
    // Buscar última fecha registrada para este tipo de tasa
    const query = {};
    query[tipo] = { $exists: true, $gt: 0 };
    
    const ultimaTasa = await Tasas.findOne(query)
      .sort({ fecha: -1 })
      .select('fecha');
    
    if (!ultimaTasa) {
      return res.status(404).json({
        ok: false,
        status: 404,
        error: `No se encontraron registros para la tasa: ${tipo}`
      });
    }
    
    // Actualizar registro en TasasCheck
    await TasasCheck.findOneAndUpdate(
      { tasa: tipo },
      { lastDataDate: ultimaTasa.fecha },
      { new: true, upsert: true }
    );
    
    // Actualizar registro global para todas las tasas
    await TasasCheck.updateOne(
      { tasa: 'todas', lastDataDate: { $lt: ultimaTasa.fecha } },
      { $set: { lastDataDate: ultimaTasa.fecha } }
    );
    
    return res.status(200).json({
      ok: true,
      status: 200,
      message: `Última fecha para tasa ${tipo} actualizada: ${moment(ultimaTasa.fecha).format('YYYY-MM-DD')}`
    });
  } catch (error) {
    logger.error(`Error al verificar fechas de tasas: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al verificar fechas de tasas'
    });
  }
};