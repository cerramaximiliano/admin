const express = require('express');
const app = express();
require('./config/config');
const Tasas = require('./models/tasas');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const moment = require('moment');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const sendEmail = require('./routes/nodemailer');
app.use(cors());
const path = require('path');
const downloadBCRADDBB = require('./routes/scrapingweb.js');
const puppeteer = require('puppeteer');
app.use(express.static(path.join(__dirname, '../public')));


mongoose.connect(process.env.URLDB, {useNewUrlParser: true, useUnifiedTopology: true}, (err, res) => {
    if(err) throw err;
    console.log('Base de datos ONLINE');
});


app.listen(process.env.PORT, () => {
    console.log('Escuchando el puerto', process.env.PORT);
});


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
cron.schedule('25 10 * * *', () => {
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
                         sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizaciones', info)
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
                         sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizaciones', info)
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
                         sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizaciones', info)
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







// (async () => {
//     const browser = await puppeteer.launch(chromeOptions);
//     const page = await browser.newPage();
//     await page.goto('https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero');
//     const ele = await page.evaluate(() => {
//         const tag = document.querySelectorAll("#collapseTwo ul li");
//         const title = document.querySelector("#collapseTwo h3");
//         let text = [];
//         text.push(title.innerText);
//         tag.forEach((tag) => {
//             text.push(tag.innerText)
//         })

//         return text
//     });

//     // await browser.close();
// }) ();