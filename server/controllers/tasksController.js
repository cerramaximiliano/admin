const taskService = require('../services/tasks/taskService');
const logger = require('../utils/logger');

/**
 * Obtiene la lista de todas las tareas programadas
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getTasksList = (req, res) => {
  try {
    const tasks = taskService.getTasksList();
    
    return res.status(200).json({
      ok: true,
      status: 200,
      tasks
    });
  } catch (error) {
    logger.error(`Error al obtener lista de tareas: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener lista de tareas'
    });
  }
};

/**
 * Ejecuta una tarea específica inmediatamente
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.executeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'El ID de la tarea es requerido'
      });
    }
    
    logger.info(`Solicitando ejecución inmediata de tarea: ${taskId}`);
    const result = await taskService.executeTaskNow(taskId);
    
    if (!result.success) {
      return res.status(404).json({
        ok: false,
        status: 404,
        error: result.error
      });
    }
    
    return res.status(200).json({
      ok: true,
      status: 200,
      message: `Tarea ${taskId} ejecutada correctamente`,
      executionTime: result.elapsedTimeMs,
      result: result.result
    });
  } catch (error) {
    logger.error(`Error al ejecutar tarea: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al ejecutar tarea'
    });
  }
};

/**
 * Detiene una tarea específica
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.stopTask = (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'El ID de la tarea es requerido'
      });
    }
    
    const result = taskService.stopTask(taskId);
    
    if (!result) {
      return res.status(404).json({
        ok: false,
        status: 404,
        error: 'No se pudo detener la tarea o no existe'
      });
    }
    
    return res.status(200).json({
      ok: true,
      status: 200,
      message: `Tarea ${taskId} detenida correctamente`
    });
  } catch (error) {
    logger.error(`Error al detener tarea: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al detener tarea'
    });
  }
};

/**
 * Inicia una tarea que estaba detenida
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.startTask = (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'El ID de la tarea es requerido'
      });
    }
    
    const result = taskService.startTask(taskId);
    
    if (!result) {
      return res.status(404).json({
        ok: false,
        status: 404,
        error: 'No se pudo iniciar la tarea o no existe'
      });
    }
    
    return res.status(200).json({
      ok: true,
      status: 200,
      message: `Tarea ${taskId} iniciada correctamente`
    });
  } catch (error) {
    logger.error(`Error al iniciar tarea: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al iniciar tarea'
    });
  }
};