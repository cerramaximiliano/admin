const mongoose = require('mongoose');

const UserStatsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuarios',
    required: true,
    index: true 
  },
  counts: {
    calculators: { type: Number, default: 0 },
    folders: { type: Number, default: 0 },
    movements: { type: Number, default: 0 },
    notifications: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
    contacts: { type: Number, default: 0 },
    alerts: { type: Number, default: 0 }
  },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Índice para mejorar el rendimiento de las consultas por userId
UserStatsSchema.index({ userId: 1 });

module.exports = mongoose.model('UserStats', UserStatsSchema);
