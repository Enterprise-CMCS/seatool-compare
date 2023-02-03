import {
  sendAlert,
  doesSecretExist,
  getSecretsValue,
  putLogsEvent,
  trackError,
} from "../../../libs";

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

  // use this secret path to define the { emailRecipients, sourceEmail } for the does not match email
  const secretId = `${project}/${stage}/alerts`;

  const data = { ...event.Payload };
  const id: string = data.id;

  const secretExists = await doesSecretExist(region, secretId);

  /* This is checking to see if the secret exists. If it does not exist, it will not send an email. */
  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches
      const params = getRecordDoesNotMatchParams({ id });
      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(params, null, 2)
      );

      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for ${id} - TEST `,
      });
    } else {
      const { emailRecipients, sourceEmail } = await getSecretsValue(
        region,
        secretId
      );

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      const params = getRecordDoesNotMatchParams({
        emailRecipients,
        sourceEmail,
        id,
      });

      await sendAlert(params);

      await putLogsEvent({
        type: "NOTFOUND",
        message: `Alert for ${id} - sent to ${JSON.stringify(emailRecipients)}`,
      });
    }
  } catch (e) {
    await trackError(e);
  } finally {
    callback(null, data);
  }
};

function getRecordDoesNotMatchParams({
  emailRecipients = ["nomatchrecipients@example.com"],
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
          Data: `Record with id: ${id} does not match in SEA Tool.`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - MMDL record for ${id} needs corrected in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };
}
