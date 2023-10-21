const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;

let estadisticas = new Schema({
    fecha: {
    type: Date
    },
    promoActivos: {
    type: Number
    },
    promoInactivos: {
    type: Number
    }

  });

  module.exports = mongoose.model('Estadisticas', estadisticas);
