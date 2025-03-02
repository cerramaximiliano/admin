const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Rutas base
const ROOT_DIR = path.join(__dirname, '..');
const FILES_DIR = path.join(ROOT_DIR, 'files');
const SERVER_FILES_DIR = path.join(FILES_DIR, 'serverFiles');

// Configuración por entorno
const ENV = process.env.NODE_ENV || 'development';
const IS_DEV = ENV === 'development';
const IS_PROD = ENV === 'production';

// Configuración de MongoDB
const MONGODB = {
  url: process.env.URLDB,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    strictQuery: false
  }
};

// Configuración de AWS
const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  ses: {
    accessKeyId: process.env.AWS_SES_KEY_ID,
    secretAccessKey: process.env.AWS_SES_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
  },
  secretsManager: {
    region: process.env.AWS_REGION || 'sa-east-1',
    secretId: process.env.AWS_SECRETS_ID || 'arn:aws:secretsmanager:sa-east-1:244807945617:secret:env-8tdon8'
  }
};

// Configuración de Email
const EMAIL_CONFIG = {
  defaultSender: 'no-reply@lawanalytics.app',
  supportEmail: 'soporte@lawanalytics.com.ar',
  templates: {
    promotionGeneral: 'promotion-1658258964667',
    promotionLaboral: 'promotionlaboral-1659113638889',
    promotionPrevisional: 'promotionprevisional-1659115051606'
  },
  bannerPath: path.join(SERVER_FILES_DIR, 'lawanalyticsBanner.PNG'),
  smtpConfig: {
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.AWS_SES_USER,
      pass: process.env.AWS_SES_PASS
    }
  }
};

// Configuración de tasas
const TASAS_CONFIG = {
  checkIntervals: {
    pasivaBCRA: { hour: 10, minute: 29 },
    pasivaBNA: { hour: 10, minute: 30 },
    activaBNA: { hour: 10, minute: 31 },
    activaCNAT2601: { hour: 10, minute: 32 },
    cer: { hour: 10, minute: 33 },
    icl: { hour: 10, minute: 34 },
    activaCNAT2658: { hour: 10, minute: 35 }
  },
  scraping: {
    baseUrl: {
      bcra: 'http://www.bcra.gov.ar/Pdfs/PublicacionesEstadisticas/',
      bna: 'https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero',
      infoleg: 'http://servicios.infoleg.gob.ar/infolegInternet/verVinculos.do?modo=2&id=639'
    },
    cpacf: {
      url: 'https://tasas.cpacf.org.ar/newLogin',
      credentials: {
        dni: '30596920',
        tomo: '109',
        folio: '47'
      }
    }
  }
};

// Configuración del servidor
const SERVER_CONFIG = {
  port: process.env.PORT || 3000,
  timezone: 'America/Argentina/Buenos_Aires',
  loggerOptions: {
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'dd-mm-yyyy, HH:MM:ss'
          }
        },
        {
          target: 'pino/file',
          options: {
            destination: path.join(ROOT_DIR, 'logger.log'),
            translateTime: 'dd-mm-yyyy, HH:MM:ss'
          }
        }
      ]
    }
  },
  tokenExpiryTime: process.env.CADUCIDAD_TOKEN
};

// Exportar configuración
module.exports = {
  env: ENV,
  isDev: IS_DEV,
  isProd: IS_PROD,
  paths: {
    root: ROOT_DIR,
    files: FILES_DIR,
    serverFiles: SERVER_FILES_DIR
  },
  mongodb: MONGODB,
  aws: AWS_CONFIG,
  email: EMAIL_CONFIG,
  tasas: TASAS_CONFIG,
  server: SERVER_CONFIG,
  tokenSecret: process.env.SEED
};