const path = require('path');
const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const {collections} = require('../db');

exports.getUserByEmail = async (email) => {
    try {
        const user = await collections.Users.findOne({email});
        return user;
    }catch(err){
        throw new Error(err)
    }
};

exports.getAllUsers = async () => {
    try {
        const users = await collections.Users.find({}).toArray();
         return users;
    }catch(err){
        throw new Error(err)
    }
};

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