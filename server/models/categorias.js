const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;


let categoriasSchema = new Schema({
    fecha: {
      type: Date,
      unique: true,
      required: true
    },
    categoriaA: {
      type: Number,
      required: true
    },
    categoriaA2: {
      type: Number,
      required: true
    },
    categoriaB: {
      type: Number,
      required: true
    },
    categoriaC: {
      type: Number,
      required: true
    },
    categoriaD: {
      type: Number,
      required: true
    },
    categoriaE: {
      type: Number,
      required: true
    },
    categoriaF: {
      type: Number,
      required: true
    },
    categoriaG: {
      type: Number,
      required: true
    },
    categoriaH: {
      type: Number,
      required: true
    },
    categoriaI: {
      type: Number,
      required: true
    },
    categoriaJ: {
      type: Number,
      required: true
    },
    categoriaK: {
      type: Number,
      required: true
    },
    categoriaL: {
      type: Number,
      required: true
    },
    categoriaM: {
      type: Number,
      required: true
    },
    categoriaN: {
      type: Number,
      required: true
    },
    categoriaS: {
      type: Number,
      required: true
    },
    categoriaW: {
      type: Number,
      required: true
    },
    categoria1: {
      type: Number,
      required: true
    },
    categoria2: {
      type: Number,
      required: true
    },
    categoria3: {
      type: Number,
      required: true
    },
    categoria4: {
      type: Number,
      required: true
    },
    categoria5: {
      type: Number,
      required: true
    },
    categoria6: {
      type: Number,
      required: true
    },
  categoria7: {
  type: Number,
  required: true
  },
  categoria8: {
  type: Number,
  required: true
  },
  categoria9: {
  type: Number,
  required: true
  },
  categoria10: {
  type: Number,
  required: true
  },
  categoria11: {
  type: Number,
  required: true
  },
  categoria12: {
  type: Number,
  required: true
  },
  categoria13: {
  type: Number,
  required: true
  },
  categoria14: {
  type: Number,
  required: true
  },
  categoria15: {
  type: Number,
  required: true
  },
  categoria16: {
  type: Number,
  required: true
  },
  categoria17: {
  type: Number,
  required: true
  },
  categoria18: {
  type: Number,
  required: true
  },
  categoria19: {
  type: Number,
  required: true
  },
  categoria20: {
  type: Number,
  required: true
  },
  categoria21: {
  type: Number,
  required: true
  },
  categoria22: {
  type: Number,
  required: true
  },
  categoria23: {
  type: Number,
  required: true
  },
  categoria24: {
  type: Number,
  required: true
  },
  categoria25: {
  type: Number,
  required: true
  },
  categoria26: {
  type: Number,
  required: true
  },
  categoria27: {
  type: Number,
  required: true
  },
  categoria28: {
  type: Number,
  required: true
  },
  categoria29: {
  type: Number,
  required: true
  },
  categoria30: {
  type: Number,
  required: true
  },
  categoria31: {
  type: Number,
  required: true
  },
  categoria32: {
  type: Number,
  required: true
  },
  categoria33: {
  type: Number,
  required: true
  },
  categoria34: {
  type: Number,
  required: true
  },
  categoria35: {
  type: Number,
  required: true
  },
  categoria36: {
  type: Number,
  required: true
  },
  categoria37: {
  type: Number,
  required: true
  },
  categoria38: {
  type: Number,
  required: true
  },
  categoria39: {
  type: Number,
  required: true
  },
  categoria40: {
  type: Number,
  required: true
  },
  categoria41: {
  type: Number,
  required: true
  },
  categoria42: {
  type: Number,
  required: true
  },
  categoria43: {
  type: Number,
  required: true
  },
  categoria44: {
  type: Number,
  required: true
  },
  categoria45: {
  type: Number,
  required: true
  },
  categoria46: {
  type: Number,
  required: true
  },
  categoria47: {
  type: Number,
  required: true
},
categoriaIndependientes: {
type: Number,
required: true
},
categoriaProfesionales: {
type: Number,
required: true
},
categoriaEmpresarios: {
type: Number,
required: true
}
});



module.exports = mongoose.model('Categorias', categoriasSchema);
