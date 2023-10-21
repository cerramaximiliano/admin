const Tasas = require('../models/tasas');
const TasasCheck = require('../models/tasas-check');
const TasasActivaBNA = require('../models/tasas-activa-bna');
const TasasPasivaBNA = require('../models/tasas-pasiva-bna');
const TasasActa2658 = require('../models/tasas-activa-2658');
const TasasActa2764 = require('../models/tasas-activa-2764');
const tasasUtils = require('../utils/tasas-check');
const models = require('../utils/models');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const moment = require('moment');

exports.checkLastDate = (tasa) => {
    const fieldExists = Object.keys(Tasas.schema.paths).includes(tasa);
    if(fieldExists === false){
        return []
    }else {
        const lastDate = Tasas.find({ [tasa] : {$exists: true , $gt : 0}})
        .sort({fecha: -1})
        .limit(1)
        return lastDate
    }
};

exports.checkDates = async ( id, quantity ) =>  {
    try {
        let tasa = await TasasCheck.findOne({_id: id});
        let tasaStartDate = moment(tasa.lastCheckedDate).utc();
        let tasaEndDate = moment(tasa.lastDataDate).utc();
        let rangeOfDates = await tasasUtils.generateDateRange(tasaStartDate,tasaEndDate, quantity);
        console.log(rangeOfDates)
          if(rangeOfDates.length === 0){
            return 'No hay días para actualizar en DDBB.'
          }else{
            const resultDiff = await Tasas.find({fecha: {$gte: rangeOfDates[0], $lte: rangeOfDates[rangeOfDates.length-1] , $nin: rangeOfDates}});
            const resultMatch = await Tasas.find({fecha: {$gte: rangeOfDates[0], $lte: rangeOfDates[rangeOfDates.length-1] , $in: rangeOfDates}});
            const foundMatchEle = resultMatch.map(ele => ele.fecha.toISOString() );
            const missingEle = rangeOfDates.filter((ele) => !foundMatchEle.includes(ele));
              if(resultDiff.length === 0  && missingEle.length === 0) {
                let updateLastCheckedDate = await TasasCheck.findOneAndUpdate({_id: id}, {lastCheckedDate: rangeOfDates[rangeOfDates.length-1]})
                return 'No hay días para actualizar en DDBB.'
              }else{
              if(resultDiff.length > 0) {
                let diffDates = resultDiff.map(function (ele) {
                    return {fecha: ele.fecha, tasaId: ele._id}
                
                });
                let updateDiffDates = await TasasCheck.findOneAndUpdate({_id: id} , {$push: {differentDates: {$each: diffDates}}} );
                let updateLastCheckedDate = await TasasCheck.findOneAndUpdate({_id: id}, {lastCheckedDate: rangeOfDates[rangeOfDates.length-1]})
              }
              if(missingEle.length > 0){
                let updateMissingDate = await TasasCheck.findOneAndUpdate({_id: id}, {$push: {missingDates: missingEle}})
                let updateLastCheckedDate = await TasasCheck.findOneAndUpdate({_id: id}, {lastCheckedDate: rangeOfDates[rangeOfDates.length-1]})
              }
              };
              return resultDiff.length +' días faltantes. '+ missingEle.length + ' días erróneos.';
          }
    }catch(err){
        return err
    }
};

exports.checkDataTasas = async ( id, quantity, tasaDDBB ) =>  {
    const fieldExists = Object.keys(Tasas.schema.paths).includes(tasaDDBB);
    if(fieldExists === false){
        return []
    }else {
        let tasa = await TasasCheck.findOne({_id: id});
        let tasaStartDate = moment(tasa.lastCheckedDate).utc();
        let tasaEndDate = moment(tasa.lastDataDate).utc();
        let rangeOfDates = await tasasUtils.generateDateRange(tasaStartDate,tasaEndDate, quantity);

        let findEmptyDocuments = await Tasas.find({fecha: {$in: rangeOfDates},  [tasaDDBB]:  {$exists: false} }  )
        if(findEmptyDocuments.length === 0){
            let updateLastCheckedDate = await TasasCheck.findOneAndUpdate({_id: id}, {lastCheckedDate: rangeOfDates[rangeOfDates.length-1]})
            return false
        }else{
            let result = findEmptyDocuments.map(function (ele) {
                return {
                    fecha: ele.fecha,
                    tasaId: ele._id
                }
            });
            let updateMissingDates = await TasasCheck.findOneAndUpdate({_id: id} , {$push: {differentDates: {$each: result}}} );
            let updateLastCheckedDate = await TasasCheck.findOneAndUpdate({_id: id}, {lastCheckedDate: rangeOfDates[rangeOfDates.length-1]})
            return result
        }
    }
}

exports.resolveDiffDates =  async function  ( id ){
    let result = await TasasCheck.findOne({_id: id });
    if( result.differentDates.length === 0 ){
        return false
    }else {
        let diffDates = result.differentDates.sort((a,b) => a.fecha - b.fecha);
        let ids = diffDates.map(ele => ele.tasaId);
        let newDates = diffDates.map(function (ele) { 
            let date = moment(ele.fecha).utc(0);
            let year = date.year();
            let month = date.month();
            let day = date.date()
            let hours = 0;
            let minutes = 0;
            let seconds = 0;
            let newDate = moment.utc({ year, month, day, hours, minutes, seconds });
            let newDateISO = newDate.toISOString();
            return newDateISO;
        });
        
        let findDates = await Tasas.find({fecha: {$in: newDates}})
        let errDates = await Tasas.find({_id: {$in: ids }})
                                    .sort({fecha: 1})
        let updateOne = [];
        findDates.forEach(function(el, index)  {
            let update = {};
            errDates.forEach(errElement => {
    
                if( moment(el.fecha).isSame(errElement.fecha, 'days') ){
                    if( !el.tasaPasivaBCRA && errElement.tasaPasivaBCRA ){
                        update.tasaPasivaBCRA = errElement.tasaPasivaBCRA;
                    }
                    if( !el.tasaPasivaBNA && errElement.tasaPasivaBNA ){
                        update.tasaPasivaBNA = errElement.tasaPasivaBNA;
                    }
                    if( !el.tasaActivaBNA && errElement.tasaActivaBNA ){
                        update.tasaActivaBNA = errElement.tasaActivaBNA;
                    }
                    if( !el.tasaActivaCNAT2601 && errElement.tasaActivaCNAT2601 ){
                        update.tasaActivaCNAT2601 = errElement.tasaActivaCNAT2601;
                    }
                    if( !el.cer && errElement.cer ){
                        update.cer = errElement.cer;
                    }
                    if( !el.icl && errElement.icl ){
                        update.icl = errElement.icl;
                    }
                    if( !el.tasaActivaCNAT2658 && errElement.tasaActivaCNAT2658 ){
                        update.tasaActivaCNAT2658 = errElement.tasaActivaCNAT2658;
                    }
                }
            });
            if( Object.keys(update).length > 0 ){
                updateOne.push({
                    updateOne: {
                        filter: {
                            _id: el._id
                        },
                        update,
                        upsert: false
                    }
                })
            }
        });
        if(updateOne.length > 0 ){
            let updateData = await Tasas.bulkWrite(updateOne);
            console.log(updateData)
        }else{
            return false
        }
    }
};

exports.scrapingCpacfTasas = async ( tasa,dni,tomo,folio ) => {
    const chromeOptions = {
        headless:true,
        slowMo:100,
        defaultViewport: null,
        args: ['--no-sandbox'],
        ignoreDefaultArgs: ["--disable-extensions"],
        // executablePath: '/admin/node_modules/puppeteer/.local-chromium/linux-982053/chrome-linux/chrome',
      };
      try{
        const browser = await puppeteer.launch(chromeOptions);
        const page = await browser.newPage();
        await page.goto('https://tasas.cpacf.org.ar/newLogin');
        const ele = await page.content();
        const selectEle = await page.waitForSelector(`[name="dni"]`);
        const selectEleTomo = await page.waitForSelector(`[name="tomo"]`);
        const selectEleFolio = await page.waitForSelector(`[name="folio"]`);
        await page.type(`[name="dni"]`, dni);
        await page.type(`[name="tomo"]`, tomo);
        await page.type(`[name="folio"]`, folio);
        await page.waitForSelector('#sgt > a');
        await page.click('#sgt > a');
        await page.waitForSelector('#center');
        await page.select('select[name="rate"]', tasa);
        await page.waitForSelector('#sgt > a');
        await page.click('#sgt > a');
        await page.waitForSelector('#capital_0');
        await page.waitForSelector('#date_from_0');
        await page.waitForSelector('#date_to');
        await page.type(`#capital_0`, '100000');
        await page.type(`#date_from_0`, '10102020');
        await page.type(`#date_to`, '10072023');
        await page.waitForSelector('#sgt > a');
        await page.click('#sgt > a');
        const link = await page.waitForSelector('#nuevocalc > a:nth-child(3)');
        await page.click('#nuevocalc > a:nth-child(3)');
        const target = await browser.waitForTarget(target => target.opener() === page.target());
        const newPage = await target.page();
        const html = await newPage.waitForSelector('#contenido');
        const datosTabla = await newPage.evaluate(() => {
            const datos = [];
            const tabla = document.querySelector('#contenido table')
            if (tabla) {
                const filas = tabla.getElementsByTagName('tr');
                for (let i = 1; i < filas.length; i++) { // Comienza en 1 para omitir la fila de encabezado
                  const fila = filas[i];
                  const celdas = fila.getElementsByTagName('td');
                  let fechaInicio,fechaFin,interesMensual;
                  fechaFin = celdas[1].textContent;
                  fechaInicio = celdas[0].textContent;
                  interesMensual = celdas[2].textContent;
                  
                  datos.push({ 
                    updateOne: {
                        filter: {
                            fechaInicio
                        },
                        update: {
                            fechaInicio, 
                            fechaFin, 
                            interesMensual 
                        },
                        upsert: true
                    }
                    
                
                });
                }
              }
            return datos
        })
        async function createObject  (arr){
            return new Promise ((resolve, reject) => {
                arr.forEach(objeto => {
                    if(objeto.updateOne.update.fechaFin.trim() === 'ACTUALIDAD'){
                        
                        const today = moment().utc().startOf('day').toDate();
                        objeto.updateOne.update.fechaFin = today;
                    }else{
                        objeto.updateOne.update.fechaFin = moment.utc(objeto.updateOne.update.fechaFin, 'DD/MM/YYYY').toDate();
                    }
                    objeto.updateOne.update.fechaInicio = moment.utc(objeto.updateOne.update.fechaInicio, 'DD/MM/YYYY').toDate();
                    objeto.updateOne.update.interesMensual = +  objeto.updateOne.update.interesMensual;
                    objeto.updateOne.filter.fechaInicio = moment.utc(objeto.updateOne.filter.fechaInicio, 'DD/MM/YYYY').toDate();
                });
                if(arr) resolve(arr)
                else reject (new Error('Error al crear el objeto'))
            })
        }
        const results = await createObject(datosTabla)
        if( results ) {
            if(tasa == 1) {
                const saveData = await TasasActivaBNA.bulkWrite(results);
            }
            if(tasa == 2){
                const saveData = await TasasPasivaBNA.bulkWrite(results);
            }
            if(tasa == 22){
                const saveData = await TasasActa2658.bulkWrite(results);
            }
            if(tasa == 23){
                const saveData = await TasasActa2764.bulkWrite(results);
            }

            await browser.close();
            return true
        }else {
            await browser.close();
            return false
        }
      }catch (err){
        console.log('Error: ', err)
        return err
      }
};


exports.findAndSolveMissingData = async ( tasa ) => {
    try {
        let findOne = await TasasCheck.findOne( { tasa: tasa } )
        if( findOne ){
            let missingData = findOne.differentDates.filter((x) => x.resolve === false)
            if( missingData.length > 0 ){
                let fechas = missingData.map(x => x.fecha);
                const resultados = [];
                let results = await tasasUtils.buscarDocumentos(fechas, tasa);
                let bulkOperation = await Tasas.bulkWrite(results);
                return bulkOperation.result.nMatched + ' documentos encontrados. ' + bulkOperation.result.nModified + ' documentos modificados.'
            }else {
                return 'No se encontraron datos pendientes de actualización.'
            }
        }else {
            return 'No se encontraron documentos.'
        }
    }catch (err) {
        return err
    }

};
exports.findCheckMissingUpdatedData = async ( tasa ) => {
    try {
        let findOne = await TasasCheck.findOne( { tasa: tasa } )
        if ( findOne ){
            let missingData = findOne.differentDates.filter((x) => x.resolve === false)
            if( missingData.length > 0) {
                let ids = missingData.map (x => (x.tasaId).toString() );
                let findData = await Tasas.find ( { _id: {$in: ids}, [tasa]: {$gt: 0} } )
                if( findData ){
                    if( findData.length > 0){
                        let update = [];
                        findData.forEach(element => {
                            update.push({
                                updateOne: {
                                    filter: {
                                        tasa: tasa,
                                        differentDates: {
                                            $elemMatch: {
                                                tasaId: (element._id).toString()
                                            }
                                        }
                                    },
                                    update: {
                                        $set: {
                                            "differentDates.$.resolve": true
                                        }
                                    },
                                    upsert: false
                                }
                            })
                        });
                        let updateData = await TasasCheck.bulkWrite(update);
                        return updateData.result.nMatched + ' documentos encontrados. ' + updateData.result.nModified + ' documentos modificados.'
                    }else {
                        return 'No se han encontrado documento para actualizar.'
                    }
                }else {
                    return false
                }
            }else {
                return 'No se encontraron datos pendientes de actualización.'
            }
        }else{
            return 'No se encontraron documentos.'
        }
        ;
    }catch (err) {
        return err
    }
};