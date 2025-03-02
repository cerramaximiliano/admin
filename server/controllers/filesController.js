const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Obtiene los nombres de archivos PDF en un directorio específico
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getNames = async (req, res) => {
  try {
    const directoryPath = path.join(config.paths.serverFiles, 'tasa_pasiva_BNA');
    
    // Asegurar que el directorio existe
    if (!fs.existsSync(directoryPath)) {
      return res.status(404).json({
        ok: false,
        status: 404,
        error: 'Directorio no encontrado'
      });
    }
    
    // Leer archivos en el directorio
    const files = await fs.promises.readdir(directoryPath, { withFileTypes: true });
    
    // Filtrar solo archivos PDF
    const pdfFiles = files
      .filter(item => !item.isDirectory() && path.extname(item.name) === '.pdf')
      .map(item => path.join(directoryPath, item.name));
    
    logger.info(`Se encontraron ${pdfFiles.length} archivos PDF en ${directoryPath}`);
    
    return res.status(200).json({
      ok: true,
      status: 200,
      result: pdfFiles
    });
  } catch (error) {
    logger.error(`Error al obtener nombres de archivos: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener nombres de archivos'
    });
  }
};

/**
 * Obtiene el contenido del archivo de logs
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getLogger = (req, res) => {
  try {
    const logFilePath = path.join(config.paths.root, 'logger.log');
    
    // Verificar que el archivo existe
    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({
        ok: false,
        status: 404,
        error: 'Archivo de log no encontrado'
      });
    }
    
    // Leer archivo de log
    fs.readFile(logFilePath, 'utf8', (err, data) => {
      if (err) {
        logger.error(`Error al leer archivo de log: ${err.message}`);
        
        return res.status(500).json({
          ok: false,
          status: 500,
          error: err.message
        });
      }
      
      return res.status(200).json({
        ok: true,
        status: 200,
        data: data
      });
    });
  } catch (error) {
    logger.error(`Error al obtener archivo de log: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener archivo de log'
    });
  }
};

/**
 * Obtiene logs de la aplicación remota
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getLoggerApp = async (req, res) => {
  try {
    // Obtener token de cookies
    const accessToken = req.cookies.access_token;
    
    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        status: 401,
        error: 'No se proporcionó token de acceso'
      });
    }
    
    // Preparar opciones para la solicitud
    const options = {
      method: 'post',
      body: JSON.stringify({ access_token: accessToken }),
      headers: { 'Content-Type': 'application/json' }
    };
    
    // Realizar solicitud a la API remota
    logger.info('Solicitando logs de la aplicación remota');
    const response = await fetch('https://www.lawanalytics.app/logger-app', options);
    
    // Procesar respuesta
    const data = await response.json();
    
    return res.status(data.status).json({
      status: data.status,
      data: data.data
    });
  } catch (error) {
    logger.error(`Error al obtener logs de la aplicación remota: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener logs de la aplicación remota'
    });
  }
};