const express = require('express');
const router = express.Router();
const taskManager = require('../services/tasks/taskService'); // Ajusta la ruta según corresponda
const logger = require('../utils/logger');
const { verificarTasasActualizadas } = require('../utils/verificadorTasas');


/**
 * @route   GET /api/tasks
 * @desc    Obtener lista de todas las tareas programadas
 * @access  Public
 */
router.get('/', (req, res) => {
    try {
        const tasks = taskManager.getTasksList();
        return res.json({ success: true, tasks });
    } catch (error) {
        logger.error(`Error al obtener lista de tareas: ${error.message}`);
        return res.status(500).json({ success: false, error: 'Error al obtener lista de tareas' });
    }
});

/**
 * @route   POST /api/tasks/:taskId/execute
 * @desc    Ejecutar una tarea específica inmediatamente
 * @access  Public
 */
router.post('/:taskId/execute', async (req, res) => {
    const { taskId } = req.params;

    try {
        const result = await taskManager.executeTaskNow(taskId);

        if (!result.success && !result.skipped) {
            return res.status(400).json({
                success: false,
                message: `Error al ejecutar tarea: ${result.error || 'Error desconocido'}`
            });
        }

        return res.json({
            success: true,
            message: result.skipped ? `Tarea omitida: ${result.reason}` : 'Tarea ejecutada correctamente',
            result
        });
    } catch (error) {
        logger.error(`Error al ejecutar tarea ${taskId}: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: `Error al ejecutar tarea: ${error.message}`
        });
    }
});

/**
 * @route   POST /api/tasks/:taskId/stop
 * @desc    Detener una tarea programada
 * @access  Public
 */
router.post('/:taskId/stop', (req, res) => {
    const { taskId } = req.params;

    try {
        const result = taskManager.stopTask(taskId);

        if (!result) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo detener la tarea o no existe'
            });
        }

        return res.json({
            success: true,
            message: 'Tarea detenida correctamente'
        });
    } catch (error) {
        logger.error(`Error al detener tarea ${taskId}: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: `Error al detener tarea: ${error.message}`
        });
    }
});

/**
 * @route   POST /api/tasks/:taskId/start
 * @desc    Iniciar una tarea detenida
 * @access  Public
 */
router.post('/:taskId/start', (req, res) => {
    const { taskId } = req.params;

    try {
        const result = taskManager.startTask(taskId);

        if (!result) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo iniciar la tarea o no existe'
            });
        }

        return res.json({
            success: true,
            message: 'Tarea iniciada correctamente'
        });
    } catch (error) {
        logger.error(`Error al iniciar tarea ${taskId}: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: `Error al iniciar tarea: ${error.message}`
        });
    }
});

/**
 * @route   POST /api/tasks/initialize
 * @desc    Reinicializar todas las tareas programadas
 * @access  Public
 */
router.post('/initialize', (req, res) => {
    try {
        taskManager.initializeTasks();
        return res.json({
            success: true,
            message: 'Tareas reinicializadas correctamente'
        });
    } catch (error) {
        logger.error(`Error al reinicializar tareas: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: `Error al reinicializar tareas: ${error.message}`
        });
    }
});

/**
 * @route   POST /api/tasks/stop-all
 * @desc    Detener todas las tareas programadas
 * @access  Public
 */
router.post('/stop-all', (req, res) => {
    try {
        taskManager.stopAllTasks();
        return res.json({
            success: true,
            message: 'Todas las tareas detenidas correctamente'
        });
    } catch (error) {
        logger.error(`Error al detener todas las tareas: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: `Error al detener todas las tareas: ${error.message}`
        });
    }
});

/**
 * @route   POST /api/dev/tasks/verificar-tasas
 * @desc    Verifica el estado de las tasas y envía un informe por correo
 * @access  Public
 */
router.post('/verificar-tasas', async (req, res) => {
    try {
        const { 
            emailDestinatario,
            soloTasasActivas = true,
            notificarExito = true,
            notificarErrores = true
        } = req.body;

        if (!emailDestinatario) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere especificar un email destinatario'
            });
        }

        logger.info(`Verificando tasas con envío de informe a ${emailDestinatario}`);
        
        const resultado = await verificarTasasActualizadas({
            soloTasasActivas,
            enviarEmail: true,
            notificarExito,
            notificarErrores,
            emailDestinatario
        });

        return res.json({
            success: true,
            message: 'Verificación de tasas completada y correo enviado',
            resultado: {
                status: resultado.status,
                todasActualizadas: resultado.todasActualizadas,
                tasasDesactualizadas: resultado.tasasDesactualizadas,
                hayErroresScraping: resultado.hayErroresScraping,
                tasasConErrores: resultado.tasasConErrores
            }
        });
    } catch (error) {
        logger.error(`Error al verificar tasas: ${error.message}`);
        return res.status(500).json({
            success: false,
            error: `Error al verificar tasas: ${error.message}`
        });
    }
});

module.exports = router;