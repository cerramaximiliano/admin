const express = require('express');
const app = express();
const nodemailer = require('nodemailer');
const transporter = require('nodemailer-smtp-transport');
const sendEmail = require('./nodemailer');
const Tasas = require('../models/tasas');
const moment = require('moment');
const xlsx = require('xlsx');
const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
//==============================================================================
//===================CONFIGURACION WEB SCRAPING=================================
//==============================================================================
//=========================TASA PASIVA==========================================
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';

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
}





exports.downloadBCRADDBB = downloadBCRADDBB;
exports.scrapingTasaActiva = scrapingTasaActiva;