const express = require('express');
const app = express();
const sendEmail = require('../config/email.js');
const {logger} = require('../config/pino');
const Tasas = require('../models/tasas');
const TasasMensuales = require('../models/tasasMensuales');
const DatosPrev = require('../models/datosprevisionales');
const Categorias = require('../models/categorias');
const Normas = require('../models/normas')
const moment = require('moment');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const pdf = require('pdf-parse');
const lineReader = require('line-reader');
const cheerio = require('cheerio');
const download = require('download');
const https = require('https');
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
//============================CHROME CONFIG=================================
const chromeOptions = {
    headless:true,
    slowMo:18,
    defaultViewport: null,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ["--disable-extensions"],
    // executablePath: '/admin/node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome',
  };

//============================FUNCIONES PJN SCRAPING======================
async function scrapingPjn (){
        const browser = await puppeteer.launch(chromeOptions);
        const page = await browser.newPage();
        await page.goto('https://scw.pjn.gov.ar/scw/home.seam');
        'formPublica:camaraNumAni'
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
                logger.error(`Tasa pasiva BNA. Error en base de datos ${err}`)
            }else{
                let today = moment(moment().format('YYYY-MM-DD') + 'T00:00').utc(true)
                if(moment(datos.fecha).isSame(today, 'day')){
                    logger.info(`Tasa Pasiva BNA. Hoy es igual al ultimo dia DDBB. ${datos.fecha, today}`)
                }else if(moment(datos.fecha).isBefore(today, 'day')){
                    logger.info(`Tasa Pasiva BNA. El ultimo dia DDBB es anterior a hoy. Actualizar. ${datos.fecha, today}`)
                    if(dateToSave.isSameOrBefore(today, 'day')){
                        logger.info(`Tasa Pasiva BNA. El dia de Hoy es mayor o igual al de la pagina web. Actualizar con WEB. ${dateToSave, today}`)
                        let filter = {fecha: today};
                        let update = {tasaPasivaBNA: Number(tasasList[0][0] / 365)};
                        Tasas.findOneAndUpdate(filter, update, {
                            new: true,
                            upsert: true
                        })
                        .exec((err, datos) => {
                            if(err) {
                                logger.error(`Tasa Pasiva BNA. Error en base de datos ${err}`)
                            }else{
                             let info = [moment().format("YYYY-MM-DD"), (tasasList[0][0] / 365), 'Tasa Pasiva BNA']
                             sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                             .then(result => {
                               if(result === true){
                                logger.info(`Tasa Pasiva BNA. Envio de mail correcto. ${result}`)
                               }else{
                                logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto ${result}`)
                               }
                             })
                             .catch(err => {
                                logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto ${err}`)
                             })
                            }
                        });
                    }else if(dateToSave.isAfter(today, 'day')){
                        logger.info(`Tasa Pasiva BNA. El dia de Hoy es anterior al dia de la pagina web. Actualizar con DDBB. ${dateToSave, today}`)
                        let filter = {fecha: today};
                        let update = {tasaPasivaBNA: Number(datos.tasaPasivaBNA)};
                        Tasas.findOneAndUpdate(filter, update, {
                            new: true,
                            upsert: true
                        })
                        .exec((err, datos) => {
                            if(err) {
                                logger.error(`Tasa Pasiva BNA. Error en base de datos ${err}`)
                            }else{
                             let info = [moment().format("YYYY-MM-DD"), datos.tasaPasivaBNA, 'Tasa Pasiva BNA']
                             sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                             .then(result => {
                               if(result === true){
                                logger.info(`Tasa Pasiva BNA. Envio de mail correcto. ${result}`)
                               }else{
                                logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto. ${result}`)
                               }
                             })
                             .catch(err => {
                                logger.error(`Tasa Pasiva BNA. Envio de mail incorrecto. ${err}`)
                             })
                            }
                        });
                    }
                }
            }
        });
    }else{
        logger.warn(`Tasa Pasiva BNA. Requiere actualizacion manual.`)
    }
}).catch(function(err){
    logger.error(`Tasa Pasiva BNA. Requiere actualizacion manual. ${err}`)
});
}
async function downloadPBNA(){
    try {
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
                    logger.info(`Tasa Pasiva BNA. Busqueda URL: ${url}`)
                }
            })
        });
        let file_url = 'https://www.bna.com.ar' + url;
        let file_name = 'tasa_pasiva_BNA_' + moment().format('YYYY-MM-DD') + '.pdf';
        let fileRoute = DOWNLOAD_DIR + 'tasa_pasiva_BNA/' + file_name;
        logger.info(`Tasa Pasiva BNA. ${fileRoute}`);
        let file = fs.createWriteStream(fileRoute, {'flags': 'w'});
        const request = https.get(file_url, function(response) {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                parseBNAPasiva(fileRoute);
    });
    });
    }catch(err){
        logger.error(`Tasa Pasiva BNA. Error al ejectutar función de guardado de pdf: ${err}`)

    }
};


//===================CONFIGURACION WEB SCRAPING=================================
//==============================================================================
//=========================TASA PASIVA==========================================

function isInt(value) {
    return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value));
}
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

async function downloadBCRADDBB(tasa) {
    const currentYear = new Date().getFullYear();
    let file_url;
    let file_name;
    
    // Configurar URL y nombre de archivo según el tipo de tasa
    if (tasa === 'pasivaBCRA') {
        file_url = `http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/ind${currentYear}.xls`;
        file_name = 'data';
    } else if (tasa === 'cer') {
        file_url = `http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/cer${currentYear}.xls`;
        file_name = 'dataCER';
    } else if (tasa === 'icl') {
        file_url = `http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/icl${currentYear}.xls`;
        file_name = 'dataICL';
    } else {
        throw new Error(`Tipo de tasa no soportado: ${tasa}`);
    }

    const filePath = DOWNLOAD_DIR;
    
    try {
        logger.info(`Iniciando descarga de ${tasa} desde ${file_url}`);
        
        // Implementar retry pattern para la descarga
        let retries = 3;
        let success = false;
        let lastError;
        
        while (retries > 0 && !success) {
            try {
                await download(file_url, filePath);
                success = true;
                logger.info(`Descarga exitosa de ${tasa}`);
            } catch (error) {
                lastError = error;
                logger.warn(`Intento de descarga fallido para ${tasa}, intentos restantes: ${retries-1}`);
                retries--;
                // Esperar antes de reintentar (backoff exponencial)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, 3-retries)));
            }
        }
        
        if (!success) {
            throw lastError || new Error(`Descarga fallida después de múltiples intentos`);
        }
        
        // Procesar el archivo descargado según su tipo
        if (tasa === 'pasivaBCRA') {
            await convertExcelFileToJsonUsingXlsx(`ind${currentYear}.xls`);
        } else if (tasa === 'cer') {
            await convertXlsCER(`cer${currentYear}.xls`);
        } else if (tasa === 'icl') {
            await convertXlsICL(`icl${currentYear}.xls`);
        }
        
        return true;
    } catch (error) {
        logger.error(`Error en downloadBCRADDBB para ${tasa}: ${error.message}`);
        // Notificar el error
        await notifyScrapingFailure('downloadBCRADDBB', error);
        throw error;
    }
}

/**
 * Notifica fallos en el proceso de scraping
 */
async function notifyScrapingFailure(operation, error) {
    const errorDetails = {
        operation,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    };
    
    // Logging
    logger.error(errorDetails);

};


async function updateDatabaseWithExcelData(parsedData) {
    try {
        // Filtrar solo los datos para el día actual (si existe)
        const today = moment().format('YYYYMMDD');
        const todayData = parsedData.find(x => moment(x[0], "YYYYMMDD").format('YYYYMMDD') === today);
        
        if (todayData) {
            logger.info(`Encontrada actualización para el día de hoy (${today})`);
            
            const date = moment(todayData[0], "YYYYMMDD").format('YYYY-MM-DD') + 'T00:00';
            const dateToFind = moment(date).utc(true);
            const filter = { fecha: dateToFind };
            const update = { tasaPasivaBCRA: Number(todayData[1]) };
            
            // Actualizar o crear registro en la base de datos
            const updatedData = await Tasas.findOneAndUpdate(filter, update, {
                new: true,
                upsert: true
            });
            
            // Enviar email de notificación sobre la actualización
            const info = [...todayData, 'Tasa Pasiva BCRA'];
            await sendEmail.sendAWSEmailNodemailer(
                'soporte@lawanalytics.app', 
                'soporte@lawanalytics.app', 
                0, 0, 0, 0, 
                'actualizaciones', 
                info
            );
            
            logger.info(`Base de datos actualizada para el ${date}`);
        } else {
            logger.info(`No hay datos disponibles para el día de hoy (${today})`);
        }
    } catch (error) {
        logger.error(`Error actualizando la base de datos: ${error.message}`);
        throw error;
    }
}

async function convertExcelFileToJsonUsingXlsx(file_read) {
    try {
        logger.info(`Iniciando procesamiento de archivo Excel: ${file_read}`);
        
        // Verificar si el archivo existe
        const filePath = path.join(DOWNLOAD_DIR, file_read);
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
        } catch (error) {
            throw new Error(`El archivo ${file_read} no existe en ${DOWNLOAD_DIR}`);
        }
        
        // Leer el archivo Excel
        const file = xlsx.readFile(filePath, {
            type: 'binary',
            cellDates: true, // Asegurar que las fechas se procesen correctamente
            dateNF: 'yyyy-mm-dd' // Formato de fecha
        });
        
        // Verificar si el archivo tiene hojas
        const sheetNames = file.SheetNames;
        if (!sheetNames || sheetNames.length === 0) {
            throw new Error(`El archivo ${file_read} no contiene hojas de cálculo`);
        }
        
        // Verificar si existe la hoja específica
        const sheetName = 'Serie_diaria';
        if (!sheetNames.includes(sheetName)) {
            throw new Error(`La hoja '${sheetName}' no existe en el archivo. Hojas disponibles: ${sheetNames.join(', ')}`);
        }
        
        // Convertir la hoja a JSON
        const tempData = xlsx.utils.sheet_to_json(file.Sheets[sheetName]);
        if (!tempData || tempData.length === 0) {
            throw new Error(`No se encontraron datos en la hoja '${sheetName}'`);
        }
        
        logger.info(`Procesados ${tempData.length} registros del archivo ${file_read}`);
        
        // Procesar los datos
        let parsedData = [];
        let data = [];
        let dataIndex = [];
        
        for (const x of tempData) {
            for (const [arr, value] of Object.entries(x)) {
                if (isInt(value) && getlength(value) === 8 && moment(value, "YYYYMMDD").isValid()) {
                    data.push(value);
                    if (data.length === 2) {
                        // Asumiendo que "total" es el array de claves
                        const total = Object.keys(x);
                        dataIndex.push(x[total[total.length-1]]);
                    }
                }
            }
            
            // Construir el dato procesado
            if (data.length >= 3) {
                parsedData.push([data[data.length-1], dataIndex[0]]);
            } else if (data.length === 2) {
                parsedData.push([data[1], dataIndex[0]]);
            }
            
            // Reiniciar variables para el siguiente registro
            data = [];
            dataIndex = [];
        }
        
        // Verificar si se procesaron datos
        if (parsedData.length === 0) {
            throw new Error(`No se pudieron extraer datos válidos del archivo ${file_read}`);
        }
        
        logger.info(`Procesamiento completo: ${parsedData.length} registros extraídos`);
        
        // Actualizar la base de datos con los datos procesados si hay actualizaciones para el día actual
        await updateDatabaseWithExcelData(parsedData);
        
        // Generar el archivo JSON con los datos procesados
        await generateJSONFile(parsedData, `dataBCRATasaPasiva${new Date().getFullYear()}.json`);
        
        return parsedData;
    } catch (error) {
        logger.error(`Error en convertExcelFileToJsonUsingXlsx: ${error.message}`);
        throw error;
    }
}

async function convertXlsICL (file_read){
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
            logger.error(`Tasa ICL BCRA. Error en DDBB. ${err}`)
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
                    logger.info(`Tasa ICL BCRA. Envio de mail sin actualizaciones.`)
                        sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesND', ['ICL'])
                        .then(result => {
                          if(result === true){
                            logger.info(`Tasa ICL BCRA. Envio de mail correcto. ${result}`)
                              return true
                          }else{
                            logger.error(`Tasa ICL BCRA. Envio de mail incorrecto. ${result}`)
                          }
                        })
                        .catch(err => {
                            logger.error(`Tasa ICL BCRA. Envio de mail incorrecto. ${err}`)
                        })

                }else{
                    logger.info(`Tasa ICL BCRA. Envio de mail con actualizaciones.`)
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
                                    string += `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
                                });
                                return string
                            }
                            let arrayText = arrayToText(actualizaciones,1);
                            let dataToSend = ['ICL', arrayText];
                            //Enviar mail con todas las tasas actualizadas
                        sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesArray', dataToSend)
                        .then(result => {
                          if(result === true){
                            logger.info(`Tasa ICL BCRA. Envio de mail correcto. ${result}`)
                          }else{
                            logger.error(`Tasa ICL BCRA. Envio de mail incorrecto. ${result}`)
                          }
                        })
                        .catch(err => {
                            logger.error(`Tasa ICL BCRA. Envio de mail incorrecto. ${err}`)
                        })
                })                
            }
        }
    });
}

async function convertXlsCER (file_read){
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
            logger.error(`Tasa CER BCRA. Error en DDBB. ${err}`)
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
                    logger.info(`Tasa CER BCRA. Resultado de bulk operation. ${result}`)
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
                    logger.info(`Tasa CER BCRA. Enviar mail sin actualizaciones.`)
                        sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesND', ['CER'])
                        .then(result => {
                        if(result === true){
                            logger.info(`Tasa CER BCRA. Envio de mail correcto. ${result}`)
                        }else{
                            logger.error(`Tasa CER BCRA. Envio de mail incorrecto. ${result}`)
                        }
                        })
                        .catch(err => {
                            logger.error(`Tasa CER BCRA. Envio de mail incorrecto. ${err}`)
                        })
                }else if(actualizaciones.length > 0){
                    logger.info(`Tasa CER BCRA. Enviar mail con actualizaciones.`)
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
                                    string += `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
                                });
                                return string
                            }
                            let arrayText = arrayToText(actualizaciones,1);
                            let dataToSend = ['CER', arrayText];
                            //Enviar mail con todas las tasas actualizadas
                        sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesArray', dataToSend)
                        .then(result => {
                        if(result === true){
                            logger.info(`Tasa CER BCRA. Envio de mail correcto. ${result}`)
                        }else{
                            logger.error(`Tasa CER BCRA. Envio de mail incorrecto. ${result}`)
                        }
                        })
                        .catch(err => {
                            logger.error(`Tasa CER BCRA. Envio de mail incorrecto. ${result}`)
                        })
                        });
                }
            }
    }
    })

    fs.readFile(DOWNLOAD_DIR + 'dataBCRATasaCER.json', (err, data)  => {
        if(err){
            logger.error(`Tasa CER BCRA. Error en lectura de archivo json. ${err}`)
            generateJSONFile(parsedData, 'dataBCRATasaCER.json')
            return err;
        }else{
            let fileParsed = JSON.parse(data);
            let compare = compareArray(fileParsed, parsedData);
            compare === false ? false : generateJSONFile(parsedData, 'dataBCRATasaCER.json');
        }
    })
}
async function generateJSONFile(data, file) {
    try {
        const filePath = path.join(DOWNLOAD_DIR, file);
        await fs.promises.writeFile(filePath, JSON.stringify(data));
        logger.info(`Archivo JSON generado: ${file}`);
    } catch (error) {
        logger.error(`Error generando archivo JSON ${file}: ${error.message}`);
        throw error;
    }
}


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
    logger.info(`Infoleg. Guardar data. Bulkoperation.`)
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
        Normas.bulkWrite(find).then(result => {
            logger.info(`Infoleg. Bulkoperation. ${result}`)
            let text = '';
            data.forEach(function(x) {
                text += `<p>Fecha de publicación: ${moment(x.fecha).format('DD-MM-YYYY')}</p><p>Norma: ${x.norma}</p><p>Asunto: ${x.tag}</p><p>Link: ${x.link}</p><br>`
            });
            sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizacionesNormas', text)
            .then(result => {
                if(result === true){
                    logger.info(`Infoleg. Envío de mail correcto. ${result}`)
                }else{
                    logger.error(`Infoleg. Envío de mail incorrecto. ${result}`)
                }
              })
              .catch(err => {
                logger.error(`Infoleg. Envío de mail incorrecto. ${err}`)
              })
        }).catch(err => {
            logger.error(`Infoleg. Bulkoperation Error. ${err}`)
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
    logger.info(`Infoleg. Resultados de scraping. ${results}`)
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
        logger.info(`Tasa Activa BNA. Resultados scraping. ${ele}`)
        return ele
    }
    catch (error) {
        logger.error(`Tasa Activa BNA. Resultados scraping con errores. ${error}`)
    }
};

async function regexDates(tasaActiva){
    let myRegexp = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g; //Check pattern only
    let validDate = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;
    tasaActiva[0] = myRegexp.exec(tasaActiva[0])
    tasaActiva[0][0] = validDate.exec(tasaActiva[0][0])
    logger.info(`Tasa Activa BNA. Resultados fecha. ${tasaActiva[0][0][0]}`)
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
          logger.error(`Tasa Activa BNA. Error en DDBB. ${err}`)
        }else{
            if (moment(datos.fecha).utc().isSame(today, 'day')) {
                //Ultima fecha de la DDBB es igual a la fecha actual de actualizacion. No hay accion requerida.
                logger.info(`Tasa Activa BNA. Fecha la DDBB es igual a la fecha actual de actualizacion. No hacer nada. ${datos.fecha, today}`)
                false
            }else{
                if(today.isSame(dateData, 'day')){
                    //Actualizar con la fecha del sitio el dia de hoy
                    logger.info(`Tasa Activa BNA. La fecha del sitio es igual a hoy. Actualizar la fecha actual con la data del sitio. ${dateData, today}`)
                    let filter = {fecha: today};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            logger.error(`Tasa Activa BNA. Error en DDBB. ${err}`)
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), tasaData, tasaText]
                         sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                            logger.info(`Tasa Activa BNA. Envio de mail correcto. ${result}`)
                           }else{
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto. ${result}`)
                           }
                         })
                         .catch(err => {
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto. ${err}`)
                         })
                        }
                    });
                }else if(today.isBefore(dateData, 'day')){
                    //es mayor la fecha del sitio, entonces copiar la fecha del dia de ayer.
                    logger.info(`Tasa Activa BNA. La fecha del sitio es mayor a hoy. Actualizar con la data del dia anterior. ${dateData, today}`)
                    let filter = {fecha: today};
                    update = {[tasaModel]: datos[tasaModel]};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            logger.error(`Tasa Activa BNA. Error en DDBB. ${err}`)
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), datos[tasaModel] , tasaText]
                         sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                            logger.info(`Tasa Activa BNA. Envio de mail correcto. ${result}`)
                           }else{
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto. ${result}`)
                           }
                         })
                         .catch(err => {
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto. ${err}`)
                         })
                        }
                    });
                }else{
                    //La fecha de hoy es mayor a la fecha del sitio. Actualizar hoy con la fecha del sitio
                    logger.info(`Tasa Activa BNA. Actualizar la fecha del dia con la fecha del sitio (de fecha anterior). ${dateData, today}`)
                    let filter = {fecha: today};
                    Tasas.findOneAndUpdate(filter, update, {
                        new: true,
                        upsert: true
                    })
                    .exec((err, datos) => {
                        if(err) {
                            logger.error(`Tasa Activa BNA. Error en DDBB. ${err}`)
                        }else{
                         let info = [moment().format("YYYY-MM-DD"), tasaData, tasaText]
                         sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', info)
                         .then(result => {
                           if(result === true){
                            logger.info(`Tasa Activa BNA. Envio de mail correcto. ${result}`)
                           }else{
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto. ${result}`)
                           }
                         })
                         .catch(err => {
                            logger.error(`Tasa Activa BNA. Envio de mail incorrecto. ${err}`)
                         })
                        }
                    });
                }
            }
        }

    })
};

//=========================ACTUALIZACION CATEGORIAS================================
async function actualizacionCategorias(){
    try {
    let resultsCat = await Categorias.findOne().sort({'fecha': -1});
    let resultsDatosPrev =  await DatosPrev.findOne({'estado': true}).sort({'fecha': -1})
    logger.info(`Categorias. Ejecuto funciones de busqueda en DDBB.`)
    if(moment(resultsCat.fecha).isBefore(moment(resultsDatosPrev.fecha))){
        logger.info(`Categorias. Hay actualizaciones disponibles.`)
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
                        logger.info(`Categorias. Bulkoperation OK.`)
                        let info = [datosNuevos[0].updateOne.filter.fecha, JSON.stringify(datosNuevos[0].updateOne.update['$set'])]
                        sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'categorias', info)
                        .then(result => {
                          if(result === true){
                            logger.info(`Categorias. Envio de mail correcto. ${result}`)
                          }else{
                            logger.error(`Categorias. Envio de mail incorrecto. ${result}`)
                          }
                        })
                        .catch(err => {
                            logger.error(`Categorias. Envio de mail incorrecto. ${err}`)
                        })

                    })
                    .catch(err => {
                        logger.warn(`Categorias. Bulkoperation fallo. ${err}`)
                    })
    }else{
        let info = 'No hay actualizaciones disponibles para categorías de autónomos.'
        logger.info(`Categorias. No hay actualizaciones disponibles.`)
        sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'n/a', info)
        .then(result => {
          if(result === true){
            logger.info(`Categorias. Envio de mail correcto. ${result}`)
          }else{
            logger.error(`Categorias. Envio de mail incorrecto. ${result}`)
          }
        })
        .catch(err => {
            logger.warn(`Categorias. Envio de mail incorrecto. ${err}`)
        })
    }
    }catch (error){
        logger.warn(`Categorias. Requiere actualizacion manual, falla funcion de actualizacion. ${error}`)
    }
};
// NUEVA BASE DE DATOS======================================================
async function findAndCreateNewDDBB(){
        let today = moment().format('YYYY-MM-DD');
        let startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        logger.info(`Tasas mensualizadas. Inicia funcion. ${today, startOfMonth}`)
        if(today === startOfMonth){
            logger.info(`Tasas mensualizadas. Fecha actual es igual a principio de mes, se arma base de datos. ${today, startOfMonth}`)
            let date = moment().subtract(1, 'M');
            let dateEndMonth = moment(date.endOf('month').format('YYYY-MM-DD') + 'T00:00').utc(true);
            let dateEndLastMonth = moment(moment(dateEndMonth).subtract(1, 'M').endOf('month').format('YYYY-MM-DD') + 'T00:00').utc(true)
            Tasas.find({'fecha': {$gte: dateEndLastMonth, $lte: dateEndMonth}})
            .then(result => {
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
                    logger.info(`Tasas mensualizadas. ${result}`)
                })
                .catch(err => {
                    logger.err(`Tasas mensualizadas. Error en actualizacion ${err}`)
                })
            })
            .catch(err => {
                logger.err(`Tasas mensualizadas. Error en DDBB. ${err}`)
            })
        }else{
            logger.info(`Tasas mensualizadas. Fecha no disponible para actualizar tasas. ${today, startOfMonth}`)
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
exports.scrapingPjn = scrapingPjn;