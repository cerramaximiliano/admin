/**
 * Configuración de los cron jobs para el sistema de tasas
 * 
 * Organizado por tipo de tasa y operación para facilitar modificaciones
 */

const cronConfig = {
    // Configuración de horarios para tareas BNA - Tasa Activa
    bna: {
        tasaActiva: {
            scraping: '0 7,9,11,13,15,21 * * *',       // Scraping directo de BNA
            consejo: '0 22 * * *',                      // Scraping desde Consejo
            busquedaFechas: '5 7 * * *'                // Búsqueda de fechas faltantes
        },
        tasaPasiva: {
            scraping: '15 7,9,11,13,15,21 * * *',       // Scraping directo de BNA
            consejo: '5 22 * * *',                      // Scraping desde Consejo
            busquedaFechas: '10 7 * * *'               // Búsqueda de fechas faltantes
        }
    },

    // Configuración de horarios para tareas BCRA
    bcra: {
        tasaPasiva: {
            scraping: '15 7,9,11,13,15,21 * * *',       // Obtener último dato API BCRA
            busquedaFechas: '20 7 * * *'               // Búsqueda de fechas faltantes
        },
        cer: {
            scraping: '25 7,9,11,13,15,21 * * *',       // Obtener último dato API BCRA - CER
            busquedaFechas: '30 7 * * *'               // Búsqueda de fechas faltantes
        },
        icl: {
            scraping: '35 7,9,11,13,15,21 * * *',                   // Obtener último dato API BCRA - ICL
            busquedaFechas: '40 7 * * *'              // Búsqueda de fechas faltantes
        }
    },

    // Configuración de horarios para tareas Colegio
    colegio: {
        tasaActivaCNAT2658: {
            busquedaFechas: '45 7 * * *'               // Búsqueda de fechas faltantes
        }
    },
    // Configuración para verificación de actualizaciones
    verificacion: {
        // Verificación después del ciclo matutino
        matutina: '34 13 * * *',     // A las 9:00 AM, después de todas las tareas de la mañana

        // Verificación después de cada ciclo de actualización
        ciclica: '55 7,9,11,13,15,21 * * *',  // 5 minutos después del último scraping del ciclo

        // Verificación diaria completa
        diaria: '0 23 * * *'      // A las 11:00 PM, reporte diario completo
    }
};

module.exports = cronConfig;