const moment = require('moment');

let myRegexp = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g; //Check pattern only
let validDate = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;

function regexDates(tasaActiva){
    let myRegexp = /(\d{2}|\d{1})[-.\/](\d{2}|\d{1})(?:[-.\/]\d{2}(\d{2})?)?/g;
    let validDate = /(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])?|(?:(?:16|[2468][048]|[3579][26])00)?)))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))(\4)?(?:(?:1[6-9]|[2-9]\d)?\d{2})?$/g;
    tasaActiva[0] = myRegexp.exec(tasaActiva[0]);
    tasaActiva[0][0] = validDate.exec(tasaActiva[0][0]);
    return moment(moment(tasaActiva[0][0][0],"DD/MM/YYYY").format('YYYY-MM-DD') + 'T00:00').utc(true);
};
function regexTextCheck(regex, text){
    let regexToUse;
    if (regex === 1) {
        regexToUse = new RegExp(/tasa activa/i);
    };
    let check = regexToUse.test(text);
    return check
};

module.exports = {myRegexp, validDate, regexDates, regexTextCheck};