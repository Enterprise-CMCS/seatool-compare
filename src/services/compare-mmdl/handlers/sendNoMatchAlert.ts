import * as Libs from "../../../libs";
import * as Types from "../../../types";
import { getEmailBody } from "../../../libs";
import { getEmailContent } from "./utils/getEmailContent";

/*
  secret should be formatted like this: validate your JSON!!
  secret name: compare/[stage]/mmdl-alerts
  {
    "sourceEmail":"someAuthorizedSender@example.com",
    "CHP": {
      "ToAddresses": ["probablySomeGovernmentEmail@example.com"],
      "CcAddresses":[
        {"email":"emailOne@example.com","alertIfGreaterThanSeconds":345600},
        {"email":"emailTwo@example.com","alertIfGreaterThanSeconds":518400},
      ]
    },
    "nonCHP":{
      "ToAddresses":["probablySomeGovernmentEmail@example.com"],
      "CcAddresses":[
        {"email":"emailOne@example.com","alertIfGreaterThanSeconds":345600},
        {"email":"emailTwo@example.com","alertIfGreaterThanSeconds":518400},
      ]
    }
  }
*/

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

  const secretId = `${project}/${stage}/mmdl-alerts`;

  const data = { ...event.Payload } as Types.MmdlSeatoolCompareData;
  const isCHP = data.programType == "CHP";
  const transmittalNumber = data.transmittalNumber;
  const secretExists = await Libs.doesSecretExist(region, secretId);
  const secSinceMmdlSigned = data.secSinceMmdlSigned || 0;

  // has this been signed more than five days ago - if so its urgent
  const isUrgent = secSinceMmdlSigned >= 432000; // five days

  const emailContent = getEmailContent({ id: transmittalNumber, isUrgent });
  const emailBody = getEmailBody(emailContent);
  const subjectText = `${transmittalNumber} - ACTION REQUIRED - No matching record in SEA Tool`;

  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches

      const params = Libs.getEmailParams({
        id: transmittalNumber,
        Body: emailBody,
      });

      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details:",
        JSON.stringify(params, null, 2)
      );

      await Libs.putLogsEvent({
        type: "NOTFOUND-MMDL",
        message: `Alert for id: ${data.id} with transmittal number: ${transmittalNumber} - TEST `,
      });
    } else {
      // if secrests does exist

      const mmdlSecret = (await Libs.getSecretsValue(
        region,
        secretId
      )) as Types.MmdlSecret;

      const sourceEmail = mmdlSecret.sourceEmail;
      const ToAddresses = mmdlSecret[isCHP ? "CHP" : "nonCHP"].ToAddresses;

      const CcAddresses = mmdlSecret[
        isCHP ? "CHP" : "nonCHP"
      ].CcAddresses.filter(
        (r) => secSinceMmdlSigned >= r.alertIfGreaterThanSeconds
      ).map((r) => r.email);

      const emailParams = Libs.getEmailParams({
        Body: emailBody,
        id: transmittalNumber,
        CcAddresses,
        sourceEmail,
        subjectText,
        ToAddresses,
      });

      await Libs.sendAlert(emailParams);

      await Libs.putLogsEvent({
        type: "NOTFOUND-MMDL",
        message: `Alert for id: ${
          data.id
        } with transmittal number: ${transmittalNumber} - to ${[
          ...ToAddresses,
          ...CcAddresses,
        ].join(", ")}`,
      });
    }
  } catch (e) {
    await Libs.trackError(e);
  } finally {
    callback(null, data);
  }
};
