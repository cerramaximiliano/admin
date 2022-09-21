const path = require('path');
const Promotion = require('../models/promo.js');

exports.emailPromotion = (req, res, next) => {
    const emailList = JSON.parse(req.body.email);
    const type = req.body.type;

    const list = [];

    emailList.forEach(ele => {
        list.push({
            email: ele[0],
            estado: true,
            tipo: type
        })
    });

    Promotion.insertMany(list, { ordered: false })
    .then((result) => {
        res.status(200).json({
            ok: true,
            status: 200,
            result: result
        })
    })
    .catch((err) => {
        res.status(500).json({
            ok: false,
            status: 500,
            err: err
        })
    })
};


exports.emailUsers = (req, res, next) => {
    Promotion.find({
        estado: true
    }).exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                status: 500,
                message: err
            })
        }
        return res.render(path.join(__dirname, '../views/') + 'promotion.ejs', {
            data: result,
            totales: result.length,
        })
    })
};
