const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');
const Categorias = require('../../models/categorias');
const DatosPrev = require('../../models/datosprevisionales');
const emailService = require('../email/emailService');

/**
 * Actualiza las categorías con base en la movilidad de datos previsionales
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function actualizarCategorias() {
  try {
    logger.info('Iniciando actualización de categorías');
    
    // Obtener última categoría y datos previsionales
    const ultimaCategoria = await Categorias.findOne().sort({ 'fecha': -1 });
    const ultimoDatosPrev = await DatosPrev.findOne({ 'estado': true }).sort({ 'fecha': -1 });
    
    if (!ultimaCategoria) {
      throw new Error('No se encontraron registros de categorías');
    }
    
    if (!ultimoDatosPrev) {
      throw new Error('No se encontraron registros de datos previsionales');
    }
    
    logger.info(`Categorías: Última fecha de categorías: ${moment(ultimaCategoria.fecha).format('YYYY-MM-DD')}, Última fecha de datos previsionales: ${moment(ultimoDatosPrev.fecha).format('YYYY-MM-DD')}`);
    
    // Verificar si es necesario actualizar
    if (moment(ultimaCategoria.fecha).isBefore(moment(ultimoDatosPrev.fecha))) {
      logger.info('Categorías: Hay actualizaciones disponibles');
      
      // Calcular todos los campos multiplicados por la movilidad
      const camposMultiplicados = {};
      
      // Obtener todos los campos del esquema de categorías
      const camposCategorias = Object.keys(Categorias.schema.paths)
        .filter(campo => 
          campo !== '_id' && 
          campo !== 'fecha' && 
          campo !== '__v' && 
          campo !== 'id'
        );
      
      // Multiplicar cada campo por la movilidad general
      camposCategorias.forEach(campo => {
        camposMultiplicados[campo] = ultimaCategoria[campo] * ultimoDatosPrev.movilidadGeneral;
      });
      
      // Crear o actualizar registro con la nueva fecha
      const resultado = await Categorias.findOneAndUpdate(
        { fecha: ultimoDatosPrev.fecha },
        camposMultiplicados,
        { new: true, upsert: true }
      );
      
      logger.info(`Categorías: Actualización realizada correctamente para la fecha ${moment(resultado.fecha).format('YYYY-MM-DD')}`);
      
      // Enviar email de notificación
      const emailData = [
        moment(resultado.fecha).format('YYYY-MM-DD'),
        JSON.stringify(camposMultiplicados)
      ];
      
      await emailService.sendEmail(
        config.email.defaultSender,
        config.email.supportEmail,
        null,
        null,
        null,
        null,
        null,
        'categorias',
        emailData
      );
      
      return {
        success: true,
        message: 'Categorías actualizadas correctamente',
        fecha: moment(resultado.fecha).format('YYYY-MM-DD')
      };
    } else {
      logger.info('Categorías: No hay actualizaciones disponibles');
      
      // Enviar email informando que no hay actualizaciones
      const mensaje = 'No hay actualizaciones disponibles para categorías de autónomos.';
      
      await emailService.sendEmail(
        config.email.defaultSender,
        config.email.supportEmail,
        null,
        null,
        null,
        null,
        null,
        'n/a',
        mensaje
      );
      
      return {
        success: true,
        message: 'No hay actualizaciones disponibles para categorías'
      };
    }
  } catch (error) {
    logger.error(`Error al actualizar categorías: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  actualizarCategorias
};