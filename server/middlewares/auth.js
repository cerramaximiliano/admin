const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Middleware para verificar la autenticación del usuario
 * 
 * Verifica que el token JWT sea válido y añade los datos del usuario
 * a la solicitud para uso en controladores posteriores.
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para continuar con el siguiente middleware
 */
exports.verificaAutenticacion = (req, res, next) => {
  try {
    // Obtener token de las cookies
    const token = req.cookies.access_token;
    
    if (!token) {
      logger.warn('Intento de acceso sin token de autenticación');
      
      return res.status(401).json({
        ok: false,
        status: 401,
        error: 'No se proporcionó token de autenticación'
      });
    }
    
    // Verificar token
    jwt.verify(token, config.tokenSecret, (err, decoded) => {
      if (err) {
        logger.warn(`Token de autenticación inválido: ${err.message}`);
        
        return res.status(401).json({
          ok: false,
          status: 401,
          error: 'Token de autenticación inválido o expirado'
        });
      }
      
      // Añadir datos del usuario a la solicitud
      req.usuario = decoded.usuario;
      
      // Verificar si el usuario tiene estado activo
      if (!req.usuario.estado) {
        logger.warn(`Intento de acceso con usuario inactivo: ${req.usuario.email}`);
        
        return res.status(403).json({
          ok: false,
          status: 403,
          error: 'Usuario inactivo o suspendido'
        });
      }
      
      logger.debug(`Usuario autenticado: ${req.usuario.email}`);
      next();
    });
  } catch (error) {
    logger.error(`Error en verificación de autenticación: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al verificar autenticación'
    });
  }
};

/**
 * Middleware para verificar si el usuario tiene rol de administrador
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para continuar con el siguiente middleware
 */
exports.verificaAdmin = (req, res, next) => {
  try {
    // Debe ejecutarse después de verificaAutenticacion
    if (!req.usuario) {
      return res.status(500).json({
        ok: false,
        status: 500,
        error: 'Error en verificación de rol: Usuario no autenticado'
      });
    }
    
    // Verificar rol
    if (req.usuario.role !== 'ADMIN_ROLE') {
      logger.warn(`Intento de acceso a recurso administrativo por usuario sin permisos: ${req.usuario.email}`);
      
      return res.status(403).json({
        ok: false,
        status: 403,
        error: 'No tiene permisos para acceder a este recurso'
      });
    }
    
    logger.debug(`Acceso administrativo autorizado: ${req.usuario.email}`);
    next();
  } catch (error) {
    logger.error(`Error en verificación de rol administrativo: ${error.message}`);
    
    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al verificar permisos administrativos'
    });
  }
};