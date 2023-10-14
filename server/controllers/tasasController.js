const {collections} = require('../db');


exports.getTasaByDate = async (date) => {
    try {
        const tasa = await collections.Tasas.findOne({fecha: date});
        return tasa;
    }catch(err){
        throw new Error(err)
    }
};

exports.getTasasLastDate = async (tipoTasa) => {
    try{
        let tasa;
        if( tipoTasa ){
            tasa = await collections.Tasas.find({[tipoTasa]: {$exists: true}}).sort({fecha: -1}).limit(1).toArray()
        }else{
            tasa = await collections.Tasas.find().sort({fecha: -1}).limit(1).toArray()
        }
        return tasa
    }catch(err){
        throw new Error(err)
    }
};

exports.getTasasByPeriod = async (from, to) => {
    try {
        const tasas = await collections.Tasas.find({fecha: {$gte: from, $lte: to}}).toArray();
        console.log(tasas);
        return tasas
    }catch(err) {
        throw new Error(err)
    }
};

exports.getAllTasas = async () => {
    try {
        const tasas = await collections.Tasas.find({}).toArray()
        return tasas
    }catch(err){
        throw new Error(err)
    }
};
