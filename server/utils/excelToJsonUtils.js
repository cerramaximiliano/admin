const moment = require('moment');
const xlsx = require('xlsx');
const fs = require('fs');
const axios = require('axios')
const path = require('path');
const pathFiles = path.join(__dirname, '../');
const DOWNLOAD_DIR = pathFiles + '/files/serverFiles/';
const {arrayToText} = require('./stringUtils');
const {parseDataForIclCer, parseDataForPasivaBcra} = require('./parseXlsUtils');
const {filterUpdateObject} = require('./ddbbUtils');
const Tasas = require('../models/tasas');
const Tasks = require('../models/tasks');

async function convertXls (url, tasa, type){
    try {
        const {data} = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
        });
        const file = xlsx.read(data);
        const sheetNames = file.SheetNames;
        const tempData = xlsx.utils.sheet_to_json(file.Sheets[sheetNames[0]]);
        const parsedData = tasa === 'tasaPasivaBCRA' ? parseDataForPasivaBcra(tempData) : parseDataForIclCer(tempData);
        const findTasas = await Tasas.findOne({[tasa]: {$gte: 0}}).sort({fecha: -1});
        if ( findTasas ){
            let actualizaciones = [];
            if (type === 'all') {
                actualizaciones.push(...parsedData);
            }else{
                parsedData.forEach(function(element){
                    if(moment(moment(element[0], "YYYYMMDD").format("YYYY-MM-DD") + 'T00:00').utc(true).isAfter(moment(findTasas.fecha))){
                        actualizaciones.push(element);
                    }
                });
            };
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
                    const find = filterUpdateObject(actualizaciones, tasa)
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
            const find = filterUpdateObject(parsedData, tasa)
            const bulkOp = await Tasas.bulkWrite(find);
            let date = (moment().format('YYYY-MM-DD')) + 'T00:00';
            const newTask = {
                task: `Tasa de interés ${tasa}`,
                fecha: new Date(),
                done: true,
                description: `Actualización de tasa de interés disponible.`
            }
            const saveTasks = await Tasks.findOneAndUpdate({ fecha: date }, {$addToSet: {tasks: newTask}}, {upsert: true, returnOriginal: false})
            if(saveTasks) return {ok: true, message: `Tasa ${tasa} succesfuly update`}
            else return {ok: false, messag: `Tasa ${tasa}, couldn't update`}
        }   
    }catch(err){
        throw new Error(err)
    }
}

module.exports = {convertXls}