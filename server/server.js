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
cron.schedule('30 10 * * *', () => {
    (async () => {
        let tasaActiva = await downloadBCRADDBB.scrapingTasaActiva();
        let regexTasa = new RegExp(/tasa activa/i)
        let myRegexp = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g; //Check pattern only
        let validDate = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g; //Check the validity of the date
        tasaActiva[0] = myRegexp.exec(tasaActiva[0])
        tasaActiva[0][0] = validDate.exec(tasaActiva[0][0])
        let dateData = moment(moment(tasaActiva[0][0][0],"DD/MM/YYYY").format('YYYY-MM-DD') + 'T00:00').utc(true);
        tasaActiva.forEach(function(x, index){
            console.log(x)
            let regExpInteres = new RegExp(/Tasa Efectiva Mensual/i)
            let check = regExpInteres.test(x);
            if(check === true){
                //buscar el porcentaje
            }
        });
        console.log('Fecha del sitio',dateData)
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
            if ( moment(datos.fecha).utc().isSame( moment(moment().format('YYYY-MM-DD') + 'T00:00').utc(true), 'day') ) {
                //Ultima fecha de la DDBB es igual a la fecha actual de actualizacion. No hay accion requerida.
                console.log(false)
                false
            }else{
                if(moment().isSame(dateData, 'day')){
                    //Actualizar con la fecha del sitio el dia de hoy
                    console.log('La fecha del sitio es igual a hoy')
                }else if(moment().isBefore(dateData, 'day')){
                    //es mayor la fecha del sitio, entonces copiar la fecha del dia de ayer.
                    console.log('La fecha del sitio es mayor a hoy');
                    let filter = {fecha: moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true)};
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