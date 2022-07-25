const express = require('express');
const app = express();
require('dotenv').config();
const Tasas = require('./models/tasas');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const moment = require('moment');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const sendEmail = require('./routes/nodemailer');
const Promotion = require('./models/promo');
const promotions = require('./config/promotions');
app.use(cors());
const path = require('path');
const downloadBCRADDBB = require('./routes/scrapingweb.js');
const puppeteer = require('puppeteer');
app.use(express.static(path.join(__dirname, '../public')));
const AWS = require('aws-sdk');
const secretManager = new AWS.SecretsManager({ region: 'sa-east-1'});

(async () => {
    const data = await secretManager.getSecretValue({ SecretId: 'arn:aws:secretsmanager:sa-east-1:244807945617:secret:env-8tdon8' }).promise();
    const secret = JSON.parse(data.SecretString);
    process.env.URLDB = secret.URLDB;
    process.env.CADUCIDAD_TOKEN = secret.CADUCIDAD_TOKEN;
    process.env.SEED = secret.SEED;
    process.env.AWS_SES_USER = secret.AWS_SES_USER;
    process.env.AWS_SES_PASS = secret.AWS_SES_PASS;
    mongoose.connect(process.env.URLDB, {useNewUrlParser: true, useUnifiedTopology: true}, (err, res) => {
        if(err) throw err;
        console.log('Base de datos ONLINE!!!')
    });
    app.listen(3000, () => {
        console.log('Escuchando el puerto', 3000);
    });

    // try{
    //     let data = await promotions.findNotEqualStatus('promotion-1658258964667', true)
    //     const resultsParse = promotions.parseResults(data);
    //     console.log(data)
    //     let delivery = [];
    //     for (let index = 0; index < resultsParse.length; index++) {
    //         let resultEmail = await sendEmail.sendAWSEmail(resultsParse[index], 'promotion-1658258964667')
    //         delivery.push([resultsParse[index], resultEmail.Status])
    //     };
    //     let saveData = [];
    //     delivery.forEach(function(x){
    //         x[0].forEach(function(y, i){
    //             saveData.push(
    //                 {
    //                     updateOne: {
    //                                 filter: {
    //                                     email: y.Destination.ToAddresses[0],
    //                                 },
    //                                 update: {
    //                                     $push: {
    //                                         delivery: [{
    //                                         status: x[1][i].Status,
    //                                         template: 'promotion-1658258964667',
    //                                         date: new Date(),
    //                                     }], 
    //                                 }
    //                                 },
    //                                 upsert: true
    //                             }
    //                         }
    //             )
    //         })
    //     });
    //     Promotion.bulkWrite(saveData).then(result => {
    //         console.log(result)
    //     });
    // }
    // catch(err){
    //     console.log(err)
    // }

cron.schedule('15 05 * * *', () => {
    downloadBCRADDBB.downloadBCRADDBB('pasivaBCRA');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
cron.schedule('20 05 * * *', () => {
    downloadBCRADDBB.downloadBCRADDBB('cer');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
cron.schedule('25 05 * * *', () => {
    downloadBCRADDBB.downloadBCRADDBB('icl');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule('00 05 * * *', () => {
(async () => {
        let today = moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true);
        let tasaActiva = await downloadBCRADDBB.scrapingTasaActiva();
        let checkTasa = await downloadBCRADDBB.regexTextCheck(1, tasaActiva[0]);
        let dateData = await downloadBCRADDBB.regexDates(tasaActiva);
        let findTasaMensual = await downloadBCRADDBB.findTasa(1, tasaActiva);
        let tasaData = await downloadBCRADDBB.dataTasa(tasaActiva, findTasaMensual[1]);
        Tasas.findOne({'tasaActivaBNA': {$gte: 0}})
        .sort({'fecha': -1})
        .exec((err, datos) => {
            if(err) {
              console.log(err)
              return {
              ok: false,
              err
              };
            }else{
            if (moment(datos.fecha).utc().isSame(today, 'day')) {
                //Ultima fecha de la DDBB es igual a la fecha actual de actualizacion. No hay accion requerida.
                console.log('Fecha la DDBB es igual a la fecha actual de actualizacion. No hacer nada.')
                false
            }else{
                if(today.isSame(dateData, 'day')){
                    //Actualizar con la fecha del sitio el dia de hoy
                    console.log('La fecha del sitio es igual a hoy. Actualizar la fecha actual con la data del sitio.')
                    let filter = {fecha: today};
                    let update = {tasaActivaBNA: Number(tasaData)};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            console.log(err)
                          return {
                          ok: false,
                          err
                          };
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), tasaData, 'Tasa Activa BNA']
                         sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                               return true
                           }else{
                               console.log('Envio de mail incorrecto')
                           }
                         })
                         .catch(err => {
                             console.log('Envio de mail incorrecto', err)
                         })
                        }
                    });
                }else if(today.isBefore(dateData, 'day')){
                    //es mayor la fecha del sitio, entonces copiar la fecha del dia de ayer.
                    console.log('La fecha del sitio es mayor a hoy. Actualizar con la data del dia anterior.');
                    let filter = {fecha: today};
                    let update = {tasaActivaBNA: Number(datos.tasaActivaBNA)};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            console.log(err)
                          return {
                          ok: false,
                          err
                          };
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), datos.tasaActivaBNA , 'Tasa Activa BNA']
                         sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                               return true
                           }else{
                               console.log('Envio de mail incorrecto')
                           }
                         })
                         .catch(err => {
                             console.log('Envio de mail incorrecto', err)
                         })
                        }
                    });
                }else{
                    //La fecha de hoy es mayor a la fecha del sitio. Actualizar hoy con la fecha del sitio
                    console.log('Actualizar la fecha del dia con la fecha del sitio (de fecha anterior)')
                    let filter = {fecha: today};
                    let update = {tasaActivaBNA: Number(tasaData)};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            console.log(err)
                          return {
                          ok: false,
                          err
                          };
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), tasaData, 'Tasa Activa BNA']
                         sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                               return true
                           }else{
                               console.log('Envio de mail incorrecto')
                           }
                         })
                         .catch(err => {
                             console.log('Envio de mail incorrecto', err)
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

cron.schedule('10 05 * * *', () => {
(async() => {
    await downloadBCRADDBB.downloadPBNA();
})();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule('30 05 * * *', () => {
(async () => {
    let results = await downloadBCRADDBB.scrapingInfoleg();
    results.length === 0 ? false : await downloadBCRADDBB.saveInfolegData(results);
    })();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule('35 05 * * *', () => {
    (async () => {
        let results = await downloadBCRADDBB.actualizacionCategorias()
    })();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

cron.schedule('40 05 * * *', () => {
    (async() => {
        try{
            let tasaActivaCNAT2658 = await downloadBCRADDBB.scrapingTasaActiva();
            let dateData = await downloadBCRADDBB.regexDates(tasaActivaCNAT2658);
            let findTasaMensual = await downloadBCRADDBB.findTasa(2, tasaActivaCNAT2658);    
            let tasaData = await downloadBCRADDBB.dataTasa(tasaActivaCNAT2658, findTasaMensual[1]);
            await downloadBCRADDBB.saveTasaActivaData(tasaData, dateData, 1)
        }catch(err){
            console.log(`Error en actualizar tasa 2658 ${err}`)
        }
    })();
}, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
});
    
cron.schedule('50 05 * * *', () => {
    (async() => {
        downloadBCRADDBB.findAndCreateNewDDBB()
    })();
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});

// let data = 
// [			
//     [	0.10685	]	,
//     [	0.10137	]	,
//     [	0.09315	]	,
//     [	0.090573333	]	,
//     [	0.082246667	]	,
//     [	0.072876667	]	,
//     [	0.030136667	]	,
//     [	0.041093333	]	,
//     [	0.049313333	]	,
//     [	0.054793333	]	,
//     [	0.057896667	]	,
//     [	0.065753333	]	,
//     [	0.068493333	]	,
//     [	0.07123	]	,
//     [	0.07671	]	,
//     [	0.08219	]	,
//     [	0.08767	]	,
//     [	0.098903333	]	,
//     [	0.109566667	]	,
//     [	0.095866667	]	,
//     [	0.082166667	]	,
//     [	0.0548	]	,
//     [	0.052033333	]	,
//     [	0.0534	]	,
//     [	0.052033333	]	,
//     [	0.05	]	,
//     [	0.048633333	]	,
//     [	0.045866667	]	,
//     [	0.0452	]	,
//     [	0.042466667	]	,
//     [	0.041766667	]	,
//     [	0.0411	]	,
//     [	0.0404	]	,
//     [	0.0411	]	,
//     [	0.042433333	]	,
//     [	0.043133333	]	,
//     [	0.043833333	]	,
//     [	0.0452	]	,
//     [	0.0493	]	,
//     [	0.053433333	]	,
//     [	0.056833333	]	,
//     [	0.060266667	]	,
//     [	0.064366667	]	,
//     [	0.065733333	]	,
//     [	0.0685	]	,
//     [	0.075333333	]	,
//     [	0.0685	]	,
//     [	0.073966667	]	,
//     [	0.0721	]	,
//     [	0.0646	]	,
//     [	0.024666667	]	,
//     [	0.0233	]	,
//     [	0.020533333	]	,
//     [	0.0233	]	,
//     [	0.024666667	]	,
//     [	0.0233	]	,
//     [	0.017833333	]	,
//     [	0.021933333	]	,
//     [	0.017833333	]	,
//     [	0.0151	]	,
//     [	0.010966667	]	,
//     [	0.0096	]	,
//     [	0.006866667	]	,
//     [	0.007566667	]	,
//     [	0.008233333	]	,
//     [	0.008933333	]	,
//     [	0.0096	]	,
//     [	0.010433333	]	,
//     [	0.010966667	]	,
//     [	0.011666667	]	,
//     [	0.012333333	]	,
//     [	0.013033333	]	,
//     [	0.0137	]	,
//     [	0.0151	]	,
//     [	0.015766667	]	,
//     [	0.017833333	]	,
//     [	0.0192	]	,
//     [	0.022633333	]	,
//     [	0.0233	]	,
//     [	0.024666667	]	,
//     [	0.0274	]	,
//     [	0.0329	]	,
//     [	0.035633333	]	,
//     [	0.0411	]	,
//     [	0.0466	]	,
//     [	0.049333333	]	,
//     [	0.052066667	]	,
//     [	0.0548	]	,
//     [	0.043833333	]	,
//     [	0.0548	]	,
//     [	0.063033333	]	,
//     [	0.0685	]	,
//     [	0.0822	]	,
//     [	0.098633333	]	,
//     [	0.120533333	]	,
//     [	0.150666667	]	,
//     [	0.109666667	]	,
//     [	0.137	]	,
//     [	0.164333333	]	,
//     [	0.095666667	]	,
//     [	0.019	]	,
//     [	0.013666667	]	,
//     [	0.019	]	,
//     [	0.014666667	]	,
//     [	0.016	]	,
//     [	0.015666667	]	,
//     [	0.016	]	,
//     [	0.016333333	]	,
//     [	0.016666667	]	,
//     [	0.017	]	,
//     [	0.017333333	]	,
//     [	0.017666667	]	,
//     [	0.017	]	,
//     [	0.016666667	]	,
//     [	0.017	]	,
//     [	0.017333333	]	,
//     [	0.018333333	]	,
//     [	0.019	]	,
//     [	0.019666667	]	,
//     [	0.018333333	]	,
//     [	0.017333333	]	,
//     [	0.016	]	,
//     [	0.016333333	]	,
//     [	0.017	]	,
//     [	0.017333333	]	,
//     [	0.017666667	]	,
//     [	0.018666667	]	,
//     [	0.019	]	,
//     [	0.02	]	,
//     [	0.020666667	]	,
//     [	0.021666667	]	,
//     [	0.025	]	,
//     [	0.026	]	,
//     [	0.026666667	]	,
//     [	0.027333333	]	,
//     [	0.029	]	,
//     [	0.030666667	]	,
//     [	0.033333333	]	,
//     [	0.038333333	]	,
//     [	0.041666667	]	,
//     [	0.04	]	,
//     [	0.033	]	,
//     [	0.027333333	]	,
//     [	0.023333333	]	,
//     [	0.021666667	]	,
//     [	0.02	]	,
//     [	0.018333333	]	,
//     [	0.02	]	,
//     [	0.021666667	]	,
//     [	0.023333333	]	,
//     [	0.025	]	,
//     [	0.026666667	]	,
//     [	0.03	]	,
//     [	0.033333333	]	,
//     [	0.036666667	]	,
//     [	0.043333333	]	,
//     [	0.048333333	]	,
//     [	0.043333333	]	,
//     [	0.046666667	]	,
//     [	0.045	]	,
//     [	0.038333333	]	,
//     [	0.04	]	,
//     [	0.043333333	]	,
//     [	0.046666667	]	,
//     [	0.05	]	,
//     [	0.053333333	]	,
//     [	0.056666667	]	,
//     [	0.05	]	,
//     [	0.043333333	]	,
//     [	0.04	]	,
//     [	0.046666667	]	,
//     [	0.058333333	]	,
//     [	0.075	]	
//             ]	
    
    


//             var enumerateDaysBetweenDates = function(startDate, endDate) {
//                 var dates = [];
//                 let firstDate = startDate;
//                 dates.push(moment(startDate).format('YYYY-MM-DD'))
//                 startDate = startDate.add(1, 'days');
//                 while(startDate.format('DD/MM/YYYY') !== endDate.format('DD/MM/YYYY')) {
//                     dates.push(moment(startDate).format('YYYY-MM-DD'));
//                     startDate = startDate.add(1, 'days');
//                 }
//                 dates.push(moment(endDate).format('YYYY-MM-DD'));
//                 return dates;
//               };

// let dates = 
// [								
//     [	"1/1/2022"	,	"10/2/2022"	],
//     [	"16/11/2020"	,	"31/12/2021"	],
//     [	"16/10/2020"	,	"15/11/2020"	],
//     [	"31/8/2020"	,	"15/10/2020"	],
//     [	"1/6/2020"	,	"30/8/2020"	],
//     [	"22/4/2020"	,	"31/5/2020"	],
//     [	"15/4/2020"	,	"21/4/2020"	],
//     [	"14/4/2020"	,	"14/4/2020"	],
//     [	"16/3/2020"	,	"13/4/2020"	],
//     [	"2/3/2020"	,	"15/3/2020"	],
//     [	"27/2/2020"	,	"1/3/2020"	],
//     [	"18/2/2020"	,	"26/2/2020"	],
//     [	"10/2/2020"	,	"17/2/2020"	],
//     [	"24/1/2020"	,	"9/2/2020"	],
//     [	"30/12/2019"	,	"23/1/2020"	],
//     [	"27/12/2019"	,	"29/12/2019"	],
//     [	"20/12/2019"	,	"26/12/2019"	],
//     [	"14/11/2019"	,	"19/12/2019"	],
//     [	"14/8/2019"	,	"13/11/2019"	],
//     [	"9/8/2019"	,	"13/8/2019"	],
//     [	"21/6/2019"	,	"8/8/2019"	],
//     [	"8/5/2018"	,	"20/6/2019"	],
//     [	"22/1/2018"	,	"7/5/2018"	],
//     [	"15/12/2017"	,	"21/1/2018"	],
//     [	"29/11/2017"	,	"14/12/2017"	],
//     [	"21/11/2017"	,	"28/11/2017"	],
//     [	"24/10/2017"	,	"20/11/2017"	],
//     [	"12/10/2017"	,	"23/10/2017"	],
//     [	"18/8/2017"	,	"11/10/2017"	],
//     [	"28/4/2017"	,	"17/8/2017"	],
//     [	"24/4/2017"	,	"27/4/2017"	],
//     [	"19/4/2017"	,	"23/4/2017"	],
//     [	"2/12/2016"	,	"18/4/2017"	],
//     [	"11/11/2016"	,	"1/12/2016"	],
//     [	"21/9/2016"	,	"10/11/2016"	],
//     [	"14/9/2016"	,	"20/9/2016"	],
//     [	"8/9/2016"	,	"13/9/2016"	],
//     [	"18/8/2016"	,	"7/9/2016"	],
//     [	"1/8/2016"	,	"17/8/2016"	],
//     [	"22/7/2016"	,	"31/7/2016"	],
//     [	"7/7/2016"	,	"21/7/2016"	],
//     [	"1/7/2016"	,	"6/7/2016"	],
//     [	"24/6/2016"	,	"30/6/2016"	],
//     [	"22/6/2016"	,	"23/6/2016"	],
//     [	"15/6/2016"	,	"21/6/2016"	],
//     [	"4/3/2016"	,	"14/6/2016"	],
//     [	"25/1/2016"	,	"3/3/2016"	],
//     [	"21/12/2015"	,	"24/1/2016"	],
//     [	"2/11/2015"	,	"20/12/2015"	],
//     [	"28/7/2015"	,	"1/11/2015"	],
//     [	"10/5/2013"	,	"27/7/2015"	],
//     [	"4/7/2012"	,	"9/5/2013"	],
//     [	"9/9/2010"	,	"3/7/2012"	],
//     [	"7/5/2010"	,	"8/9/2010"	],
//     [	"15/9/2008"	,	"6/5/2010"	],
//     [	"23/5/2008"	,	"14/9/2008"	],
//     [	"19/9/2007"	,	"22/5/2008"	],
//     [	"17/9/2007"	,	"18/9/2007"	],
//     [	"24/8/2007"	,	"16/9/2007"	],
//     [	"29/1/2007"	,	"23/8/2007"	],
//     [	"4/4/2006"	,	"28/1/2007"	],
//     [	"31/1/2006"	,	"3/4/2006"	],
//     [	"30/4/2004"	,	"30/1/2006"	],
//     [	"2/4/2004"	,	"29/4/2004"	],
//     [	"23/1/2004"	,	"1/4/2004"	],
//     [	"16/1/2004"	,	"22/1/2004"	],
//     [	"8/1/2004"	,	"15/1/2004"	],
//     [	"6/1/2004"	,	"7/1/2004"	],
//     [	"18/12/2003"	,	"5/1/2004"	],
//     [	"17/12/2003"	,	"17/12/2003"	],
//     [	"3/12/2003"	,	"16/12/2003"	],
//     [	"3/11/2003"	,	"2/12/2003"	],
//     [	"11/8/2003"	,	"2/11/2003"	],
//     [	"28/7/2003"	,	"10/8/2003"	],
//     [	"23/7/2003"	,	"27/7/2003"	],
//     [	"16/7/2003"	,	"22/7/2003"	],
//     [	"7/7/2003"	,	"15/7/2003"	],
//     [	"2/7/2003"	,	"6/7/2003"	],
//     [	"30/6/2003"	,	"1/7/2003"	],
//     [	"27/6/2003"	,	"29/6/2003"	],
//     [	"27/5/2003"	,	"26/6/2003"	],
//     [	"22/5/2003"	,	"26/5/2003"	],
//     [	"15/5/2003"	,	"21/5/2003"	],
//     [	"12/5/2003"	,	"14/5/2003"	],
//     [	"6/5/2003"	,	"11/5/2003"	],
//     [	"30/4/2003"	,	"5/5/2003"	],
//     [	"28/4/2003"	,	"29/4/2003"	],
//     [	"13/3/2003"	,	"27/4/2003"	],
//     [	"13/1/2003"	,	"12/3/2003"	],
//     [	"21/11/2002"	,	"12/1/2003"	],
//     [	"11/11/2002"	,	"20/11/2002"	],
//     [	"7/11/2002"	,	"10/11/2002"	],
//     [	"31/10/2002"	,	"6/11/2002"	],
//     [	"30/10/2002"	,	"30/10/2002"	],
//     [	"22/10/2002"	,	"29/10/2002"	],
//     [	"11/10/2002"	,	"21/10/2002"	],
//     [	"25/9/2002"	,	"10/10/2002"	],
//     [	"18/9/2002"	,	"24/9/2002"	],
//     [	"15/4/2002"	,	"17/9/2002"	],
//     [	"27/3/2002"	,	"14/4/2002"	],
//     [	"20/2/2002"	,	"26/3/2002"	],
//     [	"16/1/2002"	,	"19/2/2002"	],
//     [	"11/1/2002"	,	"15/1/2002"	],
//     [	"3/12/2001"	,	"10/1/2002"	],
//     [	"8/11/2000"	,	"2/12/2001"	],
//     [	"27/4/1999"	,	"7/11/2000"	],
//     [	"23/4/1999"	,	"26/4/1999"	],
//     [	"21/4/1999"	,	"22/4/1999"	],
//     [	"14/4/1999"	,	"20/4/1999"	],
//     [	"12/4/1999"	,	"13/4/1999"	],
//     [	"24/3/1999"	,	"11/4/1999"	],
//     [	"8/10/1998"	,	"23/3/1999"	],
//     [	"19/12/1997"	,	"7/10/1998"	],
//     [	"26/6/1997"	,	"18/12/1997"	],
//     [	"2/5/1997"	,	"25/6/1997"	],
//     [	"6/3/1997"	,	"1/5/1997"	],
//     [	"30/1/1997"	,	"5/3/1997"	],
//     [	"22/11/1996"	,	"29/1/1997"	],
//     [	"3/10/1996"	,	"21/11/1996"	],
//     [	"4/9/1996"	,	"2/10/1996"	],
//     [	"14/8/1996"	,	"3/9/1996"	],
//     [	"28/5/1996"	,	"13/8/1996"	],
//     [	"10/5/1996"	,	"27/5/1996"	],
//     [	"7/5/1996"	,	"9/5/1996"	],
//     [	"25/4/1996"	,	"6/5/1996"	],
//     [	"21/3/1996"	,	"24/4/1996"	],
//     [	"7/3/1996"	,	"20/3/1996"	],
//     [	"23/2/1996"	,	"6/3/1996"	],
//     [	"13/2/1996"	,	"22/2/1996"	],
//     [	"18/8/1995"	,	"12/2/1996"	],
//     [	"11/8/1995"	,	"17/8/1995"	],
//     [	"2/8/1995"	,	"10/8/1995"	],
//     [	"5/7/1995"	,	"1/8/1995"	],
//     [	"5/6/1995"	,	"4/7/1995"	],
//     [	"31/5/1995"	,	"4/6/1995"	],
//     [	"29/5/1995"	,	"30/5/1995"	],
//     [	"24/5/1995"	,	"28/5/1995"	],
//     [	"18/5/1995"	,	"23/5/1995"	],
//     [	"16/5/1995"	,	"17/5/1995"	],
//     [	"21/3/1995"	,	"15/5/1995"	],
//     [	"10/3/1995"	,	"20/3/1995"	],
//     [	"7/3/1995"	,	"9/3/1995"	],
//     [	"24/2/1995"	,	"6/3/1995"	],
//     [	"9/2/1995"	,	"23/2/1995"	],
//     [	"7/12/1994"	,	"8/2/1995"	],
//     [	"11/7/1994"	,	"6/12/1994"	],
//     [	"11/3/1994"	,	"10/7/1994"	],
//     [	"22/10/1993"	,	"10/3/1994"	],
//     [	"17/9/1993"	,	"21/10/1993"	],
//     [	"14/9/1993"	,	"16/9/1993"	],
//     [	"1/9/1993"	,	"13/9/1993"	],
//     [	"11/8/1993"	,	"31/8/1993"	],
//     [	"6/5/1993"	,	"10/8/1993"	],
//     [	"11/3/1993"	,	"5/5/1993"	],
//     [	"3/3/1993"	,	"10/3/1993"	],
//     [	"11/2/1993"	,	"2/3/1993"	],
//     [	"25/11/1992"	,	"10/2/1993"	],
//     [	"25/6/1992"	,	"24/11/1992"	],
//     [	"15/1/1992"	,	"24/6/1992"	],
//     [	"4/12/1991"	,	"14/1/1992"	],
//     [	"6/9/1991"	,	"3/12/1991"	],
//     [	"28/8/1991"	,	"5/9/1991"	],
//     [	"26/8/1991"	,	"27/8/1991"	],
//     [	"19/8/1991"	,	"25/8/1991"	],
//     [	"14/8/1991"	,	"18/8/1991"	],
//     [	"7/8/1991"	,	"13/8/1991"	],
//     [	"22/5/1991"	,	"6/8/1991"	],
//     [	"9/5/1991"	,	"21/5/1991"	],
//     [	"7/5/1991"	,	"8/5/1991"	],
//     [	"19/4/1991"	,	"6/5/1991"	],
//     [	"3/4/1991"	,	"18/4/1991"	],
//     [	"2/4/1991"	,	"2/4/1991"	],
//     [	"1/4/1991"	,	"1/4/1991"	],
//                                     ];


// let fechas = [];
// dates.forEach(function(x){
//     if(moment(x[0], 'DD/MM/YYYY').isSame(moment(x[1], 'DD/MM/YYYY'), 'day')){
//         fechas.push([moment(x[0], 'DD/MM/YYYY').format('YYYY-MM-DD')])
//     }else{
//         let days = enumerateDaysBetweenDates(moment(x[0], 'DD/MM/YYYY'), moment(x[1], 'DD/MM/YYYY'));
//         fechas.push(days)
//     }
// });

// let find = [];
// fechas.forEach(function(el, index) {

//     let date = [];
//     el.forEach(function(x){
//         let dateP = (moment(x, "YYYY-MM-DD").format('YYYY-MM-DD')) + 'T00:00';
//         date.push(moment(dateP).utc(true));
//     });
//     find.push({
//                 updateMany: {
//                             filter: {
//                                 fecha: date, 
//                             },
//                             update: {
//                                 tasaPasivaBNA: Number(data[index]), 
//                             },
//                             upsert: true
//                         }
//                     })
// });
// Tasas.bulkWrite(find).then(result => {
//     console.log(result)
// });
})();