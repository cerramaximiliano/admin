const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const transporter = require('nodemailer-smtp-transport');
const sendEmail = require('./nodemailer');
const Tasas = require('../models/tasas');
const DatosPrev = require('../models/datosprevisionales')
const moment = require('moment');
const xlsx = require('xlsx');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const pdf = require('pdf-parse');
const lineReader = require('line-reader');
const cheerio = require('cheerio');
//============================RUTAS --------=================================
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
//============================FUNCIONES TASA PASIVA BNA======================
function parseBNAPasiva(routeFile){
let tasasList = [];
async function dataTasaPasiva(data, ind){
    let regexNumber = /\d*(\.|\,)?\d*/;
    let check;
    let tasas = [];
    let checkPercentaje = data.search('%');
    if(checkPercentaje === -1){
        false
    }else{
        let words = data.split('%');
        let checkWords = words.filter(x => x != '');
        if(checkWords.length === 0){
            false
        }else{
            words.forEach(function(x, index) {
                let checkWords = x.match(regexNumber);
                if (checkWords[0] != undefined && checkWords[0] != '') {
                    check = parseFloat(checkWords[0].replace(',','.').replace(' ',''))
                    tasas.push(check);
                }else{
                    false
                }
            });
        }
    }
    tasasList.push(tasas);
    return tasasList
}

let arrayLine = [];
let datesTasas = [];
let dataBuffer = fs.readFileSync(routeFile);
pdf(dataBuffer).then(function(data){
    let text = data.text;
    fs.writeFileSync(DOWNLOAD_DIR + 'tasa_pasiva_BNA/' + 'tasaPasivaBNA.txt',text)
    arrayLine = fs.readFileSync(DOWNLOAD_DIR + 'tasa_pasiva_BNA/' + 'tasaPasivaBNA.txt').toString().split("\n");
    arrayLine.forEach(function(x, index){
        let resultNumbers = dataTasaPasiva(x, index);
        let myRegexp = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g; //Check pattern only
        let validDate = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;
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
        Tasas.findOne({'tasaPasivaBNA': {$gte: 0}})
        .sort({'fecha': -1})
        .exec((err, datos) => {
            if(err) {
              console.log(err)
            }else{
                let today = moment(moment().format('YYYY-MM-DD') + 'T00:00').utc(true)
                if(moment(datos.fecha).isSame(today, 'day')){
                    console.log('Hoy es igual al ultimo dia DDBB')
                }else if(moment(datos.fecha).isBefore(today, 'day')){
                    console.log('El ultimo dia DDBB es anterior a hoy. Actualizar');
                    if(dateToSave.isSameOrBefore(today, 'day')){
                        console.log('El dia de Hoy es mayor o igual al de la pagina web. Actualizar con WEB')
                        let filter = {fecha: today};
                        let update = {tasaPasivaBNA: Number(tasasList[0][0] / 365)};
                        Tasas.findOneAndUpdate(filter, update, {
                            new: true,
                            upsert: true
                        })
                        .exec((err, datos) => {
                            if(err) {
                                console.log(err)
                            }else{
                             let info = [moment().format("YYYY-MM-DD"), (tasasList[0][0] / 365), 'Tasa Pasiva BNA']
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
                    }else if(dateToSave.isAfter(today, 'day')){
                        console.log('El dia de Hoy es anterior al dia de la pagina web. Actualizar con DDBB')
                        let filter = {fecha: today};
                        let update = {tasaPasivaBNA: Number(datos.tasaPasivaBNA)};
                        Tasas.findOneAndUpdate(filter, update, {
                            new: true,
                            upsert: true
                        })
                        .exec((err, datos) => {
                            if(err) {
                                console.log(err)
                            }else{
                             let info = [moment().format("YYYY-MM-DD"), datos.tasaPasivaBNA, 'Tasa Pasiva BNA']
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
                }
            }
        });
    }else{
        console.log('requerir accion humana')
    }
}).catch(function(err){
    console.log(err)
});
}
async function downloadPBNA(){
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    await page.goto('https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero');
    const ele = await page.content();
    const $ = cheerio.load(ele);
    let url;
    const table = $('#collapseTwo > .panel-body > .plazoTable > ul > li').each(function(x, ele){
        $(this).each(function(i,element){

            let matchPasivas = $(this).text().match(/tasas de operaciones pasivas/i);
            if(matchPasivas != null){
                url = $(this).children().attr('href')
            }
        })
    });
    let file_url = 'https://www.bna.com.ar' + url;
    let file_name = 'tasa_pasiva_BNA_' + moment().format('YYYY-MM-DD') + '.pdf';
    let fileRoute = DOWNLOAD_DIR + 'tasa_pasiva_BNA/' + file_name
    let file = fs.createWriteStream(fileRoute, {'flags': 'w'});
    const request = https.get(file_url, function(response) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            parseBNAPasiva(fileRoute);
});
});
};


//===================CONFIGURACION WEB SCRAPING=================================
//==============================================================================
//=========================TASA PASIVA==========================================


function isInt(value) {
        return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
};
function getlength(number) {
        return number.toString().length;
};
function countDecimals (number) {
    if(Math.floor(number.valueOf()) === number.valueOf()) return 0;
    return number.toString().split(".")[1].length || 0; 
};
function compareArray (arr1, arr2){
    if (arr1.length === arr2.length){
        return false
    }else{
        return true
    }
}

function downloadBCRADDBB(tasa){
    let file_url;
    let file_name;
    if (tasa === 'pasivaBCRA'){
        file_url='http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/ind2022.xls';
        file_name = 'data.xls';
    }else if(tasa === 'cer'){
        file_url='http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/cer2022.xls'
        file_name = 'dataCER.xls';
    }else if(tasa === 'icl'){
        file_url='http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/icl2022.xls'
        file_name = 'dataICL.xls';
    }
    
    let file = fs.createWriteStream(DOWNLOAD_DIR + file_name, {'flags': 'w'});
    const request = http.get(file_url, function(response) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            if (tasa === 'pasivaBCRA') {
                convertExcelFileToJsonUsingXlsx();
            }else if(tasa === 'cer'){
                convertXlsCER();
            }else if(tasa === 'icl'){
                convertXlsICL();
            }
        });
    
    }).on('error', (err) => {
        console.log('Error', err.message);
    });
async function convertExcelFileToJsonUsingXlsx () {
        let file_read = 'data.xls'
        const file = xlsx.readFile(DOWNLOAD_DIR + file_read, {type: 'binary'})
        const sheetNames = file.SheetNames;
        const totalSheets = sheetNames.length;
        const tempData = xlsx.utils.sheet_to_json(file.Sheets['Serie_diaria']);
        let parsedData = [];
        let data = [];
        let dataIndex = [];
        tempData.forEach(function(x, index){
            Object.keys(x).forEach(function(arr, ind, total){
                if(isInt(x[arr]) === true){
                    if(getlength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
                        data.push(x[arr]);
                        if(data.length === 2){
                            dataIndex.push(x[total[total.length-1]])
                        }
                    }else{
                        false
                    }
                }else{
                    false
                }
            });
            if(data.length >= 3){
                parsedData.push([data[data.length-1],dataIndex[0]]);
            }else if (data.length === 2){
                parsedData.push([data[1],dataIndex[0]]);
            }else{
                false
            };
    
            data = [];
            dataIndex = [];
        });
        parsedData.forEach(function(x){
            if (moment(x[0], "YYYYMMDD").isSame(moment(), 'days') === true){
                let date = (moment(x[0], "YYYYMMDD").format('YYYY-MM-DD')) + 'T00:00'
                let dateToFind = moment(date).utc(true);
                let filter = {fecha: dateToFind}
                let update = {tasaPasivaBCRA: Number(x[1])};
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
                        let info = x.push('Tasa Pasiva BCRA')
                        sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizaciones', x)
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
                        return {
                        ok: true,
                        datos: datos
                        }
                        }
                    });
            }else {
                return false
            }
        });
        return generateJSONFile(parsedData, 'dataBCRATasaPasiva2022.json');
    };

async function convertXlsICL (){
    let file_read = 'dataICL.xls';
    const file = xlsx.readFile(DOWNLOAD_DIR + file_read, {type: 'binary'})
    const sheetNames = file.SheetNames;
    const totalSheets = sheetNames.length;
    const tempData = xlsx.utils.sheet_to_json(file.Sheets['ICL']);
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    tempData.forEach(function(x){
        Object.keys(x).forEach(function(arr){
            if(isInt(x[arr]) === true){
                if(getlength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
                    data.push(x[arr]);
                }
            }else if(typeof x[arr] === 'number' && arr === 'INTEREST RATES AND ADJUSTMENT COEFFICIENTS ESTABLISHED BY THE BCRA'){
                countDecimals(x[arr]) >= 1 ? dataIndex.push(x[arr]) : false
            }
        })
        data[0] != undefined && dataIndex[0] != undefined ? parsedData.push([data[0], dataIndex[0]]) : false
        data = [];
        dataIndex = [];
    });
    Tasas.findOne({'icl': {$gte: 0}})
    .sort({'fecha': -1})
    .exec((err, datos) => {
        if(err) {
        console.log(err)
        return {
        ok: false,
        err
        };
        }else{
            //Busca un resultado de la ultima fecha para ese indice
            let actualizaciones = [];
            parsedData.forEach(function(e){
                if (moment(moment(e[0], "YYYYMMDD").format("YYYY-MM-DD") + 'T00:00').utc(true).isAfter(moment(datos.fecha))) {
                    actualizaciones.push(e);
                }else{
                    false;
                }
            });
                if (actualizaciones.length === 0){
                        sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizacionesND', ['ICL'])
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

                }else{
                    console.log('enviar mail con actualizaciones');
                    let find = [];
                    actualizaciones.forEach(function(ele){
                            let date = (moment(ele[0], "YYYYMMDD").format('YYYY-MM-DD')) + 'T00:00'
                            find.push({
                                        updateOne: {
                                                    filter: {
                                                        fecha: moment(date).utc(true), 
                                                    },
                                                    update: {
                                                        icl: Number(ele[1]), 
                                                    },
                                                    upsert: true
                                                }
                                            })
                        });
                        Tasas.bulkWrite(find).then(result => {
                            function arrayToText(array, position){
                                let string = ''
                                array.forEach(function(x){
                                    console.log(x)
                                    string += `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
                                });
                                return string
                            }
                            let arrayText = arrayToText(actualizaciones,1);
                            let dataToSend = ['ICL', arrayText];
                            //Enviar mail con todas las tasas actualizadas
                        sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizacionesArray', dataToSend)
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
                })                
            }
        }
    });
}

async function convertXlsCER (){
    let file_read = 'dataCER.xls'
    const file = xlsx.readFile(DOWNLOAD_DIR + file_read, {type: 'binary'})
    const sheetNames = file.SheetNames;
    const tempData = xlsx.utils.sheet_to_json(file.Sheets['Totales_diarios']);
    let parsedData = [];
    let data = [];
    let dataIndex = [];
    tempData.forEach(function(x){
        Object.keys(x).forEach(function(arr, ind, total){
            if(isInt(x[arr]) === true){
                if(getlength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
                   data.push(x[arr]);
                }
            }else if(typeof x[arr] === 'number'){
                countDecimals(x[arr]) > 10 ? dataIndex.push(x[arr]) : false;
            }
        })
        data[0] != undefined && dataIndex[0] != undefined ? parsedData.push([data[0], dataIndex[0]]) : false
        data = [];
        dataIndex = [];
    });
    Tasas.findOne({'cer': {$gte: 0}})
    .sort({'fecha': -1})
    .exec((err, datos) => {
        if(err) {
            console.log(err)
          return {
          ok: false,
          err
          };
        }else{
            if(datos === null){
                let find = [];
                parsedData.forEach(function(el) {
                    let date = (moment(el[0], "YYYYMMDD").format('YYYY-MM-DD')) + 'T00:00'
                    find.push({
                                updateOne: {
                                            filter: {
                                                fecha: moment(date).utc(true), 
                                            },
                                            update: {
                                                cer: Number(el[1]), 
                                            },
                                            upsert: true
                                        }
                                    })
                });
                Tasas.bulkWrite(find).then(result => {
                    console.log(result)
                });
            }else{
                let actualizaciones = [];
                parsedData.forEach(function(element){
                    if(moment(moment(element[0], "YYYYMMDD").format("YYYY-MM-DD") + 'T00:00').utc(true).isAfter(moment(datos.fecha))){
                        //si ultimo dia grabado en la base de datos es menor a alguno de los nuevos, se graban en la base de datos
                        actualizaciones.push(element);
                    }else{
                        //no hay fechas nuevas para grabar disponibles
                        false
                    }
                });
                if (actualizaciones.length === 0){
                    console.log('enviar mail sin actualizaciones')
                        sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizacionesND', ['CER'])
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
                }else if(actualizaciones.length > 0){
                    console.log('enviar mail con actualizaciones');
                    console.log(actualizaciones)
                    let find = [];
                    actualizaciones.forEach(function(ele){
                            let date = (moment(ele[0], "YYYYMMDD").format('YYYY-MM-DD')) + 'T00:00'
                            find.push({
                                        updateOne: {
                                                    filter: {
                                                        fecha: moment(date).utc(true), 
                                                    },
                                                    update: {
                                                        cer: Number(ele[1]), 
                                                    },
                                                    upsert: true
                                                }
                                            })
                        });
                        Tasas.bulkWrite(find).then(result => {
                            function arrayToText(array, position){
                                let string = ''
                                array.forEach(function(x){
                                    console.log(x)
                                    string += `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
                                });
                                return string
                            }
                            let arrayText = arrayToText(actualizaciones,1);
                            let dataToSend = ['CER', arrayText];
                            //Enviar mail con todas las tasas actualizadas
                        sendEmail.sendEmail('soporte@lawanalytics.com.ar', 'soporte@lawanalytics.com.ar', 0, 0, 0, 0, 'actualizacionesArray', dataToSend)
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
                        });
                }
            }
    }
    })

    fs.readFile(DOWNLOAD_DIR + 'dataBCRATasaCER.json', (err, data)  => {
        if(err){
            console.log(err)
            generateJSONFile(parsedData, 'dataBCRATasaCER.json')
            return err;
        }else{
            let fileParsed = JSON.parse(data);
            let compare = compareArray(fileParsed, parsedData);
            compare === false ? false : generateJSONFile(parsedData, 'dataBCRATasaCER.json');
        }
    })
}
function generateJSONFile(data, file) {
        try {
            fs.writeFileSync(DOWNLOAD_DIR + file, JSON.stringify(data))
        } catch (err) {
            console.error(err)
        }
};
};

const chromeOptions = {
    headless:true, 
    slowMo:18,
    defaultViewport: null,
    args: ['--no-sandbox']
  };

  function datesSpanish(date){
    let dateArray = date.split('-');
    switch (dateArray[1]) {
        case 'ene':
            dateArray[1] = 1;
            break
        case 'feb':
            dateArray[1] = 2;
            break
        case 'mar':
            dateArray[1] = 3;
            break
        case 'abr':
            dateArray[1] = 4;
            break
        case 'may':
            dateArray[1] = 5;
            break
        case 'jun':
            dateArray[1] = 6;
            break
        case 'jul':
            dateArray[1] = 7;
            break
        case 'ago':
            dateArray[1] = 8;
            break
        case 'sep':
            dateArray[1] = 9;
            break
        case 'oct':
            dateArray[1] = 10;
            break
        case 'nov':
            dateArray[1] = 11;
            break
        case 'dic':
            dateArray[1] = 12;
            break
        default:
            break;
    };
    return dateArray.join('-');
};

async function scrapingSubPages(page, link){
    await page.goto(link);
    const ele = await page.content();
    const $ = cheerio.load(ele);
    const text = $('#Textos_Completos > p > a');
    console.log(text)
}


const findLastRecord = DatosPrev.findOne({'estado': true})
.sort({'fecha': -1})
.select('fecha');

class Pages {
    constructor(date, link, tag){
        this.date = date;
        this.link = link;
        this.tag = tag;
    }
};

async function scrapingInfoleg(){
    let results = [];
    let findDate = await findLastRecord;

    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    await page.goto('http://servicios.infoleg.gob.ar/infolegInternet/verVinculos.do?modo=2&id=639');
    const ele = await page.content();
    const $ = cheerio.load(ele);
    const title = $('#detalles > strong').text().match(/\d+/)[0];
    console.log(title);
    let dtRegex = new RegExp(/^(([1-9]|0[1-9]|1[0-9]|2[1-9]|3[0-1])[-](ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[-](\d{4}))$/gi);
        const data = $('.vr_azul11').each(function(x,i){
        let text = ($(this).text()).replace(/\s/g, "");
        let check = (dtRegex).test(text);
        if(check === true){
            let momentDates = datesSpanish(text);
            let momentDate = moment(moment(momentDates, 'DD-MM-YYYY').format('YYYY-MM-DD') + 'T00:00').utc(true);
            if( momentDate.isSameOrAfter(findDate.fecha) ){
                let link = 'http://servicios.infoleg.gob.ar' + $(this).prev().children().attr('href');
                let data = $(this).next().text();
                let movilidadData = data.match(/movilidad/i);
                let haberData = data.match(/haber/i);
                if(movilidadData != null){
                    let result = new Pages (momentDate, link, movilidadData[0])
                    results.push(result)
                }else if(haberData != null){
                    let result = new Pages (momentDate, link, haberData[0])
                    results.push(result)
                }else{
                    false
                }
            }
        }
    });
    for (let i = 0; i < results.length; i++) {  
            await page.goto(`${results[i].link}`), {
                waitUntil: 'load',
                timeout: 0
            };
            let element = await page.content();
            let $$ = cheerio.load(element);
            let text = $$('#Textos_Completos > p > a').filter(function(){
                return $(this).text().trim() === 'Texto completo de la norma'
            });
            results[i].textLinks = 'http://servicios.infoleg.gob.ar/infolegInternet/'+ text.attr('href')
    };
    await browser.close();
    return results
};

async function scrapingTasaActiva () {
    const browser = await puppeteer.launch(chromeOptions);
    const page = await browser.newPage();
    await page.goto('https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero');
    const ele = await page.evaluate(() => {
        const tag = document.querySelectorAll("#collapseTwo ul li");
        const title = document.querySelector("#collapseTwo h3");
        let text = [];
        text.push(title.innerText);
        tag.forEach((tag) => {
            text.push(tag.innerText)
        })

        return text
    });
    await browser.close();
    return ele
};
async function regexDates(tasaActiva){
    let myRegexp = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g; //Check pattern only
    let validDate = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;
    tasaActiva[0] = myRegexp.exec(tasaActiva[0])
    tasaActiva[0][0] = validDate.exec(tasaActiva[0][0])
    return moment(moment(tasaActiva[0][0][0],"DD/MM/YYYY").format('YYYY-MM-DD') + 'T00:00').utc(true);
};
async function regexTextCheck(regex, text){
    let regexToUse;
    if (regex === 1) {
        regexToUse = new RegExp(/tasa activa/i);
    };
    let check = regexToUse.test(text);
    return check
};
async function findTasa(regex, iterator){
    let regexToUse;
    let check;
    let dataIndex;
    if(regex === 1){
        regexToUse = new RegExp(/tasa efectiva mensual/i);
    }
    iterator.forEach(function(x, index){
        if(regexToUse.test(x) === true){
            check = true
            dataIndex = index
        }else{
            false
        }
    })
    return [check, dataIndex]
};


async function dataTasa(tasa, index){
    let regexNumber = /\d*(\.|\,)?\d*/;
    let check;
    let words = tasa[index].split(' ');
    let checkMensual = words.some(value => (/mensual/i).test(value));
    words.forEach(function(x) {
        let checkWords = x.match(regexNumber);
        if (checkWords[0] != undefined && checkWords[0] != '') {
            check = parseFloat(checkWords[0].replace(',','.').replace(' ',''))
        }else{
            false
        }
    })
    checkMensual === true ? check = check / 30 : false;
    return check
}




exports.downloadBCRADDBB = downloadBCRADDBB;
exports.scrapingTasaActiva = scrapingTasaActiva;
exports.regexDates = regexDates;
exports.regexTextCheck = regexTextCheck;
exports.findTasa = findTasa;
exports.dataTasa = dataTasa;
exports.downloadPBNA = downloadPBNA;
exports.parseBNAPasiva = parseBNAPasiva;
exports.scrapingInfoleg = scrapingInfoleg;