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
const puppeteer = require('puppeteer');
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

// const chromeOptions = {
//     headless:true, 
//     slowMo:18,
//     defaultViewport: null
//   };


// (async () => {
//     const browser = await puppeteer.launch(chromeOptions);
//     const page = await browser.newPage();
//     await page.goto('https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero');
//     const ele = await page.evaluate(() => {
//         const tag = document.querySelectorAll("#collapseTwo ul li");
//         const title = document.querySelector("#collapseTwo h3");
//         let text = [];
//         text.push(title.innerText);
//         tag.forEach((tag) => {
//             text.push(tag.innerText)
//         })

//         return text
//     })
    


//     console.log(ele);
//     // await browser.close();
// }) ();