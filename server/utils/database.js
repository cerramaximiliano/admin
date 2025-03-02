const mongoose = require('mongoose');
const config = require('../config');
const logger = require('./logger');

/**
 * Inicializa la conexión a MongoDB
 * 
 * @returns {Promise} - Promesa que se resuelve cuando la conexión se establece
 */
exports.connect = async () => {
  try {
    // Configurar Mongoose
    mongoose.set('strictQuery', false);
    
    // Agregar monitoreo de eventos
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB: Conexión establecida');
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB: Conexión cerrada');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB: Error en conexión: ${err.message}`);
    });
    
    // Manejar eventos de proceso para cerrar conexión ordenadamente
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB: Conexión cerrada por terminación de aplicación');
      process.exit(0);
    });
    
    // Conectar a la base de datos
    logger.info(`MongoDB: Conectando a ${config.mongodb.url}`);
    await mongoose.connect(config.mongodb.url, config.mongodb.options);
    
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB: Error al conectar: ${error.message}`);
    throw error;
  }
};

/**
 * Cierra la conexión a MongoDB
 * 
 * @returns {Promise} - Promesa que se resuelve cuando la conexión se cierra
 */
exports.disconnect = async () => {
  if (mongoose.connection.readyState === 0) {
    logger.info('MongoDB: La conexión ya está cerrada');
    return;
  }
  
  try {
    await mongoose.connection.close();
    logger.info('MongoDB: Conexión cerrada correctamente');
  } catch (error) {
    logger.error(`MongoDB: Error al cerrar conexión: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene el estado actual de la conexión
 * 
 * @returns {Object} - Estado de la conexión
 */
exports.getStatus = () => {
  const states = {
    0: 'Desconectado',
    1: 'Conectado',
    2: 'Conectando',
    3: 'Desconectando'
  };
  
  return {
    state: mongoose.connection.readyState,
    stateDescription: states[mongoose.connection.readyState],
    host: mongoose.connection.host || 'Ninguno',
    name: mongoose.connection.name || 'Ninguno'
  };
};