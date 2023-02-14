import {
  sendAlert,
  doesSecretExist,
  getSecretsValue,
  putLogsEvent,
  trackError,
} from "../../../libs";

//! This work/logic will be done in another ticket

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
  const secretId = `${project}/${stage}/alerts`;

  const data = { ...event.Payload };
  const id = data.SPA_ID;

  const secretExists = await doesSecretExist(region, secretId);

  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches
      const params = getRecordDoesNotExistParams({ id });
      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(params, null, 2)
      );
      await putLogsEvent({
        type: "NOTFOUND-APPIAN",
        message: `Alert for SPA_ID ${id} - TEST `,
      });
    } else {
      const { emailRecipients, sourceEmail } = await getSecretsValue(
        region,
        secretId
      );

      console.log(emailRecipients, sourceEmail);

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      const params = getRecordDoesNotExistParams({
        emailRecipients,
        sourceEmail,
        id,
      });

      console.log(params);

      await sendAlert(params);

      await putLogsEvent({
        type: "NOTFOUND-APPIAN",
        message: `Alert for SPA_ID ${id} - sent to ${JSON.stringify(
          emailRecipients
        )}`,
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
}: {
  emailRecipients?: string[];
  sourceEmail?: string;
  id: string;
}) {
  return {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Record with SPA-ID ${id} does not exist in SEA Tool.`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - Appian record for SPA_ID${id} needs added in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };
}
