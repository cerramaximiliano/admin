const moment = require('moment');
const modelosUtils = require('./models')
const TasasActivaBNA = require('../models/tasas-activa-bna');
const TasasPasivaBNA = require('../models/tasas-pasiva-bna');
const TasasActa2658 = require('../models/tasas-activa-2658');
const TasasActa2764 = require('../models/tasas-activa-2764');

exports.generateDateRange = async (startDate, endDate, quantity) =>  {
    return new Promise((resolve, reject) => {
      try {
        const dateRange = [];
        while (startDate.isSameOrBefore(endDate) && quantity > 0) {
          dateRange.push(startDate.toISOString());
          quantity -= 1;
          startDate = moment(startDate).add(1, 'day');
        }
        resolve(dateRange);
      } catch (error) {
        reject(error);
      }
    });
  };


exports.buscarDocumentos =  async (fechas, tasa) => {
  let Model = await modelosUtils.changeModel(tasa)
  const resultados = [];
    for (const fecha of fechas) {
      const resultado = await Model.find({
          fechaInicio: { $lte: fecha },
          fechaFin: { $gte: fecha },
      });
      resultados.push(
          {
              updateOne: {
                  filter: {
                      fecha: fecha
                  },
                  update: {
                      [tasa]: resultado[0].interesMensual / 30
                  },
                  upsert: false
              }
          }
      );
    }
    return resultados
  }