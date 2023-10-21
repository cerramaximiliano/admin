const express = require('express');
const app = express();
const path = require('path');
const moment = require('moment');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const transporter = require('nodemailer-smtp-transport');
const pathFiles = path.join(__dirname, '../');

function sendAWStemplateEmail (recipientEmail, template, templateData, SES_CONFIG) {
  console.log(true, 'template')
  console.log(SES_CONFIG)
  const AWS_SES = new AWS.SES(SES_CONFIG);
  let params = {
  Destinations:  recipientEmail,
    Source: 'no-reply@lawanalytics.app',
    Template: template,
    DefaultTemplateData: templateData,
};
  return AWS_SES.sendBulkTemplatedEmail(params).promise()
};
exports.getTemplates = (SES_CONFIG) => {
  const AWS_SES = new AWS.SES(SES_CONFIG);
  return AWS_SES.listTemplates({MaxItems: 10}).promise();
};



exports.sendAWSEmailNodemailer = async (email, cc, referencia, content, pageSelectData, pageTypeData, type, calculo) => {
  return new Promise((resolve, reject) => {
    let mailOptionsAut = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      cc: cc,
      subject: 'Law||Analytics - Verificación de cuenta.',
      html: `<img src="cid:unique@kreata.ee"/>
              <p>Este es un correo de verificación de cuenta del sitio Law||Analytics. Para confirmar la cuenta creada, haga click en el siguiente link:</p>
              <br></br>
              <a href="${referencia}">Confirmar</a>`,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };
    let mailOptionsReset = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      cc: cc,
      subject: 'Law||Analytics - Reseteo de password.',
      html: `<img src="cid:unique@kreata.ee"/>
              <p>Este es un correo de reseteo de password de su cuenta en el sitio Law||Analytics. Si usted solicito el reseteo de su password, haga click en el siguiente link:</p>
              <br></br>
              <a href="${referencia}">Confirmar</a>`,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };
    let mailOptionsResults = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      cc: cc,
      subject: 'Law||Analytics - Sistema de cálculo.',
      html: `<img src="cid:unique@kreata.ee"/>
              <h4>${calculo[0]}</h4>
              <br></br>
              <div>
                ${calculo[1]}
              </div>`,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    }
    let mailOptionsActualizaciones = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      subject: 'Law||Analytics - Actualizaciones.',
      html: `
      <p>Tasa de interés actualizada: ${calculo[2]}</p>
      <p>Fecha: ${moment(calculo[0], "YYYYMMDD").format('DD/MM/YYYY')}</p>
      <p>Valor: ${calculo[1]}</p>
      <br></br>`,
    };
    let mailOptionsActualizacionesND = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      subject: 'Law||Analytics - Actualizaciones.',
      html: `
      <p>Tasa de interés actualizada: ${calculo[0]}</p>
      <p>No hay actualizaciones disponibles.</p>
      <br></br>`,
    };
    let mailOptionsActualizacionesArray = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      subject: 'Law||Analytics - Actualizaciones.',
      html: `
      <p>Tasa de interés actualizada: ${calculo[0]}</p>
      <p>Fechas y valores actualizados: ${calculo[1]}.</p>
      <br></br>`,
    };
    let mailOptionsPublicacionesArray = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      subject: 'Law||Analytics - Actualizaciones.',
      html: `<img src="cid:unique@kreata.ee"/>
      <p>Actualizaciones normativas disponibles:</p>
      <br>` + calculo,
    };
    let mailOptionsCategorias = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      subject: 'Law||Analytics - Actualizaciones.',
      html: `
      <p>Actualizaciones categorías disponibles:</p>
      <br>` + `Fecha agregada: ${calculo[0]}` + `<br>` + `Datos agregados: ${(calculo[1])}`,
    };
    let mailOptionsNA = {
      from: email,
      to: 'soporte@lawanalytics.com.ar',
      subject: 'Law||Analytics - Actualizaciones.',
      html: `
      <p>Actualizaciones:</p>
      <br> ${calculo}`  ,
    };

    let body;
    let smtpTransport;
    if (type === 'captcha') {
      body = mailOptions
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'AUT'){
      body = mailOptionsAut
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'RESET'){
      body = mailOptionsReset
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'calcResults'){
      body = mailOptionsResults
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'actualizaciones'){
      body = mailOptionsActualizaciones
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'actualizacionesND'){
      body = mailOptionsActualizacionesND
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'actualizacionesArray'){
      body = mailOptionsActualizacionesArray
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'actualizacionesNormas'){
      body = mailOptionsPublicacionesArray;
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type === 'categorias'){
      body = mailOptionsCategorias;
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }else if(type==='n/a'){
      body = mailOptionsNA;
      smtpTransport = nodemailer.createTransport(transporter({
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.AWS_SES_USER,
          pass: process.env.AWS_SES_PASS
        }
      }));
    }
    let result = smtpTransport.sendMail(body, function(err, info){
      if(err){
        resolve(err);
      }else{
        resolve(true)
      };
    });
  });
};


exports.sendAWSEmail = sendAWStemplateEmail;
