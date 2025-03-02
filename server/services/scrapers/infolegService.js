const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');
const Normas = require('../../models/normas');
const DatosPrev = require('../../models/datosprevisionales');
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
 * Clase para almacenar información de normativas
 */
class NormativaInfo {
  constructor(fecha, link, tag, norma, textLink) {
    this.fecha = fecha;
    this.link = link;
    this.tag = tag;
    this.norma = norma;
    this.textLink = textLink || '';
  }
}

/**
 * Convierte fechas en formato español a formato estándar
 * 
 * @param {String} date - Fecha en formato español (ej: "1-ene-2023")
 * @returns {String} - Fecha en formato estándar
 */
function datesSpanish(date) {
  const dateArray = date.split('-');
  
  // Convertir mes en texto a número
  const monthMap = {
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
  };
  
  if (dateArray[1] in monthMap) {
    dateArray[1] = monthMap[dateArray[1]];
  }
  
  return dateArray.join('-');
}

/**
 * Guarda la información de normativas en la base de datos
 * 
 * @param {Array} normativas - Array de objetos NormativaInfo
 * @returns {Promise} - Resultado de la operación
 */
async function saveInfolegData(normativas) {
  if (!normativas || normativas.length === 0) {
    logger.info('Infoleg: No hay nuevas normativas para guardar');
    return { success: true, message: 'No hay nuevas normativas para guardar' };
  }
  
  try {
    logger.info(`Infoleg: Guardando ${normativas.length} normativas`);
    
    // Preparar operaciones bulk
    const bulkOps = normativas.map(normativa => ({
      updateOne: {
        filter: { norma: normativa.norma },
        update: {
          fecha: normativa.fecha,
          link: normativa.link,
          textLink: normativa.textLink,
          tag: normativa.tag
        },
        upsert: true
      }
    }));
    
    // Ejecutar operación bulk
    const result = await Normas.bulkWrite(bulkOps);
    logger.info(`Infoleg: ${result.matchedCount} documentos encontrados, ${result.modifiedCount} documentos modificados, ${result.upsertedCount} documentos insertados`);
    
    // Preparar texto del email
    let emailText = '';
    normativas.forEach(normativa => {
      emailText += `<p>Fecha de publicación: ${moment(normativa.fecha).format('DD-MM-YYYY')}</p>` +
                  `<p>Norma: ${normativa.norma}</p>` +
                  `<p>Asunto: ${normativa.tag}</p>` +
                  `<p>Link: ${normativa.link}</p><br>`;
    });
    
    // Enviar email con las actualizaciones
    await emailService.sendEmail(
      config.email.defaultSender,
      config.email.supportEmail,
      config.email.supportEmail,
      null,
      null,
      null,
      null,
      'actualizacionesNormas',
      emailText
    );
    
    return {
      success: true,
      message: 'Normativas guardadas correctamente',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    };
  } catch (error) {
    logger.error(`Error al guardar normativas de Infoleg: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Realiza el scraping de normativas desde Infoleg
 * 
 * @returns {Promise} - Array de objetos NormativaInfo
 */
async function scrapingInfoleg() {
  try {
    logger.info('Iniciando scraping de normativas desde Infoleg');
    
    // Buscar última fecha registrada
    const lastRecord = await DatosPrev.findOne({ 'estado': true }).sort({ 'fecha': -1 });
    
    if (!lastRecord) {
      throw new Error('No se encontró un registro de fecha previsional para comparar');
    }
    
    const lastDate = lastRecord.fecha;
    
    // Iniciar navegador
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    
    // Cargar página de Infoleg
    await page.goto(config.tasas.scraping.baseUrl.infoleg);
    
    // Obtener contenido
    const content = await page.content();
    const $ = cheerio.load(content);
    
    // Buscar título para verificar
    const title = $('#detalles > strong').text().match(/\d+/);
    
    if (!title || !title[0]) {
      await browser.close();
      throw new Error('No se pudo verificar el título de la página de Infoleg');
    }
    
    // Expresión regular para fechas
    const dtRegex = /^(([1-9]|0[1-9]|1[0-9]|2[1-9]|3[0-1])[-](ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[-](\d{4}))$/i;
    
    // Resultado para almacenar normativas encontradas
    const normativas = [];
    
    // Buscar elementos que contengan fechas
    $('.vr_azul11').each(function() {
      const text = $(this).text().replace(/\s/g, "");
      const norma = $(this).prev().children().text().replace(/\s\s+/g, " ");
      
      // Verificar si el texto contiene una fecha válida
      if (dtRegex.test(text)) {
        // Convertir fecha
        const fechaStr = datesSpanish(text);
        const fecha = moment(fechaStr, 'DD-MM-YYYY');
        
        if (fecha.isValid()) {
          const fechaUtc = moment(fecha.format('YYYY-MM-DD') + 'T00:00').utc(true);
          
          // Si la fecha es igual o posterior a la última registrada
          if (fechaUtc.isSameOrAfter(lastDate)) {
            const link = 'http://servicios.infoleg.gob.ar' + $(this).prev().children().attr('href');
            const data = $(this).next().text();
            
            // Buscar términos relevantes
            const movilidadMatch = data.match(/movilidad/i);
            const haberMatch = data.match(/haber/i);
            
            if (movilidadMatch || haberMatch) {
              const tag = movilidadMatch ? movilidadMatch[0] : haberMatch[0];
              normativas.push(new NormativaInfo(fechaUtc, link, tag, norma));
            }
          }
        }
      }
    });
    
    // Si no hay normativas, cerrar navegador y retornar
    if (normativas.length === 0) {
      await browser.close();
      logger.info('Infoleg: No se encontraron nuevas normativas');
      return [];
    }
    
    logger.info(`Infoleg: Se encontraron ${normativas.length} normativas nuevas`);
    
    // Para cada normativa, buscar enlace al texto completo
    for (let i = 0; i < normativas.length; i++) {
      await page.goto(normativas[i].link, { waitUntil: 'load', timeout: 30000 });
      
      const detailContent = await page.content();
      const $detail = cheerio.load(detailContent);
      
      // Buscar enlace al texto completo
      const textLink = $detail('#Textos_Completos > p > a').filter(function() {
        return $detail(this).text().trim() === 'Texto completo de la norma';
      });
      
      if (textLink.length > 0) {
        normativas[i].textLink = 'http://servicios.infoleg.gob.ar/infolegInternet/' + textLink.attr('href');
      }
    }
    
    // Cerrar navegador
    await browser.close();
    
    return normativas;
  } catch (error) {
    logger.error(`Error al hacer scraping de Infoleg: ${error.message}`);
    throw error;
  }
}

/**
 * Actualiza las normativas desde Infoleg
 * 
 * @returns {Promise} - Resultado de la operación
 */
async function updateInfoleg() {
  try {
    // Obtener normativas
    const normativas = await scrapingInfoleg();
    
    // Guardar normativas
    const result = await saveInfolegData(normativas);
    
    return {
      success: true,
      message: `Infoleg: ${normativas.length} normativas procesadas`,
      ...result
    };
  } catch (error) {
    logger.error(`Error al actualizar normativas de Infoleg: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scrapingInfoleg,
  saveInfolegData,
  updateInfoleg
};