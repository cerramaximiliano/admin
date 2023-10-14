const moment = require('moment');

exports.formatDateToISO = (inputDate) => {
        const dateParts1 = inputDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const dateParts2 = inputDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dateParts1 || dateParts2) {
          const year = dateParts1 ? dateParts1[1] : dateParts2[3];
          const month = dateParts1 ? dateParts1[2] : dateParts2[2];
          const day = dateParts1 ? dateParts1[3] : dateParts2[1];
          const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
          return utcDate;
        } else {
          throw new Error(`Invalid date format`);
        }
};

exports.validatePeriod = (inputFromDate, inputToDate) => {
  if( ! moment(inputFromDate).isSameOrBefore(inputToDate) ) {
    throw new Error(`Invalid range of dates`)
  }else{
    return true
  }
}