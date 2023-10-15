const moment = require('moment');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
const {isInt, getLength, countDecimals, compareArray} = require('./mathUtils');
const {arrayToText} = require('./stringUtils');
const Tasas = require('../models/tasas');
const Tasks = require('../models/tasks');

async function convertExcelFileToJsonUsingXlsx (file_read) {
    const file = xlsx.readFile(DOWNLOAD_DIR + file_read, {type: 'binary'})
    const sheetNames = file.SheetNames;
    const totalSheets = sheetNames.length;
    const tempData = xlsx.utils.sheet_to_json(file.Sheets['Serie_diaria']);
    console.log(tempData)
    // let parsedData = [];
    // let data = [];
    // let dataIndex = [];
    // tempData.forEach(function(x, index){
    //     Object.keys(x).forEach(function(arr, ind, total){
    //         if(isInt(x[arr]) === true){
    //             if(getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
    //                 data.push(x[arr]);
    //                 if(data.length === 2){
    //                     dataIndex.push(x[total[total.length-1]])
    //                 }
    //             }else{
    //                 false
    //             }
    //         }else{
    //             false
    //         }
    //     });
    //     if(data.length >= 3){
    //         parsedData.push([data[data.length-1],dataIndex[0]]);
    //     }else if (data.length === 2){
    //         parsedData.push([data[1],dataIndex[0]]);
    //     }else{
    //         false
    //     };
    //     data = [];
    //     dataIndex = [];
    // });
    // parsedData.forEach(function(x){
    //     if (moment(x[0], "YYYYMMDD").isSame(moment(), 'days') === true){
    //         logger.info(`Tasa pasiva BCRA. Hay actualizacion disponible.`)
    //         let date = (moment(x[0], "YYYYMMDD").format('YYYY-MM-DD')) + 'T00:00'
    //         let dateToFind = moment(date).utc(true);
    //         let filter = {fecha: dateToFind}
    //         let update = {tasaPasivaBCRA: Number(x[1])};
    //         Tasas.findOneAndUpdate(filter, update, {
    //             new: true,
    //             upsert: true
    //         })
    //         .exec((err, datos) => {
    //             if(err) {
    //                 logger.error(`Tasa Pasiva BCRA. Error en DDBB. ${err}`)
    //               return {
    //               ok: false,
    //               err
    //               };
    //             }else{
    //                 let info = x.push('Tasa Pasiva BCRA')
    //                 sendEmail.sendAWSEmailNodemailer('soporte@lawanalytics.app', 'soporte@lawanalytics.app', 0, 0, 0, 0, 'actualizaciones', x)
    //                 .then(result => {
    //                   if(result === true){
    //                     logger.info(`Tasa Pasiva BCRA. Envio de mail correcto. ${result}`)
    //                   }else{
    //                     logger.error(`Tasa Pasiva BCRA. Envio de mail incorrecto. ${result}`)
    //                   }
    //                 })
    //                 .catch(err => {
    //                     logger.error(`Tasa Pasiva BCRA. Envio de mail incorrecto. ${err}`)
    //                 })
    //                 return {
    //                 ok: true,
    //                 datos: datos
    //                 }
    //                 }
    //             });
    //     }else {
    //         false;
    //         logger.info(`Tasa pasiva BCRA. No hay actualizacion disponible.`);
    //     }
    // });
    // return generateJSONFile(parsedData, 'dataBCRATasaPasiva2023.json');
};

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
            if(getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
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
};

async function convertXls (file_read, tasa){
    try {
        const file = xlsx.readFile(DOWNLOAD_DIR + file_read, {type: 'binary'})
        const sheetNames = file.SheetNames;
        const tempData = xlsx.utils.sheet_to_json(file.Sheets['Totales_diarios']);
        let parsedData = [];
        let data = [];
        let dataIndex = [];
        tempData.forEach(function(x){
            Object.keys(x).forEach(function(arr){
                if(isInt(x[arr]) === true){
                    if(getLength(x[arr]) === 8 && moment(x[arr], "YYYYMMDD").isValid()){
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
        const findTasas = await Tasas.findOne({[tasa]: {$gte: 0}}).sort({fecha: -1});
        if ( findTasas ){
            let actualizaciones = [];
            parsedData.forEach(function(element){
                if(moment(moment(element[0], "YYYYMMDD").format("YYYY-MM-DD") + 'T00:00').utc(true).isAfter(moment(findTasas.fecha))){
                    //si ultimo dia grabado en la base de datos es menor a alguno de los nuevos, se graban en la base de datos
                    actualizaciones.push(element);
                }
            });
            if (actualizaciones.length === 0){
                let date = (moment().format('YYYY-MM-DD')) + 'T00:00';
                const newTask = {
                    task: `Tasa de interés ${tasa}`,
                    fecha: new Date(),
                    done: false,
                    description: 'Tasa de interés actualizada. No hay datos nuevos.'
                }
                const saveTasks = await Tasks.findOneAndUpdate({ fecha: date }, {$addToSet: {tasks: newTask}}, {upsert: true, returnOriginal: false})
                return saveTasks;
            }else if(actualizaciones.length > 0){
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
                    const bulkUpdate = await Tasas.bulkWrite(find)
                    let arrayText = arrayToText(actualizaciones,1);
                    let date = (moment().format('YYYY-MM-DD')) + 'T00:00';
                    const newTask = {
                        task: `Tasa de interés ${tasa}`,
                        fecha: new Date(),
                        done: true,
                        description: `Actualización de tasa de interés disponible. ${arrayText}`
                    }
                    const saveTasks = await Tasks.findOneAndUpdate({ fecha: date }, {$addToSet: {tasks: newTask}}, {upsert: true, returnOriginal: false})
                    return saveTasks;
            }
        }else {
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
            const bulkOp = await Tasas.bulkWrite(find);
            let date = (moment().format('YYYY-MM-DD')) + 'T00:00';
            const newTask = {
                task: `Tasa de interés ${tasa}`,
                fecha: new Date(),
                done: true,
                description: `Actualización de tasa de interés disponible.`
            }
            const saveTasks = await Tasks.findOneAndUpdate({ fecha: date }, {$addToSet: {tasks: newTask}}, {upsert: true, returnOriginal: false})
            return saveTasks;
        }
        // fs.readFile(DOWNLOAD_DIR + 'dataBCRATasaCER.json', (err, data)  => {
        //     if(err){
        //         console.log(`Tasa CER BCRA. Error en lectura de archivo json. ${err}`)
        //         generateJSONFile(parsedData, 'dataBCRATasaCER.json')
        //         return err;
        //     }else{
        //         let fileParsed = JSON.parse(data);
        //         let compare = compareArray(fileParsed, parsedData);
        //         compare === false ? false : generateJSONFile(parsedData, 'dataBCRATasaCER.json');
        //     }
        // })
    }catch(err){
        console.log(err)
        throw new Error(err)
    }
}

module.exports = {convertExcelFileToJsonUsingXlsx, convertXlsICL, convertXls}