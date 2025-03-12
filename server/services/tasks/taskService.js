const cron = require('node-cron');
const moment = require('moment');
const config = require('../../config');
const logger = require('../../utils/logger');
const database = require('../../utils/database');

// Importar servicios
const { mainConsejoService, findMissingDataService } = require('../scrapers/tasas/consejoService');
const { actualizarTasaActivaBNAConReintentos } = require('../scrapers/tasas/bnaService');
const { mainBnaPasivaService } = require("../scrapers/tasas/bnaProcesadorPDF")
const { getCurrentRateAndSave, findMissingDataServiceBcra } = require("../scrapers/tasas/bcraService");
const { findMissingDataColegio } = require('../scrapers/tasas/colegioService');

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
    // Verificar si la tarea ya existe y detenerla si es así
    if (tasks.has(taskId)) {
      stopTask(taskId);
      logger.info(`Deteniendo tarea existente ${taskId} para reprogramarla`);
    }

    // Verificar expresión cron
    if (!cron.validate(cronExpression)) {
      logger.error(`Expresión cron inválida para la tarea ${taskId}: ${cronExpression}`);
      return false;
    }

    // Crear una función envoltorio que verifique la conexión a MongoDB
    const wrappedTaskFunction = async () => {
      // Verificar la conexión a MongoDB antes de ejecutar la tarea
      if (!database.isConnected()) {
        logger.warn(`La tarea ${taskId} no se ejecutará porque MongoDB no está conectado`);
        return { success: false, skipped: true, reason: 'MongoDB desconectado' };
      }

      logger.info(`Ejecutando tarea: ${taskId} - ${description}`);

      try {
        const startTime = process.hrtime();
        const result = await taskFunction();
        const elapsedTime = process.hrtime(startTime);
        const elapsedTimeMs = (elapsedTime[0] * 1000 + elapsedTime[1] / 1000000).toFixed(2);

        // Actualizar información de última ejecución
        const taskInfo = tasks.get(taskId);
        if (taskInfo) {
          taskInfo.lastRun = new Date();
          tasks.set(taskId, taskInfo);
        }

        logger.info(`Tarea ${taskId} completada en ${elapsedTimeMs}ms con resultado: ${JSON.stringify(result)}`);
        return { success: true, result, elapsedTimeMs };
      } catch (error) {
        logger.error(`Error al ejecutar tarea ${taskId}: ${error.message}`);
        return { success: false, error: error.message };
      }
    };

    // Programar tarea
    const task = cron.schedule(cronExpression, wrappedTaskFunction, {
      scheduled: true,
      timezone: config.server.timezone
    });

    // Guardar referencia a la función original para ejecuciones manuales
    task.job = wrappedTaskFunction;

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

    // Verificar la conexión a MongoDB antes de ejecutar la tarea
    if (!database.isConnected()) {
      logger.warn(`La ejecución manual de la tarea ${taskId} no se realizará porque MongoDB no está conectado`);
      return { success: false, skipped: true, reason: 'MongoDB desconectado' };
    }

    const result = await taskInfo.task.job();

    // La información de última ejecución ya se actualiza en el job

    return result;
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
 * Detiene todas las tareas programadas
 */
function stopAllTasks() {
  logger.info('Deteniendo todas las tareas programadas');

  tasks.forEach((taskInfo, taskId) => {
    try {
      taskInfo.task.stop();
      taskInfo.status = 'stopped';
      tasks.set(taskId, taskInfo);
    } catch (error) {
      logger.error(`Error al detener tarea ${taskId}: ${error.message}`);
    }
  });

  logger.info(`Se detuvieron ${tasks.size} tareas programadas`);
}

/**
 * Inicializa las tareas del sistema
 */
function initializeTasks() {
  logger.info('Inicializando tareas programadas');

  // Detener todas las tareas existentes
  stopAllTasks();

  // Tareas de BNA - Tasa Activa
  scheduleTask(
    'bna-tasa-activa-bna',
    '0 7,9,11,13,15,21 * * *',
    actualizarTasaActivaBNAConReintentos,
    'Scraping de tasa activa BNA desde BNA'
  );

  scheduleTask(
    'búsqueda-fechas-activa-bna',
    `10 7 * * *`,
    () => findMissingDataService("tasa_activa_BN", "tasaActivaBNA"),
    'Búsqueda de fechas sin datos y scraping de tasa activa BNA desde Consejo'
  );

  scheduleTask(
    'consejo-tasa-activa-bna',
    `0 22 * * *`,
    () => mainConsejoService({ tasa: "tasa_activa_BN", database: "tasaActivaBNA" }),
    'Scraping de tasa activa BNA desde Consejo'
  );

  // Tareas Tasa Pasiva BNA
  scheduleTask(
    'bna-tasa-pasiva-bna',
    `15 7,9,11,13,15,21 * * *`,
    //`59 14 * * *`,
    mainBnaPasivaService,
    'Scraping de tasa pasiva BNA desde BNA'
  );

  scheduleTask(
    'consejo-tasa-pasiva-bna',
    `25 7 * * *`,
    () => mainConsejoService({ tasa: "tasa_pasiva_BN", database: "tasaPasivaBNA" }),
    'Scraping de tasa pasiva BNA desde Consejo'
  );

  scheduleTask(
    'búsqueda-fechas-pasiva-bna',
    //`15 7 * * *`,
    `10 22 * * *`,
    () => findMissingDataService("tasa_pasiva_BN", "tasaPasivaBNA"),
    'Búsqueda de fechas sin datos y scraping de tasa pasiva BNA desde Consejo'
  );

  // Tareas de BCRA
  scheduleTask(
    'bcra-pasiva-bcra',
    `30 7,9,11,13,15,21 * * *`,
    () => getCurrentRateAndSave("tasaPasivaBCRA", "43"),
    'Búsqueda de último dato de API BCRA'
  );

  scheduleTask(
    'búsqueda-fechas-pasiva-bcra',
    `20 22 * * *`,
    () => findMissingDataServiceBcra("tasaPasivaBCRA", "43"),
    'Búsqueda de fechas sin datos y scraping de tasa pasiva BCRA desde API BCRA'
  );

  scheduleTask(
    'bcra-cer-bcra',
    `40 7,9,11,13,15,21 * * *`,
    //`58 9 * * *`,
    () => getCurrentRateAndSave("cer", "30"),
    'Búsqueda de último dato de API BCRA - Tasa CER'
  );

  scheduleTask(
    'búsqueda-fechas-cer-bcra',
    `40 22 * * *`,
    //'17 10 * * *',
    () => findMissingDataServiceBcra("cer", "30"),
    'Búsqueda de fechas sin datos y scraping de tasa cer BCRA desde API BCRA'
  );

  scheduleTask(
    'bcra-icl-bcra',
    //`55 7,9,11,13,15,21 * * *`,
    `23 10 * * *`,
    () => getCurrentRateAndSave("icl", "40"),
    'Búsqueda de último dato de API BCRA - Tasa ICL'
  );

  scheduleTask(
    'búsqueda-fechas-icl-bcra',
    //`45 22 * * *`,
    '24 10 * * *',
    () => findMissingDataServiceBcra("icl", "40"),
    'Búsqueda de fechas sin datos y scraping de tasa icl BCRA desde API BCRA'
  );

  // Tareas Colegio
  scheduleTask(
      'busqueda-fechas-tasaActivaCNAT2658',
      '30 22 * * *',
      //'55 17 * * *',
      () => findMissingDataColegio("tasaActivaCNAT2658", "22"),
      'Búsqueda de fechas sin datos y scraping de tasa CNAT 2658'
  )




  // Registrar este servicio en la utilidad de base de datos
  // para permitir la reinicialización automática en caso de reconexión
  if (typeof database.registerTaskService === 'function') {
    database.registerTaskService(module.exports);
  }

  logger.info(`Se inicializaron ${tasks.size} tareas programadas`);
}

module.exports = {
  scheduleTask,
  stopTask,
  startTask,
  executeTaskNow,
  getTasksList,
  initializeTasks,
  stopAllTasks
};