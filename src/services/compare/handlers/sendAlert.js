import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  doesSecretExist,
  getSecretsValue,
} from "../../../libs/secrets-manager-lib";

const getEmailParams = ({
  emailRecipients = ["exampleRecipient@example.com"],
  sourceEmail = "exampleSource@example.com",
  id,
}) => ({
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
});

exports.handler = async function (event, context, callback) {
  const region = process.env.region;
  const project = process.env.project;
  const stage = process.env.stage;
  const secretId = `${project}/${stage}/alerts`;

  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;

  const secretExists = await doesSecretExist(region, secretId);

  if (!secretExists) {
    // Secret doesnt exist - this will likely be the case on ephemeral branches
    const params = getEmailParams({ id });
    console.log(
      "EMAIL NOT SENT - Secret does not exist for this stage which would define recipients and source"
    );
    console.log("Example email details: ", JSON.stringify(params, null, 2));
  } else {
    const { emailRecipients, sourceEmail } = await getSecretsValue({
      region,
      secretId,
    });

    const client = new SESClient({ region });
    const params = getEmailParams({ emailRecipients, sourceEmail, id });

    console.log("Sending email with params:", JSON.stringify(params, null, 2));
    const command = new SendEmailCommand(params);

    try {
      const result = await client.send(command);
      console.log(
        "Result from sending alert:",
        JSON.stringify(result, null, 2)
      );
    } catch (e) {
      console.log("ERROR sending alert:", JSON.stringify(e, null, 2));
    } finally {
      callback(null, { statusCode: 200 });
    }
  }
};
