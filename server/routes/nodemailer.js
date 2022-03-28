const express = require('express');
const app = express();
const path = require('path');
const config = require('../config/config');
const moment = require('moment');
const nodemailer = require('nodemailer')
const transporter = require('nodemailer-smtp-transport');

//==============================================================================
//=========================FUNCTION PARA ENVIAR EMAILS DE ACCLAW================
//===========================NODEMAILER=========================================
const pathFiles = path.join(__dirname, '../');
async function sendEmail (email, cc, referencia, content, pageSelectData, pageTypeData, type, calculo) {
  return new Promise((resolve, reject) => {
    let mailOptions = {
      from: 'soporte@lawanalytics.com.ar',
      to: email,
      cc: cc,
      subject: 'Law||Analytics - Actualización de notificaciones',
      html: '<img src="cid:unique@kreata.ee"/><p>Actualización de notificaciones bajo la referencia ' + referencia + ' (' + pageSelectData + pageTypeData + ')' + ': </p><br>' + content + '<br>' + '<p>Este es un mensaje automático de www.lawanalytics.com.ar.</p>',
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };
    let mailOptionsAut = {
      from: 'soporte@lawanalytics.com.ar',
      to: email,
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
      from: 'soporte@lawanalytics.com.ar',
      to: email,
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
      from: 'calculo@lawanalytics.com.ar',
      to: email,
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
      from: 'soporte@lawanalytics.com.ar',
      to: email,
      subject: 'Law||Analytics - Actualizaciones.',
      html: `<img src="cid:unique@kreata.ee"/>
      <p>Tasa de interés actualizada: ${calculo[2]}</p>
      <p>Fecha: ${moment(calculo[0], "YYYYMMDD").format('DD/MM/YYYY')}</p>
      <p>Valor: ${calculo[1]}</p>
      <br></br>`,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };
    let mailOptionsActualizacionesND = {
      from: 'soporte@lawanalytics.com.ar',
      to: email,
      subject: 'Law||Analytics - Actualizaciones.',
      html: `<img src="cid:unique@kreata.ee"/>
      <p>Tasa de interés actualizada: ${calculo[0]}</p>
      <p>No hay actualizaciones disponibles.</p>
      <br></br>`,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };
    let mailOptionsActualizacionesArray = {
      from: 'soporte@lawanalytics.com.ar',
      to: email,
      subject: 'Law||Analytics - Actualizaciones.',
      html: `<img src="cid:unique@kreata.ee"/>
      <p>Tasa de interés actualizada: ${calculo[0]}</p>
      <p>Fechas y valores actualizados: ${calculo[1]}.</p>
      <br></br>`,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };
    let mailOptionsPublicacionesArray = {
      from: 'soporte@lawanalytics.com.ar',
      to: email,
      subject: 'Law||Analytics - Actualizaciones.',
      html: `<img src="cid:unique@kreata.ee"/>
      <p>Actualizaciones normativas disponibles:</p>
      <br>` + calculo,
      attachments: [{
        filename: 'lawanalyticsBanner.PNG',
        path: pathFiles + 'files/serverFiles/lawanalyticsBanner.PNG',
        cid: 'unique@kreata.ee'
      }]
    };


    let body;
    let smtpTransport;
    if (type === 'captcha') {
      body = mailOptions
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'AUT'){
      body = mailOptionsAut
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'RESET'){
      body = mailOptionsReset
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'calcResults'){
      body = mailOptionsResults
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'actualizaciones'){
      body = mailOptionsActualizaciones
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'actualizacionesND'){
      body = mailOptionsActualizacionesND
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'actualizacionesArray'){
      body = mailOptionsActualizacionesArray
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }else if(type === 'actualizacionesNormas'){
      body = mailOptionsPublicacionesArray;
      smtpTransport = nodemailer.createTransport(transporter({
        service: "Mailgun",
        auth: {
          user: "postmaster@lawanalytics.com.ar",
          pass: "10a6fdae0fa5da32f7f9a9a6a9f687e9-62916a6c-5b91d626"
        }
      }));
    }
    let result = smtpTransport.sendMail(body, function(err, info){
      if(err){
        //TODO GRABAR REPORTE DE ERRORES
        resolve(false);
      }else{
        resolve(true)
      };
    });
  });
};
exports.sendEmail = sendEmail;
