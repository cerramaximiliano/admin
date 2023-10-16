const axios = require('axios');
const fs = require('fs');

const downloadFile = async (fileURL, localPath) => {
    try {
      const response = await axios({
        method: 'get',
        url: fileURL,
        responseType: 'stream',
      });
      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve('done'));
        writer.on('error', reject('error'));
      });
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      throw new Error(err)
    }
  };


  module.exports = {downloadFile};