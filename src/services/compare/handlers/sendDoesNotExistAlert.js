import { sendAlert } from "../../../libs/ses-lib";
import {
  doesSecretExist,
  getSecretsValue,
} from "../../../libs/secrets-manager-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const region = process.env.region;
  const project = process.env.project;
  const stage = process.env.stage;

  const secretId = `${project}/${stage}/alerts`;

  const data = { ...event.Payload };

  const secretExists = await doesSecretExist(region, secretId);

  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches
      const params = getRecordDoesNotExistParams({ id: data.id });
      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage which would define recipients and source"
      );
      console.log("Example email details: ", JSON.stringify(params, null, 2));
    } else {
      const { emailRecipients, sourceEmail } = await getSecretsValue({
        region,
        secretId,
      });

      // you can also use the data.programType value here if needed "MAC" | "HHS" | "CHP"
      const params = getRecordDoesNotExistParams({
        emailRecipients,
        sourceEmail,
        id: data.id,
      });

      const result = await sendAlert(params);
      console.log(
        "Result from sending alert:",
        JSON.stringify(result, null, 2)
      );
    }
  } catch (e) {
    console.error("ERROR sending alert:", JSON.stringify(e, null, 2));
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
