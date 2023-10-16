const express = require('express');
const app = express();
const sendEmail = require('../config/email.js');
const pino = require('pino');
const {logger} = require('../config/pino.js');
const Tasas = require('../models/tasas.js');
const TasasMensuales = require('../models/tasasMensuales.js');
const DatosPrev = require('../models/datosprevisionales.js');
const Categorias = require('../models/categorias.js');
const Normas = require('../models/normas.js')
const Tasks = require('../models/tasks');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const pdf = require('pdf-parse');
const lineReader = require('line-reader');
const cheerio = require('cheerio');
const download = require('download');
const axios = require('axios');
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
const chromeOptions = require('../config/puppeteer');
const firebaseConfig = require('../config/firebase');

const {initializeApp} = require('firebase/app');
const { ref, getDownloadURL, uploadBytesResumable } = require('firebase/storage');
const { getStorage } = require('firebase/storage');

const {convertXls} = require('../utils/excelToJsonUtils.js');
const {downloadFile} = require('../utils/downloadPdfUtils')
const {parseBNAPasiva} = require('../utils/parsePdfUtils.js');
const dateUtils = require('../utils/dateUtils.js');

//============================FUNCIONES PJN SCRAPING======================
async function scrapingPjn (){
        const browser = await puppeteer.launch(chromeOptions);
        const page = await browser.newPage();
        await page.goto('https://scw.pjn.gov.ar/scw/home.seam');
        'formPublica:camaraNumAni'
};

//========================FUNCITON TASA ACTIVA=========================================
async function downloadActivaBNA () {
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
        console.log(ele)
        return ele
    }
    catch (err) {
        throw new Error(err)
    }
};

//============================FUNCION TASA PASIVA BNA======================
async function downloadPasivaBNA(){
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
                }
            })
        });
        const file_url = `https://www.bna.com.ar${url}`;
        const file_name = `${moment().format('YYYY-MM-DD')}.pdf`;
        const {data} = await axios({
            method: 'get',
            url: file_url,
            responseType: 'arraybuffer',
          });
        initializeApp(firebaseConfig);
        const storage = getStorage();
        const storageRef = ref(storage, `tasa-pasiva-BNA/${file_name}`);
        const metadata = {
            contentType: 'application/pdf'
        };
        const snapshot = await uploadBytesResumable(storageRef, data, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
        if(downloadURL){ 
            const newTask = {
                task: `Archivo guardado Firebase - Tasa Pasiva BNA`,
                fecha: new Date(),
                done: true,
                description: `${downloadURL}`
            }
            await Tasks.findOneAndUpdate({fecha: `${(moment().format('YYYY-MM-DD'))}T00:00`}, {$addToSet: {tasks: newTask}}, {upsert: true})}
        const parse = parseBNAPasiva(downloadURL);
    }catch(err){
        throw new Error(err)
    }
};

//============================FUNCIONES TASAS BCRA /ICL/CER/PASIVA======================
async function downloadBCRADDBB(tasa, type){
    let file_url;
    if (tasa === 'tasaPasivaBCRA'){
        file_url= process.env.URL_BCRA_PASIVA;
    }else if(tasa === 'cer'){
        file_url=process.env.URL_BCRA_CER
    }else if(tasa === 'icl'){
        file_url=process.env.URL_BCRA_ICL
    };
    const file = await download(file_url, DOWNLOAD_DIR);
    if( !file ) {throw new Error (`Download file ${tasa} fail`)}
    else{
        if (tasa === 'tasaPasivaBCRA'){
            console.log(tasa, 'pasiva');
            const file = await convertXls('ind2023.xls', tasa, type);
            return file
        }else if (tasa === 'cer') {
            console.log(tasa, 'cer');
            const file = await convertXls('cer2023.xls', tasa, type);
            return file
        }else if (tasa === 'icl'){
            console.log(tasa, 'icl');
            const file = await convertXls('icl2023.xls', tasa, type);
            return file
        }
    }
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
            let momentDates = dateUtils.datesSpanish(text);
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
exports.downloadActivaBNA = downloadActivaBNA;
exports.regexDates = regexDates;
exports.regexTextCheck = regexTextCheck;
exports.findTasa = findTasa;
exports.dataTasa = dataTasa;
exports.downloadPasivaBNA = downloadPasivaBNA;
exports.scrapingInfoleg = scrapingInfoleg;
exports.saveInfolegData = saveInfolegData;
exports.actualizacionCategorias = actualizacionCategorias;
exports.saveTasaActivaData = saveTasaActivaData;
exports.scrapingPjn = scrapingPjn;