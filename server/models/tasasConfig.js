const mongoose = require('mongoose');
let Schema = mongoose.Schema;

let tasasConfigSchema = new Schema({
  tipoTasa: {
    type: String,
    required: true,
    enum: ['tasaPasivaBNA', 'tasaPasivaBCRA', 'tasaActivaBNA', "tasaActivaTnaBNA", 'cer', 'icl', 'tasaActivaCNAT2601', 'tasaActivaCNAT2658', 'tasaActivaCNAT2764'],
    unique: true
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaUltima: {
    type: Date,
    required: true
  },
  fechasFaltantes: [{
    type: Date
  }],
  ultimaVerificacion: {
    type: Date,
    default: Date.now
  },
  descripcion: {
    type: String
  },
  activa: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('TasasConfig', tasasConfigSchema);