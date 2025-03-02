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
const config = require('./config');
const logger = require('./utils/logger');

// Obtener secretos de AWS
const retrieveSecrets = require('./config/env');

// Rutas
const apiRoutes = require('./routes/apiRoutes');

// Servicios
const taskService = require('./services/tasks/taskService');

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
    
    // Conectar a la base de datos
    logger.info(`Conectando a MongoDB: ${config.mongodb.url}`);
    await mongoose.connect(config.mongodb.url, config.mongodb.options);
    logger.info('Conexión a MongoDB establecida');
    
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
      server.close(() => {
        logger.info('Servidor HTTP cerrado');
        mongoose.connection.close(false, () => {
          logger.info('Conexión a MongoDB cerrada');
          process.exit(0);
        });
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('Señal SIGINT recibida. Cerrando servidor...');
      server.close(() => {
        logger.info('Servidor HTTP cerrado');
        mongoose.connection.close(false, () => {
          logger.info('Conexión a MongoDB cerrada');
          process.exit(0);
        });
      });
    });
    
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