const pino = require('pino');
const path = require('path');
const config = require('../config');

/**
 * Configuración del logger utilizando Pino
 * 
 * Proporciona un logger centralizado para toda la aplicación
 * con formato bonito para consola y archivo de logs.
 */
const logger = pino({
  transport: {
    targets: [
      // Salida en consola con formato bonito
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'dd-mm-yyyy, HH:MM:ss',
          ignore: 'pid,hostname'
        }
      },
      // Salida en archivo para persistencia
      {
        target: 'pino/file',
        options: {
          destination: path.join(config.paths.root, 'logger.log'),
          translateTime: 'dd-mm-yyyy, HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    ]
  },
  level: config.isDev ? 'debug' : 'info',
  // Añadir información de contexto a cada log
  base: {
    env: config.env
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

module.exports = logger;