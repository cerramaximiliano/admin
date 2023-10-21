const AWS = require('aws-sdk');

module.exports = () => {
    const secretManager = new AWS.SecretsManager({ region: 'sa-east-1'});
    return new Promise ((resolve, reject) => {
        secretManager.getSecretValue({ SecretId: 'arn:aws:secretsmanager:sa-east-1:244807945617:secret:env-8tdon8' }, (err, data) => {
            if(err) {
                reject (err)
            }else {
                const secret = JSON.parse(data.SecretString)
                URLDB = secret.URLDB;
                CADUCIDAD_TOKEN = secret.CADUCIDAD_TOKEN;
                SEED = secret.SEED;
                AWS_SES_USER = secret.AWS_SES_KEY_ID;
                AWS_SES_PASS = secret.AWS_SES_ACCESS_KEY;
                SES_CONFIG = JSON.stringify({
                    accessKeyId: secret.AWS_SES_KEY_ID,
                    secretAccessKey: secret.AWS_SES_ACCESS_KEY,
                    region: 'us-east-1',
                });
                let secretsString = "";
				Object.keys(secret).forEach((key) => {
					secretsString += `${key}=${secret[key]}\n`;
				});
                resolve(secretsString);
            }
        })
    })
};