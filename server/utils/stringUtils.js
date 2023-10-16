const moment = require('moment');

function arrayToText(array, position){
    let string = ''
    array.forEach(function(x){
        string += `[ Fecha: ${moment(x[0], 'YYYYMMDD').format('DD/MM/YYYY')} - Indice: ${x[1]} ]`
    });
    return string
};


module.exports = {arrayToText};
