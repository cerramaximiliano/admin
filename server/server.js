const express = require('express');
const app = express();
require('./config/config');
const Tasas = require('./models/tasas');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const moment = require('moment');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
app.use(cors());
const path = require('path');
const downloadBCRADDBB = require('./routes/scrapingweb.js');
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect(process.env.URLDB, {useNewUrlParser: true, useUnifiedTopology: true}, (err, res) => {
    if(err) throw err;
    console.log('Base de datos ONLINE');
});


app.listen(process.env.PORT, () => {
    console.log('Escuchando el puerto', process.env.PORT);
});


cron.schedule('15 05 * * *', () => {
    downloadBCRADDBB.downloadBCRADDBB('pasivaBCRA');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
cron.schedule('20 05 * * *', () => {
    downloadBCRADDBB.downloadBCRADDBB('cer');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
cron.schedule('25 05 * * *', () => {
    downloadBCRADDBB.downloadBCRADDBB('icl');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
downloadBCRADDBB.downloadBCRADDBB('icl');

// let find = [];
// data2021.forEach(function(x,index){
//     console.log(x[1])
//     let date = moment(x[0], "DD/MM/YYYY").format('YYYY-MM-DD') + 'T00:00';
//     let dateFormat = moment(date).utc(true);
//     find.push({
//         updateOne: {
//                     filter: {
//                         fecha: dateFormat, 
//                     },
//                     update: {
//                         icl: Number(x[1]), 
//                     },
//                     upsert: true
//                 }
//             })
// });
// Tasas.bulkWrite(find).then(result => {
// console.log(result)
// });



