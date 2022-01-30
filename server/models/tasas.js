const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;

let tasasSchema = new Schema({
    fecha: {
    type: Date,
    required: true,
    unique: true,
    },
    tasaPasivaBNA: {
    type: Number
    },
    tasaPasivaBCRA: {
    type: Number
    },
    tasaActivaBNA: {
    type: Number
    },
    cer: {
    type: Number
    },

  });



  module.exports = mongoose.model('Tasas', tasasSchema);
