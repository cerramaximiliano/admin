const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let escalasComercio = new Schema({
    fecha: {
    type: Date,
    required: true,
    },
    categoria: {
    type: String,
    },
    remuneraciones: [
      {
        remuneracion: Number,
        tipo: String,
        },
    ],
    remuneracionTotal: {
      type: Number
    },
    estado:{
      type: Boolean
    }
  });

  module.exports = mongoose.model('EscalasComercio', escalasComercio);
