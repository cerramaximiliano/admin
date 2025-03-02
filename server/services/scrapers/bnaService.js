const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');
const Tasas = require('../../models/tasas');
const emailService = require('../email/emailService');

/**
 * Configuración para Puppeteer
 */
const chromeOptions = {
  headless: true,
  slowMo: 100,
  defaultViewport: null,
  args: ['--no-sandbox'],
  ignoreDefaultArgs: ["--disable-extensions"],
};

/**
 * Descarga el PDF de tasa pasiva BNA y lo procesa
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function downloadTasaPasivaBNA() {
  try {
    logger.info('Iniciando descarga de tasa pasiva BNA');
    
    // Iniciar navegador y abrir página
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    await page.goto(config.tasas.scraping.baseUrl.bna);
    
    // Extraer URL del PDF de tasas pasivas
    const content = await page.content();
    const $ = cheerio.load(content);
    let pdfUrl = null;
    
    // Buscar enlace al PDF de tasas pasivas
    $('#collapseTwo > .panel-body > .plazoTable > ul > li').each(function() {
      const text = $(this).text().trim();
      if (text.match(/tasas de operaciones pasivas/i)) {
        pdfUrl = $(this).children().attr('href');
        logger.info(`Tasa Pasiva BNA: URL encontrada: ${pdfUrl}`);
      }
    });
    
    if (!pdfUrl) {
      await browser.close();
      throw new Error('No se encontró la URL del PDF de tasa pasiva BNA');
    }
    
    // Construir URL completa y nombre de archivo
    const fileUrl = 'https://www.bna.com.ar' + pdfUrl;
    const fileName = `tasa_pasiva_BNA_${moment().format('YYYY-MM-DD')}.pdf`;
    const fileDir = path.join(config.paths.serverFiles, 'tasa_pasiva_BNA');
    const filePath = path.join(fileDir, fileName);
    
    // Asegurar que el directorio existe
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    // Descargar el PDF
    await downloadFile(fileUrl, filePath);
    await browser.close();
    
    // Procesar el PDF descargado
    await processPasivaBNAPdf(filePath);
    
    return { success: true, message: 'Tasa pasiva BNA descargada y procesada correctamente' };
  } catch (error) {
    logger.error(`Error al descargar/procesar tasa pasiva BNA: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Descarga un archivo desde una URL
 * 
 * @param {String} url - URL del archivo
 * @param {String} outputPath - Ruta donde guardar el archivo
 * @returns {Promise} - Promesa que se resuelve cuando termina la descarga
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath, { 'flags': 'w' });
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        logger.info(`Archivo descargado correctamente: ${outputPath}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {}); // Eliminar archivo parcial
        logger.error(`Error al guardar archivo: ${err.message}`);
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Eliminar archivo parcial
      logger.error(`Error al descargar archivo: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Procesa el PDF de tasa pasiva BNA
 * 
 * @param {String} filePath - Ruta del archivo PDF
 */
async function processPasivaBNAPdf(filePath) {
  try {
    let tasasList = [];
    let datesTasas = [];
    
    // Leer archivo PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    
    // Guardar el texto extraído
    const textPath = path.join(config.paths.serverFiles, 'tasa_pasiva_BNA', 'tasaPasivaBNA.txt');
    fs.writeFileSync(textPath, pdfData.text);
    
    // Procesar línea por línea
    const lines = pdfData.text.split('\n');
    
    // Expresiones regulares para buscar fechas y tasas
    const regexNumber = /\d*(\.|\,)?\d*/;
    const dateRegex = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g;
    const validDateRegex = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;
    
    // Extraer tasas
    for (const line of lines) {
      // Buscar porcentajes
      if (line.includes('%')) {
        const parts = line.split('%');
        const values = parts.filter(x => x.trim() !== '');
        
        if (values.length > 0) {
          const rates = [];
          
          for (const part of values) {
            const match = part.match(regexNumber);
            if (match && match[0] !== '' && match[0] !== undefined) {
              const rate = parseFloat(match[0].replace(',', '.').replace(' ', ''));
              rates.push(rate);
            }
          }
          
          if (rates.length > 0) {
            tasasList.push(rates);
          }
        }
      }
      
      // Buscar fechas
      const dateMatch = dateRegex.exec(line);
      if (dateMatch) {
        const validMatch = validDateRegex.exec(dateMatch[0]);
        if (validMatch && moment(validMatch[0], 'DD-MM-YY').isValid()) {
          datesTasas.push(validMatch[0]);
        }
      }
      
      // Reiniciar regex para seguir buscando
      dateRegex.lastIndex = 0;
      validDateRegex.lastIndex = 0;
    }
    
    // Filtrar tasas válidas
    tasasList = tasasList.filter(x => x.length !== 0);
    
    // Verificar si se encontraron tasas y fechas válidas
    if (tasasList.length === 0 || datesTasas.length === 0) {
      logger.warn('Tasa Pasiva BNA: No se encontraron tasas o fechas válidas en el PDF');
      return;
    }
    
    // Verificar si la tasa y fecha son válidas
    if (typeof tasasList[0][0] === 'number' && moment(datesTasas[0], 'DD-MM-YY').isValid()) {
      // Convertir fecha del PDF
      const dateFromPdf = moment(moment(datesTasas[0], "DD-MM-YY").format('YYYY-MM-DD') + 'T00:00').utc(true);
      
      // Buscar último registro en la base de datos
      const lastRecord = await Tasas.findOne({ 'tasaPasivaBNA': { $gte: 0 } })
        .sort({ 'fecha': -1 });
      
      if (!lastRecord) {
        logger.error('Tasa Pasiva BNA: No se encontraron registros previos en la base de datos');
        return;
      }
      
      // Fecha actual
      const today = moment(moment().format('YYYY-MM-DD') + 'T00:00').utc(true);
      
      // Determinar qué hacer según las fechas
      if (moment(lastRecord.fecha).isSame(today, 'day')) {
        logger.info('Tasa Pasiva BNA: El último registro ya es de hoy, no se requiere actualización');
      } else if (moment(lastRecord.fecha).isBefore(today, 'day')) {
        logger.info('Tasa Pasiva BNA: El último registro es anterior a hoy, se requiere actualización');
        
        if (dateFromPdf.isSameOrBefore(today, 'day')) {
          logger.info('Tasa Pasiva BNA: Actualizando con la tasa del PDF');
          
          // Actualizar registro
          const result = await Tasas.findOneAndUpdate(
            { fecha: today },
            { tasaPasivaBNA: Number(tasasList[0][0] / 365) },
            { new: true, upsert: true }
          );
          
          // Enviar email de notificación
          const emailData = [
            moment().format("YYYY-MM-DD"),
            (tasasList[0][0] / 365),
            'Tasa Pasiva BNA'
          ];
          
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
          
        } else if (dateFromPdf.isAfter(today, 'day')) {
          logger.info('Tasa Pasiva BNA: La fecha del PDF es posterior a hoy, actualizando con el último valor conocido');
          
          // Actualizar con último valor conocido
          const result = await Tasas.findOneAndUpdate(
            { fecha: today },
            { tasaPasivaBNA: Number(lastRecord.tasaPasivaBNA) },
            { new: true, upsert: true }
          );
          
          // Enviar email de notificación
          const emailData = [
            moment().format("YYYY-MM-DD"),
            lastRecord.tasaPasivaBNA,
            'Tasa Pasiva BNA'
          ];
          
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
    } else {
      logger.warn('Tasa Pasiva BNA: Formato de tasas o fechas inválido, requiere actualización manual');
    }
  } catch (error) {
    logger.error(`Error al procesar PDF de tasa pasiva BNA: ${error.message}`);
    throw error;
  }
}

/**
 * Extrae la tasa activa BNA de la web
 * 
 * @returns {Promise} - Objeto con los datos extraídos
 */
async function scrapeTasaActivaBNA() {
  try {
    logger.info('Iniciando scraping de tasa activa BNA');
    
    // Iniciar navegador y abrir página
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    await page.goto(config.tasas.scraping.baseUrl.bna);
    
    // Extraer información de tasas
    const tasaActiva = await page.evaluate(() => {
      const items = document.querySelectorAll("#collapseTwo ul li");
      const title = document.querySelector("#collapseTwo h3");
      const result = [];
      
      if (title) {
        result.push(title.innerText);
      }
      
      items.forEach((item) => {
        result.push(item.innerText);
      });
      
      return result;
    });
    
    await browser.close();
    
    // Verificar que se obtuvo información
    if (!tasaActiva || tasaActiva.length === 0) {
      throw new Error('No se pudo extraer información de tasa activa BNA');
    }
    
    logger.info(`Tasa Activa BNA: Extracción exitosa, ${tasaActiva.length} elementos encontrados`);
    return tasaActiva;
  } catch (error) {
    logger.error(`Error al extraer tasa activa BNA: ${error.message}`);
    throw error;
  }
}

/**
 * Extrae la fecha de la tasa activa
 * 
 * @param {Array} tasaActiva - Datos extraídos de la web
 * @returns {Moment} - Objeto moment con la fecha
 */
function extractFechaTasaActiva(tasaActiva) {
  try {
    // Expresiones regulares para buscar fechas
    const dateRegex = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g;
    const validDateRegex = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;
    
    // Buscar fecha en el título
    const dateMatch = dateRegex.exec(tasaActiva[0]);
    
    if (!dateMatch) {
      throw new Error('No se encontró fecha en los datos de tasa activa BNA');
    }
    
    const validMatch = validDateRegex.exec(dateMatch[0]);
    
    if (!validMatch || !moment(validMatch[0], 'DD/MM/YYYY').isValid()) {
      throw new Error('Formato de fecha inválido en los datos de tasa activa BNA');
    }
    
    const date = moment(validMatch[0], 'DD/MM/YYYY').format('YYYY-MM-DD') + 'T00:00';
    return moment(date).utc(true);
  } catch (error) {
    logger.error(`Error al extraer fecha de tasa activa BNA: ${error.message}`);
    throw error;
  }
}

/**
 * Extrae el valor de la tasa activa
 * 
 * @param {Array} tasaActiva - Datos extraídos de la web
 * @returns {Number} - Valor de la tasa
 */
function extractValorTasaActiva(tasaActiva) {
  try {
    // Buscar elemento que contiene "tasa activa"
    let tasaIndex = -1;
    
    for (let i = 0; i < tasaActiva.length; i++) {
      if (/tasa activa/i.test(tasaActiva[i])) {
        tasaIndex = i;
        break;
      }
    }
    
    if (tasaIndex === -1) {
      throw new Error('No se encontró información de tasa activa en los datos extraídos');
    }
    
    // Buscar "tasa efectiva mensual" o "tasa efectiva anual"
    let mensualIndex = -1;
    let anualIndex = -1;
    
    for (let i = 0; i < tasaActiva.length; i++) {
      if (/tasa efectiva mensual/i.test(tasaActiva[i])) {
        mensualIndex = i;
      } else if (/tasa efectiva anual vencida/i.test(tasaActiva[i])) {
        anualIndex = i;
      }
    }
    
    if (mensualIndex === -1 && anualIndex === -1) {
      throw new Error('No se encontró información de tasa efectiva en los datos extraídos');
    }
    
    // Extraer y procesar el valor numérico
    const regexNumber = /\d*(\.|\,)?\d*/;
    const lineToProcess = mensualIndex !== -1 ? tasaActiva[mensualIndex] : tasaActiva[anualIndex];
    const words = lineToProcess.split(' ');
    
    let value = null;
    for (const word of words) {
      const match = word.match(regexNumber);
      if (match && match[0] !== '' && match[0] !== undefined) {
        value = parseFloat(match[0].replace(',', '.').replace(' ', ''));
        break;
      }
    }
    
    if (value === null) {
      throw new Error('No se pudo extraer valor numérico de la tasa activa');
    }
    
    // Convertir según el tipo de tasa
    if (mensualIndex !== -1) {
      return value / 30; // Tasa mensual a diaria
    } else {
      return value / 365; // Tasa anual a diaria
    }
  } catch (error) {
    logger.error(`Error al extraer valor de tasa activa BNA: ${error.message}`);
    throw error;
  }
}

/**
 * Actualiza la tasa activa BNA en la base de datos
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function updateTasaActivaBNA() {
  try {
    logger.info('Iniciando actualización de tasa activa BNA');
    
    // Obtener datos de la tasa activa
    const tasaActiva = await scrapeTasaActivaBNA();
    
    // Extraer fecha y valor
    const dateData = extractFechaTasaActiva(tasaActiva);
    const tasaData = extractValorTasaActiva(tasaActiva);
    
    // Fecha actual
    const today = moment(moment().format('YYYY-MM-DD') + 'T00:00').utc(true);
    
    // Buscar último registro en la base de datos
    const lastRecord = await Tasas.findOne({ 'tasaActivaBNA': { $gte: 0 } })
      .sort({ 'fecha': -1 });
    
    if (!lastRecord) {
      throw new Error('No se encontraron registros previos de tasa activa BNA');
    }
    
    // Determinar acción según fechas
    if (moment(lastRecord.fecha).isSame(today, 'day')) {
      logger.info('Tasa Activa BNA: El último registro ya es de hoy, no se requiere actualización');
      return { success: true, message: 'No se requiere actualización de tasa activa BNA' };
    } 
    
    // Es necesario actualizar
    let updateValue, updateReason;
    
    if (today.isSame(dateData, 'day')) {
      // Actualizar con la tasa del sitio
      updateValue = tasaData;
      updateReason = 'Actualizando con la tasa del sitio web (fecha actual)';
    } else if (today.isBefore(dateData, 'day')) {
      // Fecha del sitio es futura, usar valor anterior
      updateValue = lastRecord.tasaActivaBNA;
      updateReason = 'La fecha del sitio es posterior a hoy, actualizando con el último valor conocido';
    } else {
      // Fecha del sitio es pasada, usar valor del sitio
      updateValue = tasaData;
      updateReason = 'Actualizando con la tasa del sitio web (fecha anterior)';
    }
    
    logger.info(`Tasa Activa BNA: ${updateReason}`);
    
    // Actualizar registro
    const result = await Tasas.findOneAndUpdate(
      { fecha: today },
      { tasaActivaBNA: Number(updateValue) },
      { new: true, upsert: true }
    );
    
    // Enviar email de notificación
    const emailData = [
      moment().format("YYYY-MM-DD"),
      updateValue,
      'Tasa Activa BNA'
    ];
    
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
    
    return { 
      success: true, 
      message: 'Tasa activa BNA actualizada correctamente',
      date: today.format('YYYY-MM-DD'),
      value: updateValue
    };
  } catch (error) {
    logger.error(`Error al actualizar tasa activa BNA: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  downloadTasaPasivaBNA,
  updateTasaActivaBNA
};