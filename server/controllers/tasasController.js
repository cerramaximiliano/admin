const path = require('path');
const moment = require('moment');
const Tasas = require('../models/tasas');
const logger = require('../utils/logger');
const TasasConfig = require("../models/tasasConfig");


/**
 * Obtiene las tasas más recientes para el dashboard
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getTasasDashboard = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 15;

    const tasas = await Tasas.find({
      estado: true,
      fecha: {
        $lte: moment()
      }
    })
      .sort({ fecha: -1 })
      .limit(limit);

    return res.render(path.join(__dirname, '../views/') + 'tasas.ejs', {
      data: tasas
    });
  } catch (error) {
    logger.error(`Error al obtener tasas para dashboard: ${error.message}`);

    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener tasas para dashboard'
    });
  }
};

/**
 * Obtiene las tasas para un período específico
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getTasasByPeriod = async (req, res) => {
  try {
    const { startDate, endDate, tipo } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    // Validar fechas
    const start = moment(startDate);
    const end = moment(endDate);

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        ok: false,
        status: 400,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD'
      });
    }

    // Construir query
    const query = {
      fecha: {
        $gte: start.startOf('day').toDate(),
        $lte: end.endOf('day').toDate()
      }
    };

    // Si se especifica un tipo de tasa, agregar al query
    if (tipo) {
      query[tipo] = { $exists: true, $ne: null };
    }

    // Ejecutar consulta
    const tasas = await Tasas.find(query).sort({ fecha: 1 });

    return res.status(200).json({
      ok: true,
      status: 200,
      count: tasas.length,
      tasas
    });
  } catch (error) {
    logger.error(`Error al obtener tasas por período: ${error.message}`);

    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener tasas por período'
    });
  }
};

/**
 * Obtiene los últimos valores registrados para cada tipo de tasa
 * 
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getUltimosTasasValues = async (req, res) => {
  try {
    // Tipos de tasas para buscar
    const tiposTasas = [
      'tasaPasivaBCRA',
      'tasaPasivaBNA',
      'tasaActivaBNA',
      'cer',
      'icl',
      'tasaActivaCNAT2601',
      'tasaActivaCNAT2658'
    ];

    const result = {};

    // Para cada tipo de tasa, buscar el último valor
    for (const tipo of tiposTasas) {
      const query = {};
      query[tipo] = { $exists: true, $ne: null };

      const tasa = await Tasas.findOne(query)
        .sort({ fecha: -1 })
        .select(`fecha ${tipo}`);

      if (tasa) {
        result[tipo] = {
          fecha: moment(tasa.fecha).format('YYYY-MM-DD'),
          valor: tasa[tipo]
        };
      }
    }

    return res.status(200).json({
      ok: true,
      status: 200,
      tasas: result
    });
  } catch (error) {
    logger.error(`Error al obtener últimos valores de tasas: ${error.message}`);

    return res.status(500).json({
      ok: false,
      status: 500,
      error: 'Error al obtener últimos valores de tasas'
    });
  }
};



exports.getUltimaTasaHastaFecha = async (tipoTasa, fechaMaxima = null, opciones = {}) => {
  try {
    // Validar el tipo de tasa
    const tiposValidos = [
      'tasaPasivaBNA',
      'tasaPasivaBCRA',
      'tasaActivaBNA',
      'cer',
      'icl',
      'tasaActivaCNAT2601',
      'tasaActivaCNAT2658'
    ];

    if (!tiposValidos.includes(tipoTasa)) {
      throw new Error(`Tipo de tasa inválido: ${tipoTasa}`);
    }

    // Construir el filtro base
    const filter = {};
    filter[tipoTasa] = { $ne: null };

    // Si se especifica una fecha máxima, añadirla al filtro
    if (fechaMaxima) {
      const fechaMax = fechaMaxima instanceof Date ? fechaMaxima : new Date(fechaMaxima);
      if (isNaN(fechaMax.getTime())) {
        throw new Error('Fecha máxima inválida');
      }
      filter.fecha = { $lte: fechaMax };
    }

    // Construir la consulta
    let query = Tasas.findOne(filter)
      .sort({ fecha: -1 });

    // Aplicar selección de campos
    if (opciones.incluirCampos) {
      query = query.select(opciones.incluirCampos);
    } else {
      query = query.select(`fecha ${tipoTasa}`);
    }

    // Ejecutar la consulta
    const ultimaTasa = await query;
    if (!ultimaTasa) {
      return null;
    }

    // Formatear el resultado
    const resultado = {
      fecha: ultimaTasa.fecha,
      valor: ultimaTasa[tipoTasa]
    };

    // Si se requiere incluir todos los campos
    if (opciones.incluirDocumentoCompleto) {
      resultado.documento = ultimaTasa;
    }

    return resultado;
  } catch (error) {
    logger.error(`Error al obtener última tasa hasta fecha: ${error.message}`);
    throw error;
  }
};

/**
 * Actualiza o crea múltiples documentos de tasas usando bulkWrite
 * @param {Array} tasasArray - Array de objetos con datos de tasas
 * @returns {Promise<Object>} - Resultado de la operación con contadores
 */
exports.bulkUpsertTasas = async (tasasArray) => {
  try {
    // Validar que se recibió un array
    if (!Array.isArray(tasasArray)) {
      throw new Error('Se esperaba un array de tasas');
    }

    // Mapas para seguimiento de fechas actualizadas/insertadas
    const fechasMap = new Map();

    // Preparar las operaciones de bulkWrite
    const bulkOperations = tasasArray.map(item => {
      // Verificar que el objeto tiene una fecha válida
      if (!item.fecha) {
        throw new Error('Todos los elementos deben tener una fecha válida');
      }

      // Crear objeto Date y formatear para seguimiento
      const fechaObj = new Date(item.fecha);
      const fechaFormatted = fechaObj.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      // Almacenar la fecha para seguimiento
      if (!fechasMap.has(fechaFormatted)) {
        fechasMap.set(fechaFormatted, {
          fecha: fechaObj,
          values: {
            tasaActivaBNA: item.tasaActiva
          }
        });
      }

      // Crear el documento para upsert
      // Mapeando tasaActiva a tasaActivaBNA según el requerimiento
      const doc = {
        fecha: fechaObj, // Asegurar que es un objeto Date
        tasaActivaBNA: item.tasaActiva,
        tasaPasivaBNA: item.tasaPasivaBNA,
      };


      // Crear operación de upsert
      return {
        updateOne: {
          filter: { fecha: doc.fecha },
          update: { $set: doc },
          upsert: true
        }
      };
    });

    // Ejecutar la operación de bulk
    const result = await Tasas.bulkWrite(bulkOperations);

    // Arrays para almacenar las fechas insertadas/actualizadas
    const fechasInsertadas = [];
    const fechasActualizadas = [];

    // Procesar fechas insertadas (tenemos los IDs)
    if (result.upsertedIds) {
      // Convertir upsertedIds de un objeto a pares clave-valor
      const upsertedPairs = Object.entries(result.upsertedIds);

      // Para cada id insertado
      for (const [index, id] of upsertedPairs) {
        // Obtener el documento correspondiente de la operación original
        const itemIndex = parseInt(index, 10);
        if (itemIndex >= 0 && itemIndex < bulkOperations.length) {
          const originalDoc = bulkOperations[itemIndex].updateOne.update.$set;
          const fecha = originalDoc.fecha;
          const fechaStr = fecha.toISOString().split('T')[0];

          // Agregar a fechas insertadas con sus valores
          fechasInsertadas.push({
            fecha: fechaStr,
            values: fechasMap.get(fechaStr)?.values || {}
          });
        }
      }
    }

    // Para las actualizaciones, necesitamos hacer una consulta extra
    // Si hubo actualizaciones (matchedCount > upsertedCount)
    if (result.matchedCount > result.upsertedCount) {
      // Obtener todas las fechas que fueron actualizadas
      // Necesitamos un conjunto de fechas para filtrar
      const todasLasFechas = Array.from(fechasMap.values()).map(item => item.fecha);

      // Usamos el conjunto de fechas insertadas para excluirlas
      const fechasInsertadasSet = new Set(fechasInsertadas.map(item => item.fecha));

      // Filtrar fechas que fueron actualizadas (no insertadas)
      const fechasSet = new Set();
      for (const [fechaStr, data] of fechasMap.entries()) {
        if (!fechasInsertadasSet.has(fechaStr)) {
          fechasActualizadas.push({
            fecha: fechaStr,
            values: data.values
          });
          fechasSet.add(fechaStr);
        }
      }
    }

    // Ordenar las fechas
    fechasInsertadas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    fechasActualizadas.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Preparar los resultados
    const responseData = {
      status: 'success',
      matched: result.matchedCount,
      modified: result.modifiedCount,
      inserted: result.upsertedCount,
      fechasInsertadas: fechasInsertadas,
      fechasActualizadas: fechasActualizadas,
      // Rangos de fechas para facilitar reportes
      rangoInsertado: fechasInsertadas.length > 0 ? {
        desde: fechasInsertadas[0].fecha,
        hasta: fechasInsertadas[fechasInsertadas.length - 1].fecha,
        cantidad: fechasInsertadas.length
      } : null,
      rangoActualizado: fechasActualizadas.length > 0 ? {
        desde: fechasActualizadas[0].fecha,
        hasta: fechasActualizadas[fechasActualizadas.length - 1].fecha,
        cantidad: fechasActualizadas.length
      } : null
    };

    // Crear log informativo
    logger.info(`[${new Date().toISOString()}] BULK_UPSERT_TASAS: Procesados ${bulkOperations.length} registros - Actualizados: ${result.modifiedCount}, Insertados: ${result.upsertedCount}`);

    if (fechasInsertadas.length > 0) {
      logger.info(`Fechas insertadas: ${fechasInsertadas.length} registros, desde ${responseData.rangoInsertado.desde} hasta ${responseData.rangoInsertado.hasta}`);
    }

    if (fechasActualizadas.length > 0) {
      logger.info(`Fechas actualizadas: ${fechasActualizadas.length} registros, desde ${responseData.rangoActualizado.desde} hasta ${responseData.rangoActualizado.hasta}`);
    }

    return responseData;

  } catch (error) {
    logger.error(`Error en bulkUpsertTasas: ${error.message}`);
    throw error;
  }
};


/**
 * Controlador para verificar fechas faltantes en un intervalo de fechas para un tipo de tasa
 * @param {string} tipoTasa - Tipo de tasa a verificar
 * @returns {Promise<Object>} - Resultado de la verificación con fechas faltantes
 */
exports.verificarFechasFaltantes = async (tipoTasa) => {
  try {
    // Validar el tipo de tasa
    const tiposValidos = [
      'tasaPasivaBNA',
      'tasaPasivaBCRA',
      'tasaActivaBNA',
      'cer',
      'icl',
      'tasaActivaCNAT2601',
      'tasaActivaCNAT2658'
    ];

    if (!tiposValidos.includes(tipoTasa)) {
      throw new Error(`Tipo de tasa inválido: ${tipoTasa}`);
    }

    // Paso 1: Obtener la configuración existente o crearla si no existe
    let config = await TasasConfig.findOne({ tipoTasa });

    if (!config) {
      // Si no existe configuración, encontrar primera y última fecha disponible
      const primeraFecha = await Tasas.findOne({ [tipoTasa]: { $ne: null } })
        .sort({ fecha: 1 })
        .select('fecha');

      const ultimaFecha = await Tasas.findOne({ [tipoTasa]: { $ne: null } })
        .sort({ fecha: -1 })
        .select('fecha');

      if (!primeraFecha || !ultimaFecha) {
        throw new Error(`No hay datos disponibles para el tipo de tasa: ${tipoTasa}`);
      }

      // Crear configuración
      // Normalizamos las fechas a las 00:00:00 UTC
      config = new TasasConfig({
        tipoTasa,
        fechaInicio: moment.utc(primeraFecha.fecha).startOf('day').toDate(),
        fechaUltima: moment.utc(ultimaFecha.fecha).startOf('day').toDate(),
        fechasFaltantes: []
      });

      await config.save();
    }

    // Paso 2: Generar array de todas las fechas en el intervalo
    // Asegurar que las fechas estén normalizadas a medianoche en UTC
    const fechaInicio = moment.utc(config.fechaInicio).startOf('day');
    let fechaUltima = moment.utc(config.fechaUltima).startOf('day');
    const todasLasFechas = [];

    // Generar array con todas las fechas en el intervalo
    // Cada fecha será a las 00:00:00 UTC
    let fechaActual = moment.utc(fechaInicio);
    while (fechaActual.isSameOrBefore(fechaUltima)) {
      // Usar hora 00:00:00 UTC para todas las fechas
      todasLasFechas.push(fechaActual.clone().startOf('day').toDate());
      fechaActual = fechaActual.clone().add(1, 'days');
    }

    // Paso 3: Buscar fechas existentes en la base de datos
    const fechasExistentes = await Tasas.find({
      fecha: {
        $gte: fechaInicio.toDate(),
        $lte: fechaUltima.toDate()
      },
      [tipoTasa]: { $ne: null }
    }).select('fecha').lean();

    // Crear un mapa de fechas existentes para búsqueda eficiente
    // Usamos el formato YYYY-MM-DD para comparación
    const fechasExistentesMap = new Map();

    fechasExistentes.forEach(item => {
      // Normalizar a UTC y luego tomar solo YYYY-MM-DD
      const fechaKey = moment.utc(item.fecha).format('YYYY-MM-DD');
      fechasExistentesMap.set(fechaKey, item.fecha);
    });

    // Paso 4: Identificar fechas faltantes
    // Comparamos solo la parte de fecha (YYYY-MM-DD), ignorando la hora
    const fechasFaltantes = todasLasFechas.filter(fecha => {
      const fechaKey = moment.utc(fecha).format('YYYY-MM-DD');
      return !fechasExistentesMap.has(fechaKey);
    }).map(fecha => moment.utc(fecha).startOf('day').toDate());

    // Paso 5: Actualizar el documento de configuración
    config.fechasFaltantes = fechasFaltantes;
    config.ultimaVerificacion = new Date();
    await config.save();

    // Preparar respuesta
    return {
      tipoTasa,
      fechaInicio: config.fechaInicio,
      fechaUltima: config.fechaUltima,
      totalDias: todasLasFechas.length,
      diasExistentes: fechasExistentes.length,
      diasFaltantes: fechasFaltantes.length,
      fechasFaltantes: fechasFaltantes.map(fecha => ({
        fecha,
        fechaFormateada: moment.utc(fecha).format('YYYY-MM-DD')
      })),
      ultimaVerificacion: config.ultimaVerificacion
    };
  } catch (error) {
    logger.error(`Error al verificar fechas faltantes para ${tipoTasa}: ${error.message}`);
    throw error;
  }
};

/**
 * Obtiene el rango de fechas faltantes para una tasa específica
 * @param {string} tipoTasa - Tipo de tasa a consultar
 * @param {Object} opciones - Opciones adicionales para la consulta
 * @param {boolean} [opciones.actualizarAntes=false] - Si es true, actualiza las fechas faltantes antes de obtener el rango
 * @param {number} [opciones.limiteDias=null] - Limita el número máximo de días a procesar
 * @returns {Promise<Object>} - Rango de fechas faltantes y detalles para scraping
 */
exports.obtenerRangoFechasFaltantes = async (tipoTasa, opciones = {}) => {
  try {
    // Validar el tipo de tasa
    const tiposValidos = [
      'tasaPasivaBNA',
      'tasaPasivaBCRA',
      'tasaActivaBNA',
      'cer',
      'icl',
      'tasaActivaCNAT2601',
      'tasaActivaCNAT2658'
    ];

    if (!tiposValidos.includes(tipoTasa)) {
      throw new Error(`Tipo de tasa inválido: ${tipoTasa}`);
    }

    // Si se solicita actualizar antes, importar y ejecutar el controlador de verificación
    if (opciones.actualizarAntes) {
      const { verificarFechasFaltantes } = require('./tasasVerificacionController');
      await verificarFechasFaltantes(tipoTasa);
    }

    // Buscar la configuración para el tipo de tasa especificado
    const config = await TasasConfig.findOne({ tipoTasa });

    if (!config) {
      throw new Error(`No se encontró configuración para el tipo de tasa: ${tipoTasa}`);
    }

    // Verificar si hay fechas faltantes
    if (!config.fechasFaltantes || config.fechasFaltantes.length === 0) {
      return {
        tipoTasa,
        hayFechasFaltantes: false,
        mensaje: 'No hay fechas faltantes para este tipo de tasa',
        totalFechasFaltantes: 0
      };
    }

    // Ordenar fechas faltantes y asegurar que estén a las 00:00:00 UTC
    const fechasOrdenadas = [...config.fechasFaltantes]
      .sort((a, b) => a - b)
      .map(fecha => {
        // Crear una nueva fecha UTC con año, mes, día y hora a 00:00:00
        const fechaUTC = new Date(Date.UTC(
          fecha.getUTCFullYear(),
          fecha.getUTCMonth(),
          fecha.getUTCDate(),
          0, 0, 0, 0
        ));
        return fechaUTC;
      });

    // Obtener primera y última fecha
    const primeraFechaFaltante = fechasOrdenadas[0];
    const ultimaFechaFaltante = fechasOrdenadas[fechasOrdenadas.length - 1];

    // Calcular días entre la primera y última fecha usando UTC
    const primerDia = moment.utc(primeraFechaFaltante).startOf('day');
    const ultimoDia = moment.utc(ultimaFechaFaltante).startOf('day');
    const diasEnRango = ultimoDia.diff(primerDia, 'days') + 1; // +1 para incluir el día final

    // Aplicar límite de días si está definido
    let fechaDesde = primeraFechaFaltante;
    let fechaHasta = ultimaFechaFaltante;
    let mensaje = `Rango completo de fechas faltantes: ${fechasOrdenadas.length} días`;

    if (opciones.limiteDias && opciones.limiteDias > 0 && opciones.limiteDias < fechasOrdenadas.length) {
      // Calcular fecha límite usando UTC para no afectar la hora
      const limiteDias = Math.min(opciones.limiteDias, fechasOrdenadas.length);
      fechaHasta = new Date(Date.UTC(
        primeraFechaFaltante.getUTCFullYear(),
        primeraFechaFaltante.getUTCMonth(),
        primeraFechaFaltante.getUTCDate() + (limiteDias - 1),
        0, 0, 0, 0
      ));
      mensaje = `Rango limitado a los primeros ${limiteDias} días de ${fechasOrdenadas.length} días faltantes`;
    }

    // Verificar si fechaDesde y fechaHasta son el mismo día, y añadir un día a fechaHasta si es así
    const mismaFecha = moment.utc(fechaDesde).isSame(moment.utc(fechaHasta), 'day');
    if (mismaFecha) {
      // Añadir un día a fechaHasta
      fechaHasta = new Date(Date.UTC(
        fechaHasta.getUTCFullYear(),
        fechaHasta.getUTCMonth(),
        fechaHasta.getUTCDate() + 1,
        0, 0, 0, 0
      ));
      mensaje += ' (se extendió un día adicional al rango para facilitar el procesamiento)';
    }

    // Formatear fechas para la respuesta - asegurar formato UTC 00:00:00
    const fechaDesdeFormateada = moment.utc(fechaDesde).format('YYYY-MM-DD');
    const fechaHastaFormateada = moment.utc(fechaHasta).format('YYYY-MM-DD');

    // Preparar respuesta
    return {
      tipoTasa,
      hayFechasFaltantes: true,
      totalFechasFaltantes: fechasOrdenadas.length,
      fechaDesde,
      fechaHasta,
      fechaDesdeFormateada,
      fechaHastaFormateada,
      diasEnRango: mismaFecha ? diasEnRango + 1 : diasEnRango, // Actualizar días en rango si se añadió un día
      mensaje,
      fechasProcesar: fechasOrdenadas
        .filter(fecha => moment.utc(fecha).isSameOrBefore(fechaHasta))
        .map(fecha => {
          // Garantizar que cada fecha esté en formato UTC 00:00:00
          const fechaUTC = new Date(Date.UTC(
            fecha.getUTCFullYear(),
            fecha.getUTCMonth(),
            fecha.getUTCDate(),
            0, 0, 0, 0
          ));
          return {
            fecha: fechaUTC,
            fechaFormateada: moment.utc(fechaUTC).format('YYYY-MM-DD')
          };
        })
    };
  } catch (error) {
    logger.error(`Error al obtener rango de fechas faltantes para ${tipoTasa}: ${error.message}`);
    throw error;
  }
};


/**
 * Actualiza el modelo TasasConfig eliminando las fechas que ya han sido procesadas
 * de la propiedad fechasFaltantes.
 * 
 * @param {string} tipoTasa - El tipo de tasa a actualizar
 * @param {Array} fechasProcesadas - Array de objetos con las fechas procesadas ({ fecha: '2024-03-30', values: {...} })
 * @returns {Object} - Resultado de la operación
 */
exports.actualizarFechasFaltantes = async (tipoTasa, fechasProcesadas = []) => {
  try {
    // Validar el tipo de tasa
    const tiposValidos = [
      'tasaPasivaBNA',
      'tasaPasivaBCRA',
      'tasaActivaBNA',
      'cer',
      'icl',
      'tasaActivaCNAT2601',
      'tasaActivaCNAT2658'
    ];

    if (!tiposValidos.includes(tipoTasa)) {
      throw new Error(`Tipo de tasa inválido: ${tipoTasa}`);
    }

    // Validar que se recibió un array de fechas
    if (!Array.isArray(fechasProcesadas)) {
      throw new Error('Se esperaba un array de fechas procesadas');
    }

    // Si no hay fechas para procesar, continuar pero solo para buscar la última fecha en la colección Tasas
    let hayFechasParaProcesar = fechasProcesadas.length > 0;

    // Buscar la configuración para el tipo de tasa
    const config = await TasasConfig.findOne({ tipoTasa });

    if (!config) {
      throw new Error(`No se encontró configuración para el tipo de tasa: ${tipoTasa}`);
    }

    let fechasEliminadas = 0;

    // Procesar las fechas faltantes solo si hay fechas para procesar
    if (hayFechasParaProcesar && config.fechasFaltantes && config.fechasFaltantes.length > 0) {
      // Convertir las fechas procesadas de strings a objetos Date
      // y crear un conjunto para búsqueda eficiente
      const fechasProcesadasSet = new Set();

      for (const item of fechasProcesadas) {
        // Convertir la fecha de string a Date
        if (typeof item.fecha === 'string') {
          // Asegurar formato YYYY-MM-DD y crear fecha UTC a las 00:00:00
          const [year, month, day] = item.fecha.split('-').map(Number);

          // Crear fecha UTC (asegura que sea a las 00:00:00)
          const fechaUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

          // Añadir al conjunto para búsqueda eficiente
          // Usar ISOString truncado como clave para evitar problemas de comparación
          fechasProcesadasSet.add(fechaUTC.toISOString().split('T')[0]);
        }
      }

      // Filtrar las fechas faltantes para eliminar las procesadas
      const fechasAnteriores = config.fechasFaltantes.length;

      // Filtrar fechas que NO están en el conjunto de procesadas
      config.fechasFaltantes = config.fechasFaltantes.filter(fecha => {
        // Convertir la fecha a formato YYYY-MM-DD para comparación
        const fechaStr = fecha.toISOString().split('T')[0];
        // Mantener la fecha solo si NO está en el conjunto de procesadas
        return !fechasProcesadasSet.has(fechaStr);
      });

      // Calcular cuántas fechas se eliminaron
      fechasEliminadas = fechasAnteriores - config.fechasFaltantes.length;
    }

    // Actualizar la fecha de última verificación
    config.ultimaVerificacion = new Date();

    // Actualizar fechaUltima si se procesaron fechas
    if (fechasEliminadas > 0) {
      // Encontrar la fecha más reciente entre las procesadas
      let fechaMasReciente = null;

      for (const item of fechasProcesadas) {
        if (typeof item.fecha === 'string') {
          const [year, month, day] = item.fecha.split('-').map(Number);
          const fechaActual = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

          if (!fechaMasReciente || fechaActual > fechaMasReciente) {
            fechaMasReciente = fechaActual;
          }
        }
      }

      // Si encontramos una fecha más reciente que la actual, actualizarla
      if (fechaMasReciente && (!config.fechaUltima || fechaMasReciente > config.fechaUltima)) {
        config.fechaUltima = fechaMasReciente;
      }
    }

    // NUEVA FUNCIONALIDAD: Buscar la última fecha en la colección Tasas que tenga un valor en la propiedad tipoTasa
    // Crear el filtro para buscar documentos que tengan un valor en la propiedad tipoTasa
    const filtro = { [tipoTasa]: { $exists: true, $ne: null } };

    // Ordenar por fecha en orden descendente y tomar solo el primero
    const ultimaTasa = await Tasas.findOne(filtro).sort({ fecha: -1 });

    // Si encontramos una tasa, actualizar la fechaUltima en la configuración si es más reciente
    if (ultimaTasa && ultimaTasa.fecha) {
      const fechaUltimoRegistro = new Date(ultimaTasa.fecha);

      // Asegurarnos de que sea a las 00:00:00 sin cambiar el día
      fechaUltimoRegistro.setUTCHours(0, 0, 0, 0);

      // Actualizar solo si es más reciente que la fecha actual o si no hay fecha actual
      if (!config.fechaUltima || fechaUltimoRegistro > config.fechaUltima) {
        config.fechaUltima = fechaUltimoRegistro;
      }
    }

    // Guardar los cambios en la base de datos
    await config.save();

    // Retornar el resultado
    return {
      status: 'success',
      message: hayFechasParaProcesar ?
        `Se eliminaron ${fechasEliminadas} fechas de fechasFaltantes` :
        'No se procesaron fechas faltantes',
      tipoTasa,
      fechasEliminadas,
      fechasRestantes: config.fechasFaltantes ? config.fechasFaltantes.length : 0,
      fechaUltima: config.fechaUltima,
      fechaUltimaActualizada: ultimaTasa ? true : false
    };
  } catch (error) {
    logger.error(`Error al actualizar fechas faltantes para ${tipoTasa}: ${error.message}`);
    throw error;
  }
};
/**
 * Actualiza las tasas en la base de datos
 * @param {Object} data - Datos obtenidos del scraping
 * @param {string} tipoTasa - Tipo de tasa a actualizar (ej: 'tasaActivaBNA')
 * @param {function} calcularValor - Función que calcula el valor a guardar
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.actualizarTasa = async (data, tipoTasa, calcularValor, tasasAdicionales = []) => {
  console.log(data, tipoTasa, calcularValor, tasasAdicionales);
  try {
    // Verificar si los datos son válidos
    if (!data || !data.data) {
      throw new Error('Datos de tasa inválidos');
    }

    // Obtener fecha del scraping
    const fechaScraping = data.data.fechaVigenciaISO || data.data.fechaFormateada;
    if (!fechaScraping) {
      throw new Error('Fecha de vigencia no encontrada en los datos');
    }

    // Normalizar la fecha usando moment.js, configurando a UTC y principio del día
    const fecha = moment.utc(fechaScraping).startOf('day').toDate();

    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      throw new Error(`Fecha inválida: ${fechaScraping}`);
    }

    // Calcular el valor a guardar para la tasa principal
    const valor = calcularValor(data.data);

    // Obtener fecha actual normalizada (UTC, inicio del día)
    const fechaActual = moment.utc().startOf('day').toDate();

    // Verificar si la fecha del scraping es anterior a la fecha actual
    const esAnterior = fecha < fechaActual;

    // Array para almacenar los resultados de las operaciones
    const resultados = [];

    // Preparar un objeto con todos los valores de tasas a guardar
    const valoresParaGuardar = {
      [tipoTasa]: valor
    };

    // Agregar tasas adicionales al objeto de valores
    for (const tasa of tasasAdicionales) {
      valoresParaGuardar[tasa.tipo] = tasa.calcularValor(data.data);
    }
    console.log(valoresParaGuardar)
    // Guardar/actualizar el registro para la fecha original con todas las tasas
    const resultadoOriginal = await guardarOActualizarTasasMultiples(fecha, valoresParaGuardar);
    resultados.push(resultadoOriginal);

    // Si la fecha es anterior a la actual, también guardar/actualizar con la fecha actual
    if (esAnterior) {
      const resultadoActual = await guardarOActualizarTasasMultiples(fechaActual, valoresParaGuardar);
      resultados.push(resultadoActual);
      logger.info(`También se actualizaron las tasas para la fecha actual ${moment(fechaActual).format('YYYY-MM-DD')}`);
    }

    // Actualizar la configuración de la tasa principal
    await exports.actualizarConfigTasa(tipoTasa, esAnterior ? fechaActual : fecha);

    // Actualizar configuración de tasas adicionales
    for (const tasa of tasasAdicionales) {
      await exports.actualizarConfigTasa(tasa.tipo, esAnterior ? fechaActual : fecha);
    }

    return {
      actualizado: true,
      mensaje: 'Tasas actualizadas correctamente',
      resultados: resultados,
      valor: valor,
      valoresAdicionales: tasasAdicionales.reduce((obj, tasa) => {
        obj[tasa.tipo] = valoresParaGuardar[tasa.tipo];
        return obj;
      }, {})
    };
  } catch (error) {
    logger.error(`Error al actualizar tasa ${tipoTasa}:`, error);
    throw error;
  }
};

// Nueva función para guardar/actualizar múltiples tasas en un solo documento
async function guardarOActualizarTasasMultiples(fecha, valoresTasas) {
  console.log(valoresTasas)
  try {
    // Buscar si ya existe un registro para esta fecha
    let documento = await Tasas.findOne({ fecha });

    // Si no existe, crear uno nuevo
    if (!documento) {
      documento = new Tasas({ fecha });
    }

    // Actualizar cada tasa en el documento
    let actualizaciones = [];
    for (const [tipoTasa, valor] of Object.entries(valoresTasas)) {
      // Solo actualizar si el valor es diferente o no existe
      if (documento[tipoTasa] !== valor) {
        documento[tipoTasa] = valor;
        actualizaciones.push(tipoTasa);
      }
    }

    // Si hubo actualizaciones, guardar el documento
    if (actualizaciones.length > 0) {
      await documento.save();
      return {
        fecha: documento.fecha,
        mensaje: `Tasas actualizadas: ${actualizaciones.join(', ')}`,
        actualizado: true,
        valores: valoresTasas
      };
    }

    // Si no hubo actualizaciones
    return {
      fecha: documento.fecha,
      mensaje: 'No hubo cambios en los valores de las tasas',
      actualizado: false,
      valores: valoresTasas
    };
  } catch (error) {
    logger.error(`Error al guardar/actualizar tasas múltiples:`, error);
    throw error;
  }
};

/**
 * Actualiza la tasa activa BNA
 * @param {Object} data - Datos obtenidos del scraping
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.guardarTasaActivaBNA = async (data) => {
  return await exports.actualizarTasa(
    data,
    'tasaActivaBNA',
    (datos) => {
      // Calcular el valor como TEM / 30
      return datos.tem / 30;
    },
    [
      {
        tipo: 'tasaActivaCNAT2658',
        calcularValor: (datos) => {
          // Calcular el valor como TEA / 365
          return datos.tea / 365;
        }
      },
      {
        tipo: 'tasaActivaTnaBNA',
        calcularValor: (datos) => {
          return datos.tna / 365
        }
      },
      {
        tipo: 'tasaActivaCNAT2764',
        calcularValor: (datos) => {
          return datos.tea / 365;
        }
      }
    ],
  );
};

/**
 * Actualiza la configuración de una tasa específica
 * @param {string} tipoTasa - Tipo de tasa a actualizar
 * @param {Date} fecha - Fecha de la tasa actualizada
 * @returns {Promise<Object>} - Documento de configuración actualizado
 */
exports.actualizarConfigTasa = async (tipoTasa, fecha) => {
  try {
    // Buscar configuración existente
    let config = await TasasConfig.findOne({ tipoTasa: tipoTasa });

    if (config) {
      // Actualizar fecha última
      config.fechaUltima = fecha;
      config.ultimaVerificacion = new Date();
      return await config.save();
    } else {
      // Crear nueva configuración
      return await TasasConfig.create({
        tipoTasa: tipoTasa,
        fechaInicio: fecha,
        fechaUltima: fecha,
        fechasFaltantes: [],
        ultimaVerificacion: new Date()
      });
    }
  } catch (error) {
    logger.error(`Error al actualizar configuración de tasa ${tipoTasa}:`, error);
    throw error;
  }
};


/**
 * Actualiza cualquier tasa con un valor específico
 * @param {Object} data - Datos obtenidos del scraping
 * @param {string} tipoTasa - Tipo de tasa a actualizar
 * @param {number} valor - Valor a guardar
 * @returns {Promise<Object>} - Resultado de la operación
 */
exports.actualizarTasaGeneral = async (data, tipoTasa, valor) => {
  return await this.actualizarTasa(data, tipoTasa, () => valor);
};

/**
 * Controlador que integra el proceso de actualización de tasas y la eliminación de fechas faltantes
 * 
 * @param {string} tipoTasa - Tipo de tasa a procesar
 * @param {Object} resultado - Resultado del proceso de bulkUpsertTasas
 * @returns {Object} - Resultado combinado de la operación
 */
exports.procesarActualizacionTasas = async (tipoTasa, resultado) => {
  logger.info("Inputs procersarActualizacionTasas", tipoTasa, resultado)
  try {
    // Validar que se recibió un resultado válido
    if (!resultado || !resultado.status) {
      throw new Error('No se recibió un resultado válido del proceso de actualización');
    }

    // Unir fechas insertadas y actualizadas
    const todasLasFechasProcesadas = [
      ...(resultado.fechasInsertadas || []),
      ...(resultado.fechasActualizadas || [])
    ];

    // Si no hay fechas procesadas, retornar temprano
    if (todasLasFechasProcesadas.length === 0) {
      return {
        status: 'success',
        message: 'No se procesaron fechas para actualizar',
        resultado
      };
    }

    // Actualizar las fechas faltantes
    const resultadoActualizacion = await this.actualizarFechasFaltantes(tipoTasa, todasLasFechasProcesadas);

    // Combinar resultados
    return {
      status: 'success',
      message: 'Proceso de actualización completado',
      resultado,
      actualizacionFechasFaltantes: resultadoActualizacion
    };
  } catch (error) {
    logger.error(`Error en procesarActualizacionTasas: ${error.message}`);
    throw error;
  }
};


/**
 * Consulta datos por rango de fechas para un campo específico
 * Puede devolver todo el rango o solo los valores extremos según el parámetro 'completo'
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @returns {Object} JSON con los datos solicitados
 */
exports.consultarPorFechas = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, campo, completo } = req.query;

    // Validar que se proporcionen los parámetros necesarios
    if (!fechaDesde || !fechaHasta || !campo) {
      return res.status(400).json({
        success: false,
        mensaje: 'Se requieren fechaDesde, fechaHasta y campo'
      });
    }

    // Verificar que el campo solicitado sea válido
    const camposValidos = [
      'tasaPasivaBNA', 'tasaPasivaBCRA', 'tasaActivaBNA',
      'cer', 'icl', 'tasaActivaCNAT2601', 'tasaActivaCNAT2658'
    ];

    if (!camposValidos.includes(campo)) {
      return res.status(400).json({
        success: false,
        mensaje: `Campo inválido. Campos permitidos: ${camposValidos.join(', ')}`
      });
    }

    // Normalizar fechas a UTC y principio del día
    const fechaDesdeNormalizada = moment.utc(fechaDesde).startOf('day').toDate();
    const fechaHastaNormalizada = moment.utc(fechaHasta).startOf('day').toDate();

    // Seleccionar campos a devolver
    let proyeccion = { fecha: 1, _id: 0 };
    proyeccion[campo] = 1;

    // Ejecutar la consulta según el valor de 'completo'
    let datos;
    const isCompleto = completo === 'true';

    if (isCompleto) {
      // Consulta para el rango completo
      const consulta = {
        fecha: {
          $gte: fechaDesdeNormalizada,
          $lte: fechaHastaNormalizada
        }
      };

      // Devolver todos los registros dentro del rango
      datos = await Tasas.find(consulta, proyeccion).sort({ fecha: 1 });
    } else {
      // Consulta solo para los extremos
      const registroInicial = await Tasas.findOne(
        { fecha: fechaDesdeNormalizada },
        proyeccion
      );

      const registroFinal = await Tasas.findOne(
        { fecha: fechaHastaNormalizada },
        proyeccion
      );

      datos = {
        inicio: registroInicial,
        fin: registroFinal
      };
    }

    return res.status(200).json({
      success: true,
      datos,
      parametros: {
        fechaDesde: fechaDesdeNormalizada,
        fechaHasta: fechaHastaNormalizada,
        campo,
        completo: isCompleto
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      mensaje: 'Error al consultar datos por fechas',
      error: error.message
    });
  }
};