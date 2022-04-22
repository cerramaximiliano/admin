const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tasasMensualesSchema = new Schema(
  {
  fecha: {
  type: Date,
  required: true,
  unique: true,
  },
  tasaPasivaBNA: {
  type: Number
  },
  tasaActivaBNA: {
  type: Number
  },
  reference: [{type: Date}]
  },
  {
    collection: 'tasasMensuales'
  }
);

module.exports = mongoose.model('TasasMensuales', tasasMensualesSchema);