const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
let Schema = mongoose.Schema;

let rolesValidos = {
    values: ['ADMIN_ROLE', 'USER_ROLE'],
    message: '{VALUE} no es un rol válido'
};

let planes = {
    values: ['FREE', 'STANDARD', 'PREMIUM']
}

let usuarioSchema = new Schema(
  {
    nombre: {type: String, require: [true, 'El nombre es necesario']},
    email: {type: String, unique: true, require: [true, 'El email es necesario'], lowercase: true},
    password: {type: String, require: [true, 'El password es obligatorio']},
    role: {type: String, default: 'USER_ROLE', enum: rolesValidos},
    estado: {type: Boolean, default: true},
    datosProfesionales: [{colegio: String, matricula: String}],
    createtime : { type : Date, default: Date.now},
    updatetime: {type: Date, default: undefined},
    suscripcion : {type: String, default: 'FREE', enum: planes},
    expiredSuscriptionTime: {type: Date, default: undefined},
    ingresosAbonados: {type: Number, default: undefined},
    resetlink: {type: String, default: undefined},
    calculos: [{tipo: String, fecha: Date, plan: Number}],
    documentos:[{tipo: String, fecha: Date, nombre: String, estado: Boolean}],
  }
);


usuarioSchema.methods.toJSON = function() {
    let user = this;
    let userObject = user.toObject();
    delete userObject.password;
    return userObject;
}

usuarioSchema.plugin(uniqueValidator, {message: '{PATH} debe ser unico'})

module.exports = mongoose.model('Usuario', usuarioSchema);
