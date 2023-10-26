const pdf = require('pdf-parse');
const {dataTasaPasiva,textToLines} = require('../utils/parseTextUtils');
const {myRegexp, validDate} = require('../utils/regexUtils');
const moment = require('moment');

async function parseBNAPasiva(dataBuffer){
    try {
    let tasasList = [];
    let datesTasas = [];
    const {text} = await pdf(dataBuffer);
    const arrayLines = text.toString().split('\n')
        arrayLines.forEach(function(x){
            let resultNumbers = dataTasaPasiva(x);
            tasasList.push(resultNumbers)
            x = myRegexp.exec(x);
            if(x != null){
                x[0] = validDate.exec(x[0])
                if(x[0] != null && moment(x[0][0], 'DD-MM-YY').isValid() === true){
                    datesTasas.push(x[0][0]);
                }
            }
        });
        tasasList = tasasList.filter(x => x.length != 0);
        if(typeof tasasList[0][0] === 'number' && moment(datesTasas[0], 'DD-MM-YY').isValid() === true){
            let dateToSave = moment(moment(datesTasas[0], "DD-MM-YY").format('YYYY-MM-DD') + 'T00:00').utc(true);
            return [dateToSave, tasasList[0][0] / 365]
        }else{
            throw new Error(`Fail to parse File`)
        }
        }catch(err){
            throw new Error(err)
        }
    };

    module.exports = {parseBNAPasiva};