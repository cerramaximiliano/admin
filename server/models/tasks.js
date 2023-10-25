const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tasksSchema = new Schema(
  {
  fecha: {
  type: Date,
  required: true,
  unique: true,
  default: new Date()
  },
  tasks: [{task: String, fecha: Date, done: Boolean, description: String, message: String}],
  },
  {
    collection: 'tasks'
  }
);

module.exports = mongoose.model('Tasks', tasksSchema);