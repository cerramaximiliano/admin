const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const transporter = require('nodemailer-smtp-transport');
const sendEmail = require('./nodemailer');
const Tasas = require('../models/tasas');
const TasasMensuales = require('../models/tasasMensuales');
const DatosPrev = require('../models/datosprevisionales');
const Categorias = require('../models/categorias');
const Normas = require('../models/normas')
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
const datosprevisionales = require('../models/datosprevisionales');
//============================RUTAS --------=================================
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
//============================CHROME CONFIG=================================
const chromeOptions = {
    headless:true, 
    slowMo:18,
    defaultViewport: null,
    args: ['--no-sandbox'],
    executablePath: '/usr/bin/chromium-browser',
  };
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
                        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', x)
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
                        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesND', ['ICL'])
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
                        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesArray', dataToSend)
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
                        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesND', ['CER'])
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
                        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesArray', dataToSend)
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


const findLastRecord = DatosPrev.findOne({'estado': true})
.sort({'fecha': -1})
.select('fecha');

const findLastRecordAll = DatosPrev.findOne({'estado': true})
.sort({'fecha': -1})


class Pages {
    constructor(fecha, link, tag, norma){
        this.fecha = fecha;
        this.link = link;
        this.tag = tag;
        this.norma = norma;
    }
};

//========================SCRAPING INFOLEG=========================================
async function saveInfolegData(data){
    let find = [];
    data.forEach(function(ele){
            find.push({
                        updateOne: {
                                    filter: {
                                        norma: (ele.norma), 
                                    },
                                    update: {
                                        fecha: (ele.fecha),
                                        link: (ele.link),
                                        textLink: (ele.textLink),
                                        tag: (ele.tag)
                                    },
                                    upsert: true
                                }
                            })
        });
        console.log(find)
        Normas.bulkWrite(find).then(result => {
            console.log(result);
            console.log(data);
            let text = '';
            data.forEach(function(x) {
                text += `<p>Fecha de publicación: ${moment(x.fecha).format('DD-MM-YYYY')}</p><p>Norma: ${x.norma}</p><p>Asunto: ${x.tag}</p><p>Link: ${x.link}</p><br>`
            });
            sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesNormas', text)
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
        }).catch(err => {
            console.log(err)
        })
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
    let dtRegex = new RegExp(/^(([1-9]|0[1-9]|1[0-9]|2[1-9]|3[0-1])[-](ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[-](\d{4}))$/gi);
        const data = $('.vr_azul11').each(function(x,i){
        let text = ($(this).text()).replace(/\s/g, "");
        let norma = ($(this).prev().children().text()).replace(/\s\s+/g, " ")
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
                    let result = new Pages (momentDate, link, movilidadData[0], norma)
                    results.push(result)
                }else if(haberData != null){
                    let result = new Pages (momentDate, link, haberData[0], norma)
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
            results[i].textLink = 'http://servicios.infoleg.gob.ar/infolegInternet/'+ text.attr('href')
    };
    await browser.close();
    return results
};


//========================SCRAPING TASA ACTIVA=========================================
async function scrapingTasaActiva () {
    const browser = await puppeteer.launch(chromeOptions);
    try {
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
    }
    catch (error) {
        console.log(error)
    }
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
    // console.log(iterator)
    // console.log(regex)
    let regexToUse;
    let check;
    let dataIndex;
    if(regex === 1){
        regexToUse = new RegExp(/tasa efectiva mensual/i);
    }else if(regex === 2){
        regexToUse = new RegExp(/tasa efectiva anual vencida/i);

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
    let checkAnual = words.some(value => (/anual/i).test(value));
    console.log(checkMensual, checkAnual)
    words.forEach(function(x) {
        let checkWords = x.match(regexNumber);
        if (checkWords[0] != undefined && checkWords[0] != '') {
            check = parseFloat(checkWords[0].replace(',','.').replace(' ',''))
        }else{
            false
        }
    })
    if(checkMensual === true){
        check = check / 30
    }else if(checkMensual === false && checkAnual === true){
        check = check / 365
    }else{
        false
    }
    return check
};


async function saveTasaActivaData(tasaData, dateData, tasa){
    let today = moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true);
    let update;
    let tasaFind;
    let tasaText;
    let tasaModel;
    if (tasa === 1){
        tasaFind = {'tasaActivaCNAT2658': {$gte: 0}};
        update = {'tasaActivaCNAT2658': Number(tasaData)};
        tasaText = 'Tasa Activa Efectiva Anual Vencida, cartera general diversa del Banco Nación - Acta CNAT 2658';
        tasaModel = 'tasaActivaCNAT2658'
    }
    Tasas.findOne(tasaFind)
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
                         let info = [moment().format("YYYY-MM-DD"), tasaData, tasaText]
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
                    update = {[tasaModel]: datos[tasaModel]};
                    console.log(update)
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
                         let info = [moment().format("YYYY-MM-DD"), datos[tasaModel] , tasaText]
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
                         let info = [moment().format("YYYY-MM-DD"), tasaData, tasaText]
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
            }
        }

    })
};

//=========================ACTUALIZACION CATEGORIAS================================
const findLastRecordCat = ()  => Categorias.findOne().sort({'fecha': -1})

async function actualizacionCategorias(){
    let resultsCat = await findLastRecordCat;
    let resultsDatosPrev =  await findLastRecordAll;
    if(moment(resultsCat.fecha).isBefore(moment(resultsDatosPrev.fecha))){
                    let datosNuevos = [];
                            datosNuevos.push({
                                updateOne: {
                                            filter: {
                                                fecha: resultsDatosPrev.fecha,
                                            },
                                            update: {
                                                categoriaA: (resultsCat.categoriaA * resultsDatosPrev.movilidadGeneral),
                                                categoriaA2: (resultsCat.categoriaA2 * resultsDatosPrev.movilidadGeneral),
                                                categoriaB: (resultsCat.categoriaB * resultsDatosPrev.movilidadGeneral),
                                                categoriaC: (resultsCat.categoriaC * resultsDatosPrev.movilidadGeneral),
                                                categoriaD: (resultsCat.categoriaD * resultsDatosPrev.movilidadGeneral),
                                                categoriaE: (resultsCat.categoriaE * resultsDatosPrev.movilidadGeneral),
                                                categoriaF: (resultsCat.categoriaF * resultsDatosPrev.movilidadGeneral),
                                                categoriaG: (resultsCat.categoriaG * resultsDatosPrev.movilidadGeneral),
                                                categoriaH: (resultsCat.categoriaH * resultsDatosPrev.movilidadGeneral),
                                                categoriaI: (resultsCat.categoriaI * resultsDatosPrev.movilidadGeneral),
                                                categoriaJ: (resultsCat.categoriaJ * resultsDatosPrev.movilidadGeneral),
                                                categoriaK: (resultsCat.categoriaK * resultsDatosPrev.movilidadGeneral),
                                                categoriaL: (resultsCat.categoriaL * resultsDatosPrev.movilidadGeneral),
                                                categoriaM: (resultsCat.categoriaM * resultsDatosPrev.movilidadGeneral),
                                                categoriaN: (resultsCat.categoriaN * resultsDatosPrev.movilidadGeneral),
                                                categoriaS: (resultsCat.categoriaS * resultsDatosPrev.movilidadGeneral),
                                                categoriaW: (resultsCat.categoriaW * resultsDatosPrev.movilidadGeneral),
                                                categoria1: (resultsCat.categoria1 * resultsDatosPrev.movilidadGeneral),
                                                categoria2: (resultsCat.categoria2 * resultsDatosPrev.movilidadGeneral),
                                                categoria3: (resultsCat.categoria3 * resultsDatosPrev.movilidadGeneral),
                                                categoria4: (resultsCat.categoria4 * resultsDatosPrev.movilidadGeneral),
                                                categoria5: (resultsCat.categoria5 * resultsDatosPrev.movilidadGeneral),
                                                categoria6: (resultsCat.categoria6 * resultsDatosPrev.movilidadGeneral),
                                                categoria7: (resultsCat.categoria7 * resultsDatosPrev.movilidadGeneral),
                                                categoria8: (resultsCat.categoria8 * resultsDatosPrev.movilidadGeneral),
                                                categoria9: (resultsCat.categoria9 * resultsDatosPrev.movilidadGeneral),
                                                categoria10: (resultsCat.categoria10 * resultsDatosPrev.movilidadGeneral),
                                                categoria11: (resultsCat.categoria11 * resultsDatosPrev.movilidadGeneral),
                                                categoria12: (resultsCat.categoria12 * resultsDatosPrev.movilidadGeneral),
                                                categoria13: (resultsCat.categoria13 * resultsDatosPrev.movilidadGeneral),
                                                categoria14: (resultsCat.categoria14 * resultsDatosPrev.movilidadGeneral),
                                                categoria15: (resultsCat.categoria15 * resultsDatosPrev.movilidadGeneral),
                                                categoria16: (resultsCat.categoria16 * resultsDatosPrev.movilidadGeneral),
                                                categoria17: (resultsCat.categoria17 * resultsDatosPrev.movilidadGeneral),
                                                categoria18: (resultsCat.categoria18 * resultsDatosPrev.movilidadGeneral),
                                                categoria19: (resultsCat.categoria19 * resultsDatosPrev.movilidadGeneral),
                                                categoria20: (resultsCat.categoria20 * resultsDatosPrev.movilidadGeneral),
                                                categoria21: (resultsCat.categoria21 * resultsDatosPrev.movilidadGeneral),
                                                categoria22: (resultsCat.categoria22 * resultsDatosPrev.movilidadGeneral),
                                                categoria23: (resultsCat.categoria23 * resultsDatosPrev.movilidadGeneral),
                                                categoria24: (resultsCat.categoria24 * resultsDatosPrev.movilidadGeneral),
                                                categoria25: (resultsCat.categoria25 * resultsDatosPrev.movilidadGeneral),
                                                categoria26: (resultsCat.categoria26 * resultsDatosPrev.movilidadGeneral),
                                                categoria27: (resultsCat.categoria27 * resultsDatosPrev.movilidadGeneral),
                                                categoria28: (resultsCat.categoria28 * resultsDatosPrev.movilidadGeneral),
                                                categoria29: (resultsCat.categoria29 * resultsDatosPrev.movilidadGeneral),
                                                categoria30: (resultsCat.categoria30 * resultsDatosPrev.movilidadGeneral),
                                                categoria31: (resultsCat.categoria31 * resultsDatosPrev.movilidadGeneral),
                                                categoria32: (resultsCat.categoria32 * resultsDatosPrev.movilidadGeneral),
                                                categoria33: (resultsCat.categoria33 * resultsDatosPrev.movilidadGeneral),
                                                categoria34: (resultsCat.categoria34 * resultsDatosPrev.movilidadGeneral),
                                                categoria35: (resultsCat.categoria35 * resultsDatosPrev.movilidadGeneral),
                                                categoria36: (resultsCat.categoria36 * resultsDatosPrev.movilidadGeneral),
                                                categoria37: (resultsCat.categoria37 * resultsDatosPrev.movilidadGeneral),
                                                categoria38: (resultsCat.categoria38 * resultsDatosPrev.movilidadGeneral),
                                                categoria39: (resultsCat.categoria39 * resultsDatosPrev.movilidadGeneral),
                                                categoria40: (resultsCat.categoria40 * resultsDatosPrev.movilidadGeneral),
                                                categoria41: (resultsCat.categoria41 * resultsDatosPrev.movilidadGeneral),
                                                categoria42: (resultsCat.categoria42 * resultsDatosPrev.movilidadGeneral),
                                                categoria43: (resultsCat.categoria43 * resultsDatosPrev.movilidadGeneral),
                                                categoria44: (resultsCat.categoria44 * resultsDatosPrev.movilidadGeneral),
                                                categoria45: (resultsCat.categoria45 * resultsDatosPrev.movilidadGeneral),
                                                categoria46: (resultsCat.categoria46 * resultsDatosPrev.movilidadGeneral),
                                                categoria47: (resultsCat.categoria47  * resultsDatosPrev.movilidadGeneral),
                                                categoriaIndependientes: (resultsCat.categoriaIndependientes * resultsDatosPrev.movilidadGeneral),
                                                categoriaProfesionales: (resultsCat.categoriaProfesionales * resultsDatosPrev.movilidadGeneral),
                                                categoriaEmpresarios: (resultsCat.categoriaEmpresarios * resultsDatosPrev.movilidadGeneral)
                                            },
                                            upsert: true
                                        }
                                    });


                    Categorias.bulkWrite(datosNuevos).then(result => {
                        let info = [datosNuevos[0].updateOne.filter.fecha, JSON.stringify(datosNuevos[0].updateOne.update['$set'])]
                        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'categorias', info)
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
                    .catch(err => {
                        console.log(err)
                    })


    }else{
        let info = 'No hay actualizaciones disponibles para categorías de autónomos.'
        sendEmail.sendEmail('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'n/a', info)
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
};
// NUEVA BASE DE DATOS======================================================
async function findAndCreateNewDDBB(){
        let today = moment().format('YYYY-MM-DD');
        let startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        if(today === startOfMonth){
            let date = moment().subtract(1, 'M');
            let dateEndMonth = moment(date.endOf('month').format('YYYY-MM-DD') + 'T00:00').utc(true);
            let dateEndLastMonth = moment(moment(dateEndMonth).subtract(1, 'M').endOf('month').format('YYYY-MM-DD') + 'T00:00').utc(true)
            Tasas.find({'fecha': {$gte: dateEndLastMonth, $lte: dateEndMonth}})
            .then(result => {
                // console.log(result);
                let tasaPasivaBNA = 0;
                let tasaActivaBNA = 0;
                result.forEach(function(x){
                    tasaActivaBNA += x.tasaActivaBNA;
                    tasaPasivaBNA += x.tasaPasivaBNA;
                })
                let fecha = dateEndMonth.clone().add(1, 'day');
                let data = {
                    fecha: fecha,
                    tasaActivaBNA: tasaActivaBNA,
                    tasaPasivaBNA: tasaPasivaBNA,
                    reference: [result[0].fecha, result[result.length-1].fecha]
                }
                TasasMensuales.findOneAndUpdate({fecha: new Date(data.fecha)}, data, {
                    new: true,
                    upsert: true
                })
                .then(result => {
                    console.log(result);
                })
                .catch(err => {
                    console.log(err)
                })
            })
            .catch(err => {
                console.log(err)
            })
        }else{
            false
        }
}

exports.findAndCreateNewDDBB = findAndCreateNewDDBB;
exports.downloadBCRADDBB = downloadBCRADDBB;
exports.scrapingTasaActiva = scrapingTasaActiva;
exports.regexDates = regexDates;
exports.regexTextCheck = regexTextCheck;
exports.findTasa = findTasa;
exports.dataTasa = dataTasa;
exports.downloadPBNA = downloadPBNA;
exports.parseBNAPasiva = parseBNAPasiva;
exports.scrapingInfoleg = scrapingInfoleg;
exports.saveInfolegData = saveInfolegData;
exports.actualizacionCategorias = actualizacionCategorias;
exports.saveTasaActivaData = saveTasaActivaData;