const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promotion = new Schema({
    email: {
    type: String,
    required: true,
    unique: true
    },
    estado: {
    type: Boolean,
    default: true
    },
    tipo: {
    type: String
    },
    delivery: [
      {
        template: String,
        status: String,
        date: Date
      }
    ],
  });

  module.exports = mongoose.model('Promotion', promotion);
