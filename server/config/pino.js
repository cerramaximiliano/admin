const pino = require('pino');
const path = require('path');
const filePath = path.join(__dirname,  '../');
const logger = pino({
    transport: {
    targets :[
        {
        target: 'pino-pretty',
        options: {
        colorize: true,
        translateTime: 'dd-mm-yyyy, HH:MM:ss',
        }},
        {
            target: 'pino-pretty',
            options: {
            colorize: false,
            translateTime: 'dd-mm-yyyy, HH:MM:ss',
            destination: `${filePath}/logger.log`
            }},
    ]
},
},
);
module.exports = {logger};
