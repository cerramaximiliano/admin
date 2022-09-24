const Promotion = require('../models/promo');
const sendEmail = require('./email');
const path = require('path');
const pathFiles = path.join(__dirname, '../');
const pino = require('pino')
  const logger = pino({
      transport: {
      targets :[
          {
          target: 'pino-pretty',
          options: {
          colorize: true,
          translateTime: 'dd-mm-yyyy, HH:MM:ss'
          }},
          {
          target: 'pino/file',
          options: {
              destination: `${pathFiles}/logger.log`,
              translateTime: 'dd-mm-yyyy, HH:MM:ss'
          }
          }
      ]
  },
  },
  );
async function findNotEqualStatus (promotion, estado, cantResultados) {
    return Promotion.find({
        estado: estado, 
        delivery:{
            $not: {'$elemMatch':{
                "template": promotion}
            }
        }
    }) 
    .limit(cantResultados);
};
async function findNotEqualStatusType (promotion, estado, type, cantResultados) {
    return Promotion.find({
        estado: estado,
        tipo: type, 
        delivery:{
            $not: {'$elemMatch':{
                "template": promotion}
            }
        }
    }) 
    .limit(cantResultados);
};
async function findTest (promotion) {
    return Promotion.find(
        {email:
            {$in:
                promotion
            }
        }
    )};

function parseResults(data){
    let resultados = [];
    let iter = 13;
    let place = 0;
    let datas = [];
    data.forEach(function(x, index){
        if(index <= iter){
            datas.push(x.email)
            if(data.length-1 === index){
                resultados.push(datas);
            }
        }else{
            resultados.push(datas);
            iter += 14;
            place += 1;
            datas = [];
            datas.push(x.email)
        }
    });
    let results = [];
    resultados.forEach(function(x){
        let data = [];
        x.forEach(function(y){
            data.push(
                {
                    Destination: {
                        ToAddresses: [y],
                    }
                }
            )
        });
        results.push(data);
    });
    return results
};

function saveDDBBPromotion(deliveryEmails){
    let saveData = [];
    deliveryEmails.forEach(function(x){
        x[0].forEach(function(y, i){
            saveData.push(
                {
                    updateOne: {
                                filter: {
                                    email: y.Destination.ToAddresses[0],
                                },
                                update: {
                                    $push: {
                                        delivery: [{
                                        status: x[1][i].Status,
                                        template: 'promotion-1658258964667',
                                        date: new Date(),
                                    }], 
                                }
                                },
                                upsert: true
                            }
                        }
            )
        })
    });
    
    return Promotion.bulkWrite(saveData)
};


function test(promotion, templateData, SES_CONFIG){
    (async() => {
        try{
            const testEmails = await findTest(['cerramaximiliano@gmail.com', 'mcerra@estudiofm.com']);
            logger.info(`Email Marketing Testing. Usuarios para Email 01: ${testEmails.length}`)
            const resultsParse = parseResults(testEmails);            
            let delivery =[];
            for (let index = 0; index < resultsParse.length; index++) {
                let resultEmail = await sendEmail.sendAWSEmail(resultsParse[index], promotion, templateData, SES_CONFIG)
                delivery.push([resultsParse[index], resultEmail.Status])
            };
            const dataSaved = await saveDDBBPromotion(delivery);
            logger.info(`Email Marketing Testing. Resultado de Emails guardados: ${dataSaved.result.nMatched}`)
            const dataPromotionsRest = await findNotEqualStatus('promotion-1658258964667', true, false)
            logger.info(`Email Marketing Testing Usuarios restantes para Email 01: ${dataPromotionsRest.length}`)
        }catch(err){
            logger.error(`Email Marketing Testing Error: ${err}`);
        }
    })()
};

function schedule (arrayDate){
    let string = '';
    arrayDate.forEach(function(x){
        if(x === undefined || x === ''){
            string += ' * '
        }else{
            string += ` ${((x).toString())} `
        }
    })
    logger.info(string)
    return string
};

exports.findNotEqualStatus = findNotEqualStatus;
exports.parseResults = parseResults;
exports.saveDDBBPromotion = saveDDBBPromotion;
exports.findTest = findTest;
exports.test = test;
exports.findNotEqualStatusType = findNotEqualStatusType;