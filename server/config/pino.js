const pino = require('pino');
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
            destination: `./server/logger.log`
            }},
    ]
},
},
);
module.exports = {logger};
