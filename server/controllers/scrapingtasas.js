const path = require('path');
const moment = require('moment');
const scrapingFunctions = require('../routes/scrapingweb.js');
const Tasas = require('../models/tasas.js');

exports.downloadUrlFile = (req, res, next) => {
    const tasa = req.query.tasa;
    if(tasa === 'icl' || tasa === 'cer' || tasa === 'pasivaBCRA'){
        scrapingFunctions.downloadBCRADDBB(tasa);
        res.status(200).json({
            ok: true,
            status: 200
        })
    }else if(tasa === 'pasivaBNA'){
        scrapingFunctions.downloadPBNA();
        res.status(200).json({
            ok: true,
            status: 200
        })
    }
};
exports.tasasDashboard = async (req, res, next) => {
    Tasas.find({
        estado: true,
        fecha: {
            $lte: moment()
        }
    })
    .sort({fecha: -1})
    .limit(15)
    .exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                status: 500,
                message: err
            })
        }
        console.log(result)
        return res.render(path.join(__dirname, '../views/') + 'tasas.ejs', {
            data: result,
        })
    })
};