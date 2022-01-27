const express = require('express');
const app = express();
require('./config/config');
const http = require('http');
const fs = require('fs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
app.use(cors());
const downloadBCRADDBB = require('./routes/scrapingweb.js');

mongoose.connect(process.env.URLDB, {useNewUrlParser: true, useUnifiedTopology: true}, (err, res) => {
    if(err) throw err;
    console.log('Base de datos ONLINE');
});


app.listen(process.env.PORT, () => {
    console.log('Escuchando el puerto', process.env.PORT);
});


cron.schedule('30 19 * * *', () => {
    console.log(moment())
    downloadBCRADDBB.downloadBCRADDBB('pasivaBCRA');
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});






