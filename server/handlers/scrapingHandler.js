const scrapingController = require('../controllers/scrapingController');


const findTasasByName = async (req, res) => {
    try{
        const tasa = req.query.tasa;
        console.log(tasa);
        if( ! tasa) return res.status(400).json({ok: false, message: `Missing request query`});
        if(tasa !== 'icl' && tasa !== 'cer' && tasa !== 'pasivaBCRA' && tasa !== 'pasivaBNA') return res.status(400).json({ok: false, message: `Query must contain 'icl', 'cer' or 'pasivaBCRA' query value`});
        const findTasa = await scrapingController.downloadUrlFile(tasa);
        console.log(findTasa);
    }catch(err){
        console.log(err);
    }
};



module.exports = {findTasasByName}