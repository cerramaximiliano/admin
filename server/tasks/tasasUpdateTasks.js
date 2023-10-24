const axios = require('axios');
const cron = require('node-cron');
const URL_BASE = 'http://localhost:4000'

cron.schedule(`12 23 * * *`, async () => {
const requestCer = await axios(`${URL_BASE}/scraping/tasas?tasa=cer`);
console.log(requestCer)
const requestPasivaBCRA = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaPasivaBCRA`);
console.log(requestPasivaBCRA)
const requestIcl = await axios(`${URL_BASE}/scraping/tasas?tasa=icl`);
console.log(requestIcl);
const requestActivaBNA2658 = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaActivaCNAT2658`);
console.log(requestActivaBNA2658);
const requestPasivaBNA = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaPasivaBNA`);
console.log(requestPasivaBNA);
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

// cron.schedule(`5 5 * * *`, async () => {

// }, {
//     scheduled: true,
//     timezone: "America/Argentina/Buenos_Aires"
// });

// cron.schedule(`10 5 * * *`, async () => {

// }, {
//     scheduled: true,
//     timezone: "America/Argentina/Buenos_Aires"
// });



// cron.schedule(`18 22 * * *`, () => {
//     (async () => {
//             let today = moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true);
//             logger.info(`Tasa Activa BNA. Actualizando fecha ${today}`);
//             let tasaActiva = await downloadBCRADDBB.scrapingTasaActiva();
//             let checkTasa = await downloadBCRADDBB.regexTextCheck(1, tasaActiva[0]);
//             let dateData = await downloadBCRADDBB.regexDates(tasaActiva);

//             let findTasaMensual = await downloadBCRADDBB.findTasa(1, tasaActiva);
//             let tasaData = await downloadBCRADDBB.dataTasa(tasaActiva, findTasaMensual[1]);

            // Tasas.findOne({'tasaActivaBNA': {$gte: 0}})
            // .sort({'fecha': -1})
            // .exec((err, datos) => {
            //     if(err) {
            //       logger.error(`Tasa activa BNA. Error en DDBB. ${err}`)
            //     }else{
            //     if (moment(datos.fecha).utc().isSame(today, 'day')) {
            //         //Ultima fecha de la DDBB es igual a la fecha actual de actualizacion. No hay accion requerida.
            //         logger.info('Tasa Activa BNA. Fecha la DDBB es igual a la fecha actual de actualizacion. No hacer nada.');
            //         false
            //     }else{
            //         if(today.isSame(dateData, 'day')){
            //             //Actualizar con la fecha del sitio el dia de hoy
            //             logger.info('Tasa Activa BNA. La fecha del sitio es igual a hoy. Actualizar la fecha actual con la data del sitio.');
            //             let filter = {fecha: today};
            //             let update = {tasaActivaBNA: Number(tasaData)};
            //             Tasas.findOneAndUpdate(filter, update, {
            //                 new: true,
            //                 upsert: true
            //             })
            //             .exec((err, datos) => {
            //                 if(err) {
            //                     logger.error(`Tasa Activa BNA. Error en Base de Datos ${err}`);
            //                   return {
            //                   ok: false,
            //                   err
            //                   };
            //                 }else{
            //                  let info = [moment().format("YYYY-MM-DD"), tasaData, 'Tasa Activa BNA']
            //                  sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
            //                  .then(result => {
            //                    if(result === true){
            //                     logger.info('Tasa Activa BNA. Envio de mail correcto.');
            //                    }else{
            //                     logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${result}`);
            //                    }
            //                  })
            //                  .catch(err => {
            //                     logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${err}`);
            //                  })
            //                 }
            //             });
            //         }else if(today.isBefore(dateData, 'day')){
            //             //es mayor la fecha del sitio, entonces copiar la fecha del dia de ayer.
            //             logger.info('Tasa Activa BNA. La fecha del sitio es mayor a hoy. Actualizar con la data del dia anterior.');
            //             let filter = {fecha: today};
            //             let update = {tasaActivaBNA: Number(datos.tasaActivaBNA)};
            //             Tasas.findOneAndUpdate(filter, update, {
            //                 new: true,
            //                 upsert: true
            //             })
            //             .exec((err, datos) => {
            //                 if(err) {
            //                     logger.error(`Tasa Activa BNA. Error en Base de Datos ${err}`);
            //                 }else{
            //                  let info = [moment().format("YYYY-MM-DD"), datos.tasaActivaBNA , 'Tasa Activa BNA']
            //                  sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
            //                  .then(result => {
            //                    if(result === true){
            //                     logger.info('Tasa Activa BNA. Envio de mail correcto.');
            //                    }else{
            //                     logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${result}`);
            //                    }
            //                  })
            //                  .catch(err => {
            //                     logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${err}`);
            //                  })
            //                 }
            //             });
            //         }else{
            //             //La fecha de hoy es mayor a la fecha del sitio. Actualizar hoy con la fecha del sitio
            //             logger.info('Tasa Activa BNA. Actualizar la fecha del dia con la fecha del sitio (de fecha anterior)');
            //             let filter = {fecha: today};
            //             let update = {tasaActivaBNA: Number(tasaData)};
            //             Tasas.findOneAndUpdate(filter, update, {
            //                 new: true,
            //                 upsert: true
            //             })
            //             .exec((err, datos) => {
            //                 if(err) {
            //                     logger.error(`Tasa Activa BNA. Error en Base de Datos ${err}`);
            //                 }else{
            //                  let info = [moment().format("YYYY-MM-DD"), tasaData, 'Tasa Activa BNA']
            //                  sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
            //                  .then(result => {
            //                    if(result === true){
            //                     logger.info('Tasa Activa BNA. Envio de mail correcto.');
            //                    }else{
            //                     logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${result}`);
            //                    }
            //                  })
            //                  .catch(err => {
            //                     logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${err}`);
            //                  })
            //                 }
            //             });
            //         }
            //         };
            //     };
            // });



    //     }) ();
    // }, {
    //     scheduled: true,
    //     timezone: "America/Argentina/Buenos_Aires"
    // });


// cron.schedule(`55 ${hour} * * *`, () => {
//     (async() => {
//         try{
//             let tasaActivaCNAT2658 = await downloadBCRADDBB.scrapingTasaActiva();
            
//             let dateData = await downloadBCRADDBB.regexDates(tasaActivaCNAT2658);// Obtengo el día

//             let findTasaMensual = await downloadBCRADDBB.findTasa(2, tasaActivaCNAT2658);

//             let tasaData = await downloadBCRADDBB.dataTasa(tasaActivaCNAT2658, findTasaMensual[1]);

//             await downloadBCRADDBB.saveTasaActivaData(tasaData, dateData, 1)
//         }catch(err){
//             logger.error(`Error en actualizar tasa 2658 ${err}`)
//         }
//     })();
// }, {
//         scheduled: true,
//         timezone: "America/Argentina/Buenos_Aires"
// });


module.exports = cron;