const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const transporter = require('nodemailer-smtp-transport');
const path = require('path');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Envía un email usando AWS SES con plantillas predefinidas
 * 
 * @param {Array} recipientEmails - Array de direcciones de email
 * @param {String} template - Nombre de la plantilla a utilizar
 * @param {Object} templateData - Datos para la plantilla
 * @returns {Promise} - Resultado de la operación
 */
async function sendTemplateEmail(recipientEmails, template, templateData) {
  try {
    const aws_ses = new AWS.SES(config.aws.ses);
    const params = {
      Destinations: recipientEmails,
      Source: config.email.defaultSender,
      Template: template,
      DefaultTemplateData: templateData,
    };
    
    logger.info(`Enviando email de plantilla ${template} a ${recipientEmails.length} destinatarios`);
    return await aws_ses.sendBulkTemplatedEmail(params).promise();
  } catch (error) {
    logger.error(`Error al enviar email de plantilla: ${error.message}`);
    throw error;
  }
}

/**
 * Obtiene las plantillas disponibles en AWS SES
 * 
 * @returns {Promise} - Lista de plantillas disponibles
 */
async function getTemplates() {
  try {
    const aws_ses = new AWS.SES(config.aws.ses);
    return await aws_ses.listTemplates({ MaxItems: 10 }).promise();
  } catch (error) {
    logger.error(`Error al obtener plantillas de email: ${error.message}`);
    throw error;
  }
}

/**
 * Envía un email usando Nodemailer
 * 
 * @param {String} from - Dirección de email del remitente
 * @param {String} to - Dirección de email del destinatario
 * @param {String} cc - Dirección de email para copia
 * @param {String} referencia - Enlace de referencia (para emails de verificación)
 * @param {String} content - Contenido adicional
 * @param {Object} pageSelectData - Datos de selección de página
 * @param {Object} pageTypeData - Datos de tipo de página
 * @param {String} type - Tipo de email a enviar (AUT, RESET, etc.)
 * @param {Array} calculo - Datos de cálculo (para emails de resultados)
 * @returns {Promise} - Resultado de la operación
 */
async function sendEmail(from, to, cc, referencia, content, pageSelectData, pageTypeData, type, calculo) {
  return new Promise((resolve, reject) => {
    // Configurar opciones de email según el tipo
    let mailOptions;
    
    switch (type) {
      case 'AUT':
        mailOptions = {
          from,
          to,
          cc,
          subject: 'Law||Analytics - Verificación de cuenta.',
          html: `<img src="cid:unique@kreata.ee"/>
                <p>Este es un correo de verificación de cuenta del sitio Law||Analytics. Para confirmar la cuenta creada, haga click en el siguiente link:</p>
                <br></br>
                <a href="${referencia}">Confirmar</a>`,
          attachments: [{
            filename: 'lawanalyticsBanner.PNG',
            path: config.email.bannerPath,
            cid: 'unique@kreata.ee'
          }]
        };
        break;
        
      case 'RESET':
        mailOptions = {
          from,
          to,
          cc,
          subject: 'Law||Analytics - Reseteo de password.',
          html: `<img src="cid:unique@kreata.ee"/>
                <p>Este es un correo de reseteo de password de su cuenta en el sitio Law||Analytics. Si usted solicito el reseteo de su password, haga click en el siguiente link:</p>
                <br></br>
                <a href="${referencia}">Confirmar</a>`,
          attachments: [{
            filename: 'lawanalyticsBanner.PNG',
            path: config.email.bannerPath,
            cid: 'unique@kreata.ee'
          }]
        };
        break;
        
      case 'calcResults':
        mailOptions = {
          from,
          to,
          cc,
          subject: 'Law||Analytics - Sistema de cálculo.',
          html: `<img src="cid:unique@kreata.ee"/>
                <h4>${calculo[0]}</h4>
                <br></br>
                <div>
                  ${calculo[1]}
                </div>`,
          attachments: [{
            filename: 'lawanalyticsBanner.PNG',
            path: config.email.bannerPath,
            cid: 'unique@kreata.ee'
          }]
        };
        break;
        
      case 'actualizaciones':
        mailOptions = {
          from,
          to,
          subject: 'Law||Analytics - Actualizaciones.',
          html: `
          <p>Tasa de interés actualizada: ${calculo[2]}</p>
          <p>Fecha: ${calculo[0]}</p>
          <p>Valor: ${calculo[1]}</p>
          <br></br>`,
        };
        break;
        
      case 'actualizacionesND':
        mailOptions = {
          from,
          to,
          subject: 'Law||Analytics - Actualizaciones.',
          html: `
          <p>Tasa de interés actualizada: ${calculo[0]}</p>
          <p>No hay actualizaciones disponibles.</p>
          <br></br>`,
        };
        break;
        
      case 'actualizacionesArray':
        mailOptions = {
          from,
          to,
          subject: 'Law||Analytics - Actualizaciones.',
          html: `
          <p>Tasa de interés actualizada: ${calculo[0]}</p>
          <p>Fechas y valores actualizados: ${calculo[1]}.</p>
          <br></br>`,
        };
        break;
        
      case 'actualizacionesNormas':
        mailOptions = {
          from,
          to,
          subject: 'Law||Analytics - Actualizaciones.',
          html: `<img src="cid:unique@kreata.ee"/>
          <p>Actualizaciones normativas disponibles:</p>
          <br>` + calculo,
          attachments: [{
            filename: 'lawanalyticsBanner.PNG',
            path: config.email.bannerPath,
            cid: 'unique@kreata.ee'
          }]
        };
        break;
        
      case 'categorias':
        mailOptions = {
          from,
          to,
          subject: 'Law||Analytics - Actualizaciones.',
          html: `
          <p>Actualizaciones categorías disponibles:</p>
          <br>` + `Fecha agregada: ${calculo[0]}` + `<br>` + `Datos agregados: ${(calculo[1])}`,
        };
        break;
        
      case 'n/a':
      default:
        mailOptions = {
          from,
          to,
          subject: 'Law||Analytics - Actualizaciones.',
          html: `
          <p>Actualizaciones:</p>
          <br> ${calculo}`,
        };
        break;
    }

    // Crear transporte SMTP
    const smtpTransport = nodemailer.createTransport(transporter(config.email.smtpConfig));
    
    // Enviar email
    smtpTransport.sendMail(mailOptions, (err, info) => {
      if (err) {
        logger.error(`Error al enviar email de tipo ${type}: ${err.message}`);
        resolve(err);
      } else {
        logger.info(`Email de tipo ${type} enviado exitosamente`);
        resolve(true);
      }
    });
  });
}

module.exports = {
  sendTemplateEmail,
  getTemplates,
  sendEmail
};