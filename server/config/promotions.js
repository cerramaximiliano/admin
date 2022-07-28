const Promotion = require('../models/promo');
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
async function findTest (promotion) {
    logger.info(promotion)
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
    let bulkOperation = Promotion.bulkWrite(saveData).then(result => {
        logger.info(`Email Marketing: emails enviados y guardados en DDBB ${result}`);
        return result;
    });
    return bulkOperation;
};


exports.findNotEqualStatus = findNotEqualStatus;
exports.parseResults = parseResults;
exports.saveDDBBPromotion = saveDDBBPromotion;
exports.findTest = findTest;