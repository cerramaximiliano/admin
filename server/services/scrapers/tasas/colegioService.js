const puppeteer = require('puppeteer');
const moment = require("moment");
const logger = require('../../../utils/logger');
const Tasas = require('../../../models/tasas');
const { actualizarFechasFaltantes, verificarFechasFaltantes } = require('../../../controllers/tasasController');
const { obtenerFechaActualISO } = require('../../../utils/format');
require('dotenv').config();

/**
 * Clase para realizar scraping del sitio tasas.cpacf.org.ar
 */
class CPACFScraper {
    constructor(options = {}) {
        this.baseUrl = 'https://tasas.cpacf.org.ar/newLogin';
        this.credentials = {
            dni: process.env.CPACF_DNI || options.dni,
            tomo: process.env.CPACF_TOMO || options.tomo,
            folio: process.env.CPACF_FOLIO || options.folio
        };
        this.browser = null;
        this.page = null;
        this.loggedIn = false;
        this.calculatorFormInfo = null;
    }

    /**
     * Inicializa el navegador y la página
     */
    async initialize() {
        try {
            logger.info('Iniciando navegador...');
            this.browser = await puppeteer.launch({
                headless: false, // Usando el nuevo modo headless
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                defaultViewport: { width: 1366, height: 768 }
            });

            this.page = await this.browser.newPage();

            // Configurar timeout
            await this.page.setDefaultNavigationTimeout(60000);

            // Agregar listeners para errores de la página
            this.page.on('error', err => {
                logger.error('Error en la página:', err);
            });

            this.page.on('console', msg => {
                if (msg.type() === 'error' || msg.type() === 'warning') {
                    logger.info(`${msg.type()}: ${msg.text()}`);
                }
            });

            return true;
        } catch (error) {
            logger.error('Error al inicializar el scraper:', error);
            await this.close();
            throw error;
        }
    }

    /**
     * Realiza el login en el sitio
     * @returns {Promise<boolean>} - Si el login fue exitoso
     */
    async login() {
        try {
            if (!this.browser || !this.page) {
                await this.initialize();
            }

            logger.info('Navegando a la página de login...');
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });

            // Verificar si los campos de login existen
            const formExists = await this.page.evaluate(() => {
                return document.querySelector('input[name="dni"]') !== null;
            });

            if (!formExists) {
                logger.error('No se encontró el formulario de login');
                throw new Error('Formulario de login no encontrado');
            }

            // Verificar credenciales
            if (!this.credentials.dni || !this.credentials.tomo || !this.credentials.folio) {
                throw new Error('Faltan credenciales para el login (DNI, TOMO o FOLIO)');
            }

            logger.info('Completando el formulario de login...');

            // Completar formulario
            await this.page.type('input[name="dni"]', this.credentials.dni);
            await this.page.type('input[name="tomo"]', this.credentials.tomo);
            await this.page.type('input[name="folio"]', this.credentials.folio);

            // Hacer click en el botón de siguiente
            logger.info('Haciendo click en SIGUIENTE...');
            await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const nextButton = links.find(link => link.textContent.includes('SIGUIENTE'));
                if (nextButton) nextButton.click();
                else document.forms[0].submit();
            });

            // Esperar a que la navegación termine
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

            // Verificar si el login fue exitoso (comprobando que ya no estamos en la página de login)
            const currentUrl = this.page.url();
            this.loggedIn = !currentUrl.includes('newLogin');

            if (!this.loggedIn) {
                const errorMessage = await this.page.evaluate(() => {
                    const errorElement = document.querySelector('td[style*="color: red;"]');
                    return errorElement ? errorElement.textContent.trim() : 'Login fallido';
                });

                throw new Error(`Error de login: ${errorMessage}`);
            }

            logger.info('Login exitoso');

            // Analizar la estructura de la página después del login
            await this.analyzePageStructure();

            return true;
        } catch (error) {
            logger.error('Error durante el login:', error);
            throw error;
        }
    }

    /**
     * Analiza la estructura de la página después del login
     * para identificar las opciones de navegación disponibles
     */
    async analyzePageStructure() {
        try {
            logger.info('Analizando la estructura de la página después del login...');

            // Extraer los enlaces disponibles
            const links = await this.page.evaluate(() => {
                const allLinks = Array.from(document.querySelectorAll('a'));
                return allLinks.map(link => ({
                    text: link.textContent.trim(),
                    href: link.href,
                    onclick: link.getAttribute('onclick')
                })).filter(link => link.text);
            });

            // Extraer los formularios disponibles
            const forms = await this.page.evaluate(() => {
                const allForms = Array.from(document.querySelectorAll('form'));
                return allForms.map(form => ({
                    id: form.id,
                    action: form.action,
                    method: form.method,
                    inputs: Array.from(form.querySelectorAll('input')).map(input => ({
                        name: input.name,
                        type: input.type,
                        id: input.id
                    }))
                }));
            });

            // Extraer las opciones de tasas si están disponibles
            const rateOptions = await this.page.evaluate(() => {
                const rateSelect = document.querySelector('select[name="rate"]');
                if (!rateSelect) return [];

                return Array.from(rateSelect.options).map(option => ({
                    value: option.value,
                    text: option.textContent.trim()
                }));
            });

            // Guarda esta información para uso posterior
            this.pageStructure = { links, forms, rateOptions };

            logger.info(`Encontrados ${links.length} enlaces y ${forms.length} formularios`);
            if (rateOptions && rateOptions.length) {
                logger.info(`Encontradas ${rateOptions.length} opciones de tasas disponibles`);
            }

            return this.pageStructure;
        } catch (error) {
            logger.error('Error al analizar la estructura de la página:', error);
            return null;
        }
    }

    /**
     * Navega a una página específica del sitio después de hacer login
     * @param {string} path - Ruta a la que navegar
     */
    async navigateTo(path) {
        if (!this.loggedIn) {
            await this.login();
        }

        const url = new URL(path, 'https://tasas.cpacf.org.ar/').href;
        logger.info(`Navegando a: ${url}`);

        try {
            await this.page.goto(url, { waitUntil: 'networkidle2' });
            // Verificar si la página existe
            const notFound = await this.page.evaluate(() => {
                return document.title.includes('404') ||
                    document.body.textContent.includes('404 Not Found') ||
                    document.body.textContent.includes('Página no encontrada');
            });

            if (notFound) {
                logger.warn(`La página ${url} no existe (404). Verifique la estructura del sitio.`);
            }
        } catch (error) {
            logger.error(`Error al navegar a ${url}: ${error.message}`);
            throw error;
        }

        return this.page;
    }

    /**
     * Selecciona una tasa específica y navega al formulario de cálculo
     * @param {string|number} rateId - ID de la tasa a seleccionar
     * @returns {Promise<boolean>} - Si la selección fue exitosa
     */
    async selectRate(rateId) {
        if (!this.loggedIn) {
            await this.login();
        }

        try {
            logger.info(`Seleccionando tasa con ID: ${rateId}`);

            // Verificar si estamos en la página principal con el selector de tasas
            const rateSelectExists = await this.page.evaluate(() => {
                return document.querySelector('select[name="rate"]') !== null;
            });

            if (!rateSelectExists) {
                logger.info('No estamos en la página con el selector de tasas, navegando a la página principal...');
                await this.navigateTo('/home');
            }

            // Seleccionar la tasa
            await this.page.select('select[name="rate"]', rateId.toString());

            // Hacer click en el botón SIGUIENTE
            logger.info('Haciendo click en SIGUIENTE para confirmar la selección de tasa...');
            await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const nextButton = links.find(link => link.textContent.includes('SIGUIENTE'));
                if (nextButton) nextButton.click();
                else document.forms[0].submit();
            });

            // Esperar a que la navegación termine
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

            // Verificar que estamos en la página de cálculo con el formulario específico
            const isCalculatorPage = await this.page.evaluate(() => {
                return document.querySelector('form[id="dataForm"]') !== null &&
                    document.querySelector('input[name="capital_0"]') !== null &&
                    document.querySelector('input[name="date_from_0"]') !== null &&
                    document.querySelector('input[name="date_to"]') !== null;
            });

            if (!isCalculatorPage) {
                logger.warn('No se pudo acceder a la página de cálculo después de seleccionar la tasa');
                return false;
            }

            // Extraer información adicional sobre el formulario y restricciones
            const formInfo = await this.page.evaluate(() => {
                const minDateFromElem = document.querySelector('#min_date_from');
                const minDateFrom = minDateFromElem ? minDateFromElem.value : '';

                const maxDateToElem = document.querySelector('#max_date_to');
                const maxDateTo = maxDateToElem ? maxDateToElem.value : '';

                const rateIdElem = document.querySelector('input[name="rate_id"]');
                const rateId = rateIdElem ? rateIdElem.value : '';

                // Verificar si hay opciones de capitalización
                const capitalizationSelect = document.querySelector('select[name="capitalization"]');
                let capitalizationOptions = [];

                if (capitalizationSelect) {
                    capitalizationOptions = Array.from(
                        capitalizationSelect.options
                    ).map(option => ({
                        value: option.value,
                        text: option.textContent.trim(),
                        selected: option.selected
                    }));
                }

                // Verificar si requiere fecha de primera capitalización
                const requiresFirstCapitalizationDate =
                    document.querySelector('input[name="date_first_capitalization"]') !== null;

                return {
                    minDateFrom,
                    maxDateTo,
                    rateId,
                    capitalizationOptions,
                    requiresFirstCapitalizationDate,
                    hasCapitalizationSelect: capitalizationSelect !== null
                };
            });

            // Guardar la información del formulario para uso posterior
            this.calculatorFormInfo = formInfo;

            logger.info('Tasa seleccionada correctamente, en página de cálculo');
            logger.info(`Opciones de capitalización disponibles: ${formInfo.hasCapitalizationSelect ? 'Sí' : 'No'}`);

            return true;
        } catch (error) {
            logger.error(`Error al seleccionar la tasa ${rateId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Guarda los resultados del cálculo en un archivo JSON
     * @param {Object} resultados - Resultados del cálculo
     * @param {string} filePath - Ruta del archivo donde guardar los resultados
     * @returns {Promise<boolean>} - Si se guardó correctamente
     */
    async saveResultsToJSON(resultados, filePath = './server/services/scrapers/tasas/resultados_calculo.json') {
        try {
            // Requerir el módulo fs
            const fs = require('fs');

            // Guardar resultados en el archivo JSON
            fs.writeFileSync(filePath, JSON.stringify(resultados, null, 2));

            logger.info(`Resultados guardados exitosamente en ${filePath}`);
            return true;
        } catch (error) {
            logger.error(`Error al guardar los resultados en JSON: ${error.message}`);
            return false;
        }
    }


    /**
     * Configura los parámetros de cálculo y realiza el cálculo
     * @param {Object} params - Parámetros para el cálculo
     * @param {string|number} params.capital - Capital inicial
     * @param {string} params.date_from_0 - Fecha inicial en formato DD/MM/YYYY
     * @param {string} params.date_to - Fecha final en formato DD/MM/YYYY
     * @param {string} params.capitalization - Tipo de capitalización (ej: "365" para anual)
     * @param {string} params.date_first_capitalization - Fecha de la primera capitalización en formato DD/MM/YYYY
     * @returns {Promise<Object>} - Resultado del cálculo
     */
    async calcular(params) {
        try {
            logger.info('Configurando parámetros de cálculo:', params);

            // Limpiar los campos antes de completarlos para evitar problemas
            await this.page.evaluate(() => {
                const capitalInput = document.querySelector('input[name="capital_0"]');
                if (capitalInput) capitalInput.value = '';

                const dateFromInput = document.querySelector('input[name="date_from_0"]');
                if (dateFromInput) dateFromInput.value = '';

                const dateToInput = document.querySelector('input[name="date_to"]');
                if (dateToInput) dateToInput.value = '';

                const dateFirstCapitalizationInput = document.querySelector('input[name="date_first_capitalization"]');
                if (dateFirstCapitalizationInput) dateFirstCapitalizationInput.value = '';
            });

            // Completar el formulario de cálculo con los nombres EXACTOS de los campos
            if (params.capital) {
                await this.page.type('input[name="capital_0"]', params.capital.toString());
            }

            if (params.date_from_0) {
                await this.page.type('input[name="date_from_0"]', params.date_from_0);
            }

            if (params.date_to) {
                await this.page.type('input[name="date_to"]', params.date_to);
            }

            // Configurar la capitalización si está disponible
            if (params.capitalization) {
                // Verificar primero si el elemento existe antes de intentar seleccionarlo
                const capitalizationExists = await this.page.evaluate(() => {
                    return document.querySelector('select[name="capitalization"]') !== null;
                });

                if (capitalizationExists) {
                    await this.page.select('select[name="capitalization"]', params.capitalization);
                } else {
                    //console.log('Advertencia: No se encontró el selector de capitalización en la página');
                }
            }

            // Configurar la fecha de primera capitalización si está disponible
            if (params.date_first_capitalization) {
                const dateFirstCapExists = await this.page.evaluate(() => {
                    return document.querySelector('input[name="date_first_capitalization"]') !== null;
                });

                if (dateFirstCapExists) {
                    await this.page.type('input[name="date_first_capitalization"]', params.date_first_capitalization);
                } else {
                    //console.log('Advertencia: No se encontró el campo de fecha de primera capitalización');
                }
            }

            // Hacer click en el botón CALCULAR o enviar el formulario
            logger.info('Enviando formulario para calcular...');
            await this.page.evaluate(() => {
                // Primero buscar un botón o enlace específico con texto CALCULAR
                const calcularButton = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'))
                    .find(el => el.textContent.includes('CALCULAR'));

                if (calcularButton) {
                    //console.log('Encontrado botón CALCULAR, haciendo click...');
                    calcularButton.click();
                } else {
                    // Si no hay botón específico, enviar el formulario directamente
                    //console.log('No se encontró botón CALCULAR, enviando formulario dataForm...');
                    document.getElementById('dataForm').submit();
                }
            });

            // Esperar a que la página de resultados cargue
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

            // Extraer los resultados generales
            const resultados = await this.extractData(() => {
                // Esta función debe adaptarse según la estructura de la página de resultados
                const resultTable = document.querySelector('table.resultados') ||
                    document.querySelector('table.table') ||
                    document.querySelector('table');

                if (!resultTable) {
                    // Si no se encuentra tabla, intentar extraer cualquier información relevante
                    const pageContent = document.body.textContent;
                    if (pageContent.includes('Error') || pageContent.includes('error')) {
                        return {
                            error: 'Error en la página de resultados',
                            pageContent: pageContent.slice(0, 500) // Primeros 500 caracteres para diagnóstico
                        };
                    }
                    return { error: 'No se encontró la tabla de resultados' };
                }

                const rows = Array.from(resultTable.querySelectorAll('tr'));
                const result = {};

                rows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td, th'));
                    if (cells.length >= 2) {
                        const key = cells[0].textContent.trim().replace(/:/g, '');
                        const value = cells[1].textContent.trim();
                        result[key] = value;
                    }
                });

                // También intentamos extraer el resultado final si existe
                const resultadoFinal = document.querySelector('.resultado-final');
                if (resultadoFinal) {
                    result.resultadoFinal = resultadoFinal.textContent.trim();
                }

                return result;
            });

            //console.log('Cálculo completado.');

            // Primero intentar usar el extractor específico para CPACF
            try {
                //console.log('Intentando extraer detalles con el extractor específico CPACF...');
                const detallesCPACF = await this.extractCPACFDetalle();

                if (Array.isArray(detallesCPACF) && detallesCPACF.length > 0) {
                    resultados.detalles = detallesCPACF;
                    //console.log(`Extracción exitosa: ${detallesCPACF.length} filas extraídas con el extractor específico`);
                    return resultados;
                }
            } catch (extractorSpecificError) {
                logger.warn('Error en el extractor específico:', extractorSpecificError);
            }

            // Si el extractor específico falló, usar el extractor genérico
            logger.info('Usando extractor genérico como fallback...');
            const detallesData = await this.extractDetallesTabla();

            if (Array.isArray(detallesData) && detallesData.length > 0) {
                resultados.detalles = detallesData;
                logger.info(`Se extrajeron ${detallesData.length} filas de detalles con el extractor genérico`);
            } else {
                logger.warn('No se pudieron obtener los detalles con ningún extractor');
            }

            return resultados;
        } catch (error) {
            logger.error(`Error al realizar el cálculo: ${error.message}`);
            throw error;
        }
    }

    /**
     * Obtiene la lista de todas las tasas disponibles
     * @returns {Promise<Array>} - Lista de tasas
     */
    async getAvailableRates() {
        if (!this.loggedIn) {
            await this.login();
        }

        try {
            // Verificar si estamos en la página principal con el selector de tasas
            const rateSelectExists = await this.page.evaluate(() => {
                return document.querySelector('select[name="rate"]') !== null;
            });

            if (!rateSelectExists) {
                //console.log('No estamos en la página con el selector de tasas, navegando a la página principal...');
                await this.navigateTo('/home');
            }

            const rates = await this.page.evaluate(() => {
                const select = document.querySelector('select[name="rate"]');
                if (!select) return [];

                return Array.from(select.options)
                    .filter(option => option.value !== '-1') // Excluir la opción "Seleccione la tasa"
                    .map(option => ({
                        id: option.value,
                        name: option.textContent.trim()
                    }));
            });

            //console.log(`Se encontraron ${rates.length} tasas disponibles`);
            return rates;
        } catch (error) {
            //console.error('Error al obtener las tasas disponibles:', error);
            throw error;
        }
    }

    /**
     * Extrae datos de la página actual
     * @param {Function} extractionFn - Función para extraer datos
     * @returns {Promise<any>} - Datos extraídos
     */
    async extractData(extractionFn) {
        if (!this.loggedIn) {
            await this.login();
        }

        return await this.page.evaluate(extractionFn);
    }

    /**
     * Toma una captura de pantalla de la página actual
     * @param {string} path - Ruta donde guardar la captura
     */
    async screenshot(path) {
        if (!this.page) {
            throw new Error('El navegador no está inicializado');
        }
        await this.page.screenshot({ path });
    }

    /**
     * Extrae detalles de la tabla de resultados con manejo para diferentes estructuras
     * @returns {Array} - Array de objetos con la información detallada
     */
    async extractDetallesTabla() {
        return await this.extractData(() => {
            // Buscar todas las tablas que podrían contener los detalles
            const tables = Array.from(document.querySelectorAll('table'));

            for (const table of tables) {
                // Obtener los encabezados de la tabla
                const headerRow = table.querySelector('tr');
                if (!headerRow) continue;

                const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => {
                    // Usar textContent para obtener todo el texto, incluyendo elementos anidados
                    return cell.textContent.trim().toLowerCase();
                });

                // Verificar si es una tabla de detalles buscando palabras clave en los encabezados
                const isDetallesTable = headers.some(h => h.includes('desde') || h.includes('from')) &&
                    headers.some(h => h.includes('hasta') || h.includes('to')) &&
                    (headers.some(h => h.includes('día') || h.includes('days') || h.includes('dias')) ||
                        headers.some(h => h.includes('interés') || h.includes('interest')));

                if (!isDetallesTable) continue;

                logger.info('Tabla de detalles encontrada. Encabezados:', headers);

                // Identificar índices de columnas importantes basados en los encabezados
                const indexMap = {
                    fechaDesde: headers.findIndex(h => h.includes('desde') || h.includes('from')),
                    fechaHasta: headers.findIndex(h => h.includes('hasta') || h.includes('to')),
                    dias: headers.findIndex(h => h.includes('día') || h.includes('days') || h.includes('dias')),
                    capital: headers.findIndex(h => h.includes('capital') || h.includes('monto')),
                    porcentajeAnual: headers.findIndex(h =>
                        (h.includes('interés') || h.includes('interest')) &&
                        (h.includes('anual') || h.includes('annual'))),
                    porcentajeDiario: headers.findIndex(h =>
                        (h.includes('interés') || h.includes('interest')) &&
                        (h.includes('diario') || h.includes('daily'))),
                    montoIntereses: headers.findIndex(h =>
                        h.includes('monto') && h.includes('interés') ||
                        h.includes('amount') && h.includes('interest'))
                };

                logger.info('Mapeo de índices de columnas:', indexMap);

                // Obtener todas las filas de datos (excluyendo la fila de encabezado)
                const dataRows = Array.from(table.querySelectorAll('tr')).slice(1);
                const detalles = [];

                dataRows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td'));

                    // Verificar que hay suficientes celdas para procesar
                    if (cells.length < 3) return;

                    // Crear objeto de detalle con propiedades dinámicas basadas en los índices encontrados
                    const detalle = {};

                    // Asignar valores basados en los índices mapeados
                    if (indexMap.fechaDesde >= 0 && indexMap.fechaDesde < cells.length) {
                        detalle.fecha_desde = cells[indexMap.fechaDesde].textContent.trim();
                    }

                    if (indexMap.fechaHasta >= 0 && indexMap.fechaHasta < cells.length) {
                        detalle.fecha_hasta = cells[indexMap.fechaHasta].textContent.trim();
                    }

                    if (indexMap.dias >= 0 && indexMap.dias < cells.length) {
                        detalle.dias = parseInt(cells[indexMap.dias].textContent.trim().replace(/[^\d]/g, ''), 10) || 0;
                    }

                    if (indexMap.capital >= 0 && indexMap.capital < cells.length) {
                        detalle.capital = cells[indexMap.capital].textContent.trim();
                    }

                    // Procesar porcentaje anual
                    if (indexMap.porcentajeAnual >= 0 && indexMap.porcentajeAnual < cells.length) {
                        let porcentajeAnualText = cells[indexMap.porcentajeAnual].textContent.trim();
                        let porcentajeAnualNum = parseFloat(porcentajeAnualText.replace(/[^\d,.]/g, '').replace(',', '.'));
                        detalle.porcentaje_interes_anual = isNaN(porcentajeAnualNum) ? 0 : porcentajeAnualNum;
                    }

                    // Procesar porcentaje diario (calcularlo si no existe)
                    if (indexMap.porcentajeDiario >= 0 && indexMap.porcentajeDiario < cells.length) {
                        let porcentajeDiarioText = cells[indexMap.porcentajeDiario].textContent.trim();
                        let porcentajeDiarioNum = parseFloat(porcentajeDiarioText.replace(/[^\d,.]/g, '').replace(',', '.'));
                        detalle.porcentaje_interes_diario = isNaN(porcentajeDiarioNum) ? 0 : porcentajeDiarioNum;
                    } else if (detalle.porcentaje_interes_anual > 0) {
                        // Calcular el interés diario dividiendo el anual por 365 si no existe la columna
                        detalle.porcentaje_interes_diario = parseFloat((detalle.porcentaje_interes_anual / 365).toFixed(6));
                    }

                    // Procesar monto de intereses
                    if (indexMap.montoIntereses >= 0 && indexMap.montoIntereses < cells.length) {
                        detalle.monto_intereses = cells[indexMap.montoIntereses].textContent.trim();
                    }

                    // Verificar si el detalle tiene al menos las propiedades mínimas para ser útil
                    if (detalle.fecha_desde && detalle.fecha_hasta) {
                        detalles.push(detalle);
                    }
                });

                // Si hemos encontrado una tabla válida con detalles, retornarla
                if (detalles.length > 0) {
                    return detalles;
                }
            }

            // Si llegamos aquí, no encontramos una tabla válida
            //console.warn('No se encontró una tabla válida de detalles');
            return { error: 'No se encontró una tabla válida con formato de detalles' };
        });
    }

    /**
 * Función para extraer datos específicamente del formato mostrado en el ejemplo CPACF
 * Esta función maneja el formato específico donde:
 * - Primera columna: Desde (fecha)
 * - Segunda columna: Hasta (fecha)
 * - Tercera columna: Días
 * - Cuarta columna: % Int. (interés anual)
 * - Quinta columna: Monto de intereses
 */
    async extractCPACFDetalle() {
        return await this.extractData(() => {
            // Buscar el contenedor de detalles específico
            const detallesContainer = document.querySelector('.detalles') ||
                document.querySelector('#detalles') ||
                document.querySelector('.table-detalle-calculos');

            if (!detallesContainer) {
                //console.warn('No se encontró el contenedor de detalles específico');

                // Buscar cualquier tabla que pueda contener los datos
                const tables = Array.from(document.querySelectorAll('table'));
                for (const table of tables) {
                    // Verificar los encabezados para identificar la tabla correcta
                    const headerRow = table.querySelector('tr');
                    if (!headerRow) continue;

                    const headers = Array.from(headerRow.querySelectorAll('th, td')).map(th =>
                        th.textContent.trim().toLowerCase());

                    // Si encontramos una tabla con los encabezados correctos
                    if (headers.some(h => h.includes('desde')) &&
                        headers.some(h => h.includes('hasta')) &&
                        headers.some(h => h.includes('día')) &&
                        headers.some(h => h.includes('int'))) {

                        //console.log('Tabla de detalles CPACF encontrada con encabezados:', headers);

                        // Extraer filas de datos
                        const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Ignorar encabezados
                        const detalles = [];

                        rows.forEach(row => {
                            const cells = Array.from(row.querySelectorAll('td'));

                            // Asegurarnos de que tenemos suficientes celdas
                            if (cells.length >= 5) {
                                // Extraer porcentaje de interés (cuarta columna)
                                let porcentajeText = cells[3].textContent.trim();
                                let porcentajeNum = parseFloat(porcentajeText.replace(/[^\d,.]/g, '').replace(',', '.'));

                                if (isNaN(porcentajeNum)) porcentajeNum = 0;

                                const detalle = {
                                    fecha_desde: cells[0].textContent.trim(),
                                    fecha_hasta: cells[1].textContent.trim(),
                                    dias: parseInt(cells[2].textContent.trim(), 10) || 0,
                                    porcentaje_interes_anual: porcentajeNum,
                                    porcentaje_interes_diario: parseFloat((porcentajeNum / 365).toFixed(6)),
                                    monto_intereses: cells[4].textContent.trim()
                                };

                                detalles.push(detalle);
                            }
                        });

                        //console.log(`Se extrajeron ${detalles.length} filas de detalles CPACF`);
                        return detalles;
                    }
                }

                return { error: 'No se encontró la tabla de detalles CPACF' };
            }

            // Si encontramos el contenedor específico, buscar la tabla dentro de él
            const table = detallesContainer.querySelector('table');
            if (!table) {
                return { error: 'Se encontró el contenedor de detalles pero no contiene una tabla' };
            }

            // Extraer filas de datos
            const rows = Array.from(table.querySelectorAll('tr')).slice(1); // Ignorar la fila de encabezados
            const detalles = [];

            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));

                // Asegurarnos de que tenemos suficientes celdas
                if (cells.length >= 5) {
                    // Extraer porcentaje de interés (cuarta columna)
                    let porcentajeText = cells[3].textContent.trim();
                    let porcentajeNum = parseFloat(porcentajeText.replace(/[^\d,.]/g, '').replace(',', '.'));

                    if (isNaN(porcentajeNum)) porcentajeNum = 0;

                    const detalle = {
                        fecha_desde: cells[0].textContent.trim(),
                        fecha_hasta: cells[1].textContent.trim(),
                        dias: parseInt(cells[2].textContent.trim(), 10) || 0,
                        porcentaje_interes_anual: porcentajeNum,
                        porcentaje_interes_diario: parseFloat((porcentajeNum / 365).toFixed(6)),
                        monto_intereses: cells[4].textContent.trim()
                    };

                    detalles.push(detalle);
                }
            });

            //console.log(`Se extrajeron ${detalles.length} filas de detalles CPACF`);
            return detalles;
        });
    }


    /**
     * Cierra el navegador y limpia los recursos
     */
    async close() {
        if (this.browser) {
            logger.info('Cerrando navegador...');
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.loggedIn = false;
        }
    }
}



async function main({ tasaId, dni, tomo, folio, screenshot, capital, fechaDesde, fechaHasta, tipoTasa }) {

    const scraper = new CPACFScraper({
        dni: dni,
        tomo: tomo,
        folio: folio,
        tasaId: tasaId
    });

    try {
        // Inicializar el scraper
        await scraper.initialize();

        // Realizar login - esto también analizará la estructura de la página
        await scraper.login();

        // Examinar la página principal después del login

        // Obtener la lista de tasas disponibles
        const tasas = await scraper.getAvailableRates();
        logger.info('Tasas disponibles:');
        tasas.forEach(tasa => {
            logger.info(`- [${tasa.id}] ${tasa.name}`);
        });

        // Buscar la tasa seleccionada en la lista
        const tasaSeleccionada = tasas.find(t => t.id === tasaId) || tasas[0];

        if (tasaSeleccionada) {
            /*             console.log(`Seleccionando tasa: ${tasaSeleccionada.name} (ID: ${tasaSeleccionada.id})`); */

            // Seleccionar la tasa
            await scraper.selectRate(tasaSeleccionada.id);

            // Verificar la información del formulario después de seleccionar la tasa
            const formInfo = scraper.calculatorFormInfo;
            /* console.log('Información del formulario de cálculo:'); */
            if (formInfo) {
                logger.info(`- Fecha mínima permitida: ${formInfo.minDateFrom || 'No especificada'}`);
                logger.info(`- Fecha máxima permitida: ${formInfo.maxDateTo || 'No especificada'}`);
            } else {
                //console.log('- No se pudo obtener información del formulario');
            }

            // Obtener la fecha mínima en formato DD/MM/YYYY para usarla en el cálculo
            const minDateFrom = formInfo && formInfo.minDateFrom ? formInfo.minDateFrom : '2003-11-07';
            const minDateArr = minDateFrom.split('-');
            const fechaMinima = `${minDateArr[2]}/${minDateArr[1]}/${minDateArr[0]}`;

            // Obtener la fecha actual en formato DD/MM/YYYY
            const today = new Date();
            const fechaActual = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

            // Configurar los parámetros según los NOMBRES DE CAMPO reales del formulario
            const paramsCalculo = {
                capital: capital,
                date_from_0: fechaDesde, // Usar nombre de campo real
                date_to: fechaHasta,    // Usar nombre de campo real
            };

            // Establecer la capitalización solo si hay opciones disponibles
            if (formInfo && formInfo.capitalizationOptions && formInfo.capitalizationOptions.length > 0) {
                paramsCalculo.capitalization = formInfo.capitalizationOptions[0].value;
                //console.log(`Usando opción de capitalización: ${paramsCalculo.capitalization}`);
            } else {
                //console.log('No hay opciones de capitalización disponibles para esta tasa');
            }

            // Si se requiere fecha de primera capitalización, agregarla
            if (formInfo && formInfo.requiresFirstCapitalizationDate) {
                // Calcular una fecha intermedia entre la inicial y final
                const fechaInicialObj = new Date(minDateArr[0], minDateArr[1] - 1, minDateArr[2]);
                const unAnoDespues = new Date(fechaInicialObj);
                unAnoDespues.setFullYear(unAnoDespues.getFullYear() + 1);

                // Formatear como DD/MM/YYYY
                const fechaCapitalizacion = `${String(unAnoDespues.getDate()).padStart(2, '0')}/${String(unAnoDespues.getMonth() + 1).padStart(2, '0')}/${unAnoDespues.getFullYear()}`;

                paramsCalculo.date_first_capitalization = fechaCapitalizacion; // Usar nombre de campo real
                //console.log(`Usando fecha de primera capitalización: ${fechaCapitalizacion}`);
            }

            //console.log('Realizando cálculo con parámetros:', paramsCalculo);

            // Realizar el cálculo (ahora incluye extraer detalles)
            const resultado = await scraper.calcular(paramsCalculo);

            // Verificar si se obtuvieron los detalles
            if (resultado.detalles && Array.isArray(resultado.detalles) && resultado.detalles.length > 0) {
                logger.info('Se obtuvieron los detalles del cálculo:');
                logger.info(`Número de períodos: ${resultado.detalles.length}`);

                // Mostrar un ejemplo de los datos extraídos
                logger.info(`Ejemplo del primer período:\n- Desde: ${resultado.detalles[0].fecha_desde}\n- Hasta: ${resultado.detalles[0].fecha_hasta}\n- % Int. Anual: ${resultado.detalles[0].porcentaje_interes_anual}\n- % Int. Diario: ${resultado.detalles[0].porcentaje_interes_diario}`);
                /*                 console.log(`- Desde: ${resultado.detalles[0].fecha_desde}`);
                                console.log(`- Hasta: ${resultado.detalles[0].fecha_hasta}`);
                                console.log(`- % Int. Anual: ${resultado.detalles[0].porcentaje_interes_anual}`);
                                console.log(`- % Int. Diario: ${resultado.detalles[0].porcentaje_interes_diario}`);
                 */
                // Guardar los resultados en un archivo JSON
                const jsonFilePath = './server/services/scrapers/tasas/pdfs/resultados_detallados.json';
                await scraper.saveResultsToJSON(resultado, jsonFilePath);
                logger.info(`Los detalles del cálculo se han guardado en ${jsonFilePath}`);
                const procesar = await procesarYGuardarTasas(resultado.detalles);
                console.log(procesar.fechasProcesadas)
                if (procesar.fechasProcesadas.length > 0) {
                    const actualizacionResult = await actualizarFechasFaltantes(tipoTasa, procesar.fechasProcesadas)
                    console.log(actualizacionResult)
                    logger.info('Resultado de actualización de fechas faltantes:', actualizacionResult);
                }
                // Más información de diagnóstico
                logger.info(`Procesamiento completado:\n- Total registros: ${procesar.total}\n- Nuevos creados: ${procesar.creados}\n- Actualizados: ${procesar.actualizados}\n- Errores: ${procesar.errores}
                `);

            } else {
                logger.warn('No se pudieron obtener los detalles del cálculo');
                logger.info('Resultado general del cálculo:');
                logger.info(JSON.stringify(resultado, null, 2));
            }

            // Guardar una captura de pantalla del resultado
            if (screenshot) {
                await scraper.screenshot('resultado.png');
            }
        } else {
            //console.error('No se encontró ninguna tasa disponible');
        }

    } catch (error) {
        logger.error('Error durante el scraping:', error);
    } finally {
        // Cerrar el navegador al finalizar
        // await scraper.close();
        // Nota: Se ha comentado el cierre para permitir depuración manual
        logger.info('Proceso completado. El navegador sigue abierto para inspección manual.');
    }
};

/**
 * Genera un rango de fechas basado en las fechas faltantes del objeto
 * @param {Object} tasaData - Objeto con información de la tasa y fechasFaltantes
 * @returns {Object} - Objeto con fechaDesde y fechaHasta en formato DD/MM/YYYY
 */
function generarRangoFechas(tasaData) {
    // Verificar que existan fechas faltantes
    if (!tasaData.fechasFaltantes || !tasaData.fechasFaltantes.length) {
        logger.error('No hay fechas faltantes en el objeto proporcionado');
        return null;
    }

    // Ordenar las fechas faltantes (por si acaso no están en orden)
    const fechasOrdenadas = [...tasaData.fechasFaltantes].sort((a, b) => {
        return new Date(a.fecha) - new Date(b.fecha);
    });

    // Obtener la primera y última fecha
    const primeraFecha = fechasOrdenadas[0].fecha;
    const ultimaFecha = fechasOrdenadas[fechasOrdenadas.length - 1].fecha;

    // Si solo hay una fecha o las fechas son iguales, generar un rango más amplio
    if (primeraFecha === ultimaFecha || fechasOrdenadas.length === 1) {
        // Convertir la fecha a objeto moment
        const fechaBase = moment(primeraFecha);

        // Generar un rango que incluya el mes anterior y el siguiente
        const fechaDesdeAmpliada = fechaBase.clone().subtract(1, 'month').format('DD/MM/YYYY');
        const fechaHastaAmpliada = fechaBase.clone().add(1, 'month').format('DD/MM/YYYY');

        return {
            fechaDesde: fechaDesdeAmpliada,
            fechaHasta: fechaHastaAmpliada
        };
    }

    // Para múltiples fechas, usar el rango original
    const fechaDesde = moment(primeraFecha).format('DD/MM/YYYY');
    const fechaHasta = moment(ultimaFecha).format('DD/MM/YYYY');

    return {
        fechaDesde,
        fechaHasta
    };
}


/**
 * Procesa un array de objetos con rangos de fechas y porcentajes de interés
 * y los guarda en la base de datos como documentos individuales por día
 * 
 * @param {Array} detalles - Array de objetos con rangos de fechas y porcentajes
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
async function procesarYGuardarTasas(detalles, options = {}) {
    console.log(detalles);
    // Resultados del procesamiento
    const result = {
        total: 0,
        creados: 0,
        actualizados: 0,
        errores: 0,
        detalle_errores: [],
        // Añadir array para registrar las fechas procesadas (formato requerido por actualizarFechasFaltantes)
        fechasProcesadas: []
    };

    if (!Array.isArray(detalles) || detalles.length === 0) {
        console.warn("No hay detalles para procesar");
        return result;
    }

    // Procesar cada objeto de detalle
    for (const detalle of detalles) {
        try {
            // Verificar que tengamos los datos necesarios
            if (!detalle.fecha_desde || !detalle.fecha_hasta || detalle.porcentaje_interes_diario === undefined) {
                console.warn("Detalle incompleto:", detalle);
                result.errores++;
                result.detalle_errores.push({
                    tipo: "Datos incompletos",
                    detalle: JSON.stringify(detalle)
                });
                continue;
            }

            // Convertir las fechas desde/hasta a objetos moment
            const fechaDesde = moment(detalle.fecha_desde, "DD/MM/YYYY");
            const fechaHasta = moment(detalle.fecha_hasta, "DD/MM/YYYY");

            // Verificar que las fechas sean válidas
            if (!fechaDesde.isValid() || !fechaHasta.isValid()) {
                console.warn("Fechas inválidas:", detalle.fecha_desde, detalle.fecha_hasta);
                result.errores++;
                result.detalle_errores.push({
                    tipo: "Fechas inválidas",
                    detalle: JSON.stringify(detalle)
                });
                continue;
            }

            // Crear un array con todas las fechas entre desde y hasta (inclusive)
            const fechas = [];
            const fechaActual = moment(fechaDesde);

            while (fechaActual.isSameOrBefore(fechaHasta, 'day')) {
                fechas.push(moment(fechaActual));
                fechaActual.add(1, 'day');
            }

            // Procesar cada fecha individual en el rango
            for (const fecha of fechas) {
                result.total++;

                // Crear el objeto de datos para guardar
                const tasaData = {
                    // Convertir a Date para que el setter del esquema pueda procesarlo
                    fecha: fecha.toDate(),
                    // Asignar el porcentaje diario a tasaActivaCNAT2658
                    tasaActivaCNAT2658: detalle.porcentaje_interes_diario
                };

                try {
                    // Buscar si ya existe un documento para esta fecha
                    const fechaNormalizada = moment.utc(fecha).startOf('day').toDate();
                    const existingDoc = await Tasas.findOne({ fecha: fechaNormalizada });

                    if (existingDoc) {
                        // Actualizar el documento existente
                        existingDoc.tasaActivaCNAT2658 = tasaData.tasaActivaCNAT2658;
                        await existingDoc.save();
                        result.actualizados++;

                        // Añadir fecha al array de fechas procesadas (formato YYYY-MM-DD)
                        result.fechasProcesadas.push({
                            fecha: fecha.format('YYYY-MM-DD')
                        });
                    } else {
                        // Crear un nuevo documento
                        const nuevaTasa = new Tasas(tasaData);
                        await nuevaTasa.save();
                        result.creados++;

                        // Añadir fecha al array de fechas procesadas (formato YYYY-MM-DD)
                        result.fechasProcesadas.push({
                            fecha: fecha.format('YYYY-MM-DD')
                        });
                    }
                } catch (dbError) {
                    // Ignorar errores de MERGED_WITH_EXISTING ya que es un comportamiento esperado
                    if (dbError.message === 'MERGED_WITH_EXISTING') {
                        result.actualizados++;

                        // Añadir fecha al array de fechas procesadas (formato YYYY-MM-DD)
                        result.fechasProcesadas.push({
                            fecha: fecha.format('YYYY-MM-DD')
                        });
                    } else {
                        console.error(`Error al guardar fecha ${fecha.format('DD/MM/YYYY')}:`, dbError);
                        result.errores++;
                        result.detalle_errores.push({
                            tipo: "Error DB",
                            fecha: fecha.format('DD/MM/YYYY'),
                            error: dbError.message
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error procesando detalle:", error);
            result.errores++;
            result.detalle_errores.push({
                tipo: "Error general",
                error: error.message,
                detalle: JSON.stringify(detalle)
            });
        }
    }

    return result;
}


async function findMissingDataColegio(tipoTasa, tasaId) {
    logger.info(`Verificacion fechas faltantes para ${tipoTasa}`)
    const verificacion = await verificarFechasFaltantes(tipoTasa)
    if (verificacion.diasFaltantes > 0) {
        const fechas = await generarRangoFechas(verificacion)
        const scrapingColegio = await main({
            dni: '30596920',
            tomo: '109',
            folio: '47',
            tasaId: tasaId,
            fechaDesde: fechas.fechaDesde,
            fechaHasta: fechas.fechaHasta,
            capital: 100000,
            screenshot: false,
            tipoTasa: tipoTasa,
        });
    } else {
        logger.info(`No se encontraron fechas faltantes para ${"tasaActivaCNAT2658"}- Rango de fechas actual ${moment(verificacion.fechaInicio).format("DD/MM/YYYY")} - ${moment(verificacion.fechaUltima).format("DD/MM/YYYY")}`)
        const currentDate = obtenerFechaActualISO();
        if (moment(currentDate).utc(0).startOf("day").isAfter(moment(verificacion.fechaUltima).utc(0))) {

            logger.info(`Hay fechas posteriores que actualizar en rango: ${moment(verificacion.fechaUltima).format('DD/MM/YYYY')} - ${moment(currentDate).format('DD/MM/YYYY')}`)
            const scrapingColegio = await main({
                dni: '30596920',
                tomo: '109',
                folio: '47',
                tasaId: tasaId,
                fechaDesde: moment(verificacion.fechaUltima).format('DD/MM/YYYY'),
                fechaHasta: moment(currentDate).format('DD/MM/YYYY'),
                capital: 100000,
                screenshot: false,
                tipoTasa: tipoTasa,
            });
        }
    }
};


// Exportar clase y función principal
module.exports = { CPACFScraper, main, findMissingDataColegio };