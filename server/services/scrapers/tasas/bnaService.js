const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const logger = require('../../../utils/logger');
const { guardarTasaActivaBNA } = require('../../../controllers/tasasController');


/**
 * Implementa una estrategia de reintentos con backoff exponencial
 * @param {Function} fn - Función a ejecutar con reintentos
 * @param {Object} options - Opciones de configuración
 * @param {number} options.maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} options.initialDelay - Retraso inicial en ms (default: 1000)
 * @param {number} options.maxDelay - Retraso máximo en ms (default: 30000)
 * @param {number} options.factor - Factor de crecimiento (default: 2)
 * @param {Function} options.shouldRetry - Función que evalúa si debe reintentar (default: siempre true)
 * @returns {Promise<any>} - Resultado de la función
 */
async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 30000,
        factor = 2,
        shouldRetry = () => true,
        onRetry = (error, attempt) => { }
    } = options;

    let attempt = 0;
    let delay = initialDelay;

    while (true) {
        try {
            return await fn(attempt);
        } catch (error) {
            attempt++;

            // Si alcanzamos el número máximo de reintentos, lanzar el error
            if (attempt >= maxRetries || !shouldRetry(error)) {
                throw error;
            }

            // Notificar del reintento
            onRetry(error, attempt);

            // Calcular el próximo delay con jitter (variación aleatoria)
            const jitter = Math.random() * 0.3 + 0.85; // Entre 0.85 y 1.15
            delay = Math.min(delay * factor * jitter, maxDelay);

            // Esperar antes del próximo intento
            logger.info(`Reintento ${attempt}/${maxRetries} en ${Math.round(delay)}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Versión mejorada de extracción de tasas con reintentos
 * @returns {Object} Objeto con fecha y tasas
 */
async function extraerTasaActivaBNAConReintentos(screenshot = false, html = false) {
    let browser;

    return withRetry(
        async (attempt) => {
            try {
                logger.info(`Intento ${attempt + 1} de extracción de tasas del BNA`);

                // Siempre capturar evidencias en reintentos
                const captureScreenshot = screenshot || attempt > 0;
                const captureHTML = html || attempt > 0;

                // Lanzar navegador
                browser = await puppeteer.launch({
                    headless: "new",
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
                    defaultViewport: { width: 1366, height: 768 }
                });

                const page = await browser.newPage();
                page.setDefaultNavigationTimeout(60000);

                // Navegar a la página de información financiera del BNA
                const url = 'https://www.bna.com.ar/home/informacionalusuariofinanciero';
                logger.info(`Navegando a: ${url} (intento ${attempt + 1})`);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

                // Guardar capturas con nombre único que incluya el número de intento
                if (captureScreenshot) {
                    await guardarCaptura(page, `bna-info-financiera-intento-${attempt + 1}`);
                }

                if (captureHTML) {
                    await guardarHTML(page, `bna-info-financiera-intento-${attempt + 1}`);
                }

                // Resto del código de extracción igual que en la función original
                const resultado = await page.evaluate(() => {
                    try {
                        // Buscar el título que contiene la fecha de vigencia
                        const tituloTasa = document.querySelector('.plazoTable h3');
                        if (!tituloTasa) {
                            return { error: 'No se encontró el título de la tasa activa' };
                        }

                        // Extraer la fecha de vigencia usando expresión regular
                        const textoTitulo = tituloTasa.textContent;
                        const regexFecha = /vigente desde el (\d{1,2}\/\d{1,2}\/\d{4})/;
                        const coincidenciaFecha = textoTitulo.match(regexFecha);

                        if (!coincidenciaFecha || !coincidenciaFecha[1]) {
                            return {
                                error: 'No se pudo extraer la fecha de vigencia',
                                textoEncontrado: textoTitulo
                            };
                        }

                        const fechaVigencia = coincidenciaFecha[1]; // Formato DD/MM/YYYY

                        // Buscar la lista que contiene las tasas
                        const listaTasas = tituloTasa.nextElementSibling;
                        if (!listaTasas || listaTasas.tagName !== 'UL') {
                            return {
                                error: 'No se encontró la lista de tasas',
                                fechaVigencia
                            };
                        }

                        // Buscar el ítem que contiene la TNA
                        const items = Array.from(listaTasas.querySelectorAll('li'));
                        const itemTNA = items.find(item =>
                            item.textContent.includes('Tasa Nominal Anual Vencida con capitalización cada 30 días')
                        );

                        if (!itemTNA) {
                            return {
                                error: 'No se encontró el ítem con la TNA',
                                fechaVigencia,
                                textoItems: items.map(item => item.textContent)
                            };
                        }

                        // Extraer el valor de la TNA usando expresión regular
                        const textoTNA = itemTNA.textContent;
                        const regexTNA = /T\.N\.A\.\s*\(\d+\s*días\)\s*=\s*(\d+[.,]\d+)%/;
                        const coincidenciaTNA = textoTNA.match(regexTNA);

                        if (!coincidenciaTNA || !coincidenciaTNA[1]) {
                            return {
                                error: 'No se pudo extraer el valor de la TNA',
                                fechaVigencia,
                                textoTNA
                            };
                        }

                        // Obtener valor numérico y normalizar
                        const valorTNA = coincidenciaTNA[1].replace(',', '.');

                        // Extraer también TEM y TEA para información completa
                        const itemTEM = items.find(item => item.textContent.includes('Tasa Efectiva Mensual Vencida'));
                        const itemTEA = items.find(item => item.textContent.includes('Tasa Efectiva Anual Vencida'));

                        let valorTEM = null;
                        let valorTEA = null;

                        if (itemTEM) {
                            const regexTEM = /T\.E\.M\.\s*\(\d+\s*días\)\s*=\s*(\d+[.,]\d+)%/;
                            const coincidenciaTEM = itemTEM.textContent.match(regexTEM);
                            if (coincidenciaTEM && coincidenciaTEM[1]) {
                                valorTEM = coincidenciaTEM[1].replace(',', '.');
                            }
                        }

                        if (itemTEA) {
                            const regexTEA = /T\.E\.A\.\s*=\s*(\d+[.,]\d+)%/;
                            const coincidenciaTEA = itemTEA.textContent.match(regexTEA);
                            if (coincidenciaTEA && coincidenciaTEA[1]) {
                                valorTEA = coincidenciaTEA[1].replace(',', '.');
                            }
                        }

                        // Retornar resultado completo
                        return {
                            fechaVigencia,
                            tna: parseFloat(valorTNA),
                            tem: valorTEM ? parseFloat(valorTEM) : null,
                            tea: valorTEA ? parseFloat(valorTEA) : null,
                            textoOriginal: {
                                titulo: textoTitulo,
                                tna: textoTNA,
                                tem: itemTEM ? itemTEM.textContent : null,
                                tea: itemTEA ? itemTEA.textContent : null
                            }
                        };
                    } catch (error) {
                        return {
                            error: `Error en la extracción: ${error.message}`
                        };
                    }
                });

                logger.info(`Resultado de la extracción (intento ${attempt + 1}):`, resultado);

                // Procesar la fecha para convertirla a formato ISO
                if (resultado.fechaVigencia) {
                    try {
                        // Convertir de formato DD/MM/YYYY a formato ISO
                        const [dia, mes, anio] = resultado.fechaVigencia.split('/');
                        const fechaISO = new Date(Date.UTC(parseInt(anio), parseInt(mes) - 1, parseInt(dia), 0, 0, 0));

                        resultado.fechaVigenciaISO = fechaISO.toISOString();
                        resultado.fechaFormateada = fechaISO.toISOString().split('T')[0];
                    } catch (error) {
                        logger.error(`Error al convertir fecha: ${error.message}`);
                        resultado.errorFecha = error.message;
                    }
                }

                // Guardar resultado en archivo JSON para referencia
                await fs.writeFile(
                    path.join(__dirname, `tasa-activa-bna-intento-${attempt + 1}.json`),
                    JSON.stringify(resultado, null, 2)
                );

                if (resultado.error) {
                    throw resultado; // Lanzar error para que se active el mecanismo de reintento
                }

                return resultado;
            } finally {
                if (browser) {
                    await browser.close();
                    logger.info(`Navegador cerrado (intento ${attempt + 1})`);
                }
            }
        },
        {
            maxRetries: 5,
            initialDelay: 2000,
            maxDelay: 60000,
            factor: 2,
            shouldRetry: (error) => {
                // Determinar si el error es recuperable
                const nonRetryableErrors = [
                    'No se encontró el título de la tasa activa',
                    'No se encontró la lista de tasas',
                    'No se encontró el ítem con la TNA'
                ];

                // Si es un error de estructura de la página, no reintentar
                if (error.error && nonRetryableErrors.some(msg => error.error.includes(msg))) {
                    logger.warn(`Error no recuperable, no se reintentará: ${error.error}`);
                    return false;
                }

                // Para otros errores (conexión, timeout, etc.), reintentar
                return true;
            },
            onRetry: (error, attempt) => {
                logger.warn(`Error en intento ${attempt}, reintentando extracción: ${error.message || JSON.stringify(error)}`);
            }
        }
    );
}



/**
 * Guarda una captura de pantalla con timestamp
 */
async function guardarCaptura(page, prefix) {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const screenshotPath = path.join(__dirname, `${prefix}-${timestamp}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        logger.info(`Captura guardada: ${prefix}-${timestamp}.png`);
    } catch (error) {
        logger.error(`Error al guardar captura: ${error.message}`);
    }
}

/**
 * Guarda el HTML de la página
 */
async function guardarHTML(page, filename) {
    try {
        const html = await page.content();
        const htmlPath = path.join(__dirname, `${filename}.html`);
        await fs.writeFile(htmlPath, html);
        logger.info(`HTML guardado en ${filename}.html`);
    } catch (error) {
        logger.error(`Error al guardar HTML: ${error.message}`);
    }
}

/**
 * Función principal mejorada con reintentos
 */
async function actualizarTasaActivaBNAConReintentos() {
    try {
        logger.info('Iniciando actualización de tasa activa BNA con reintentos');

        // Extraer datos de la página web con reintentos
        const datosTasaActiva = await extraerTasaActivaBNAConReintentos();

        if (datosTasaActiva.error) {
            throw new Error(`Error en la extracción: ${datosTasaActiva.error}`);
        }

        if (!datosTasaActiva.tna || !datosTasaActiva.fechaVigenciaISO) {
            throw new Error('No se pudo extraer la tasa o la fecha de vigencia');
        }

        // Resto del código igual que en la función original
        // Preparar objeto de respuesta
        const resultadoScraping = {
            status: 'success',
            message: 'Tasa Activa BNA actualizada correctamente',
            data: datosTasaActiva
        };
        console.log("Result", resultadoScraping)
        // Guardar en la base de datos
        const resultadoGuardado = await guardarTasaActivaBNA(resultadoScraping);

        logger.info(`Tasa Activa BNA extraída: ${datosTasaActiva.tna}% (vigente desde ${datosTasaActiva.fechaFormateada})`);

        if (resultadoGuardado.actualizado) {
            logger.info(`Tasa Activa BNA guardada en BD correctamente con valor: ${resultadoGuardado.valor}`);
        } else {
            logger.warn(`No se guardó la tasa en la BD: ${resultadoGuardado.mensaje}`);
        }

        return {
            status: 'success',
            message: 'Tasa Activa BNA actualizada correctamente',
            data: datosTasaActiva,
            resultadoGuardado
        };

    } catch (error) {
        logger.error(`Error en actualizarTasaActivaBNAConReintentos: ${error.message}`);
        return {
            status: 'error',
            message: error.message
        };
    }
}


module.exports = {
    extraerTasaActivaBNAConReintentos,
    actualizarTasaActivaBNAConReintentos,
};