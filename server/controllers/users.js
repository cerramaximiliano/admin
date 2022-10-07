const path = require('path');
const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

exports.usersLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    User.findOne({ email: email}, (err, usuarioDB) => {
      if(err) {
        return res.status(500).json({
        ok: false,
        err
      });
    }
      if (!usuarioDB) {
        return res.status(400).json({
          ok: false,
          start: true,
          err
        })
    }
        if(!bcrypt.compareSync(password, usuarioDB.password)) {
          return res.status(400).json({
          ok: false,
          start: true,
          err
          })
    };
    usuarioDB.calculos = false;
    usuarioDB.documentos = false;
    const token = jwt.sign({
      usuario: usuarioDB
    }, process.env.SEED, {expiresIn: process.env.CADUCIDAD_TOKEN})
    res.cookie('access_token', token, {
      maxAge: 86400000,
      httpOnly: true,
    })
    res.status(200).json({
        ok: true,
        status: 200
    })
      });
};


exports.usersHome = (req, res, next) => {
res.render(path.join(__dirname, '../views/') + 'home.ejs')
};

exports.usersDashboard = (req, res, next) => {
  User.find()
      .then(result => {
        return res.render(path.join(__dirname, '../views/') + 'users.ejs', {
          data: result,
      })
      })
      .catch(err => {
        return res.status(500).json({
          ok: false,
          status: 500
        })
      })
}