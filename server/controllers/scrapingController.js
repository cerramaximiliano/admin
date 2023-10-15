const path = require('path');
const moment = require('moment');
const scrapingFunctions = require('../utils/scrapingweb.js');
const Tasas = require('../models/tasas.js');

exports.downloadUrlFile = async (tasa) => {
    try {
        if(tasa === 'icl' || tasa === 'cer' || tasa === 'pasivaBCRA'){
            const findTasa = await scrapingFunctions.downloadBCRADDBB(tasa);
            console.log(findTasa);
            return findTasa;
        }else if(tasa === 'pasivaBNA'){
            const findTasa = await scrapingFunctions.downloadPBNA();
            return findTasa
        }
    }catch(err){
        throw new Error(err)
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