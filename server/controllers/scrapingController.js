const path = require('path');
const moment = require('moment');
const scrapingFunctions = require('../utils/scrapingweb.js');
const Tasas = require('../models/tasas.js');

exports.downloadUrlFile = async (tasa, type) => {
    try {
        if(tasa === 'icl' || tasa === 'cer' || tasa === 'tasaPasivaBCRA'){
            const findTasa = await scrapingFunctions.downloadBCRADDBB(tasa, type);
            return findTasa;
        }else if(tasa === 'tasaPasivaBNA'){
            const findTasa = await scrapingFunctions.downloadPasivaBNA(tasa);
            return findTasa
        }else if( tasa === 'tasaActivaCNAT2658'){
            const findTasa = await scrapingFunctions.downloadActivaBNA(tasa);
            return findTasa;
        }else if( tasa === 'tasaActivaBNA' ){
            const findTasa = await scrapingFunctions.downloadActivaBNA(tasa);
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

exports.updateTasaByDate = async (tasaData, dateData, query) => {
    try {
        const today = moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true);
        const update = {[query]: Number(tasaData)};
        const lastTasa = await Tasas.findOne({[query]: {$gte: 0}}).sort({'fecha': -1});
        if( lastTasa ){
            if( moment(lastTasa.fecha).utc().isSame(today, 'day') ) return {message: `Tasa de fecha ${today.format('DD-MM-YYYY')} ya fue actualizada previamente`, ok: false}
            else {
                if( today.isSame(dateData, 'day') ) {
                    const updateSame = await Tasas.findOneAndUpdate({fecha: today}, update, {new: true,upsert: true})
                    return {message: `Tasa de fecha ${today.format('DD-MM-YYYY')} fue actualizada con la publicación del sitio (publicación contiene la misma fecha)`, ok: true};
                }else if( today.isBefore(dateData, 'day') ){
                    const updateBefore = await Tasas.findOneAndUpdate({fecha: today}, {[query]: lastTasa[query] }, {new: true,upsert: true})
                    return {message: `Tasa de fecha ${today.format('DD-MM-YYYY')} fue actualizada con la base de datos (publicación contiene fecha posterior: ${dateData})`, ok: true};
                }else {
                    const updateAfter = await Tasas.findOneAndUpdate({fecha: today}, update, {new: true,upsert: true});
                    return {message: `Tasa de fecha ${today.format('DD-MM-YYYY')} fue actualizada con la publicación del sitio (publicación contiene fecha anterio: ${dateData})`, ok: true};
                }
            }
        }else{
            return {message: `Tasa de fecha ${today.format('DD-MM-YYYY')} no se pudo actualizar porque no se encontró la búsqueda en base de datos la última tasa actualizada`, ok: false}
        }
    }catch(err){
        throw new Error(err)
    }
};
