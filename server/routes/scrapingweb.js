const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const got = require('got');
const request = require('request');
const poll = require('promise-poller').default;
const nodemailer = require('nodemailer')
const transporter = require('nodemailer-smtp-transport');
const sendEmail = require('./nodemailer');
const AccLaw = require('../models/acclaw');
const Captcha = require('../models/captcha');
const Tasas = require('../models/tasas');
const moment = require('moment');
const xlsx = require('xlsx');
const http = require('http');
const path = require('path');
const fs = require('fs');
//==============================================================================
//===================CONFIGURACION WEB SCRAPING=================================
//==============================================================================
//=========================TASA PASIVA==========================================
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
const file_name = 'data.xls';
function isInt(value) {
        return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
};
function getlength(number) {
        return number.toString().length;
};
function downloadBCRADDBB(tasa){
    let file_url;
    if (tasa === 'pasivaBCRA'){
        file_url='http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/ind2022.xls'
    }else if(tasa === 'cer'){
        file_url='www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/cer2022.xls'
    }
    
    let file = fs.createWriteStream(DOWNLOAD_DIR + file_name, {'flags': 'w'});
    const request = http.get(file_url, function(response) {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            convertExcelFileToJsonUsingXlsx();
        });
    
    }).on('error', (err) => {
        console.log('Error', err.message);
    });
async function convertExcelFileToJsonUsingXlsx () {
        const file = xlsx.readFile(DOWNLOAD_DIR + 'data.xls', {type: 'binary'})
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
        return generateJSONFile(parsedData);
    };

async function convertXlsCER (){


}
function generateJSONFile(data) {
        try {
            fs.writeFileSync(DOWNLOAD_DIR + 'dataBCRATasaPasiva2022.json', JSON.stringify(data))
        } catch (err) {
            console.error(err)
        }
};
};

exports.downloadBCRADDBB = downloadBCRADDBB;