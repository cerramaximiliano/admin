const scrapingController = require('../controllers/scrapingController');
const tasasController = require('../controllers/tasasController');
const moment = require('moment');

const findAndUpdateTasasByName = async (req, res) => {
    const tasa = req.query.tasa;
    const type = req.query.type;
    try{
        if( ! tasa) return res.status(400).json({ok: false, message: `Missing request query`});
        if(tasa !== 'icl' && tasa !== 'cer' && tasa !== 'tasaPasivaBCRA' && tasa !== 'tasaPasivaBNA' && tasa !== 'tasaPasivaBNA' && tasa !== 'tasaActivaBNA' && tasa !== 'tasaActivaCNAT2658') return res.status(400).json({ok: false, message: `Query must contain 'icl', 'cer' or 'pasivaBCRA' query value`});
        const findLast = await tasasController.getTasasLastDate(tasa);
        const today = moment(moment().format("YYYY-MM-DD") + 'T00:00').utc(true);
        const tasaDate = moment(findLast[0].fecha).utc(0);
        // if( findLast && today.isSameOrBefore(tasaDate) && tasa !== 'cer' && tasa !== 'icl' ) return res.status(200).json({ok: true, message: `Tasa ${tasa} already update`})
        const findTasa = await scrapingController.downloadUrlFile(tasa, type);
        if( findTasa ) return res.status(201).json({ok: true, message: `Tasas successfully update`})
        else return res.status(400).json({ok:false, message: `Tasas couldn't update`})
    }catch(err){
        console.log('Error', err)
        res.status(500).json({ok: false, message: err.message})
    }
};



module.exports = {findAndUpdateTasasByName}