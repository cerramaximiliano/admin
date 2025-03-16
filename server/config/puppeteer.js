// puppeteer-config.js
const os = require('os');
const path = require('path');

/**
 * Configuración para Puppeteer
 * @param {Object} options - Opciones adicionales para sobrescribir la configuración predeterminada
 * @returns {Object} Configuración completa para Puppeteer
 */


function getPuppeteerConfig(options = {}) {
    // Detectar sistema operativo
    const platform = os.platform();
    // Configuración predeterminada

    const defaultConfig = {
        // Usar chromium-browser en sistemas Linux
        executablePath: getChromiumPath(),
        headless: process.env.NODE_ENV === 'development' ? "new" : false,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'
        ],
        defaultViewport: { width: 1366, height: 768 },
        // Si usar puppeteer o puppeteer-core
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
    };

    // Combinar configuración predeterminada con opciones personalizadas
    return { ...defaultConfig, ...options };
}

/**
 * Obtiene la ruta de Chromium según el sistema operativo
 * @returns {string} Ruta al ejecutable de Chromium
 */
function getChromiumPath() {
    const platform = os.platform();

    switch (platform) {
        case 'linux':
            // Rutas comunes en Linux
            return process.env.CHROMIUM_PATH || '/usr/bin/chromium' || '/usr/bin/chromium-browser';
        case 'darwin': // macOS
            return '/Applications/Chromium.app/Contents/MacOS/Chromium';
        case 'win32': // Windows
            return path.join(process.env.LOCALAPPDATA, 'Chromium\\Application\\chrome.exe');
        default:
            return '';
    }
}

module.exports = {
    getPuppeteerConfig,
    getChromiumPath
};