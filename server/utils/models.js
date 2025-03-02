const TasasActivaBNA = require('../models/tasas-activa-bna');
const TasasPasivaBNA = require('../models/tasas-pasiva-bna');
const TasasActa2658 = require('../models/tasas-activa-2658');
const TasasActa2764 = require('../models/tasas-activa-2764');

exports.changeModel = async (model) => {
    let Model;
    if( model === 'tasaActivaBNA'){
        Model = TasasActivaBNA;
    }else if( model === 'tasaPasivaBNA'){
        Model = TasasPasivaBNA;
    }
    return Model;
}