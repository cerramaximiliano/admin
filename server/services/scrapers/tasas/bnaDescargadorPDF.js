const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');
const moment = require('moment');
const https = require('https');
const Tasas = require('../../../models/tasas');
const TasasConfig = require('../../../models/tasasConfig');
const { getPuppeteerConfig } = require('../../../config/puppeteer');


/**
 * Registra un error en el modelo TasasConfig
 * 
 * @param {String} tipoTasa - Tipo de tasa afectada
 * @param {String} taskId - Identificador de la tarea
 * @param {String} mensaje - Mensaje de error
 * @param {String|Object} detalleError - Detalles adicionales del error
 * @param {String} codigo - Código de error opcional
 * @returns {Promise<boolean>} - Resultado del registro
 */
async function registrarErrorTasa(tipoTasa, taskId, mensaje, detalleError = '', codigo = '') {
    try {
        if (!tipoTasa) {
            logger.warn(`No se puede registrar error: tipoTasa no proporcionado`);
            return false;
        }
        
        const config = await TasasConfig.findOne({ tipoTasa });
        if (!config) {
            logger.warn(`No se puede registrar error: configuración no encontrada para ${tipoTasa}`);
            return false;
        }
        
        await config.registrarError(taskId, mensaje, detalleError, codigo);
        return true;
    } catch (error) {
        logger.error(`Error al registrar error en TasasConfig: ${error.message}`);
        return false;
    }
}


/**
 * Descarga el PDF de tasas pasivas del BNA
 * @param {Object} options - Opciones de configuración
 * @param {Boolean} options.capturarEvidencia - Si se deben capturar pantallazos y HTML
 * @param {String} options.directorioPdf - Directorio donde guardar el PDF
 * @returns {Promise<Object>} - Resultado de la descarga
 */

const configPuppeteer = getPuppeteerConfig();

async function descargarPdfTasasPasivas(options = {}) {
    const rootDir = path.resolve(__dirname, '../../../../')
    const saveDir = path.join(rootDir, 'server', 'files');
    const {
        capturarEvidencia = true,
        directorioPdf = saveDir,
    } = options;

    let browser;
    let pdfPath = null;
    let pdfDetected = false;
    let pdfUrl = null;

    try {
        logger.info('Iniciando descarga del PDF de tasas pasivas del BNA');

        // Crear directorio para PDFs si no existe
        await fs.mkdir(directorioPdf, { recursive: true });

        // Lanzar navegador
        browser = await puppeteer.launch({
            headless: configPuppeteer.headless,
            args: configPuppeteer.args,
            defaultViewport: configPuppeteer.defaultViewport,
            executablePath: configPuppeteer.executablePath,
        });

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);

        // Navegar a la página de información financiera del BNA
        const url = 'https://www.bna.com.ar/home/informacionalusuariofinanciero';
        logger.info(`Navegando a: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Capturar evidencia si está habilitado
        if (capturarEvidencia) {
            await guardarCaptura(page, 'bna-pagina-inicial');
            await guardarHTML(page, 'bna-pagina-inicial');
        }

        // Buscar el enlace de tasas pasivas
        logger.info('Buscando enlace de tasas pasivas');

        const linkExists = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a.link'));
            const tasasPasivasLink = links.find(link =>
                link.textContent.includes('Tasas de Operaciones Pasivas') &&
                link.getAttribute('href').includes('.pdf')
            );
            return tasasPasivasLink ? tasasPasivasLink.getAttribute('href') : null;
        });

        if (!linkExists) {
            throw new Error('No se encontró el enlace al PDF de tasas pasivas');
        }

        logger.info(`Enlace del PDF encontrado: ${linkExists}`);

        // Construir la URL completa del PDF
        pdfUrl = new URL(linkExists, 'https://www.bna.com.ar').href;
        logger.info(`URL completa del PDF: ${pdfUrl}`);

        // Descargar el PDF utilizando https en lugar de a través del navegador
        const pdfBuffer = await downloadPdf(pdfUrl);

        // Crear nombre de archivo con fecha
        const fechaActual = moment().format('YYYY-MM-DD');
        const nombreArchivoPdf = `tasas_pasivas_${fechaActual}.pdf`;
        pdfPath = path.join(directorioPdf, nombreArchivoPdf);

        // Guardar el PDF
        await fs.writeFile(pdfPath, pdfBuffer);

        logger.info(`PDF descargado y guardado en: ${pdfPath}`);
        logger.info(`Nombre del archivo PDF: ${nombreArchivoPdf}`);

        // Extraer la fecha del nombre del archivo PDF para tener la fecha de actualización
        const nombreArchivo = path.basename(linkExists);
        const matchFecha = nombreArchivo.match(/tasas_ope_(\d+)\.pdf/);
        let fechaArchivo = null;

        if (matchFecha && matchFecha[1]) {
            // Intentar determinar si el número es una fecha en formato DDMM o algún otro formato
            const numeroArchivo = matchFecha[1];
            // Guardamos el número como referencia
            fechaArchivo = numeroArchivo;
        }

        // Crear el resultado
        const result = {
            status: 'success',
            message: 'PDF de tasas pasivas descargado correctamente',
            data: {
                pdfPath,
                pdfUrl,
                fechaDescarga: new Date().toISOString(),
                nombreArchivo: path.basename(linkExists),
                nombreArchivoGuardado: path.basename(pdfPath),
                rutaCompleta: pdfPath,
                directorioGuardado: directorioPdf,
                referenciaArchivo: fechaArchivo
            }
        };

        // Asegurar que todos los logs anteriores se han procesado
        await new Promise(resolve => setTimeout(resolve, 500));

        return result;

    } catch (error) {
        logger.error(`Error al descargar PDF de tasas pasivas: ${error.message}`);

        // Capturar evidencia del error si está habilitado
        if (capturarEvidencia && browser) {
            try {
                const page = (await browser.pages())[0];
                if (page) {
                    await guardarCaptura(page, 'bna-error-tasas-pasivas');
                    await guardarHTML(page, 'bna-error-tasas-pasivas');
                }
            } catch (captureError) {
                logger.error(`Error al capturar evidencia del error: ${captureError.message}`);
            }
        }

        // Asegurar que todos los logs de error se han procesado
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            status: 'error',
            message: `Error al descargar PDF: ${error.message}`
        };
    } finally {
        if (browser) {
            await browser.close();
            logger.info('Navegador cerrado');

            // Asegurar que el log de cierre se ha procesado
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

/**
 * Descarga un PDF mediante HTTPS
 * @param {String} url - URL del PDF
 * @returns {Promise<Buffer>} - Buffer con el contenido del PDF
 */
function downloadPdf(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Verificar que la respuesta sea exitosa
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP Error: ${response.statusCode}`));
                return;
            }

            // Verificar que la respuesta sea un PDF
            const contentType = response.headers['content-type'];
            if (contentType && !contentType.includes('application/pdf')) {
                reject(new Error(`Content-Type incorrecto: ${contentType}`));
                return;
            }

            // Recopilar los datos
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', (err) => reject(err));
        }).on('error', (err) => reject(err));
    });
}

/**
 * Implementa el mismo sistema de reintentos con backoff exponencial para la descarga del PDF
 */
async function descargarPdfTasasPasivasConReintentos(options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 2000,
        maxDelay = 30000,
        factor = 2,
        ...descargarOptions
    } = options;

    let attempt = 0;
    let delay = initialDelay;

    while (true) {
        try {
            logger.info(`Intento ${attempt + 1}/${maxRetries} de descarga del PDF`);

            // Asegurar que el log del intento se ha procesado
            await new Promise(resolve => setTimeout(resolve, 200));

            const result = await descargarPdfTasasPasivas({
                ...descargarOptions,
                capturarEvidencia: descargarOptions.capturarEvidencia || attempt > 0
            });

            return result;

        } catch (error) {
            attempt++;

            // Si alcanzamos el número máximo de reintentos, lanzar el error
            if (attempt >= maxRetries) {
                logger.error(`Se agotaron los reintentos (${maxRetries}) para descargar el PDF`);

                // Asegurar que el log de error se ha procesado
                await new Promise(resolve => setTimeout(resolve, 500));

                return {
                    status: 'error',
                    message: `Fallaron todos los intentos: ${error.message}`,
                    attempts: attempt
                };
            }

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
 * Guarda una captura de pantalla con timestamp
 */
async function guardarCaptura(page, prefix) {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const rootDir = path.resolve(__dirname, '../../../../')
        const saveDir = path.join(rootDir, 'server', 'files');
        const screenshotPath = path.join(saveDir, `${prefix}-${timestamp}.png`);
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
        const rootDir = path.resolve(__dirname, '../../../../')
        const saveDir = path.join(rootDir, 'server', 'files');
        const htmlPath = path.join(saveDir, `${filename}.html`);
        await fs.writeFile(htmlPath, html);
        logger.info(`HTML guardado en ${filename}.html`);
    } catch (error) {
        logger.error(`Error al guardar HTML: ${error.message}`);
    }
}

module.exports = {
    descargarPdfTasasPasivas,
    descargarPdfTasasPasivasConReintentos
};