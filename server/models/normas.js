const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;

let normas = new Schema({
    fecha: {
    type: Date,
    required: true
    },
    norma: {
    type: String,
    required: true
    },
    link: {
    type: String,
    required: true
    },
    textLink: {
    type: String,
    required: true
    },
    tag: {
    type: String,
    required: true
    },
    estado: {
    type: Boolean,
    default: true
    }
  });

  module.exports = mongoose.model('Normas', normas);
