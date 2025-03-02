const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const fs = require('fs').promises;
const dotenv = require('dotenv');
const moment = require('moment');

// Cargar configuración
const config = require('./server/config');
const logger = require('./server/utils/logger');
const database = require("./server/utils/database");

// Obtener secretos de AWS
const retrieveSecrets = require('./server/config/env');
dotenv.config()

// Rutas
const apiRoutes = require('./server/routes/apiRoutes');

// Servicios
const taskService = require('./server/services/tasks/taskService');

// Configurar Express
const app = express();

// Configurar plantillas
app.set('views', path.join(__dirname, 'views'));
app.engine('html', ejs.renderFile);
app.set('view engine', 'ejs');

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Registrar rutas
app.use('/api', apiRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.redirect('/api/home');
});

// Manejador de errores
app.use((err, req, res, next) => {
    logger.error(`Error no controlado: ${err.message}`);
    logger.error(err.stack);

    res.status(500).json({
        ok: false,
        status: 500,
        error: 'Error interno del servidor'
    });
});

/**
 * Inicialización de la aplicación
 */
async function inicializarApp() {
    try {
        logger.info('Iniciando aplicación...');

        // Recuperar secretos de AWS
        logger.info('Recuperando secretos...');
        const secretsString = await retrieveSecrets();
        await fs.writeFile(".env", secretsString);
        dotenv.config();

        // Configurar zona horaria
        moment.tz.setDefault(config.server.timezone);

        // Conectar a la base de datos usando el utilitario
        await database.connect();

        // Inicializar tareas programadas
        logger.info('Inicializando tareas programadas...');
        taskService.initializeTasks();

        // Iniciar servidor
        const server = app.listen(config.server.port, () => {
            logger.info(`Servidor escuchando en el puerto ${config.server.port}`);
        });

        // Manejar cierre ordenado
        process.on('SIGTERM', () => {
            logger.info('Señal SIGTERM recibida. Cerrando servidor...');
            server.close(async () => {
                logger.info('Servidor HTTP cerrado');
                await database.disconnect();
                process.exit(0);
            });
        });

        // No es necesario manejar SIGINT aquí ya que lo hace el utilitario de base de datos

        return server;
    } catch (error) {
        logger.error(`Error al inicializar la aplicación: ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Si este archivo es ejecutado directamente (no importado)
if (require.main === module) {
    inicializarApp();
}

module.exports = { app, inicializarApp };