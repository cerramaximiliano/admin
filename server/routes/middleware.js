const jwt = require('jsonwebtoken');

let verificaAutenticacion = (req, res, next) => {
    let token = req.cookies.access_token;
    jwt.verify(token, process.env.SEED, (err, decoded) => {
      if(err) {
        return res.status(401).json({
          ok: false,
          status: 401,
          err: {
            message: 'Token no valido'
          }
        });
      }
      req.usuario = decoded.usuario;
      next();
  });
  };

  module.exports = {
    verificaAutenticacion,
  }
  
