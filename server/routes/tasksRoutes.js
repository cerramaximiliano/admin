const express = require('express');
const router = express.Router();
const taskManager = require('../services/tasks/taskService'); // Ajusta la ruta según corresponda
const logger = require('../utils/logger');
const { verificaAutenticacion, verificaAdmin } = require('../middlewares/auth');
const { verificarTasasActualizadas } = require('../utils/verificadorTasas');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificaAutenticacion);

/**
 * @route   GET /api/tasks
 * @desc    Obtener lista de todas las tareas programadas
 * @access  Private (Admin)
 */
router.get('/', verificaAdmin, (req, res) => {
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
 * @access  Private (Admin)
 */
router.post('/:taskId/execute', verificaAdmin, async (req, res) => {
    const { taskId } = req.params;

    try {
        logger.info(`Usuario ${req.usuario.email} está ejecutando la tarea ${taskId}`);
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
 * @access  Private (Admin)
 */
router.post('/:taskId/stop', verificaAdmin, (req, res) => {
    const { taskId } = req.params;

    try {
        logger.info(`Usuario ${req.usuario.email} está deteniendo la tarea ${taskId}`);
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
 * @access  Private (Admin)
 */
router.post('/:taskId/start', verificaAdmin, (req, res) => {
    const { taskId } = req.params;

    try {
        logger.info(`Usuario ${req.usuario.email} está iniciando la tarea ${taskId}`);
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
 * @access  Private (Admin)
 */
router.post('/initialize', verificaAdmin, (req, res) => {
    try {
        logger.info(`Usuario ${req.usuario.email} está reinicializando todas las tareas`);
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
 * @access  Private (Admin)
 */
router.post('/stop-all', verificaAdmin, (req, res) => {
    try {
        logger.info(`Usuario ${req.usuario.email} está deteniendo todas las tareas`);
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
 * @route   POST /api/tasks/verificar-tasas
 * @desc    Verifica el estado de las tasas y envía un informe por correo
 * @access  Private (Admin)
 */
router.post('/verificar-tasas', verificaAdmin, async (req, res) => {
    try {
        const { 
            emailDestinatario = req.usuario.email,
            soloTasasActivas = true,
            notificarExito = true,
            notificarErrores = true
        } = req.body;

        logger.info(`Usuario ${req.usuario.email} está verificando tasas con envío de informe a ${emailDestinatario}`);
        
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