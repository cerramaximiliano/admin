const Tasas = require('../models/tasas');
const TasasCheck = require('../models/tasas-check');
const tasasFunctions = require('../controllers/tasas-check');
const tasasUtils = require('../utils/tasas-check');
const cron = require('node-cron');

exports.tasksTasasCheck = async (tasa, hour, minute) => {
cron.schedule(`${minute} ${hour} * * *`, () => {
    (async () => {
        try{
            let result = await tasasFunctions.checkLastDate(tasa);
                        if( result.length === 0 ){
                        return 'No hay fechas más actuales para actualizar. Tasas: ' + tasa;
                    }else{
                    let setLastDate = await TasasCheck.findOneAndUpdate({tasa: tasa}, {lastDataDate: result[0].fecha})
                    let setAllTasasDate = await TasasCheck.updateOne({tasa: 'todas', lastDataDate: {$lt: result[0].fecha}}, { $set: {lastDataDate: result[0].fecha}})
                    return 'Se actualizó la última fecha de la tasa ' + tasa + '  para la DDBB de Check.'
                    }
        }catch(err){
            return 'No fue posible actualizar la última fecha de la tasa.'
        }
    })()
},{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
})
};
exports.tasksTasasCheckMissingDates = (id, hour, minute, second, quantity) => {
    cron.schedule( `${minute} ${hour} * * *`  , () => {
        (async () => {
            let findedMissingDates = await tasasFunctions.checkDates(id, quantity);
            console.log('Resultado: ' , findedMissingDates)
        })()
    },{
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
    })
};
exports.resolveDiffDates = (id, hour, minute) => {
        cron.schedule( `${minute} ${hour} * * *`  , () => {
    (async () => {
    let result = await tasasFunctions.resolveDiffDates(id);
    console.log(result)
    })()
    },{
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
    })
}


exports.tasksTasasCheckMissingData = (id, hour, minute, second, quantity, tasa) => {
    cron.schedule( `${second} ${minute} ${hour} * * *`  , () => {
    (async () => {
        let result = await tasasFunctions.checkDataTasas(id, quantity, tasa);
        console.log(result)
    })()
    },{
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
    })
}


exports.scrapingCpacfTasas = async ( tasa,hour,minute,dni,tomo,folio ) => {
    cron.schedule( `${minute} ${hour} * * *`  , () => {
    (async () => {
    let result = await tasasFunctions.scrapingCpacfTasas( tasa,dni,tomo,folio )
    })()
    },{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
    })
}
exports.findMissingData = async ( tasa, hour, minute ) => {
    cron.schedule( `${minute} ${hour} * * *`  , () => {
    (async () => {
    let result = await tasasFunctions.findAndSolveMissingData( tasa );
    console.log(result)
    })()
    },{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
    })
};
exports.checkMissingData = async ( tasa, hour, minute ) => {
    cron.schedule( `${minute} ${hour} * * *`  , () => {
    (async () => {
    let result = await tasasFunctions.findCheckMissingUpdatedData ( tasa );
    console.log(result)
    })()
    },{
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
    })
}