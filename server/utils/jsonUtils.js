function generateJSONFile(data, file) {
    try {
        fs.writeFileSync(DOWNLOAD_DIR + file, JSON.stringify(data))
    } catch (err) {
        logger.error(`Error en escritura de archivo json. ${err}`)
    }
};

module.exports = generateJSONFile;