(async () => {
const AWS = require('aws-sdk');
const secretManager = new AWS.SecretsManager({ region: 'sa-east-1'});

const data =  await secretManager.getSecretValue({ SecretId: 'arn:aws:secretsmanager:sa-east-1:244807945617:secret:env-8tdon8' }).promise();
const secret = JSON.parse(data.SecretString);

process.env.URLDB = secret.URLDB;
process.env.CADUCIDAD_TOKEN = secret.CADUCIDAD_TOKEN;
process.env.SEED = secret.SEED;
process.env.AWS_SES_USER = secret.AWS_SES_USER;
process.env.AWS_SES_PASS = secret.AWS_SES_PASS;
process.env.SES_CONFIG = JSON.stringify({
    accessKeyId: secret.AWS_SES_KEY_ID,
    secretAccessKey: secret.AWS_SES_ACCESS_KEY,
    region: 'us-east-1',
});

console.log(process.env.URLDB)

})();
