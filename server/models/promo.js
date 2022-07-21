const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
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
    delivery: [
      {
        template: String,
        status: String,
        date: Date
      }
    ]
  });

  module.exports = mongoose.model('Promotion', promotion);
