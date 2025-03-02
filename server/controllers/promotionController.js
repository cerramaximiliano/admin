const path = require('path');
const moment = require('moment');
const Promotion = require('../models/promo');
const Estadisticas = require('../models/estadisticas');
const emailService = require('../services/email/emailService');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Registra emails para envío de promociones
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.emailPromotion = async (req, res) => {
  try {
    // Validar datos de entrada
    if (!req.body.email || !req.body.type) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'Email y tipo son requeridos'
      });
    }
    
    // Parsear lista de emails
    const emailList = JSON.parse(req.body.email);
    const type = req.body.type;
    
    // Preparar datos para inserción
    const list = [];
    emailList.forEach(ele => {
      list.push({
        email: ele[0],
        estado: true,
        tipo: type
      });
    });
    
    // Insertar en base de datos
    try {
      const result = await Promotion.insertMany(list, { ordered: false });
      
      // Actualizar estadísticas
      const ultimaEstadistica = await Estadisticas.findOne().sort({ fecha: -1 });
      
      if (!ultimaEstadistica) {
        return res.status(500).json({
          ok: false,
          status: 500,
          error: 'No se encontraron registros de estadísticas'
        });
      }
      
      // Determinar si es necesario crear un nuevo registro o actualizar el existente
      if (moment(ultimaEstadistica.fecha).isSame(moment().startOf('day'))) {
        // Actualizar registro existente
        await Estadisticas.findOneAndUpdate(
          { fecha: ultimaEstadistica.fecha },
          { $inc: { promoActivos: result.length } }
        );
      } else {
        // Crear nuevo registro para hoy
        const nuevoRegistro = new Estadisticas({
          fecha: moment().startOf('day').toDate(),
          promoActivos: Number(ultimaEstadistica.promoActivos) + result.length,
          promoInactivos: Number(ultimaEstadistica.promoInactivos)
        });
        
        await nuevoRegistro.save();
      }
      
      return res.status(200).json({
        ok: true,
        status: 200,
        result: result
      });
    } catch (error) {
      // Si hay error de duplicados pero se insertaron algunos
      if (error.result && error.result.result.nInserted > 0) {
        // Actualizar estadísticas solo con los insertados
        await findUpdateEstadisticas(error.result.result.nInserted);
      }
      
      return res.status(500).json({
        ok: false,
        status: 500,
        error: error.message
      });
    }
  } catch (error) {
    logger.error(`Error al registrar emails para promoción: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al registrar emails para promoción'
    });
  }
};

/**
 * Marca emails como inactivos para promociones
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.emailPromotionErase = async (req, res) => {
  try {
    // Validar datos de entrada
    if (!req.body.email) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'Email es requerido'
      });
    }
    
    // Parsear lista de emails
    const emailList = JSON.parse(req.body.email);
    
    // Preparar lista de emails
    const list = [];
    emailList.forEach(ele => {
      list.push(ele[0]);
    });
    
    // Actualizar estado en base de datos
    const result = await Promotion.updateMany(
      { 'email': { $in: list } },
      { $set: { "estado": false } }
    );
    
    // Actualizar estadísticas
    const ultimaEstadistica = await Estadisticas.findOne().sort({ fecha: -1 });
    
    if (!ultimaEstadistica) {
      return res.status(500).json({
        ok: false,
        status: 500,
        error: 'No se encontraron registros de estadísticas'
      });
    }
    
    // Determinar si es necesario crear un nuevo registro o actualizar el existente
    if (moment(ultimaEstadistica.fecha).isSame(moment().startOf('day'))) {
      // Actualizar registro existente
      await Estadisticas.findOneAndUpdate(
        { fecha: ultimaEstadistica.fecha },
        { 
          $inc: { 
            promoActivos: result.modifiedCount * -1,
            promoInactivos: result.modifiedCount
          }
        }
      );
    } else {
      // Crear nuevo registro para hoy
      const nuevoRegistro = new Estadisticas({
        fecha: moment().startOf('day').toDate(),
        promoActivos: Number(ultimaEstadistica.promoActivos) - result.modifiedCount,
        promoInactivos: Number(ultimaEstadistica.promoInactivos) + result.modifiedCount
      });
      
      await nuevoRegistro.save();
    }
    
    return res.status(200).json({
      ok: true,
      status: 200,
      result: result
    });
  } catch (error) {
    logger.error(`Error al marcar emails como inactivos: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al marcar emails como inactivos'
    });
  }
};

/**
 * Renderiza página de usuarios para email
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.emailUsers = async (req, res) => {
  try {
    // Obtener usuarios activos
    const usuarios = await Promotion.find({ estado: true }).limit(15);
    
    // Obtener estadísticas
    const estadisticas = await Estadisticas.findOne().sort({ fecha: -1 });
    
    if (!estadisticas) {
      return res.status(500).json({
        ok: false,
        status: 500,
        error: 'No se encontraron registros de estadísticas'
      });
    }
    
    // Obtener plantillas de email
    let templates;
    try {
      templates = await emailService.getTemplates();
    } catch (error) {
      logger.error(`Error al obtener plantillas de email: ${error.message}`);
      
      return res.status(500).json({
        ok: false,
        status: 500,
        error: 'Error al obtener plantillas de email'
      });
    }
    
    // Renderizar vista
    return res.render(path.join(__dirname, '../views/') + 'promotion.ejs', {
      templates: templates.TemplatesMetadata,
      data: usuarios,
      totales: estadisticas
    });
  } catch (error) {
    logger.error(`Error al obtener datos para página de usuarios: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener datos para página de usuarios'
    });
  }
};

/**
 * Función auxiliar para actualizar estadísticas
 * 
 * @param {Number} addNumber - Número a agregar a estadísticas
 * @returns {Promise} - Resultado de la operación
 */
async function findUpdateEstadisticas(addNumber) {
  try {
    const ultimaEstadistica = await Estadisticas.findOne().sort({ fecha: -1 });
    
    if (!ultimaEstadistica) {
      return false;
    }
    
    // Determinar si es necesario crear un nuevo registro o actualizar el existente
    if (moment(ultimaEstadistica.fecha).isSame(moment().startOf('day'))) {
      // Actualizar registro existente
      return await Estadisticas.findOneAndUpdate(
        { fecha: ultimaEstadistica.fecha },
        { $inc: { promoActivos: addNumber } }
      );
    } else {
      // Crear nuevo registro para hoy
      const nuevoRegistro = new Estadisticas({
        fecha: moment().startOf('day').toDate(),
        promoActivos: Number(ultimaEstadistica.promoActivos) + addNumber,
        promoInactivos: Number(ultimaEstadistica.promoInactivos)
      });
      
      return await nuevoRegistro.save();
    }
  } catch (error) {
    logger.error(`Error al actualizar estadísticas: ${error.message}`);
    return false;
  }
}