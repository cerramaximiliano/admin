const mongoose = require('mongoose');
let Schema = mongoose.Schema;

  let escalasDomestico = new Schema({
    fecha: {
      type: Date,
      required: true
    },
    categoria: {
      type: String
    },
    remuneraciones: [
      {
        remuneracion: Number,
        tipo: String,
        modalidad: String
      }
    ],
    norma: {type: String,}

  })

  module.exports = mongoose.model('EscalasDomestico', escalasDomestico);