import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { getSecretsValue } from "../../../libs/secrets-manager-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const { emailRecipients, sourceEmail } = await getSecretsValue({
    region: process.env.region,
    secretId: process.env.secretId,
  });
  const id = event.Context.Execution.Input.id;

  const client = new SESClient({ region: process.env.region });
  const params = {
    Destination: {
      ToAddresses: emailRecipients,
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Space Shuttle, this is Flight Safety, be advised that ${id} is non existent or wrong in SEA Tool.`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `ACTION REQUIRED - MMDL record for ${id} needs correction in SEA Tool`,
      },
    },
    Source: sourceEmail,
  };

  const response = {
    statusCode: 200,
  };

  console.log("Sending email with params:", JSON.stringify(params, null, 2));
  const command = new SendEmailCommand(params);

  try {
    const result = await client.send(command);
    console.log("Result from sending alert:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("ERROR sending alert:", JSON.stringify(e, null, 2));
  } finally {
    callback(null, response);
  }
};
