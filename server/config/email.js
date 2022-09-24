const express = require('express');
const app = express();
const path = require('path');
const moment = require('moment');
const AWS = require('aws-sdk');

function sendAWStemplateEmail (recipientEmail, template, templateData, SES_CONFIG) {
  const AWS_SES = new AWS.SES(SES_CONFIG);
  let params = {
  Destinations:  recipientEmail,
    Source: 'no-reply@lawanalytics.app',
    Template: template,
    DefaultTemplateData: templateData,
};
  return AWS_SES.sendBulkTemplatedEmail(params).promise()
}
exports.getTemplates = (SES_CONFIG) => {
  const AWS_SES = new AWS.SES(SES_CONFIG);
  return AWS_SES.listTemplates({MaxItems: 10}).promise();
};

exports.sendAWSEmail = sendAWStemplateEmail;
