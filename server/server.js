const retrieveSecrets = require('./config/env.js');
const dotenv = require('dotenv');
const express = require('express');
const app = express();
const Tasas = require('./models/tasas');
const TasasCheck = require('./models/tasas-check');
const tasksTasasCheck = require('./tasks/tasas-check');
const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require("fs").promises;
const bodyParser = require('body-parser');
const moment = require('moment');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const sendEmail = require('./config/email');
const Promotion = require('./models/promo');
const Schedule = require('./models/schedule');
const EscalaComercio = require('./models/escalasComercio');
const EscalaDomestico =  require('./models/escalasDomestico');
const promotions = require('./config/promotions');
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const downloadBCRADDBB = require('./routes/scrapingweb.js');
const puppeteer = require('puppeteer');
const scrapingRoutes = require('./routes/scrapingRoutes');
const pino = require('pino');
const {logger} = require('./config/pino');
const AWS = require('aws-sdk');
const hour = '9';
const hourPromotionInitial = '10';

const server = app.listen(3000, async () => {
    try {
		const secretsString = await retrieveSecrets();
		await fsPromises.writeFile(".env", secretsString);
    	dotenv.config();
        mongoose.connect(process.env.URLDB, {useNewUrlParser: true, useUnifiedTopology: true}, (err, res) => {
            if(err) throw err;
            logger.info('Base de Datos ONLINE');
        });
        logger.info('Escuchando puerto 3000');
	} catch (error) {
		process.exit(-1);
	}
});



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(scrapingRoutes);

const promotionGeneral = ['promotion-1658258964667', 'Promocion general'];
const promotionLab = ['promotionlaboral-1659113638889', 'Promocion laboral'];
const promotionPrev =  ['promotionprevisional-1659115051606', 'Promocion previsional'];

// MANDAR CORREO PROMOCION GENERAL A TODOS LOS CONTACTOS CON ESTADO TRUE QUE NO SE LES HAY ENVIADO EL MAIL PROMOCION GENERAL

// Task Chequeo Ultimo Dato de Fecha de cada Tasa
tasksTasasCheck.tasksTasasCheck('tasaPasivaBCRA', 10, 29);
tasksTasasCheck.tasksTasasCheck('tasaPasivaBNA', 10, 30);
tasksTasasCheck.tasksTasasCheck('tasaActivaBNA', 10, 31);
tasksTasasCheck.tasksTasasCheck('tasaActivaCNAT2601', 10, 32);
tasksTasasCheck.tasksTasasCheck('cer', 10, 33);
tasksTasasCheck.tasksTasasCheck('icl', 10, 34);
tasksTasasCheck.tasksTasasCheck('tasaActivaCNAT2658', 10, 35);

// Task Itero y Chequeo Si existen todas las Fechas

// Tasks Itero y Chequeo Si todas las fechas tienen las Tasas Correspondientes
//01 - Chequeo DÍAS FALTANTES o DÍAS ERRÓNEOS:
tasksTasasCheck.tasksTasasCheckMissingDates('64a8a07283a546c51e534335', 10, 20, 2, 300);
//02 - Chequeo Datos Faltantes en Diferentes Tasas Hasta la última fecha en que hay datos en cada Tasa:
tasksTasasCheck.tasksTasasCheckMissingData('64a6f1aa83a546c51e534322', 10, 40, '*', 10, 'tasaPasivaBCRA');
tasksTasasCheck.tasksTasasCheckMissingData('64a6f1b783a546c51e534323', 10, 45, '*', 10, 'tasaPasivaBNA');
tasksTasasCheck.tasksTasasCheckMissingData('64a6f1c683a546c51e534324', 10, 50, '*', 10, 'tasaActivaBNA');
tasksTasasCheck.tasksTasasCheckMissingData('64a6f1d783a546c51e534325', 10, 55, '*', 10, 'cer');
tasksTasasCheck.tasksTasasCheckMissingData('64a6f1e383a546c51e534326', 11, 0, '*', 10, 'icl');
tasksTasasCheck.tasksTasasCheckMissingData('64a6f1ef83a546c51e534327', 11, 5, '*', 10, 'tasaActivaCNAT2601');
tasksTasasCheck.tasksTasasCheckMissingData('64a6f20283a546c51e534328', 11, 10, '*', 10, 'tasaActivaCNAT2658');
// tasksTasasCheck.resolveDiffDates('64a8a07283a546c51e534335',19,12,'*')

// WEB SCRAPING CPACF WEBSITE - WEB SCRAPING PAGINA CPACF Y ALMACENA ÚLTIMOS DATOS EN DDBB
//Tasa Activa BNA
tasksTasasCheck.scrapingCpacfTasas('1', 11, 58, '30596920', '109', '47');
//Tasa Pasiva BNA
tasksTasasCheck.scrapingCpacfTasas('2', 11, 59,'30596920', '109', '47');
//Tasa Activa ACTA 2658
tasksTasasCheck.scrapingCpacfTasas('22', 12, 0,'30596920', '109', '47');
//Tasa Activa ACTA 2764
tasksTasasCheck.scrapingCpacfTasas('23', 12, 1,'30596920', '109', '47');

// BUSCA DATOS PERDIDOS EN DIFERENTES TASAS Y LOS COMPLETA CON LA TASA DEL CPACF
// SÓLO DISPONIBLE PARA TASAS QUE ESTEN ACTUALIZADAS DEL CPACF

tasksTasasCheck.findMissingData( 'tasaActivaBNA', 21, 10 );
tasksTasasCheck.findMissingData( 'tasaPasivaBNA', 21, 12 );

// CONTROLA LOS DATOS PERDIDOS DE DIFERENTES TASAS PARA CHEQUEAR SI FUERON ACTUALIZADOS
// CON LA DDBB DEL CPACF, DE ACUERDO A FUNCION findMissingData()

tasksTasasCheck.checkMissingData( 'tasaActivaBNA', 21, 14 );
tasksTasasCheck.checkMissingData( 'tasaPasivaBNA', 21, 16 );











// cron.schedule(`40 ${hourPromotionInitial} * *  Monday-Friday`, () => {
    // (async () => {
    //     const SES_CONFIG = {
    //         accessKeyId: process.env.AWS_SES_KEY_ID,
    //         secretAccessKey: process.env.AWS_SES_ACCESS_KEY,
    //         region: 'us-east-1',
    //     };
    //     try{
    //         const dataPromotions = await promotions.findNotEqualStatus(promotionGeneral[0], true, 70)
    //         logger.info(`Email Marketing. Usuarios para Email ${promotionGeneral[1]}: ${dataPromotions.length}`)

    //         if(dataPromotions.length > 0){
    //             const resultsParse = promotions.parseResults(dataPromotions);
    //             logger.info(`Email Marketing. Resultados parseados. Cantidad de emails con 14 destinatarios: ${resultsParse.length}`);
    //             let delivery = [];
    //             for (let index = 0; index < resultsParse.length; index++) {
    //                 let resultEmail = await sendEmail.sendAWSEmail(resultsParse[index], promotionGeneral[0], '{"subject":"Law||Analytics- Gestor Legal Online"}', SES_CONFIG);
    //                 delivery.push([resultsParse[index], resultEmail.Status]);
    //             };
    //             const dataSaved = await promotions.saveDDBBPromotion(delivery);
    //             logger.info(`Email Marketing Testing. Resultado de Emails guardados: ${dataSaved.result.nMatched}`)
    //             const dataPromotionsRest = await promotions.findNotEqualStatus(promotionGeneral[0], true, false)
    //             logger.info(`Email Marketing Usuarios restantes para Email 01: ${dataPromotionsRest.length}`)
    //         }else{
    //             logger.info(`Email Marketing. No hay usuarios disponibles para enviar promocion.`)
    //         }
    //     }
    //     catch(err){
    //         logger.error(`Email Marketing Error: ${err}`)
    //     };
    // })()
// }, {
//     scheduled: true,
//     timezone: "America/Argentina/Buenos_Aires"
// });



cron.schedule(`00 ${hour} * * *`, () => {
    downloadBCRADDBB.downloadBCRADDBB('pasivaBCRA');
    logger.info('Tasa Pasiva BCRA. Funcion de actualizacion ejecutada.');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
cron.schedule(`05 ${hour} * * *`, () => {
    downloadBCRADDBB.downloadBCRADDBB('cer');
    logger.info('Tasa CER ok');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
cron.schedule(`10 ${hour} * * *`, () => {
    downloadBCRADDBB.downloadBCRADDBB('icl');
    logger.info('Tasa ICL ok');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});


cron.schedule(`20 ${hour} * * *`, () => {
(async() => {
    await downloadBCRADDBB.downloadPBNA();
})();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule(`25 ${hour} * * *`, () => {
(async () => {
    let results = await downloadBCRADDBB.scrapingInfoleg();
    results.length === 0 ? false : await downloadBCRADDBB.saveInfolegData(results);
    })();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule(`30 ${hour} * * *`, () => {
    (async () => {
        let results = await downloadBCRADDBB.actualizacionCategorias()
    })();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});


cron.schedule(`55 ${hour} * * *`, () => {
    (async() => {
        try{
            let tasaActivaCNAT2658 = await downloadBCRADDBB.scrapingTasaActiva();
            let dateData = await downloadBCRADDBB.regexDates(tasaActivaCNAT2658);
            let findTasaMensual = await downloadBCRADDBB.findTasa(2, tasaActivaCNAT2658);    
            let tasaData = await downloadBCRADDBB.dataTasa(tasaActivaCNAT2658, findTasaMensual[1]);
            await downloadBCRADDBB.saveTasaActivaData(tasaData, dateData, 1)
        }catch(err){
            logger.error(`Error en actualizar tasa 2658 ${err}`)
        }
    })();
}, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
});
    
cron.schedule(`35 ${hour} * * *`, () => {
    (async() => {
        downloadBCRADDBB.findAndCreateNewDDBB()
    })();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});



cron.schedule(`18 ${hour} * * *`, () => {
(async () => {
        let today = moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true);
        logger.info(`Tasa Activa BNA. Actualizando fecha ${today}`)
        let tasaActiva = await downloadBCRADDBB.scrapingTasaActiva();
        let checkTasa = await downloadBCRADDBB.regexTextCheck(1, tasaActiva[0]);
        let dateData = await downloadBCRADDBB.regexDates(tasaActiva);
        let findTasaMensual = await downloadBCRADDBB.findTasa(1, tasaActiva);
        let tasaData = await downloadBCRADDBB.dataTasa(tasaActiva, findTasaMensual[1]);
        Tasas.findOne({'tasaActivaBNA': {$gte: 0}})
        .sort({'fecha': -1})
        .exec((err, datos) => {
            if(err) {
              logger.error(`Tasa activa BNA. Error en DDBB. ${err}`)
            }else{
            if (moment(datos.fecha).utc().isSame(today, 'day')) {
                //Ultima fecha de la DDBB es igual a la fecha actual de actualizacion. No hay accion requerida.
                logger.info('Tasa Activa BNA. Fecha la DDBB es igual a la fecha actual de actualizacion. No hacer nada.');
                false
            }else{
                if(today.isSame(dateData, 'day')){
                    //Actualizar con la fecha del sitio el dia de hoy
                    logger.info('Tasa Activa BNA. La fecha del sitio es igual a hoy. Actualizar la fecha actual con la data del sitio.');
                    let filter = {fecha: today};
                    let update = {tasaActivaBNA: Number(tasaData)};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            logger.error(`Tasa Activa BNA. Error en Base de Datos ${err}`);
                          return {
                          ok: false,
                          err
                          };
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), tasaData, 'Tasa Activa BNA']
                         sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                            logger.info('Tasa Activa BNA. Envio de mail correcto.');
                           }else{
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${result}`);
                           }
                         })
                         .catch(err => {
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${err}`);
                         })
                        }
                    });
                }else if(today.isBefore(dateData, 'day')){
                    //es mayor la fecha del sitio, entonces copiar la fecha del dia de ayer.
                    logger.info('Tasa Activa BNA. La fecha del sitio es mayor a hoy. Actualizar con la data del dia anterior.');
                    let filter = {fecha: today};
                    let update = {tasaActivaBNA: Number(datos.tasaActivaBNA)};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            logger.error(`Tasa Activa BNA. Error en Base de Datos ${err}`);
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), datos.tasaActivaBNA , 'Tasa Activa BNA']
                         sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                            logger.info('Tasa Activa BNA. Envio de mail correcto.');
                           }else{
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${result}`);
                           }
                         })
                         .catch(err => {
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${err}`);
                         })
                        }
                    });
                }else{
                    //La fecha de hoy es mayor a la fecha del sitio. Actualizar hoy con la fecha del sitio
                    logger.info('Tasa Activa BNA. Actualizar la fecha del dia con la fecha del sitio (de fecha anterior)');
                    let filter = {fecha: today};
                    let update = {tasaActivaBNA: Number(tasaData)};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            logger.error(`Tasa Activa BNA. Error en Base de Datos ${err}`);
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), tasaData, 'Tasa Activa BNA']
                         sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                            logger.info('Tasa Activa BNA. Envio de mail correcto.');
                           }else{
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${result}`);
                           }
                         })
                         .catch(err => {
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto ${err}`);
                         })
                        }
                    });
                }
                };
            };
        });
    }) ();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});




// cron.schedule(`45 20 * * *`, () => {
//     const SES_CONFIG = {
//         accessKeyId: process.env.AWS_SES_ACCESS_KEY,
//         secretAccessKey: process.env.AWS_SES_KEY_ID,
//         region: 'us-east-1',
//     };
//     promotions.test('promotionprevisional-1659115051606', '{"subject":"Law||Analytics- Cálculos Previsionales"}', SES_CONFIG);
// }, {
// scheduled: true,
// timezone: "America/Argentina/Buenos_Aires"
// });
// cron.schedule(`50 20 * * *`, () => {
//     const SES_CONFIG = {
//         accessKeyId: process.env.AWS_SES_ACCESS_KEY,
//         secretAccessKey: process.env.AWS_SES_KEY_ID,
//         region: 'us-east-1',
//     };
//     promotions.test('promotion-1658258964667', '{"subject":"Law||Analytics- Gestor Legal Online"}', SES_CONFIG);
// }, {
// scheduled: true,
// timezone: "America/Argentina/Buenos_Aires"
// });

// cron.schedule(`55 20 * * *`, () => {
//     const SES_CONFIG = {
//         accessKeyId: process.env.AWS_SES_ACCESS_KEY,
//         secretAccessKey: process.env.AWS_SES_KEY_ID,
//         region: 'us-east-1',
//     };
//     promotions.test('promotionlaboral-1659113638889', '{"subject":"Law||Analytics- Cálculos Laborales"}', SES_CONFIG);
// }, {
// scheduled: true,
// timezone: "America/Argentina/Buenos_Aires"
// });

