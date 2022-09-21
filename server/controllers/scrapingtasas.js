const path = require('path');
const scrapingFunctions = require('../routes/scrapingweb.js');

exports.downloadUrlFile = (req, res, next) => {
    const tasa = req.query.tasa;
    if(tasa === 'icl' || tasa === 'cer' || tasa === 'pasivaBCRA'){
        scrapingFunctions.downloadBCRADDBB(tasa);
        res.status(200).json({
            ok: true,
            status: 200
        })
    }else if(tasa === 'pasivaBNA'){
        scrapingFunctions.downloadPBNA();
        res.status(200).json({
            ok: true,
            status: 200
        })
    }

};


