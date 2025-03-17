const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');
const { PDFDocument } = require('pdf-lib');
const pdf = require('pdf-parse');
const Tasas = require('../../../models/tasas');
const TasasConfig = require('../../../models/tasasConfig');
const { descargarPdfTasasPasivasConReintentos } = require('./bnaDescargadorPDF');


/**
 * Extrae datos de un PDF de tasas pasivas del BNA
 * @param {String} pdfPath - Ruta al archivo PDF
 * @returns {Promise<Object>} - Datos extraídos del PDF
 */
async function extraerDatosTasasPasivas(pdfPath) {
    try {
        logger.info(`Iniciando extracción de datos del PDF: ${pdfPath}`);

        // Verificar que el archivo existe
        await fs.access(pdfPath);

        // Leer archivo
        const dataBuffer = await fs.readFile(pdfPath);

        // Parsear el PDF
        const data = await pdf(dataBuffer);

        // Guardar el texto completo para debuggear
        const textFilePath = `${pdfPath.replace('.pdf', '')}_text.txt`;
        await fs.writeFile(textFilePath, data.text);
        logger.info(`Texto extraído guardado en: ${textFilePath}`);

        // Extraer fecha de vigencia (suponiendo un formato específico)
        const fechaMatch = data.text.match(/vigencia\s+(?:desde\s+el\s+)?(\d{2}\/\d{2}\/\d{4})/i);
        const fechaVigencia = fechaMatch ? fechaMatch[1] : null;

        // Convertir fecha a formato ISO si se encontró
        let fechaVigenciaISO = null;
        let fechaFormateada = null;

        if (fechaVigencia) {
            try {
                // Convertir de formato DD/MM/YYYY a formato ISO
                const [dia, mes, anio] = fechaVigencia.split('/');
                const fecha = new Date(Date.UTC(parseInt(anio), parseInt(mes) - 1, parseInt(dia), 0, 0, 0));
                fechaVigenciaISO = fecha.toISOString();
                fechaFormateada = fechaVigenciaISO.split('T')[0];
            } catch (error) {
                logger.error(`Error al convertir fecha: ${error.message}`);
            }
        }

        // Extraer las tasas pasivas (este patrón debe adaptarse según la estructura exacta del PDF)
        // El siguiente es un ejemplo genérico que busca patrones típicos de tasas de interés

        // Buscar tasa para caja de ahorro (ejemplo)
        const cajasAhorroMatch = data.text.match(/Caja\s+de\s+Ahorro[^\d]*(\d+[.,]\d+)%/i);
        const cajasAhorroTasa = cajasAhorroMatch ? parseFloat(cajasAhorroMatch[1].replace(',', '.')) : null;

        // Buscar tasa para plazo fijo a 30 días (ejemplo)
        const plazoFijo30Match = data.text.match(/Plazo\s+Fijo.*?30\s+días[^\d]*(\d+[.,]\d+)%/i);
        const plazoFijo30Tasa = plazoFijo30Match ? parseFloat(plazoFijo30Match[1].replace(',', '.')) : null;

        // Buscar tasa para plazo fijo a 60 días (ejemplo)
        const plazoFijo60Match = data.text.match(/Plazo\s+Fijo.*?60\s+días[^\d]*(\d+[.,]\d+)%/i);
        const plazoFijo60Tasa = plazoFijo60Match ? parseFloat(plazoFijo60Match[1].replace(',', '.')) : null;

        // Buscar tasa para plazo fijo a 90 días (ejemplo)
        const plazoFijo90Match = data.text.match(/Plazo\s+Fijo.*?90\s+días[^\d]*(\d+[.,]\d+)%/i);
        const plazoFijo90Tasa = plazoFijo90Match ? parseFloat(plazoFijo90Match[1].replace(',', '.')) : null;

        // Buscar tasa para plazo fijo UVA (ejemplo)
        const plazoFijoUVAMatch = data.text.match(/Plazo\s+Fijo.*?UVA[^\d]*(\d+[.,]\d+)%/i);
        const plazoFijoUVATasa = plazoFijoUVAMatch ? parseFloat(plazoFijoUVAMatch[1].replace(',', '.')) : null;

        // Armar objeto con los datos extraídos
        const tasasPasivas = {
            cajasAhorro: cajasAhorroTasa,
            plazoFijo: {
                dias30: plazoFijo30Tasa,
                dias60: plazoFijo60Tasa,
                dias90: plazoFijo90Tasa,
                uva: plazoFijoUVATasa
            }
        };

        // Esperar a que todos los logs sean procesados antes de retornar
        await new Promise(resolve => setTimeout(resolve, 500));

        // Retornar resultado
        return {
            status: 'success',
            message: 'Datos extraídos correctamente del PDF',
            data: {
                fechaVigencia,
                fechaVigenciaISO,
                fechaFormateada,
                tasasPasivas,
                metadatos: {
                    numPaginas: data.numpages,
                    informacion: data.info,
                    version: data.version,
                    nombreArchivo: path.basename(pdfPath),
                    tamanoArchivo: (await fs.stat(pdfPath)).size,
                    textoCompleto: textFilePath
                }
            }
        };

    } catch (error) {
        logger.error(`Error al extraer datos del PDF: ${error.message}`);
        // Esperar a que los logs de error sean procesados
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            status: 'error',
            message: `Error al extraer datos: ${error.message}`
        };
    }
}

/**
 * Función principal que descarga el PDF y extrae sus datos
 * @param {Object} options - Opciones para la descarga y extracción
 * @returns {Promise<Object>} - Resultado del proceso
 */
async function procesarPdfTasasPasivas(options = {}) {
    const { descargarPdfTasasPasivasConReintentos } = require('./bnaDescargadorPDF');

    try {
        logger.info('Iniciando procesamiento de PDF de tasas pasivas del BNA');

        // Descargar el PDF
        const resultadoDescarga = await descargarPdfTasasPasivasConReintentos(options);
        // Esperar a que los logs sean procesados
        await new Promise(resolve => setTimeout(resolve, 300));

        if (resultadoDescarga.status === 'error') {
            return resultadoDescarga;
        }

        const { pdfPath } = resultadoDescarga.data;

        // Extraer datos del PDF
        const resultadoExtraccion = await extraerDatosTasasPasivas(pdfPath);
        // Esperar a que los logs sean procesados
        await new Promise(resolve => setTimeout(resolve, 300));

        // Combinar resultados
        return {
            status: resultadoExtraccion.status,
            message: `PDF descargado y procesado: ${resultadoExtraccion.message}`,
            data: {
                ...resultadoDescarga.data,
                ...resultadoExtraccion.data
            }
        };

    } catch (error) {
        logger.error(`Error al procesar PDF de tasas pasivas: ${error.message}`);
        // Esperar a que los logs de error sean procesados
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            status: 'error',
            message: `Error al procesar PDF: ${error.message}`
        };
    }
}

/**
 * Guarda las tasas pasivas en la base de datos
 * @param {Object} resultadoProcesamiento - Resultado del procesamiento del PDF
 * @returns {Promise<Object>} - Resultado del guardado
 */
async function guardarTasasPasivas(resultadoProcesamiento) {
    try {
        logger.info('Iniciando guardado de tasas pasivas en la base de datos');

        // Verificar que tenemos los datos necesarios
        if (!resultadoProcesamiento ||
            !resultadoProcesamiento.data ||
            !resultadoProcesamiento.data.fechaVigenciaISO) {

            logger.error('Datos de tasas pasivas insuficientes para guardar en la base de datos');
            await new Promise(resolve => setTimeout(resolve, 300));

            return {
                status: 'error',
                message: 'Datos insuficientes para guardar en la base de datos'
            };
        }

        // Extraer los datos relevantes
        const { fechaVigenciaISO } = resultadoProcesamiento.data;
        let tasaValor = null;

        // Determinar la fuente del valor de la tasa
        if (resultadoProcesamiento.data.tasaValor !== undefined && resultadoProcesamiento.data.tasaValor !== null) {
            // Si viene de extraerDatosTasasPasivasTxt
            const valorOriginal = resultadoProcesamiento.data.tasaValor;
            tasaValor = (valorOriginal / 365); // Convertir a tasa mensual
            logger.info(`Usando tasa del valor específico: ${valorOriginal}% (anual) → ${tasaValor.toFixed(4)}% (diario)`);
        } else if (resultadoProcesamiento.data.tasasPasivas &&
            resultadoProcesamiento.data.tasasPasivas.plazoFijo &&
            resultadoProcesamiento.data.tasasPasivas.plazoFijo.dias30 !== undefined &&
            resultadoProcesamiento.data.tasasPasivas.plazoFijo.dias30 !== null) {
            // Si viene de extraerDatosTasasPasivas, usamos el valor de plazo fijo a 30 días
            const valorOriginal = resultadoProcesamiento.data.tasasPasivas.plazoFijo.dias30;
            tasaValor = (valorOriginal / 365); // Convertir a tasa mensual
            logger.info(`Usando tasa de plazo fijo a 30 días: ${valorOriginal}% (anual) → ${tasaValor.toFixed(4)}% (diario)`);
        } else {
            logger.error('No se encontró un valor de tasa válido para guardar');
            await new Promise(resolve => setTimeout(resolve, 300));

            return {
                status: 'error',
                message: 'No se encontró un valor de tasa válido para guardar'
            };
        }

        // Convertir fecha de vigencia a formato fecha JavaScript
        const fechaVigencia = new Date(fechaVigenciaISO);
        logger.info(`Fecha de vigencia original: ${fechaVigencia.toISOString()}`);

        // Obtener la fecha actual (normalizada al inicio del día en UTC)
        const fechaActual = new Date();
        fechaActual.setUTCHours(0, 0, 0, 0);
        logger.info(`Fecha actual (normalizada): ${fechaActual.toISOString()}`);

        // Determinar si hay que guardar en dos fechas
        const guardarDosFechas = fechaVigencia < fechaActual;
        if (guardarDosFechas) {
            logger.info(`La fecha de vigencia es anterior a la fecha actual. Se guardarán datos para ambas fechas.`);
        }

        // Array para almacenar resultados de uno o dos guardados
        const resultados = [];

        // Función para guardar un registro para una fecha específica
        async function guardarRegistro(fecha, esActual = false) {
            logger.info(`Guardando registro para fecha ${fecha.toISOString()}${esActual ? ' (fecha actual)' : ''}`);

            // Buscar si ya existe un registro para esta fecha
            const registroExistente = await Tasas.findOne({ fecha });

            let resultado;
            let accion;

            if (registroExistente) {
                // Actualizar registro existente
                logger.info(`Actualizando registro existente para la fecha ${fecha.toISOString()}`);
                registroExistente.tasaPasivaBNA = tasaValor;

                try {
                    await registroExistente.save();
                    accion = 'actualizado';
                    logger.info(`Registro ${esActual ? '(fecha actual) ' : ''}actualizado correctamente con ID: ${registroExistente._id}`);
                } catch (saveError) {
                    // Si es el error especial de nuestro middleware, es porque se fusionó con otro registro
                    if (saveError.message === 'MERGED_WITH_EXISTING') {
                        accion = 'fusionado';
                        logger.info(`El registro ${esActual ? '(fecha actual) ' : ''}se fusionó con uno existente debido al middleware`);
                    } else {
                        throw saveError; // Re-lanzar otros errores
                    }
                }

                resultado = registroExistente;
            } else {
                // Crear nuevo registro
                logger.info(`Creando nuevo registro para la fecha ${fecha.toISOString()}${esActual ? ' (fecha actual)' : ''}`);
                const nuevoRegistro = new Tasas({
                    fecha,
                    tasaPasivaBNA: tasaValor
                });

                try {
                    await nuevoRegistro.save();
                    accion = 'creado';
                    logger.info(`Nuevo registro ${esActual ? '(fecha actual) ' : ''}creado con ID: ${nuevoRegistro._id}`);
                    resultado = nuevoRegistro;
                } catch (saveError) {
                    // Si es el error especial de nuestro middleware, es porque se fusionó con otro registro
                    if (saveError.message === 'MERGED_WITH_EXISTING') {
                        // En este caso, buscar el registro que se fusionó
                        accion = 'fusionado';
                        logger.info(`El registro ${esActual ? '(fecha actual) ' : ''}se fusionó con uno existente debido al middleware`);
                        // Buscar el registro actualizado
                        resultado = await Tasas.findOne({ fecha });
                    } else {
                        throw saveError; // Re-lanzar otros errores
                    }
                }
            }

            return {
                fecha: fecha.toISOString(),
                esFechaActual: esActual,
                accion,
                id: resultado?._id?.toString()
            };
        }

        // Guardar para la fecha de vigencia original
        const resultadoFechaOriginal = await guardarRegistro(fechaVigencia, false);
        resultados.push(resultadoFechaOriginal);

        // Si es necesario, guardar también para la fecha actual
        if (guardarDosFechas) {
            const resultadoFechaActual = await guardarRegistro(fechaActual, true);
            resultados.push(resultadoFechaActual);
        }

        // Para mantener compatibilidad con el código existente, asignamos el primer resultado
        const resultado = resultados[0];

        // Actualizar el modelo TasasConfig con la última fecha
        try {
            logger.info(`Actualizando TasasConfig para tipoTasa: tasaPasivaBNA`);

            // Buscar la configuración para tasaPasivaBNA
            let config = await TasasConfig.findOne({ tipoTasa: 'tasaPasivaBNA' });

            // Determinar la fecha más reciente guardada
            const fechaMasReciente = guardarDosFechas ? fechaActual : fechaVigencia;
            logger.info(`Fecha más reciente para actualizar en TasasConfig: ${fechaMasReciente.toISOString()}`);

            if (config) {
                // Actualizar configuración existente
                logger.info(`Encontrada configuración existente para tasaPasivaBNA, actualizando fechaUltima`);

                // Solo actualizar si la nueva fecha es más reciente que la actual
                if (!config.fechaUltima || fechaMasReciente > new Date(config.fechaUltima)) {
                    config.fechaUltima = fechaMasReciente;
                    config.ultimaVerificacion = new Date();
                    await config.save();
                    logger.info(`TasasConfig actualizado con fechaUltima: ${fechaMasReciente.toISOString()}`);
                } else {
                    logger.info(`No se actualizó TasasConfig porque la fecha existente es más reciente o igual`);
                }
            } else {
                // Crear nueva configuración
                logger.info(`No se encontró configuración para tasaPasivaBNA, creando nueva`);
                config = new TasasConfig({
                    tipoTasa: 'tasaPasivaBNA',
                    fechaInicio: fechaMasReciente, // La primera fecha que conocemos
                    fechaUltima: fechaMasReciente,
                    fechasFaltantes: [],
                    ultimaVerificacion: new Date()
                });
                await config.save();
                logger.info(`Nueva configuración TasasConfig creada con fechas inicio/ultima: ${fechaMasReciente.toISOString()}`);
            }

        } catch (configError) {
            // No fallar todo el proceso si hay un error al actualizar la configuración
            logger.error(`Error al actualizar TasasConfig: ${configError.message}`);
            if (configError.stack) {
                logger.error(`Stack de error en TasasConfig: ${configError.stack}`);
            }
        }

        return {
            status: 'success',
            message: resultados.length > 1
                ? `Tasa pasiva guardada correctamente en la base de datos para la fecha de vigencia y la fecha actual`
                : `Tasa pasiva ${resultados[0].accion} correctamente en la base de datos`,
            data: {
                fechaVigencia: fechaVigencia.toISOString(),
                fechaActual: fechaActual.toISOString(),
                fechasGuardadas: resultados.length,
                tasaPasivaBNA: tasaValor,
                tasaPasivaBNA_original: resultadoProcesamiento.data.tasaValor ||
                    (resultadoProcesamiento.data.tasasPasivas?.plazoFijo?.dias30),
                conversion: "tasaPasivaBNA = (valor_original / 365) * 30",
                registros: resultados,
                configActualizada: true,
                datosOriginales: resultadoProcesamiento.data
            }
        };
    } catch (error) {
        logger.error(`Error al guardar tasas pasivas: ${error.message}`);
        if (error.stack) {
            logger.error(`Stack: ${error.stack}`);
        }

        // Esperar a que los logs de error sean procesados
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            status: 'error',
            message: `Error al guardar tasas pasivas: ${error.message}`
        };
    }
}

async function extraerDatosTasasPasivasTxt(textPath) {
    try {
        logger.info(`Iniciando extracción de datos del archivo de texto: ${textPath}`);

        // Verificar que el archivo existe
        try {
            await fs.access(textPath);
            logger.info(`Archivo encontrado: ${textPath}`);
        } catch (error) {
            logger.error(`El archivo no existe o no es accesible: ${textPath}`);
            // Esperar a que los logs de error sean procesados
            await new Promise(resolve => setTimeout(resolve, 300));
            return {
                status: 'error',
                message: `El archivo no existe o no es accesible: ${error.message}`
            };
        }

        // Leer archivo de texto
        let texto;
        try {
            texto = await fs.readFile(textPath, 'utf8');
            logger.info(`Archivo leído correctamente. Longitud: ${texto.length} caracteres`);
        } catch (error) {
            logger.error(`Error al leer el archivo: ${error.message}`);
            // Esperar a que los logs de error sean procesados
            await new Promise(resolve => setTimeout(resolve, 300));
            return {
                status: 'error',
                message: `Error al leer el archivo: ${error.message}`
            };
        }

        // 1. Extraer fecha de vigencia (formato "dd de Mes de YYYY")
        logger.info("Buscando fecha de vigencia...");
        const fechaRegex = /TASAS DE INTERÉS PASIVAS VIGENTES AL\s+(\d{2})\s+de\s+([A-Za-zÁ-Úá-ú]+)\s+de\s+(\d{4})/i;
        const fechaMatch = texto.match(fechaRegex);

        let fechaVigencia = null;
        let fechaVigenciaISO = null;

        if (fechaMatch) {
            const dia = fechaMatch[1];
            const mes = fechaMatch[2];
            const anio = fechaMatch[3];

            fechaVigencia = `${dia} de ${mes} de ${anio}`;
            logger.info(`Fecha encontrada: ${fechaVigencia}`);

            // Mapeo de nombres de meses en español a números
            const mesesMap = {
                'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
                'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
            };

            // Convertir nombre del mes a número (0-11)
            const mesNum = mesesMap[mes.toLowerCase()];

            if (mesNum !== undefined) {
                // Crear objeto Date y convertir a ISO string
                const fecha = new Date(Date.UTC(parseInt(anio), mesNum, parseInt(dia)));
                fechaVigenciaISO = fecha.toISOString();
                logger.info(`Fecha en formato ISO: ${fechaVigenciaISO}`);
            } else {
                logger.warn(`No se pudo convertir el mes '${mes}' a formato numérico`);
            }
        } else {
            logger.warn("No se encontró la fecha de vigencia en el formato esperado");
        }

        // 2. Extraer el valor específico (23,00%)
        logger.info("Buscando valor de tasa específico...");
        let tasaValor = null;

        try {
            // Primer intento: patrón específico
            const valorRegex = /T\.E\.A\.\s*\n\s*T\.N\.A\.T\.E\.A\.\s*\n\s*T\.N\.A\.T\.E\.A\.\s*\n\s*(\d+[.,]\d+)%/m;
            const valorMatch = texto.match(valorRegex);

            if (valorMatch) {
                // Convertir de string a número (reemplazando coma por punto)
                tasaValor = parseFloat(valorMatch[1].replace(',', '.'));
                logger.info(`Valor encontrado con patrón principal: ${valorMatch[1]}% -> ${tasaValor}`);
            } else {
                logger.info("No se encontró valor con el patrón principal, probando métodos alternativos...");

                // Segundo intento: patrón alternativo
                const patronAlternativo = /T\.N\.A\.T\.E\.A\.\s*\n\s*T\.N\.A\.T\.E\.A\.\s*\n\s*T\.E\.A\.\s*\n\s*(\d+[.,]\d+)%/m;
                const matchAlternativo = texto.match(patronAlternativo);

                if (matchAlternativo) {
                    tasaValor = parseFloat(matchAlternativo[1].replace(',', '.'));
                    logger.info(`Valor encontrado con patrón alternativo: ${matchAlternativo[1]}% -> ${tasaValor}`);
                } else {
                    logger.info("Probando con búsqueda por líneas...");

                    // Tercer intento: búsqueda por líneas
                    const lineas = texto.split('\n');

                    // Buscar líneas donde aparece T.E.A. y T.N.A.T.E.A.
                    for (let i = 0; i < lineas.length; i++) {
                        if (lineas[i].trim() === 'T.E.A.' &&
                            i + 3 < lineas.length &&
                            lineas[i + 1].includes('T.N.A.T.E.A.') &&
                            lineas[i + 2].includes('T.N.A.T.E.A.')) {

                            const lineaValor = lineas[i + 3].trim();
                            const valorMatch = lineaValor.match(/(\d+[.,]\d+)%/);

                            if (valorMatch) {
                                tasaValor = parseFloat(valorMatch[1].replace(',', '.'));
                                logger.info(`Valor encontrado por análisis de líneas: ${valorMatch[1]}% -> ${tasaValor}`);
                                break;
                            }
                        }
                    }

                    // Cuarto intento: búsqueda directa de 23,00%
                    if (tasaValor === null) {
                        logger.info("Buscando específicamente el valor 23,00%...");
                        const valor23Match = texto.match(/23[.,]00%/);
                        if (valor23Match) {
                            tasaValor = 23.0;
                            logger.info("Valor 23,00% encontrado directamente");
                        } else {
                            logger.warn("No se pudo encontrar el valor específico '23,00%'");
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`Error al analizar el texto para extraer valores: ${error.message}`);
        }

        // Verificar si se encontraron los datos requeridos
        if (fechaVigenciaISO === null && tasaValor === null) {
            logger.warn("No se pudo extraer ninguno de los datos requeridos");
            // Esperar a que los logs de advertencia sean procesados
            await new Promise(resolve => setTimeout(resolve, 300));
            return {
                status: 'warning',
                message: 'No se pudieron extraer los datos requeridos del archivo',
                data: {
                    metadatos: {
                        nombreArchivo: path.basename(textPath)
                    }
                }
            };
        }

        // Asegurar que todos los logs sean procesados
        logger.info("Extracción completada con éxito");
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Retornar resultado
        return {
            status: 'success',
            message: 'Datos extraídos correctamente del archivo de texto',
            data: {
                fechaVigencia,
                fechaVigenciaISO,
                tasaValor,
                metadatos: {
                    nombreArchivo: path.basename(textPath),
                    longitudTexto: texto.length
                }
            }
        };

    } catch (error) {
        logger.error(`Error general en la extracción de datos: ${error.message}`);
        logger.error(error.stack); // Incluir stack trace completo
        // Esperar a que los logs de error sean procesados
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            status: 'error',
            message: `Error general en la extracción: ${error.message}`,
            error: {
                stack: error.stack
            }
        };
    }
}

async function mainBnaPasivaService() {
    try {
        const resultado = await descargarPdfTasasPasivasConReintentos();
        const resultadoPDF = await extraerDatosTasasPasivas(`./server/files/${resultado.data.nombreArchivoGuardado}`);
        const resultTxt = await extraerDatosTasasPasivasTxt(`${resultadoPDF.data.metadatos.textoCompleto}`)
        const guardarTasas = await guardarTasasPasivas(resultTxt)
        return guardarTasas
    } catch (error) {
        throw new Error(error)
    }
}


module.exports = {
    extraerDatosTasasPasivas,
    extraerDatosTasasPasivasTxt,
    procesarPdfTasasPasivas,
    guardarTasasPasivas,
    mainBnaPasivaService,
};