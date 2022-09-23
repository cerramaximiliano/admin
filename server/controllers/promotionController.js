const path = require('path');
const Promotion = require('../models/promo.js');
const Estadisticas = require('../models/estadisticas.js');
const moment = require('moment');

async function findUpdateEstadisticas (addNumber) {
    Estadisticas.findOne()
                .sort({fecha: -1})
                .then(res => {
                    (async () => {
                        if( moment(res.fecha).isSame( moment(moment().format('YYYY-MM-DD')+ 'T00:00:00.000Z').utc()  ) ) {
                            const updateSameDay = await Estadisticas.findOneAndUpdate({fecha: res.fecha}, {'$inc': {promoActivos:  addNumber}})
                            console.log(updateSameDay)
                            return updateSameDay
                        }else{
                            let newRecord = new Estadisticas({
                                fecha: moment().format('YYYY-MM-DD')+ 'T00:00:00.000Z',
                                promoActivos: Number(res.promoActivos) + addNumber,
                                promoInactivos: Number(res.promoInactivos)
                            });
                            const saveNewDay = await newRecord.save();
                            return saveNewDay
                        }
                    })()
                })
                .catch(err => {
                    return res.status(500).json({
                        ok: false,
                        status: 500,
                        err: err
                    })
                })
}



exports.emailPromotion = (req, res, next) => {
    const emailList = JSON.parse(req.body.email);
    const type = req.body.type;
    const list = [];
    emailList.forEach(ele => {
        list.push({
            email: ele[0],
            estado: true,
            tipo: type
        })
    });
    Promotion.insertMany(list, { ordered: false })
    .then((result) => {
        console.log(result, 19)
        Estadisticas.findOne()
        .sort({fecha: -1})
                    .then(results => {
                        if( moment(results.fecha).isSame( moment(moment().format('YYYY-MM-DD')+ 'T00:00:00.000Z').utc()  ) ) {
                            Estadisticas.findOneAndUpdate({fecha: results.fecha}, 
                                                            {'$inc': {promoActivos:  (result.length)}},
                                                            )
                                        .then(updateRecord => {
                                            res.status(200).json({
                                                ok: true,
                                                status: 200,
                                                result: result
                                            })
                                        })
                                        .catch(errorUpdateRecord => {
                                            res.status(500).json({
                                                ok: false,
                                                status: 500,
                                                err: errorUpdateRecord
                                            })
                                        })
                        }else{
                            let newRecord = new Estadisticas({
                                fecha: moment().format('YYYY-MM-DD')+ 'T00:00:00.000Z',
                                promoActivos: Number(results.promoActivos) + (result.length),
                                promoInactivos: Number(results.promoInactivos)
                            });
                            newRecord.save()
                                .then(record => {
                                    console.log(record)
                                    res.status(200).json({
                                        ok: true,
                                        status: 200,
                                        result: result
                                    })
                                })
                                .catch(errRecord => {
                                    console.log(errRecord, 58)
                                    res.status(500).json({
                                        ok: false,
                                        status: 500,
                                        err: errRecord
                                    })
                                })
                        }
                    }).catch(errors => {
                        console.log(errors, 68)
                        res.status(500).json({
                            ok: false,
                            status: 500,
                            err: errors
                        })
                    })
    })
    .catch((err) => {
        if(err.result.result.nInserted != undefined && err.result.result.nInserted > 0){
            findUpdateEstadisticas(err.result.result.nInserted)
        }
        res.status(500).json({
            ok: false,
            status: 500,
            err: err
        })
    })
};

exports.emailPromotionErase = (req, res, next) => {
    const emailList = JSON.parse(req.body.email);
    const list = [];
    emailList.forEach(ele => {
        list.push(
            ele[0]
        );
    });
    Promotion.updateMany(
        { 'email':{ $in : list } },
        { $set: { "estado": false } },
    ).then(result => {
        Estadisticas.findOne()
            .sort({fecha: -1})
                        .then(results => {
                            if( moment(results.fecha).isSame( moment(moment().format('YYYY-MM-DD')+ 'T00:00:00.000Z').utc()  ) ) {
                                Estadisticas.findOneAndUpdate({fecha: results.fecha}, 
                                                                {'$inc': {promoActivos:  (result.modifiedCount * -1) , promoInactivos: result.modifiedCount }},
                                                                )
                                            .then(updateRecord => {
                                                res.status(200).json({
                                                    ok: true,
                                                    status: 200,
                                                    result: result
                                                })
                                            })
                                            .catch(errorUpdateRecord => {
                                                res.status(500).json({
                                                    ok: false,
                                                    status: 500,
                                                    err: errUpdateRecord
                                                })
                                            })
                            }else{
                                let newRecord = new Estadisticas({
                                    fecha: moment().format('YYYY-MM-DD')+ 'T00:00:00.000Z',
                                    promoActivos: Number(results.promoActivos) + (result.modifiedCount * -1),
                                    promoInactivos: Number(results.promoInactivos) + result.modifiedCount,
                                });
                                newRecord.save()
                                    .then(record => {
                                        res.status(200).json({
                                            ok: true,
                                            status: 200,
                                            result: result
                                        })
                                    })
                                    .catch(errRecord => {
                                        res.status(500).json({
                                            ok: false,
                                            status: 500,
                                            err: errRecord
                                        })
                                    })
                            }

                        }).catch(errors => {
                            res.status(500).json({
                                ok: false,
                                status: 500,
                                err: errors
                            })
                        })
    })
    .catch(err => {
        res.status(500).json({
            ok: false,
            status: 500,
            err: err
        })
    })
};

exports.emailUsers = (req, res, next) => {
    Promotion.find({
        estado: true
    })
    .limit(15)
    .exec((err, result) => {
        if(err){
            return res.status(500).json({
                ok: false,
                status: 500,
                message: err
            })
        }
        Estadisticas.findOne()
        .sort({fecha: -1})
        .then(data => {
            return res.render(path.join(__dirname, '../views/') + 'promotion.ejs', {
                data: result,
                totales: data,
            })
        })
        .catch(err => {
            return res.status(500).json({
                ok: false,
                status: 500,
                message: err
            })
        })
    })
};
