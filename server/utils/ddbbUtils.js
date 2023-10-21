const moment = require('moment');

function filterUpdateObject (data, tasa) {
    let find = [];
    data.forEach(function(ele){
        let date = (moment(ele[0], "YYYYMMDD").format('YYYY-MM-DD')) + 'T00:00'
        find.push({
                    updateOne: {
                                filter: {
                                    fecha: moment(date).utc(true), 
                                },
                                update: {
                                    [tasa]: Number(ele[1]), 
                                },
                                upsert: true
                            }
                        })
    });
    return find
};


module.exports = {filterUpdateObject};