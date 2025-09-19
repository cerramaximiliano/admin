// models/UserAnalytics.js
const mongoose = require('mongoose');

const UserAnalyticsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Usuarios',
    required: true,
    index: true 
  },
  // Estadísticas temporales y de actividad
  folderStatusDistribution: {
    nueva: { type: Number, default: 0 },
    enProceso: { type: Number, default: 0 },
    cerrada: { type: Number, default: 0 },
    pendiente: { type: Number, default: 0 }
  },
  averageResolutionTimes: {
    overall: { type: Number, default: 0 }, // Tiempo promedio en días
    byStatus: {
      nueva: { type: Number, default: 0 },
      enProceso: { type: Number, default: 0 },
      pendiente: { type: Number, default: 0 }
    }
  },
  upcomingDeadlines: {
    next7Days: { type: Number, default: 0 },
    next15Days: { type: Number, default: 0 },
    next30Days: { type: Number, default: 0 }
  },
  activityMetrics: {
    dailyAverage: { type: Number, default: 0 },
    weeklyAverage: { type: Number, default: 0 },
    monthlyAverage: { type: Number, default: 0 },
    mostActiveDay: { type: String, default: 'Monday' }
  },
  
  // Estadísticas financieras
  financialMetrics: {
    totalActiveAmount: { type: Number, default: 0 },
    averageAmountPerFolder: { type: Number, default: 0 },
    amountByStatus: {
      nueva: { type: Number, default: 0 },
      enProceso: { type: Number, default: 0 },
      cerrada: { type: Number, default: 0 },
      pendiente: { type: Number, default: 0 }
    },
    calculatorsByType: {
      calculado: { type: Number, default: 0 },
      ofertado: { type: Number, default: 0 },
      reclamado: { type: Number, default: 0 }
    },
    calculatorsAmountByType: {
      calculado: { type: Number, default: 0 },
      ofertado: { type: Number, default: 0 },
      reclamado: { type: Number, default: 0 }
    }
  },
  
  // Estadísticas de materias
  matterDistribution: {
    type: Map,
    of: Number,
    default: {}
  },
  averageAmountByMatter: {
    type: Map,
    of: Number,
    default: {}
  },
  resolutionTimeByMatter: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Estadísticas de tareas y planificación
  taskMetrics: {
    completionRate: { type: Number, default: 0 }, // Porcentaje de tareas completadas
    pendingTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 }
  },
  
  // Métricas de notificaciones y alertas
  notificationMetrics: {
    totalCount: { type: Number, default: 0 }, // Total de alertas
    unreadCount: { type: Number, default: 0 },
    averageReadTime: { type: Number, default: 0 }, // En horas
    responseRate: { type: Number, default: 0 } // Porcentaje de notificaciones atendidas
  },
  
  // Tendencias temporales (últimos meses)
  trendData: {
    newFolders: [{ month: String, count: Number }],
    closedFolders: [{ month: String, count: Number }],
    movements: [{ month: String, count: Number }],
    calculators: [{ month: String, count: Number }],
    tasks: [{ month: String, count: Number }]
  },
  
  // Metadata
  lastUpdated: { type: Date, default: Date.now },
  dataQuality: { type: Number, default: 100 }, // Porcentaje de completitud/calidad
  analyticsVersion: { type: String, default: '1.0' }
}, { timestamps: true });

// Índices para mejorar rendimiento
UserAnalyticsSchema.index({ userId: 1, lastUpdated: -1 });
UserAnalyticsSchema.index({ 'folderStatusDistribution.enProceso': 1 });
UserAnalyticsSchema.index({ 'financialMetrics.totalActiveAmount': 1 });

module.exports = mongoose.model('UserAnalytics', UserAnalyticsSchema);