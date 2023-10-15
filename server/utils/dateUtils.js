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
};

exports.datesSpanish = (date) => {
  let dateArray = date.split('-');
  switch (dateArray[1]) {
      case 'ene':
          dateArray[1] = 1;
          break
      case 'feb':
          dateArray[1] = 2;
          break
      case 'mar':
          dateArray[1] = 3;
          break
      case 'abr':
          dateArray[1] = 4;
          break
      case 'may':
          dateArray[1] = 5;
          break
      case 'jun':
          dateArray[1] = 6;
          break
      case 'jul':
          dateArray[1] = 7;
          break
      case 'ago':
          dateArray[1] = 8;
          break
      case 'sep':
          dateArray[1] = 9;
          break
      case 'oct':
          dateArray[1] = 10;
          break
      case 'nov':
          dateArray[1] = 11;
          break
      case 'dic':
          dateArray[1] = 12;
          break
      default:
          break;
  };
  return dateArray.join('-');
};