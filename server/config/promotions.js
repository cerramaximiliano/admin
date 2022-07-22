const Promotion = require('../models/promo');

async function findNotEqualStatus (promotion, estado) {
    return Promotion.find({
        estado: estado, 
        delivery:{
            $not: {'$elemMatch':{
                "template": promotion}
            }
        }
    });
};

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


exports.findNotEqualStatus = findNotEqualStatus;
exports.parseResults = parseResults;