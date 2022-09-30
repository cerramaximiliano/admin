const fileConfig = require('../config/files.js');
const fs = require('fs');


exports.getNames = async (req, res, next) => {

    const resultNames = await fileConfig.getNameFiles('./server/files/serverFiles/tasa_pasiva_BNA');
    console.log(resultNames)
    return res.status(200).json({
        ok: true,
        result: resultNames
    })
};

exports.getLogger = (req, res, next) => {
    console.log(true)
    fs.readFile('./server/logger.log', 'utf8', function(err, data) {
        if (err){
            return res.status(500).json({
                ok: false,
                message: err,
                status: 500
            })
        }
        return res.status(202).json({
            ok: false,
            status: 200,
            data: data
        })
        
    });


}