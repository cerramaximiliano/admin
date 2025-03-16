/**
 * @file cleanFiles.js
 * @description Funciones para limpiar archivos de la carpeta server/files
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger');

/**
 * Elimina todos los archivos de la carpeta server/files
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.recursive - Si debe eliminar archivos en subcarpetas (por defecto: false)
 * @param {Array<string>} options.extensions - Extensiones de archivo a eliminar (por defecto: todas)
 * @param {number} options.olderThan - Eliminar solo archivos más antiguos que X días (por defecto: 0 = todos)
 * @param {string} options.prefix - Eliminar solo archivos que empiecen con cierto prefijo
 * @returns {Promise<Object>} - Resultado de la operación con estadísticas
 */
async function cleanServerFiles(options = {}) {
    const defaultOptions = {
        recursive: false,
        extensions: [],  // Vacío significa todas las extensiones
        olderThan: 0,    // 0 significa todos los archivos, sin importar antigüedad
        prefix: ''       // Vacío significa todos los archivos, sin importar prefijo
    };

    // Combinar opciones por defecto con las proporcionadas
    const config = { ...defaultOptions, ...options };

    // Calcular la fecha límite si se especificó olderThan
    const dateLimit = config.olderThan > 0 
        ? new Date(Date.now() - config.olderThan * 24 * 60 * 60 * 1000) 
        : null;

    // Determinar la ruta del directorio
    const filesDir = path.resolve(__dirname, '../../files');

    // Estadísticas para el resultado
    const stats = {
        total: 0,
        deleted: 0,
        skipped: 0,
        errors: []
    };

    try {
        // Verificar si el directorio existe
        try {
            await fs.access(filesDir);
        } catch (error) {
            logger.warn(`El directorio ${filesDir} no existe. Creándolo...`);
            await fs.mkdir(filesDir, { recursive: true });
            return {
                ...stats,
                message: 'El directorio no existía y fue creado.'
            };
        }

        // Función recursiva para procesar archivos y directorios
        async function processDirectory(dirPath) {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                if (entry.isDirectory()) {
                    if (config.recursive) {
                        await processDirectory(fullPath);
                    }
                    continue;
                }

                stats.total++;

                // Verificar extensión si se especificaron
                if (config.extensions.length > 0) {
                    const ext = path.extname(entry.name).toLowerCase().substring(1);
                    if (!config.extensions.includes(ext)) {
                        stats.skipped++;
                        continue;
                    }
                }

                // Verificar prefijo si se especificó
                if (config.prefix && !entry.name.startsWith(config.prefix)) {
                    stats.skipped++;
                    continue;
                }

                // Verificar antigüedad si se especificó
                if (dateLimit) {
                    const stat = await fs.stat(fullPath);
                    if (stat.mtime > dateLimit) {
                        stats.skipped++;
                        continue;
                    }
                }

                // Eliminar el archivo
                try {
                    await fs.unlink(fullPath);
                    stats.deleted++;
                    logger.info(`Archivo eliminado: ${fullPath}`);
                } catch (error) {
                    stats.errors.push({
                        file: fullPath,
                        error: error.message
                    });
                    logger.error(`Error al eliminar ${fullPath}: ${error.message}`);
                }
            }
        }

        // Iniciar el procesamiento desde el directorio principal
        await processDirectory(filesDir);

        return {
            ...stats,
            success: stats.errors.length === 0,
            message: `Limpieza completada. ${stats.deleted} archivos eliminados de ${stats.total} encontrados.`
        };
    } catch (error) {
        logger.error(`Error en cleanServerFiles: ${error.message}`);
        return {
            ...stats,
            success: false,
            message: `Error general: ${error.message}`
        };
    }
};


module.exports = {
    cleanServerFiles,
};