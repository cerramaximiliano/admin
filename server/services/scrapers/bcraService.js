const xlsx = require('xlsx');
const download = require('download');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');
const Tasas = require('../../models/tasas');
const emailService = require('../email/emailService');

/**
 * Verifica si un valor es un número entero
 * 
 * @param {*} value - Valor a verificar
 * @returns {Boolean} - true si es un entero, false en caso contrario
 */
function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value));
}

/**
 * Obtiene la longitud de un número
 * 
 * @param {Number} number - Número a evaluar
 * @returns {Number} - Longitud del número
 */
function getLength(number) {
  return number.toString().length;
}

/**
 * Cuenta los decimales de un número
 * 
 * @param {Number} number - Número a evaluar
 * @returns {Number} - Cantidad de decimales
 */
function countDecimals(number) {
  if (Math.floor(number.valueOf()) === number.valueOf()) return 0;
  return number.toString().split(".")[1].length || 0;
}

/**
 * Genera un archivo JSON con los datos procesados
 * 
 * @param {Array} data - Datos a guardar
 * @param {String} fileName - Nombre del archivo
 */
function generateJSONFile(data, fileName) {
  try {
    const filePath = path.join(config.paths.serverFiles, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data));
    logger.info(`Archivo JSON generado correctamente: ${fileName}`);
  } catch (err) {
    logger.error(`Error en escritura de archivo JSON ${fileName}: ${err.message}`);
  }
}

/**
 * Descarga y procesa el archivo de tasa pasiva BCRA
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function downloadTasaPasivaBCRA() {
  try {
    const fileUrl = `${config.tasas.scraping.baseUrl.bcra}ind2023.xls`;
    const filePath = config.paths.serverFiles;
    
    logger.info(`Descargando archivo de tasa pasiva BCRA: ${fileUrl}`);
    await download(fileUrl, filePath);
    
    logger.info('Procesando archivo de tasa pasiva BCRA');
    await processExcelTasaPasiva(path.join(filePath, 'ind2023.xls'));
    
    return { success: true, message: 'Tasa pasiva BCRA actualizada correctamente' };
  } catch (error) {
    logger.error(`Error al descargar/procesar tasa pasiva BCRA: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Procesa el archivo Excel de tasa pasiva BCRA
 * 
 * @param {String} filePath - Ruta del archivo Excel
 */
async function processExcelTasaPasiva(filePath) {
  try {
    const file = xlsx.readFile(filePath, { type: 'binary' });
    const sheetNames = file.SheetNames;
    const tempData = xlsx.utils.sheet_to_json(file.Sheets['Serie_diaria']);
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    
    // Procesar datos del Excel
    tempData.forEach(function(x, index) {
      Object.keys(x).forEach(function(arr, ind, total) {
        if (isInt(x[arr]) === true) {
          if (getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()) {
            data.push(x[arr]);
            if (data.length === 2) {
              dataIndex.push(x[total[total.length - 1]]);
            }
          }
        }
      });
      
      if (data.length >= 3) {
        parsedData.push([data[data.length - 1], dataIndex[0]]);
      } else if (data.length === 2) {
        parsedData.push([data[1], dataIndex[0]]);
      }
      
      data = [];
      dataIndex = [];
    });

    // Guardar los datos
    for (const item of parsedData) {
      const date = moment(item[0], "YYYYMMDD");
      
      // Si la fecha es hoy, actualizar en la base de datos
      if (date.isSame(moment(), 'days')) {
        logger.info(`Tasa pasiva BCRA: Hay actualización disponible para la fecha ${date.format('YYYY-MM-DD')}`);
        
        const dateToFind = date.format('YYYY-MM-DD') + 'T00:00';
        const filter = { fecha: moment(dateToFind).utc(true) };
        const update = { tasaPasivaBCRA: Number(item[1]) };
        
        const result = await Tasas.findOneAndUpdate(filter, update, {
          new: true,
          upsert: true
        });
        
        // Enviar email de notificación
        const emailData = [date.format('YYYY-MM-DD'), item[1], 'Tasa Pasiva BCRA'];
        await emailService.sendEmail(
          config.email.defaultSender,
          config.email.supportEmail,
          config.email.supportEmail,
          null,
          null,
          null,
          null,
          'actualizaciones',
          emailData
        );
      }
    }
    
    // Generar archivo JSON con todos los datos procesados
    generateJSONFile(parsedData, 'dataBCRATasaPasiva2023.json');
    
  } catch (error) {
    logger.error(`Error al procesar Excel de tasa pasiva BCRA: ${error.message}`);
    throw error;
  }
}

/**
 * Descarga y procesa archivo de CER
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function downloadCER() {
  try {
    const fileUrl = `${config.tasas.scraping.baseUrl.bcra}cer2023.xls`;
    const filePath = config.paths.serverFiles;
    
    logger.info(`Descargando archivo de CER: ${fileUrl}`);
    await download(fileUrl, filePath);
    
    logger.info('Procesando archivo de CER');
    await processExcelCER(path.join(filePath, 'cer2023.xls'));
    
    return { success: true, message: 'CER actualizado correctamente' };
  } catch (error) {
    logger.error(`Error al descargar/procesar CER: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Procesa el archivo Excel de CER
 * 
 * @param {String} filePath - Ruta del archivo Excel
 */
async function processExcelCER(filePath) {
  try {
    const file = xlsx.readFile(filePath, { type: 'binary' });
    const tempData = xlsx.utils.sheet_to_json(file.Sheets['Totales_diarios']);
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    
    // Procesar datos del Excel
    tempData.forEach(function(x) {
      Object.keys(x).forEach(function(arr) {
        if (isInt(x[arr]) === true) {
          if (getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()) {
            data.push(x[arr]);
          }
        } else if (typeof x[arr] === 'number') {
          if (countDecimals(x[arr]) > 10) {
            dataIndex.push(x[arr]);
          }
        }
      });
      
      if (data[0] != undefined && dataIndex[0] != undefined) {
        parsedData.push([data[0], dataIndex[0]]);
      }
      
      data = [];
      dataIndex = [];
    });
    
    // Verificar últimos datos almacenados
    const lastRecord = await Tasas.findOne({ 'cer': { $gte: 0 } }).sort({ 'fecha': -1 });
    
    if (!lastRecord) {
      // Si no hay registros, crear todos
      let bulkOps = [];
      
      for (const item of parsedData) {
        const date = moment(item[0], "YYYYMMDD").format('YYYY-MM-DD') + 'T00:00';
        
        bulkOps.push({
          updateOne: {
            filter: { fecha: moment(date).utc(true) },
            update: { cer: Number(item[1]) },
            upsert: true
          }
        });
      }
      
      await Tasas.bulkWrite(bulkOps);
      logger.info(`CER: Se han creado ${bulkOps.length} registros nuevos`);
      
    } else {
      // Filtrar sólo las actualizaciones nuevas
      const updates = parsedData.filter(item => 
        moment(moment(item[0], "YYYYMMDD").format("YYYY-MM-DD") + 'T00:00').utc(true)
          .isAfter(moment(lastRecord.fecha))
      );
      
      if (updates.length === 0) {
        logger.info('CER: No hay actualizaciones disponibles');
        
        // Enviar email informando que no hay actualizaciones
        await emailService.sendEmail(
          config.email.defaultSender,
          config.email.supportEmail,
          config.email.supportEmail,
          null,
          null,
          null,
          null,
          'actualizacionesND',
          ['CER']
        );
        
      } else {
        // Hay actualizaciones, guardarlas
        let bulkOps = [];
        
        for (const item of updates) {
          const date = moment(item[0], "YYYYMMDD").format('YYYY-MM-DD') + 'T00:00';
          
          bulkOps.push({
            updateOne: {
              filter: { fecha: moment(date).utc(true) },
              update: { cer: Number(item[1]) },
              upsert: true
            }
          });
        }
        
        await Tasas.bulkWrite(bulkOps);
        logger.info(`CER: Se han actualizado ${bulkOps.length} registros`);
        
        // Preparar texto del email
        let updateText = updates.map(x => 
          `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
        ).join('');
        
        // Enviar email con las actualizaciones
        await emailService.sendEmail(
          config.email.defaultSender,
          config.email.supportEmail,
          config.email.supportEmail,
          null,
          null,
          null,
          null,
          'actualizacionesArray',
          ['CER', updateText]
        );
      }
    }
    
    // Generar archivo JSON con todos los datos
    generateJSONFile(parsedData, 'dataBCRATasaCER.json');
    
  } catch (error) {
    logger.error(`Error al procesar Excel de CER: ${error.message}`);
    throw error;
  }
}

/**
 * Descarga y procesa archivo de ICL
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function downloadICL() {
  try {
    const fileUrl = `${config.tasas.scraping.baseUrl.bcra}icl2023.xls`;
    const filePath = config.paths.serverFiles;
    
    logger.info(`Descargando archivo de ICL: ${fileUrl}`);
    await download(fileUrl, filePath);
    
    logger.info('Procesando archivo de ICL');
    await processExcelICL(path.join(filePath, 'icl2023.xls'));
    
    return { success: true, message: 'ICL actualizado correctamente' };
  } catch (error) {
    logger.error(`Error al descargar/procesar ICL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Procesa el archivo Excel de ICL
 * 
 * @param {String} filePath - Ruta del archivo Excel
 */
async function processExcelICL(filePath) {
  try {
    const file = xlsx.readFile(filePath, { type: 'binary' });
    const tempData = xlsx.utils.sheet_to_json(file.Sheets['ICL']);
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    
    // Procesar datos del Excel
    tempData.forEach(function(x) {
      Object.keys(x).forEach(function(arr) {
        if (isInt(x[arr]) === true) {
          if (getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()) {
            data.push(x[arr]);
          }
        } else if (typeof x[arr] === 'number' && arr === 'INTEREST RATES AND ADJUSTMENT COEFFICIENTS ESTABLISHED BY THE BCRA') {
          if (countDecimals(x[arr]) >= 1) {
            dataIndex.push(x[arr]);
          }
        }
      });
      
      if (data[0] != undefined && dataIndex[0] != undefined) {
        parsedData.push([data[0], dataIndex[0]]);
      }
      
      data = [];
      dataIndex = [];
    });
    
    // Verificar últimos datos almacenados
    const lastRecord = await Tasas.findOne({ 'icl': { $gte: 0 } }).sort({ 'fecha': -1 });
    
    if (!lastRecord) {
      // Si no hay registros, crear todos
      let bulkOps = [];
      
      for (const item of parsedData) {
        const date = moment(item[0], "YYYYMMDD").format('YYYY-MM-DD') + 'T00:00';
        
        bulkOps.push({
          updateOne: {
            filter: { fecha: moment(date).utc(true) },
            update: { icl: Number(item[1]) },
            upsert: true
          }
        });
      }
      
      await Tasas.bulkWrite(bulkOps);
      logger.info(`ICL: Se han creado ${bulkOps.length} registros nuevos`);
      
    } else {
      // Filtrar sólo las actualizaciones nuevas
      const updates = parsedData.filter(item => 
        moment(moment(item[0], "YYYYMMDD").format("YYYY-MM-DD") + 'T00:00').utc(true)
          .isAfter(moment(lastRecord.fecha))
      );
      
      if (updates.length === 0) {
        logger.info('ICL: No hay actualizaciones disponibles');
        
        // Enviar email informando que no hay actualizaciones
        await emailService.sendEmail(
          config.email.defaultSender,
          config.email.supportEmail,
          config.email.supportEmail,
          null,
          null,
          null,
          null,
          'actualizacionesND',
          ['ICL']
        );
        
      } else {
        // Hay actualizaciones, guardarlas
        let bulkOps = [];
        
        for (const item of updates) {
          const date = moment(item[0], "YYYYMMDD").format('YYYY-MM-DD') + 'T00:00';
          
          bulkOps.push({
            updateOne: {
              filter: { fecha: moment(date).utc(true) },
              update: { icl: Number(item[1]) },
              upsert: true
            }
          });
        }
        
        await Tasas.bulkWrite(bulkOps);
        logger.info(`ICL: Se han actualizado ${bulkOps.length} registros`);
        
        // Preparar texto del email
        let updateText = updates.map(x => 
          `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
        ).join('');
        
        // Enviar email con las actualizaciones
        await emailService.sendEmail(
          config.email.defaultSender,
          config.email.supportEmail,
          config.email.supportEmail,
          null,
          null,
          null,
          null,
          'actualizacionesArray',
          ['ICL', updateText]
        );
      }
    }
    
    // Generar archivo JSON con todos los datos
    generateJSONFile(parsedData, 'dataBCRATasaICL.json');
  } catch (error) {
    logger.error(`Error al procesar Excel de ICL: ${error.message}`);
    throw error;
  }
}

module.exports = {
  downloadTasaPasivaBCRA,
  downloadCER,
  downloadICL
};