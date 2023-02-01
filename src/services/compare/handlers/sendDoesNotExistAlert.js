import {
  sendAlert,
  doesSecretExist,
  getSecretsValue,
  putLogsEvent,
  getLogsEvent,
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
      if (data.programType == "CHP") {
        secretId = `${project}/${stage}/alerts/CHP`;
      }
      //{ emailRecipients, sourceEmail, emailRecipientsA, emailRecipientsB }
      const { emailRecipients, sourceEmail, emailRecipientsA, emailRecipientsB} = await getSecretsValue({
        region,
        secretId,
      });

      const logs = await getLogsEvent({ type: "NOTFOUND", id: data.id });
      const recipientMap = processEvents(logs, data.id);
      console.log(JSON.stringify({recipientMap}));
      let recipientType = null;
      let recipients;
      if (recipientMap["emailRecipients"] && recipientMap["emailRecipientsA"] && recipientMap["emailRecipientsB"]) {
        recipientType = "emailRecipientsB";
        recipients = emailRecipientsB;
      }else if(recipientMap["emailRecipients"] && recipientMap["emailRecipientsA"]){
        recipientType = "emailRecipientsB";
        recipients = emailRecipientsB;
      }else if (recipientMap["emailRecipients"] ) {
        recipientType = "emailRecipientsA";
        recipients = emailRecipientsA;
      }else{
        recipientType = "emailRecipients";
        recipients = emailRecipients;
      }

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      const params = getRecordDoesNotExistParams({
        recipients,
        sourceEmail,
        id: data.id,
      });

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
          Data: `Record with id: ${id} does not exist in SEA Tool.`,
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

const processEvents = (logs, id) => {
  const { events } = logs;
  const extensions = {};
  events.forEach(event => {
      if (event.message.includes(id)) {
          extensions[event.message.split('recipient:')[1]] = true;
      }
  });
  return extensions;
};