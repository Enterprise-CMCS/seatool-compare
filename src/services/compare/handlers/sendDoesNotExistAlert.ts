import {
  sendTemplatedEmail,
  doesSecretExist,
  getSecretsValue,
  putLogsEvent,
  trackError,
} from "../../../libs";

const Templates = {
  SendNoMatchTemplateInitial: "SendNoMatchTemplateInitialTemplate",
  SendNoMatchTemplateFollowUp: "SendNoMatchTemplateInitialFollowUpTemplate",
  SendNoMatchTemplateChpInitial: "SendNoMatchTemplateChpTemplate",
  SendNoMatchTemplateChpFollowUp: "SendNoMatchTemplateChpFollowUpTemplate",
};

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const region = process.env.region;
  const project = process.env.project;
  const stage = process.env.stage;

  if (!region) throw "process.env.region needs to be defined.";

  // use this secret path to define the { emailRecipients, sourceEmail } for the does not exist email
  // changing alerts to mmdl-alerts
  // secret will look like this {sourceEmail:"" CHP:[], nonCHP:[]}
  const secretId = `${project}/${stage}/mmdl-alerts`;

  const data = { ...event.Payload };
  const transmittalNumber = data.transmittalNumber;

  const secretExists = await doesSecretExist(region, secretId);

  try {
    //checking if the secrets exist
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches
      const params = getEmailParams({
        id: data.id,
        Template: Templates.SendNoMatchTemplateInitial,
      });
      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details:",
        JSON.stringify(params, null, 2)
      );
      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for id: ${data.id} transmittal number: ${transmittalNumber} - TEST `,
      });
    } else {
      //if secrests does not exist
      const emailParams = await getSecretsValue(region, secretId);

      // i have defined these variables to use them as flags to fill the email data fields dynamocally
      let recipientType;
      let recipients;
      const isChp = data.programType == "CHP"; // isChp caintains true||false

      let emailData = { sourceEmail: emailParams.sourceEmail };

      // depending on if chip true||false filling in the info
      let recipientEmails;

      const { CHP, nonCHP } = emailParams;
      // CHP or nonCHP contains emailRecipientsInitial, emailRecipientsFirstFollowUp, emailRecipientsSecondFollowUp
      recipientEmails = isChp ? CHP : nonCHP;
      const {
        emailRecipientsInitial,
        emailRecipientsFirstFollowUp,
        emailRecipientsSecondFollowUp,
      } = recipientEmails;

      emailData["emailRecipientsInitial"] = emailRecipientsInitial;
      emailData["emailRecipientsFirstFollowUp"] = emailRecipientsFirstFollowUp;
      emailData["emailRecipientsSecondFollowUp"] = 
        emailRecipientsSecondFollowUp;

      // defining an object to map and calculate init, first and second followup email
      const emailRecipientsTypes = {
        emailRecipientsInitial: data.secSinceMmdlSigned < 48 * 3600, // less hen tow days
        emailRecipientsFirstFollowUp:
          data.secSinceMmdlSigned > 48 * 3600 && // if it is after two days
          data.secSinceMmdlSigned < 48 * 2 * 3600, // and before four days
        emailRecipientsSecondFollowUp: data.secSinceMmdlSigned > 48 * 2 * 3600, // after four days
      };

      // if it greater then 2 days but less then 4 days
      if (emailRecipientsTypes.emailRecipientsFirstFollowUp) {
        recipientType = "emailRecipientsFirstFollowUp";
        recipients = emailData["emailRecipientsFirstFollowUp"];
      }
      // if it is greater then 4 days
      else if (emailRecipientsTypes.emailRecipientsSecondFollowUp) {
        recipientType = "emailRecipientsSecondFollowUp";
        recipients = emailData["emailRecipientsSecondFollowUp"];
      }
      // if it is less then 2 days
      else if (emailRecipientsTypes.emailRecipientsInitial) {
        recipientType = "emailRecipientsInitial";
        recipients = emailData["emailRecipientsInitial"];
      }
      console.log({
        emailRecipientsTypes,
        recipients,
        thisRecipientType: recipientType,
      });

      // this object will go inside the send template email
      // just the template is going to be chaned
      let paramsToGetEmailParams = {
        emailRecipients: recipients,
        sourceEmail: emailData.sourceEmail,
        id: data.id,
        Template: "",
      };

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      // depending on if it is chip or not
      // and if its inital or not we are getting the template names
      if (!isChp) {
        //for non chip
        if (emailRecipientsTypes.emailRecipientsInitial) {
          paramsToGetEmailParams.Template =
            Templates.SendNoMatchTemplateInitial;
        } else {
          paramsToGetEmailParams.Template =
            Templates.SendNoMatchTemplateFollowUp;
        }
      } else {
        // for chip
        if (emailRecipientsTypes.emailRecipientsInitial) {
          paramsToGetEmailParams.Template =
            Templates.SendNoMatchTemplateChpInitial;
        } else {
          paramsToGetEmailParams.Template =
            Templates.SendNoMatchTemplateChpFollowUp;
        }
      }

      // finally getting the params to send email
      const params = getEmailParams(paramsToGetEmailParams);

      // previously we were using sendAlert,
      // now we are using SendTemplatedEmail as we are sending template email
      // now finally sending the email
      await sendTemplatedEmail(params);

      // putting the cloud watch logs event
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

const getEmailParams = ({
  emailRecipients = ["notexistrecipients@example.com"],
  sourceEmail = "officialcms@example.com",
  id,
  Template,
}) => {
  return {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Source: sourceEmail,
    Template: Template,
    TemplateData: JSON.stringify({ id: id }),
  };
};
