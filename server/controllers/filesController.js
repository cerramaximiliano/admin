const fileConfig = require('../config/files.js');



exports.getNames = async (req, res, next) => {

    const resultNames = await fileConfig.getNameFiles('./server/files/serverFiles/tasa_pasiva_BNA');
    console.log(resultNames)
    return res.status(200).json({
        ok: true,
        result: resultNames
    })

};