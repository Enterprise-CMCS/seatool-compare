import {
  sendAlert,
  doesSecretExist,
  getSecretsValue,
  putLogsEvent,
  trackError,
} from "../../../libs";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const region = process.env.region;
  const project = process.env.project;
  const stage = process.env.stage;

  // use this secret path to define the { emailRecipients, sourceEmail } for the does not exist email
  let secretId = `${project}/${stage}/alerts`;

  const data = { ...event.Payload };

  const secretExists = await doesSecretExist(region, secretId);

  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches
      const params = getRecordDoesNotExistParams({ id: data.id });
      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(params, null, 2)
      );
      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for ${data.id} - TEST `,
      });
    } else {
      let isProgramTypeChp = false;
      if (data.programType == "CHP") {
        secretId = `${project}/${stage}/alerts/CHP`;
        isProgramTypeChp = true;
      }
      //{ emailRecipients, sourceEmail, emailRecipientsA, emailRecipientsB }
      const {
        emailRecipients,
        sourceEmail,
        emailRecipientsA,
        emailRecipientsB,
      } = await getSecretsValue({
        region,
        secretId,
      });
      let recipientType;
      let recipients;
      // if it greater then 2 days but less then 4 days
      if (
        data.secSinceMmdlSigned > 48 * 3600 &&
        data.secSinceMmdlSigned < 48 * 2 * 3600
      ) {
        recipientType = "emailRecipientsA";
        recipients = emailRecipientsA;
        console.table({
          secSinceMmdlSigned: data.secSinceMmdlSigned,
          twoDays: 48 * 3600,
          recipients,
          recipientType,
          "(data.secSinceMmdlSigned > (48 * 3600)) && (data.secSinceMmdlSigned < ((48 * 2) * 3600))":
            data.secSinceMmdlSigned > 48 * 3600 &&
            data.secSinceMmdlSigned < 48 * 2 * 3600,
        });
      }
      // if it is greater then 4 days
      else if (data.secSinceMmdlSigned > 48 * 2 * 3600) {
        recipientType = "emailRecipientsB";
        recipients = emailRecipientsB;
        console.table({
          secSinceMmdlSigned: data.secSinceMmdlSigned,
          twoDays: 48 * 3600,
          recipients,
          recipientType,
          "(data.secSinceMmdlSigned > (48 * 3600))":
            data.secSinceMmdlSigned > 48 * 3600,
        });
      }
      // if it is less then 2 days
      else {
        recipientType = "emailRecipients";
        recipients = emailRecipients;
        console.table({
          secSinceMmdlSigned: data.secSinceMmdlSigned,
          twoDays: 48 * 3600,
          recipients,
          recipientType,
          "(data.secSinceMmdlSigned < (48 * 3600))":
            data.secSinceMmdlSigned < 48 * 3600,
        });
      }

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      let params;
      if (!isProgramTypeChp) {
        //for non chip
        if (recipientType == "emailRecipients") {
          params = getRecordDoesNotExistParams({
            recipients,
            sourceEmail,
            id: data.id,
          });
        }else{
          params = getRecordDoesNotExistParamsAB({
            recipients,
            sourceEmail,
            id: data.id,
          });
        }
      }else{
        // for chip
        if (recipientType == "emailRecipients") {
          params = getRecordDoesNotExistParamsChp({
            recipients,
            sourceEmail,
            id: data.id,
          });
        }else{
          params = getRecordDoesNotExistParamsChpAB({
            recipients,
            sourceEmail,
            id: data.id,
          });
        }
      }


      await sendAlert(params);

      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for ${data.id} - sent to ${JSON.stringify(
          recipients
        )} recipient:${recipientType}`,
      });
    }
  } catch (e) {
    await trackError(e);
  } finally {
    callback(null, data);
  }
};

function getRecordDoesNotExistParams({
  emailRecipients = ["notexistrecipients@example.com"],
  sourceEmail = "officialcms@example.com",
  id,
}) {
  return {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Document</title>
              <style>
                  div {
                      background-color:  rgb(22, 82, 150);
                      width: 580px;
                      border: 15px solid  rgb(22, 82, 150);;
                      /* padding: 50px; */
                      margin: 20px;
                      color: white;
                  }
                  .dev1{
                      color: white;
                  }
              </style>
          </head>
          <body>
              <center >
                  <h2>This is Reminder that there's no matching</h2>
                  <h2>record in <a href="">SEA Tool</a> for ${id} </h2>
                  <br>
                  <p>Either a  record wasn't created in SEA Tool, or the SEA id is MMDL and SEA Tool doesn't Match</p>
                  <br>
                  <div id="dev1">
                      if you have any questions, please contact the help desk at SEATool_helpDesk@cms.hhs.org
                  </div>
              </center>
          </body>
          </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - MMDL record for ${id} needs added in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };
}

function getRecordDoesNotExistParamsAB({
  emailRecipients = ["notexistrecipients@example.com"],
  sourceEmail = "officialcms@example.com",
  id,
}) {
  return {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Document</title>
              <style>
                  div {
                      background-color:  rgb(22, 82, 150);
                      width: 580px;
                      border: 15px solid  rgb(22, 82, 150);;
                      /* padding: 50px; */
                      margin: 20px;
                      color: white;
                  }
                  .dev1{
                      color: white;
                  }
              </style>
          </head>
          <body>
              <center >
                  <h2>This is a Urgent Reminder that there's no matching</h2>
                  <h2>matching record in <a href="">SEA Tool</a> for ${id} </h2>
                  <br>
                  <p>Either a  record wasn't created in SEA Tool, or the SEA id is MMDL and SEA Tool doesn't Match</p>
                  <p>Failure to address this could lead to critical delay in the review process and</p>
                  <p>a deemed aproved SPA or waiver action.</p>
                  <br>
                  <div id="dev1">
                      if you have any questions, please contact the help desk at SEATool_helpDesk@cms.hhs.org
                  </div>
              </center>
          </body>
          </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - MMDL record for ${id} needs added in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };
}

function getRecordDoesNotExistParamsChp({
  emailRecipients = ["notexistrecipients@example.com"],
  sourceEmail = "officialcms@example.com",
  id,
}) {
  return {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Document</title>
              <style>
                  div {
                      background-color:  rgb(22, 82, 150);
                      width: 580px;
                      border: 15px solid  rgb(22, 82, 150);;
                      /* padding: 50px; */
                      margin: 20px;
                      color: white;
                  }
                  .dev1{
                      color: white;
                  }
              </style>
          </head>
          <body>
              <center >
                  <h2>This is Reminder that there's no matching</h2>
                  <h2>record in <a href="">SEA Tool</a> for ${id} </h2>
                  <br>
                  <p>Either a  record wasn't created in SEA Tool, or the SEA id is MMDL and SEA Tool doesn't Match</p>
                  <br>
                  <div id="dev1">
                      if you have any questions, please contact the help desk at SEATool_helpDesk@cms.hhs.org
                  </div>
              </center>
          </body>
          </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - MMDL record for ${id} needs added in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };
}
function getRecordDoesNotExistParamsChpAB({
  emailRecipients = ["notexistrecipients@example.com"],
  sourceEmail = "officialcms@example.com",
  id,
}) {
  return {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `<!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Document</title>
              <style>
                  div {
                      background-color:  rgb(22, 82, 150);
                      width: 580px;
                      border: 15px solid  rgb(22, 82, 150);;
                      /* padding: 50px; */
                      margin: 20px;
                      color: white;
                  }
                  .dev1{
                      color: white;
                  }
              </style>
          </head>
          <body>
              <center >
                  <h2>This is a Urgent Reminder that there's no matching</h2>
                  <h2>matching record in <a href="">SEA Tool</a> for ${id} </h2>
                  <br>
                  <p>Either a  record wasn't created in SEA Tool, or the SEA id is MMDL and SEA Tool doesn't Match</p>
                  <p>Failure to address this could lead to critical delay in the review process and</p>
                  <p>a deemed aproved SPA</p>
                  <br>
                  <div id="dev1">
                      if you have any questions, please contact the help desk at SEATool_helpDesk@cms.hhs.org
                  </div>
              </center>
          </body>
          </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - MMDL record for ${id} needs added in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };
}