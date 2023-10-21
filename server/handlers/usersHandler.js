const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const usersController = require('../controllers/usersController');

const login = async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await usersController.getUserByEmail(email);
        if( user && user.email && user.password ){
            const decode = bcrypt.compare(password, user.password, function(err, result) {
                if( result ) {
                    res.status(200).json({
                        ok: true,
                        access: true
                    })
                }else{
                    res.status(200).json({
                        ok: false,
                        access: false,
                        message: `Invalid email/password`
                    })
                }
            });
        }else {
            res.status(200).json({
                ok: false,
                access: false,
                message: `Invalid email/password`
            })
        }
    }catch(err) {
        res.status(500).json({
            ok: false,
            access: false,
            error: err.message
        })
    }
};

const findByEmail = async (req,res) => {
    const {email} = req.params;
    try {
        const user = await usersController.getUserByEmail(email);
        if ( user ) {res.status(200).json({
            ok: true,
            data: user
        })}else{
        res.status(204).json({
            ok: true, 
            message: `No content`
        })}
    }catch(err){
        res.status(500).json({
            ok: false,
            error: err.message
        })
    }
};

const getAllUsers = async (req,res) => {
    try {
        const users = await usersController.getAllUsers();
        if ( users ) {res.status(200).json({
            ok: true,
            data: users
        })}else{
        res.status(204).json({
            ok: true, 
            message: `No content`
        })}
    }catch (err){
        res.status(500).json({
            ok: false,
            error: err.message
        })
    }
};


module.exports = {login,findByEmail,getAllUsers};