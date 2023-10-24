const scrapingController = require('../controllers/scrapingController');


const findAndUpdateTasasByName = async (req, res) => {
    const tasa = req.query.tasa;
    const type = req.query.type;
    try{
        if( ! tasa) return res.status(400).json({ok: false, message: `Missing request query`});
        if(tasa !== 'icl' && tasa !== 'cer' && tasa !== 'tasaPasivaBCRA' && tasa !== 'tasaPasivaBNA' && tasa !== 'tasaPasivaBNA' && tasa !== 'tasaActivaBNA' && tasa !== 'tasaActivaCNAT2658') return res.status(400).json({ok: false, message: `Query must contain 'icl', 'cer' or 'pasivaBCRA' query value`});
        const findTasa = await scrapingController.downloadUrlFile(tasa, type);
        console.log(findTasa)
        if( findTasa ) return res.status(201).json({ok: true, message: `Tasas successfully update`})
        else return res.status(400).json({ok:false, message: `Tasas couldn't update`})
    }catch(err){
        console.log('Error', err)
        res.status(500).json({ok: false, message: err.message})
    }
};



module.exports = {findAndUpdateTasasByName}