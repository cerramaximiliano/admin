const tasasController = require('../controllers/tasasController');
const dateUtils = require('../utils/dateUtils');

const searchByDate = async (req,res) => {
    const {from, to } = req.query;
    if (!from || !to) return res.status(400).json({
        ok: false,
        message: `Invalid params`
    })
    try {
        const fromValidated = dateUtils.formatDateToISO(from);
        const toValidated = dateUtils.formatDateToISO(to);
        const validate = dateUtils.validatePeriod(fromValidated, toValidated);
        const tasas = await tasasController.getTasasByPeriod(fromValidated, toValidated);
        if( tasas && tasas.length > 0){
            res.status(200).json({
                ok: true,
                data: tasas
            })
        }else{
            res.status(204).json({
                ok: false,
                message: `No content`
            })
        }
    }catch(err){
        res.status(500).json({
            ok: false,
            error: err.message
        })
    }
};

const getLastDate = async (req,res) => {
    const {tipoTasa} = req.query;
    try {
        const tasa = await tasasController.getTasasLastDate(tipoTasa);
        res.status(200).json({
            ok: true,
            data: tasa
        })
    }catch (err) {
        res.status(500).json({
            ok: false,
            error: err.message
        })
    }
};

const getByDate = async (req,res) => {
    const {date} = req.params;
    try  {
        const dateValidated = dateUtils.formatDateToISO(date);
        const tasa = await tasasController.getTasaByDate(dateValidated)
        if( tasa ) {
            res.status(200).json({
                ok: true,
                data: tasa
            })
        }else{
            res.status(204).json({
                ok: false,
                message: `No content`
            })
        }
    }catch(err) {
        res.status(500).json({
            ok: false,
            error: err.message
        })
    }
};

const getAllTasas = async (req,res) => {
    try {
        const tasas = await tasasController.getAllTasas();
        res.status(200)
    }catch(err){
        res.status(500).json({
            ok: false,
            error: err.message
        })
    }
};


module.exports = {searchByDate, getLastDate, getByDate, getAllTasas};