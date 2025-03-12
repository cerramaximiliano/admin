const moment = require("moment");

const convertirANumero = (texto) => {
    // Eliminar cualquier carácter que no sea dígito, punto o coma
    const limpio = texto.replace(/[^\d.,]/g, '');
    // Reemplazar coma por punto (en caso de formato europeo)
    const normalizado = limpio.replace(',', '.');
    // Convertir a número
    return parseFloat(normalizado);
};


/**
 * Convierte una fecha en formato ISO (MongoDB) a un objeto con día, mes y año para el formulario
 * @param {string} fechaISO - Fecha en formato ISO (ej: "2023-07-19T00:00:00.000+00:00")
 * @returns {Object} - Objeto con día, mes y año formateados para los selectores
 */
function parseFechaISO(fechaISO) {
    // Crear una fecha usando el string ISO
    // Forzar la interpretación en UTC para evitar desplazamientos de zona horaria
    const fecha = moment.utc(fechaISO);

    if (!fecha.isValid()) {
        logger.error(`Fecha inválida: ${fechaISO}`);
        // Valores por defecto en caso de error
        return {
            dia: '01',
            mes: 'Ene',
            anio: moment().format('YYYY')
        };
    }

    // Mapeo de números de mes a abreviaturas en español
    const mesesAbrev = {
        1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
        7: 'Jul', 8: 'Ago', 9: 'Sept', 10: 'Oct', 11: 'Nov', 12: 'Dic'
    };

    // Extraer componentes de la fecha - usar UTC para evitar cambios por zona horaria
    return {
        dia: fecha.format('DD'), // Día con 2 dígitos (01-31)
        mes: mesesAbrev[fecha.month() + 1], // Nombre abreviado del mes en español
        anio: fecha.format('YYYY') // Año con 4 dígitos
    };
}

function obtenerDiaSiguiente(fechaStr) {
    // Crear un objeto moment con la fecha proporcionada
    const fecha = moment(fechaStr);
    
    // Añadir un día
    const diaSiguiente = fecha.add(1, 'days');
    
    // Devolver en formato ISO con la misma estructura que el original
    return diaSiguiente.toISOString();
  }

  function obtenerFechaActualISO() {
    // Obtener la fecha actual como objeto moment
    const fechaActual = moment();
    
    // Convertir a formato ISO
    return fechaActual.toISOString();
  }


module.exports = { convertirANumero, parseFechaISO, obtenerDiaSiguiente, obtenerFechaActualISO }