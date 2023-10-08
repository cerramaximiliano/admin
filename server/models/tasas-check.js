const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;

let tasasSchema = new Schema({
    tasa: {
      type: String,
      required: true,
      unique: true,
    },
    firstDataDate: {
      type: Date
    },
    lastDataDate: {
      type: Date
    },
    lastCheckedDate: {
      type: Date
    },
    missingDates: {
      type: [Date]
    },
    differentDates: [
      { tasaId: String,
        fecha: Date,
        resolve: {type: Boolean, default: false}
      }
    ]
  });



  module.exports = mongoose.model('TasasCheck', tasasSchema);
