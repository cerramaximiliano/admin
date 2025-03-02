const puppeteer = require('puppeteer');
const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');
const TasasActivaBNA = require('../../models/tasas-activa-bna');
const TasasPasivaBNA = require('../../models/tasas-pasiva-bna');
const TasasActa2658 = require('../../models/tasas-activa-2658');
const TasasActa2764 = require('../../models/tasas-activa-2764');

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
 * Obtiene el modelo correspondiente según el tipo de tasa
 * 
 * @param {String} tasa - Tipo de tasa (1: Activa BNA, 2: Pasiva BNA, etc.)
 * @returns {Model} - Modelo de Mongoose
 */
function getModeloTasa(tasa) {
  switch (tasa) {
    case '1':
      return TasasActivaBNA;
    case '2':
      return TasasPasivaBNA;
    case '22':
      return TasasActa2658;
    case '23':
      return TasasActa2764;
    default:
      throw new Error(`Tipo de tasa no soportado: ${tasa}`);
  }
}

/**
 * Obtiene el nombre legible de la tasa
 * 
 * @param {String} tasa - Tipo de tasa (1: Activa BNA, 2: Pasiva BNA, etc.)
 * @returns {String} - Nombre legible
 */
function getNombreTasa(tasa) {
  switch (tasa) {
    case '1':
      return 'Tasa Activa BNA';
    case '2':
      return 'Tasa Pasiva BNA';
    case '22':
      return 'Tasa Activa CNAT Acta 2658';
    case '23':
      return 'Tasa Activa CNAT Acta 2764';
    default:
      return `Tasa tipo ${tasa}`;
  }
}

/**
 * Realiza scraping de tasas desde el sitio de CPACF
 * 
 * @param {String} tasa - Tipo de tasa (1: Activa BNA, 2: Pasiva BNA, etc.)
 * @param {String} dni - DNI para autenticación
 * @param {String} tomo - Tomo para autenticación
 * @param {String} folio - Folio para autenticación
 * @returns {Promise} - Resultado de la operación
 */
async function scrapingCpacfTasas(tasa, dni, tomo, folio) {
  try {
    const nombreTasa = getNombreTasa(tasa);
    logger.info(`Iniciando scraping de ${nombreTasa} desde CPACF`);
    
    // Iniciar navegador
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    
    // Cargar página de login
    await page.goto(config.tasas.scraping.cpacf.url);
    
    // Esperar y completar formulario de login
    const selectEle = await page.waitForSelector('[name="dni"]');
    const selectEleTomo = await page.waitForSelector('[name="tomo"]');
    const selectEleFolio = await page.waitForSelector('[name="folio"]');
    
    await page.type('[name="dni"]', dni);
    await page.type('[name="tomo"]', tomo);
    await page.type('[name="folio"]', folio);
    
    // Hacer click en siguiente
    await page.waitForSelector('#sgt > a');
    await page.click('#sgt > a');
    
    // Esperar a que cargue la página de selección de tasa
    await page.waitForSelector('#center');
    
    // Seleccionar tipo de tasa
    await page.select('select[name="rate"]', tasa);
    
    // Hacer click en siguiente
    await page.waitForSelector('#sgt > a');
    await page.click('#sgt > a');
    
    // Esperar a que cargue el formulario de fechas
    await page.waitForSelector('#capital_0');
    await page.waitForSelector('#date_from_0');
    await page.waitForSelector('#date_to');
    
    // Completar formulario con fechas y monto
    await page.type('#capital_0', '100000');
    await page.type('#date_from_0', '10102020');
    
    // Usar la fecha actual para el cálculo
    const fechaActual = moment().format('DDMMYYYY');
    await page.type('#date_to', fechaActual);
    
    // Hacer click en siguiente
    await page.waitForSelector('#sgt > a');
    await page.click('#sgt > a');
    
    // Esperar y hacer click en el enlace para ver la tabla de tasas
    const link = await page.waitForSelector('#nuevocalc > a:nth-child(3)');
    await page.click('#nuevocalc > a:nth-child(3)');
    
    // Esperar a que se abra la nueva pestaña
    const target = await browser.waitForTarget(target => target.opener() === page.target());
    const newPage = await target.page();
    
    // Esperar a que cargue el contenido
    await newPage.waitForSelector('#contenido');
    
    // Extraer datos de la tabla
    const datosTabla = await newPage.evaluate(() => {
      const datos = [];
      const tabla = document.querySelector('#contenido table');
      
      if (tabla) {
        const filas = tabla.getElementsByTagName('tr');
        
        for (let i = 1; i < filas.length; i++) {
          const fila = filas[i];
          const celdas = fila.getElementsByTagName('td');
          
          const fechaInicio = celdas[0].textContent;
          const fechaFin = celdas[1].textContent;
          const interesMensual = celdas[2].textContent;
          
          datos.push({
            updateOne: {
              filter: {
                fechaInicio
              },
              update: {
                fechaInicio,
                fechaFin,
                interesMensual
              },
              upsert: true
            }
          });
        }
      }
      
      return datos;
    });
    
    // Cerrar navegador
    await browser.close();
    
    // Si no hay datos, retornar error
    if (!datosTabla || datosTabla.length === 0) {
      throw new Error(`No se encontraron datos de ${nombreTasa} en CPACF`);
    }
    
    logger.info(`${nombreTasa}: Se encontraron ${datosTabla.length} registros`);
    
    // Procesar fechas y valores
    const datosFormateados = datosTabla.map(objeto => {
      // Establecer la fecha fin como hoy si es "ACTUALIDAD"
      if (objeto.updateOne.update.fechaFin.trim() === 'ACTUALIDAD') {
        objeto.updateOne.update.fechaFin = moment().utc().startOf('day').toDate();
      } else {
        objeto.updateOne.update.fechaFin = moment.utc(objeto.updateOne.update.fechaFin, 'DD/MM/YYYY').toDate();
      }
      
      // Formatear fecha inicio
      objeto.updateOne.update.fechaInicio = moment.utc(objeto.updateOne.update.fechaInicio, 'DD/MM/YYYY').toDate();
      objeto.updateOne.filter.fechaInicio = moment.utc(objeto.updateOne.filter.fechaInicio, 'DD/MM/YYYY').toDate();
      
      // Convertir interés a número
      objeto.updateOne.update.interesMensual = parseFloat(objeto.updateOne.update.interesMensual);
      
      return objeto;
    });
    
    // Obtener el modelo correspondiente
    const Modelo = getModeloTasa(tasa);
    
    // Guardar datos en la base de datos
    const result = await Modelo.bulkWrite(datosFormateados);
    
    logger.info(`${nombreTasa}: ${result.matchedCount} documentos encontrados, ${result.modifiedCount} documentos modificados, ${result.upsertedCount} documentos insertados`);
    
    return {
      success: true,
      message: `${nombreTasa}: Datos actualizados correctamente`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    };
  } catch (error) {
    logger.error(`Error al hacer scraping de ${getNombreTasa(tasa)}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scrapingCpacfTasas
};