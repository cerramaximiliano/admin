const axios = require('axios');
const cron = require('node-cron');
const URL_BASE = 'http://localhost:3000'

const moment = require('moment');
// const hour = moment().get('hours');
// const minute = moment().get('minutes')+1;

cron.schedule(`${0} ${6} * * *`, async () => {
const requestCer = await axios(`${URL_BASE}/scraping/tasas?tasa=cer`);
const requestPasivaBCRA = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaPasivaBCRA`);
const requestIcl = await axios(`${URL_BASE}/scraping/tasas?tasa=icl`);
const requestActivaBNA2658 = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaActivaCNAT2658`);
const requestActiva = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaActivaBNA`);
const requestPasivaBNA = await axios(`${URL_BASE}/scraping/tasas?tasa=tasaPasivaBNA`);
}, {
    scheduled: true,
    timezone: "America/Argentina/Buenos_Aires"
});
module.exports = cron;