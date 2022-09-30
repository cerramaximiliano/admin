const pino = require('pino');
// const pino = require('pino-pretty');
const logger = pino({
    transport: {
    targets :[
        {
            target: 'pino-pretty',
            options: {
            colorize: false,
            translateTime: 'dd-mm-yyyy, HH:MM:ss',
            destination: `./logger.log`
            }},
    ]
},
},
);
module.exports = {logger};
