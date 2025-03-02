const cron = require('node-cron');
const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');

// Importar servicios
const bcraService = require('../scrapers/bcraService');
const bnaService = require('../scrapers/bnaService');
const cpacfService = require('../scrapers/cpacfService');
const infolegService = require('../scrapers/infolegService');
const categoriasService = require('../categorias/categoriasService');

// Colección de tareas programadas
const tasks = new Map();

/**
 * Programa una tarea para ejecutarse periódicamente
 * 
 * @param {String} taskId - Identificador único de la tarea
 * @param {String} cronExpression - Expresión cron para la programación
 * @param {Function} taskFunction - Función a ejecutar
 * @param {String} description - Descripción de la tarea
 * @returns {Boolean} - true si la tarea se programó correctamente
 */
function scheduleTask(taskId, cronExpression, taskFunction, description) {
  try {
    // Verificar si la tarea ya existe
    if (tasks.has(taskId)) {
      logger.warn(`La tarea ${taskId} ya está programada`);
      return false;
    }
    
    // Verificar expresión cron
    if (!cron.validate(cronExpression)) {
      logger.error(`Expresión cron inválida para la tarea ${taskId}: ${cronExpression}`);
      return false;
    }
    
    // Programar tarea
    const task = cron.schedule(cronExpression, async () => {
      logger.info(`Ejecutando tarea: ${taskId} - ${description}`);
      
      try {
        const startTime = process.hrtime();
        const result = await taskFunction();
        const elapsedTime = process.hrtime(startTime);
        const elapsedTimeMs = (elapsedTime[0] * 1000 + elapsedTime[1] / 1000000).toFixed(2);
        
        logger.info(`Tarea ${taskId} completada en ${elapsedTimeMs}ms con resultado: ${JSON.stringify(result)}`);
      } catch (error) {
        logger.error(`Error al ejecutar tarea ${taskId}: ${error.message}`);
      }
    }, {
      scheduled: true,
      timezone: config.server.timezone
    });
    
    // Guardar tarea
    tasks.set(taskId, {
      id: taskId,
      description,
      expression: cronExpression,
      task,
      lastRun: null,
      status: 'scheduled'
    });
    
    logger.info(`Tarea programada: ${taskId} - ${description} con expresión cron: ${cronExpression}`);
    return true;
  } catch (error) {
    logger.error(`Error al programar tarea ${taskId}: ${error.message}`);
    return false;
  }
}

/**
 * Detiene una tarea programada
 * 
 * @param {String} taskId - Identificador de la tarea
 * @returns {Boolean} - true si la tarea se detuvo correctamente
 */
function stopTask(taskId) {
  if (!tasks.has(taskId)) {
    logger.warn(`La tarea ${taskId} no existe`);
    return false;
  }
  
  try {
    const taskInfo = tasks.get(taskId);
    taskInfo.task.stop();
    taskInfo.status = 'stopped';
    tasks.set(taskId, taskInfo);
    
    logger.info(`Tarea detenida: ${taskId}`);
    return true;
  } catch (error) {
    logger.error(`Error al detener tarea ${taskId}: ${error.message}`);
    return false;
  }
}

/**
 * Inicia una tarea que estaba detenida
 * 
 * @param {String} taskId - Identificador de la tarea
 * @returns {Boolean} - true si la tarea se inició correctamente
 */
function startTask(taskId) {
  if (!tasks.has(taskId)) {
    logger.warn(`La tarea ${taskId} no existe`);
    return false;
  }
  
  try {
    const taskInfo = tasks.get(taskId);
    
    if (taskInfo.status !== 'stopped') {
      logger.warn(`La tarea ${taskId} no está detenida`);
      return false;
    }
    
    taskInfo.task.start();
    taskInfo.status = 'scheduled';
    tasks.set(taskId, taskInfo);
    
    logger.info(`Tarea iniciada: ${taskId}`);
    return true;
  } catch (error) {
    logger.error(`Error al iniciar tarea ${taskId}: ${error.message}`);
    return false;
  }
}

/**
 * Ejecuta una tarea inmediatamente
 * 
 * @param {String} taskId - Identificador de la tarea
 * @returns {Promise} - Resultado de la ejecución
 */
async function executeTaskNow(taskId) {
  if (!tasks.has(taskId)) {
    logger.warn(`La tarea ${taskId} no existe`);
    return { success: false, error: 'Tarea no encontrada' };
  }
  
  try {
    const taskInfo = tasks.get(taskId);
    logger.info(`Ejecutando tarea inmediatamente: ${taskId} - ${taskInfo.description}`);
    
    const startTime = process.hrtime();
    const result = await taskInfo.task.job();
    const elapsedTime = process.hrtime(startTime);
    const elapsedTimeMs = (elapsedTime[0] * 1000 + elapsedTime[1] / 1000000).toFixed(2);
    
    // Actualizar información de última ejecución
    taskInfo.lastRun = new Date();
    tasks.set(taskId, taskInfo);
    
    logger.info(`Tarea ${taskId} ejecutada inmediatamente. Completada en ${elapsedTimeMs}ms`);
    return { success: true, result, elapsedTimeMs };
  } catch (error) {
    logger.error(`Error al ejecutar tarea ${taskId} inmediatamente: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene la lista de todas las tareas programadas
 * 
 * @returns {Array} - Lista de tareas
 */
function getTasksList() {
  const tasksList = [];
  
  tasks.forEach((taskInfo, taskId) => {
    tasksList.push({
      id: taskId,
      description: taskInfo.description,
      status: taskInfo.status,
      expression: taskInfo.expression,
      lastRun: taskInfo.lastRun ? moment(taskInfo.lastRun).format('YYYY-MM-DD HH:mm:ss') : null
    });
  });
  
  return tasksList;
}

/**
 * Inicializa las tareas del sistema
 */
function initializeTasks() {
  logger.info('Inicializando tareas programadas');
  
  // Tareas de BCRA
  scheduleTask(
    'bcra-tasa-pasiva',
    `00 ${config.tasas.checkIntervals.pasivaBCRA.hour} * * *`,
    bcraService.downloadTasaPasivaBCRA,
    'Descarga y procesa tasa pasiva BCRA'
  );
  
  scheduleTask(
    'bcra-cer',
    `05 ${config.tasas.checkIntervals.cer.hour} * * *`,
    bcraService.downloadCER,
    'Descarga y procesa CER'
  );
  
  scheduleTask(
    'bcra-icl',
    `10 ${config.tasas.checkIntervals.icl.hour} * * *`,
    bcraService.downloadICL,
    'Descarga y procesa ICL'
  );
  
  // Tareas de BNA
  scheduleTask(
    'bna-tasa-pasiva',
    `20 ${config.tasas.checkIntervals.pasivaBNA.hour} * * *`,
    bnaService.downloadTasaPasivaBNA,
    'Descarga y procesa tasa pasiva BNA'
  );
  
  scheduleTask(
    'bna-tasa-activa',
    `18 ${config.tasas.checkIntervals.activaBNA.hour} * * *`,
    bnaService.updateTasaActivaBNA,
    'Actualiza tasa activa BNA'
  );
  
  // Tareas de CPACF
  scheduleTask(
    'cpacf-tasa-activa-bna',
    `58 11 * * *`,
    () => cpacfService.scrapingCpacfTasas(
      '1', 
      config.tasas.scraping.cpacf.credentials.dni,
      config.tasas.scraping.cpacf.credentials.tomo,
      config.tasas.scraping.cpacf.credentials.folio
    ),
    'Scraping de tasa activa BNA desde CPACF'
  );
  
  scheduleTask(
    'cpacf-tasa-pasiva-bna',
    `59 11 * * *`,
    () => cpacfService.scrapingCpacfTasas(
      '2', 
      config.tasas.scraping.cpacf.credentials.dni,
      config.tasas.scraping.cpacf.credentials.tomo,
      config.tasas.scraping.cpacf.credentials.folio
    ),
    'Scraping de tasa pasiva BNA desde CPACF'
  );
  
  scheduleTask(
    'cpacf-tasa-acta-2658',
    `00 12 * * *`,
    () => cpacfService.scrapingCpacfTasas(
      '22', 
      config.tasas.scraping.cpacf.credentials.dni,
      config.tasas.scraping.cpacf.credentials.tomo,
      config.tasas.scraping.cpacf.credentials.folio
    ),
    'Scraping de tasa acta 2658 desde CPACF'
  );
  
  scheduleTask(
    'cpacf-tasa-acta-2764',
    `01 12 * * *`,
    () => cpacfService.scrapingCpacfTasas(
      '23', 
      config.tasas.scraping.cpacf.credentials.dni,
      config.tasas.scraping.cpacf.credentials.tomo,
      config.tasas.scraping.cpacf.credentials.folio
    ),
    'Scraping de tasa acta 2764 desde CPACF'
  );
  
  // Tarea de Infoleg
  scheduleTask(
    'infoleg-normativas',
    `25 ${config.tasas.checkIntervals.pasivaBCRA.hour} * * *`,
    infolegService.updateInfoleg,
    'Actualiza normativas desde Infoleg'
  );
  
  // Tarea de categorías
  scheduleTask(
    'actualizar-categorias',
    `30 ${config.tasas.checkIntervals.pasivaBCRA.hour} * * *`,
    categoriasService.actualizarCategorias,
    'Actualiza categorías según movilidad'
  );
  
  logger.info(`Se inicializaron ${tasks.size} tareas programadas`);
}

module.exports = {
  scheduleTask,
  stopTask,
  startTask,
  executeTaskNow,
  getTasksList,
  initializeTasks
};  