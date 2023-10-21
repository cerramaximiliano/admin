const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let schedule = new Schema({
    task: {
    type: String,
    required: true,
    unique: true
    },
    date: {
    type: Date,
    },
    schedule: {
    type: String
    },
    status:{
      type: Boolean
    }
  });

  module.exports = mongoose.model('Schedule', schedule);
