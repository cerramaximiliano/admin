# Documentación del Modelo UserAnalytics

## Descripción General
El modelo `UserAnalytics` almacena métricas y estadísticas calculadas para cada usuario del sistema. Se genera diariamente a las 5:00 AM mediante un cron job y ahora crea un nuevo documento histórico en cada ejecución.

## Estructura de Propiedades

### 1. **folderStatusDistribution**
Distribución de carpetas por estado actual.

**Fuente de datos:** Colección `folders`

**Cálculo:**
- Agrupa todas las carpetas del usuario por estado
- Cuenta la cantidad de carpetas en cada estado
- Normaliza los estados (convierte a minúsculas, mapea variantes)

**Estructura:**
```javascript
folderStatusDistribution: {
    nueva: 5,        // Carpetas con estado "NUEVA"
    enProceso: 10,   // Carpetas con estado "EN PROCESO"
    cerrada: 15,     // Carpetas con estado "CERRADA"
    pendiente: 3     // Carpetas con estado "PENDIENTE"
}
```

---

### 2. **averageResolutionTimes**
Tiempos promedio de resolución de carpetas en días.

**Fuente de datos:** Colección `folders`

**Cálculo:**
- Para carpetas cerradas: diferencia entre `finalDateFolder` y `initialDateFolder`
- Para carpetas abiertas: diferencia entre fecha actual y `initialDateFolder`
- Calcula promedios generales y por estado

**Estructura:**
```javascript
averageResolutionTimes: {
    overall: 45,              // Promedio general en días
    byStatus: {
        nueva: 10,            // Promedio para carpetas en estado nueva
        enProceso: 30,        // Promedio para carpetas en proceso
        pendiente: 25         // Promedio para carpetas pendientes
    }
}
```

---

### 3. **upcomingDeadlines**
Plazos y vencimientos próximos del usuario.

**Fuente de datos:** Colecciones `events` y `movements`

**Cálculo:**
- **Events:** Cuenta eventos donde `end` está entre hoy y la fecha límite
- **Movements:** Cuenta movimientos con `expirationDate` en el rango
- Suma ambos conteos para cada período

**Estructura:**
```javascript
upcomingDeadlines: {
    next7Days: 5,    // Eventos + Movimientos que vencen en 7 días
    next15Days: 12,  // Eventos + Movimientos que vencen en 15 días
    next30Days: 20   // Eventos + Movimientos que vencen en 30 días
}
```

---

### 4. **activityMetrics**
Métricas de actividad basadas en movimientos del usuario.

**Fuente de datos:** Colección `movements` (últimos 30 días)

**Cálculo:**
- Cuenta movimientos de los últimos 30 días
- Calcula promedios diario, semanal y mensual
- Determina el día de la semana con más actividad

**Estructura:**
```javascript
activityMetrics: {
    dailyAverage: 3,          // Promedio de movimientos por día
    weeklyAverage: 21,        // Promedio de movimientos por semana
    monthlyAverage: 90,       // Total de movimientos en el mes
    mostActiveDay: 'Monday'   // Día con más actividad
}
```

---

### 5. **financialMetrics**
Métricas financieras de carpetas y calculadoras.

**Fuente de datos:** Colecciones `folders` y `calculators`

**Cálculo:**
- **Folders:** Suma montos por estado, calcula promedios
- **Calculators:** Agrupa por tipo, cuenta y suma montos
- Total activo excluye carpetas cerradas

**Estructura:**
```javascript
financialMetrics: {
    totalActiveAmount: 150000,        // Suma de montos (excluye cerradas)
    averageAmountPerFolder: 5000,     // Promedio general por carpeta
    amountByStatus: {
        nueva: 30000,                  // Suma de montos en carpetas nuevas
        enProceso: 80000,              // Suma de montos en proceso
        cerrada: 50000,                // Suma de montos en cerradas
        pendiente: 40000               // Suma de montos pendientes
    },
    calculatorsByType: {
        calculado: 10,                 // Cantidad de calculadoras tipo "calculado"
        ofertado: 5,                   // Cantidad de calculadoras tipo "ofertado"
        reclamado: 3                   // Cantidad de calculadoras tipo "reclamado"
    },
    calculatorsAmountByType: {
        calculado: 100000,             // Suma de montos tipo "calculado"
        ofertado: 50000,               // Suma de montos tipo "ofertado"
        reclamado: 30000               // Suma de montos tipo "reclamado"
    }
}
```

---

### 6. **matterDistribution**
Distribución de carpetas por materia.

**Fuente de datos:** Colección `folders`

**Cálculo:**
- Agrupa carpetas por campo `materia`
- Cuenta cantidad de carpetas por cada materia

**Estructura:**
```javascript
matterDistribution: Map {
    "Accidente de trabajo": 15,
    "Despido": 8,
    "Diferencias salariales": 12,
    // ... más materias
}
```

---

### 7. **averageAmountByMatter**
Monto promedio por materia.

**Fuente de datos:** Colección `folders`

**Cálculo:**
- Suma montos totales por materia
- Divide entre cantidad de carpetas de esa materia

**Estructura:**
```javascript
averageAmountByMatter: Map {
    "Accidente de trabajo": 75000,
    "Despido": 120000,
    "Diferencias salariales": 45000,
    // ... más materias
}
```

---

### 8. **resolutionTimeByMatter**
Tiempo promedio de resolución por materia en días.

**Fuente de datos:** Colección `folders`

**Cálculo:**
- Para carpetas con `initialDateFolder` y `finalDateFolder`
- Calcula diferencia en días
- Promedia por materia

**Estructura:**
```javascript
resolutionTimeByMatter: Map {
    "Accidente de trabajo": 90,    // días promedio
    "Despido": 45,                  // días promedio
    "Diferencias salariales": 60,   // días promedio
    // ... más materias
}
```

---

### 9. **taskMetrics**
Métricas de tareas del usuario.

**Fuente de datos:** Colección `tasks`

**Cálculo:**
- Cuenta tareas por estado (`checked` o `status`)
- Identifica tareas vencidas comparando `dueDate` con fecha actual
- Calcula tasas de completitud
- Analiza subtareas, archivos adjuntos y comentarios

**Estructura:**
```javascript
taskMetrics: {
    completionRate: 75,              // Porcentaje de tareas completadas
    pendingTasks: 25,                // Cantidad de tareas pendientes
    completedTasks: 75,              // Cantidad de tareas completadas
    overdueTasks: 5,                 // Tareas vencidas (dueDate < hoy)

    // Propiedades adicionales en el código pero no en el modelo:
    priorityDistribution: {
        alta: 10,
        media: 20,
        baja: 15
    },
    statusDistribution: {
        pendiente: 20,
        en_progreso: 10,
        revision: 5,
        completada: 60,
        cancelada: 5
    },
    tasksWithSubtasks: 30,          // Tareas que tienen subtareas
    tasksWithAttachments: 15,       // Tareas con archivos adjuntos
    tasksWithComments: 40,          // Tareas con comentarios
    averageSubtasksPerTask: 2.5,    // Promedio de subtareas por tarea
    totalSubtasks: 120,             // Total de subtareas
    completedSubtasks: 90,          // Subtareas completadas
    subtaskCompletionRate: 75       // % de subtareas completadas
}
```

**Nota:** El modelo actual solo almacena 4 propiedades básicas, pero el servicio calcula muchas más métricas.

---

### 10. **notificationMetrics**
Métricas de notificaciones y alertas.

**Fuente de datos:** Colección `alerts`

**Cálculo:**
- **totalCount:** Cuenta total de alertas del usuario
- **unreadCount:** Cuenta alertas no leídas (`read = false`)
- **averageReadTime:** Calcula tiempo promedio entre `createdAt` y `updatedAt` para alertas leídas (en horas)
- **responseRate:** Porcentaje de alertas leídas sobre el total

**Estructura:**
```javascript
notificationMetrics: {
    totalCount: 50,           // Total de alertas del usuario
    unreadCount: 8,           // Alertas sin leer (read = false)
    averageReadTime: 2.5,     // Horas promedio hasta lectura
    responseRate: 84          // % de alertas leídas (42/50 * 100)
}
```

**Notas:**
- Usa `updatedAt` como momento de lectura ya que el modelo no tiene campo `viewedAt`
- Solo considera tiempos de lectura menores a 7 días (168 horas) para evitar outliers
- La propiedad del modelo es `read` (no `isRead`)

---

### 11. **trendData**
Tendencias temporales de los últimos 6 meses.

**Fuente de datos:** Colecciones `folders`, `movements`, `calculators`, `tasks`

**Cálculo:**
- Filtra registros de los últimos 6 meses
- Agrupa por mes (formato YYYY-MM)
- Cuenta elementos por mes para cada categoría

**Estructura:**
```javascript
trendData: {
    newFolders: [
        { month: "2024-07", count: 12 },
        { month: "2024-08", count: 15 },
        // ... hasta el mes actual
    ],
    closedFolders: [
        { month: "2024-07", count: 8 },
        // ... carpetas cerradas por mes
    ],
    movements: [
        { month: "2024-07", count: 45 },
        // ... movimientos creados por mes
    ],
    calculators: [
        { month: "2024-07", count: 5 },
        // ... calculadoras creadas por mes
    ],
    tasks: [
        { month: "2024-07", count: 20 },
        { month: "2024-08", count: 25 },
        // ... tareas creadas por mes
    ]
}
```

---

### 12. **Metadatos**

**lastUpdated**
- Tipo: Date
- Descripción: Fecha y hora de la última actualización
- Valor: Se actualiza automáticamente en cada generación

**dataQuality**
- Tipo: Number (0-100)
- Descripción: Porcentaje de calidad/completitud de los datos
- Cálculo: Basado en la presencia de datos en las métricas principales

**analyticsVersion**
- Tipo: String
- Descripción: Versión del sistema de analytics
- Valor actual: "1.0"

**timestamps**
- createdAt: Fecha de creación del documento
- updatedAt: Fecha de última modificación

---

## Proceso de Generación

1. **Cron Job:** Se ejecuta diariamente a las 5:00 AM
2. **Función:** `generateAllUsersAnalytics()` itera sobre todos los usuarios
3. **Procesamiento:** En lotes de 10 usuarios para optimizar recursos
4. **Almacenamiento:** Crea un nuevo documento por cada usuario (histórico)
5. **Paralelización:** Las métricas se calculan en paralelo para cada usuario

## Notas Importantes

- Desde el último cambio, cada ejecución crea un **nuevo documento** en lugar de actualizar el existente
- Esto permite mantener un historial completo de analytics
- Los cálculos consideran valores null y campos vacíos
- Los tiempos se calculan solo cuando hay fechas válidas
- Las tasas y porcentajes se redondean para facilitar la lectura