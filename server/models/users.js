const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    verificationCode: { type: String },
    isVerified: { type: Boolean },
    picture: { type: String },

    // Nuevas propiedades basadas en el tipo UserProfile
    address: { type: String },
    address1: { type: String },
    avatar: { type: String },
    contact: { type: String },
    country: { type: String },
    designation: { type: String },
    dob: { type: Date },
    note: { type: String },
    role: { type: String },
    skill: { type: [String] }, // Array de habilidades
    state: { type: String },
    subscription: { type: String },
    tier: { type: String },
    url: { type: String },
    zipCode: { type: String },

    // Subdocumento de usuarios según la definición de User
    users: [
      {
        userId: { type: String },
        name: { type: String },
        email: { type: String },
        role: { type: String },
        status: { type: String },
        avatar: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Middleware para encriptar la contraseña antes de guardar
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Usuarios", UserSchema);
