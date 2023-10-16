const pdf = require('pdf-parse');
const {dataTasaPasiva,textToLines} = require('../utils/parseTextUtils');
const {myRegexp, validDate} = require('../utils/regexUtils');
const moment = require('moment');

async function parseBNAPasiva(dataBuffer){
    try {
    let tasasList = [];
    let datesTasas = [];
    const {text} = await pdf(dataBuffer);
    const arrayLines = text.toString().split('\n')
        arrayLines.forEach(function(x){
            let resultNumbers = dataTasaPasiva(x);
            tasasList.push(resultNumbers)
            x = myRegexp.exec(x);
            if(x != null){
                x[0] = validDate.exec(x[0])
                if(x[0] != null && moment(x[0][0], 'DD-MM-YY').isValid() === true){
                    datesTasas.push(x[0][0]);
                }
            }
        });
        tasasList = tasasList.filter(x => x.length != 0);
        if(typeof tasasList[0][0] === 'number' && moment(datesTasas[0], 'DD-MM-YY').isValid() === true){
            let dateToSave = moment(moment(datesTasas[0], "DD-MM-YY").format('YYYY-MM-DD') + 'T00:00').utc(true);
    //         const lastTasa = await Tasas.findOne({'tasaPasivaBNA': {$gte: 0}}).sort({'fecha': -1})
    //             if(!lastTasa) {
    //                 throw new Error(`Last tasa Not Found`)
    //             }else{
    //                 let today = moment(moment().format('YYYY-MM-DD') + 'T00:00').utc(true)
    //                 if(moment(datos.fecha).isSame(today, 'day')){
    //                     logger.info(`Tasa Pasiva BNA. Hoy es igual al ultimo dia DDBB. ${datos.fecha, today}`)
    //                 }else if(moment(datos.fecha).isBefore(today, 'day')){
    //                     logger.info(`Tasa Pasiva BNA. El ultimo dia DDBB es anterior a hoy. Actualizar. ${datos.fecha, today}`)
    //                     if(dateToSave.isSameOrBefore(today, 'day')){
    //                         logger.info(`Tasa Pasiva BNA. El dia de Hoy es mayor o igual al de la pagina web. Actualizar con WEB. ${dateToSave, today}`)
    //                         let filter = {fecha: today};
    //                         let update = {tasaPasivaBNA: Number(tasasList[0][0] / 365)};
    //                         Tasas.findOneAndUpdate(filter, update, {
    //                             new: true,
    //                             upsert: true
    //                         })
    //                         .exec((err, datos) => {
    //                             if(err) {
    //                                 logger.error(`Tasa Pasiva BNA. Error en base de datos ${err}`)
    //                             }else{
    //                              let info = [moment().format("YYYY-MM-DD"), (tasasList[0][0] / 365), 'Tasa Pasiva BNA']
    //                              sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
    //                              .then(result => {
    //                                if(result === true){
    //                                 logger.info(`Tasa Pasiva BNA. Envio de mail correcto. ${result}`)
    //                                }else{
    //                                 logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto ${result}`)
    //                                }
    //                              })
    //                              .catch(err => {
    //                                 logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto ${err}`)
    //                              })
    //                             }
    //                         });
    //                     }else if(dateToSave.isAfter(today, 'day')){
    //                         logger.info(`Tasa Pasiva BNA. El dia de Hoy es anterior al dia de la pagina web. Actualizar con DDBB. ${dateToSave, today}`)
    //                         let filter = {fecha: today};
    //                         let update = {tasaPasivaBNA: Number(datos.tasaPasivaBNA)};
    //                         Tasas.findOneAndUpdate(filter, update, {
    //                             new: true,
    //                             upsert: true
    //                         })
    //                         .exec((err, datos) => {
    //                             if(err) {
    //                                 logger.error(`Tasa Pasiva BNA. Error en base de datos ${err}`)
    //                             }else{
    //                              let info = [moment().format("YYYY-MM-DD"), datos.tasaPasivaBNA, 'Tasa Pasiva BNA']
    //                              sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
    //                              .then(result => {
    //                                if(result === true){
    //                                 logger.info(`Tasa Pasiva BNA. Envio de mail correcto. ${result}`)
    //                                }else{
    //                                 logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto. ${result}`)
    //                                }
    //                              })
    //                              .catch(err => {
    //                                 logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto. ${err}`)
    //                              })
    //                             }
    //                         });
    //                     }
    //                 }
    //             }
    //         });
        }else{
            throw new Error(`Fail to parse File`)
        }
        }catch(err){
            throw new Error(err)
        }
    };

    module.exports = {parseBNAPasiva};