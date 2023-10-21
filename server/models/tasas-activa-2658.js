const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;

let tasasSchema = new Schema({
    fechaInicio: {
    type: Date,
    required: true,
    },
    fechaFin: {
      type: Date,
      required: true,
      },
    interesMensual: {
    type: Number,
    required: true
    }
  });



  module.exports = mongoose.model('TasasActiva2658', tasasSchema);
