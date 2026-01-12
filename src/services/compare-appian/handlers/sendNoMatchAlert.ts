import * as Libs from "../../../libs";
import * as Types from "../../../types";
import { getEmailContent } from "./utils/getEmailContent";
import { getIsIgnoredState } from "./utils/getIsIgnoredState";

/*
  secret should be formatted like this: validate your JSON!!
  secret name: compare/[stage]/alerts-appian

  {
  	"sourceEmail": "source@example.com",
  	"emailRecipients": {
  		"ToAddresses": ["recipient@example.com"],
  		"CcAddresses": [{
  				"email": "emailOne@example.com",
  				"alertIfGreaterThanSeconds": 345600
  			},
  			{
  				"email": "emailTwo@example.com",
  				"alertIfGreaterThanSeconds": 518400
  			}
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
  const stage = process.env.stage ?? "master";

  if (!region) throw "process.env.region needs to be defined.";

  const secretId = `${project}/${stage}/alerts-appian`;

  const data: Types.AppianSeatoolCompareData = {
    ...event.Payload,
  }
  const id: string = data.SPA_ID;
  const secretExists = await Libs.doesSecretExist(region, secretId);
  const secSinceAppianSubmitted = data.secSinceAppianSubmitted || 0;
  const isIgnoredState = getIsIgnoredState(data);

  // Validate record is still a valid Official submission before sending email
  // Note: appianRecord from DynamoDB has payload property, but AppianRecord type is narrowly defined
  const appianRecord = data.appianRecord as any;
  const isValidOfficialSubmission =
    id && // SPA_ID is not null/undefined
    appianRecord?.payload?.SBMSSN_TYPE?.toLowerCase() === "official" &&
    appianRecord?.payload?.SPA_PCKG_ID?.toLowerCase()?.endsWith("o");

  if (!isValidOfficialSubmission) {
    console.log(
      `EMAIL NOT SENT - Record is no longer a valid Official submission. ` +
        `SPA_ID: ${id}, SBMSSN_TYPE: ${appianRecord?.payload?.SBMSSN_TYPE}, ` +
        `SPA_PCKG_ID: ${appianRecord?.payload?.SPA_PCKG_ID}`
    );

    await Libs.putLogsEvent({
      type: "NOTFOUND-APPIAN",
      message: `Alert SKIPPED for PK ${data.PK} - Record no longer valid Official submission`,
    });

    callback(null, data);
    return;
  }

  // Check if submission exceeds the urgent threshold (configured per environment)
  const isUrgentThresholdSec = parseInt(process.env.isUrgentThresholdSec || "432000", 10);
  const isUrgent = secSinceAppianSubmitted >= isUrgentThresholdSec;

  // Build the email from the template:
  const emailContent = getEmailContent({
    id,
    isUrgent,
    seatoolSubdomain: process.env.seatoolSubdomain,
  });
  const emailBody = Libs.getEmailBody(emailContent);
  const subjectText = `${id} - ACTION REQUIRED - No matching record in SEA Tool`;

  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches

      const params = Libs.getEmailParams({
        id: id,
        Body: emailBody,
      });

      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(params, null, 2)
      );

      await Libs.putLogsEvent({
        type: "NOTFOUND-APPIAN",
        message: `Alert for ${id} - TEST `,
      });
    } else {
      // Secret does exist:
      const appianSecret = (await Libs.getSecretsValue(
        region,
        secretId
      )) as Types.AppianSecret;

      const sourceEmail = appianSecret.sourceEmail;
      const ToAddresses = appianSecret.emailRecipients.ToAddresses;
      // Add CC addresses only if the time since submission is longer than the
      // duration set in `alertIfGreaterThanSeconds` in the secrets JSON
      // (see example at top of file)
      const CcAddresses = appianSecret.emailRecipients.CcAddresses.filter(
        (r) => secSinceAppianSubmitted >= r.alertIfGreaterThanSeconds
      ).map((r) => r.email);

      const emailParams = Libs.getEmailParams({
        Body: emailBody,
        id: id,
        CcAddresses,
        sourceEmail,
        subjectText,
        ToAddresses,
      });

      if (!isIgnoredState) {
        await Libs.sendAlert(emailParams);
      }

      await Libs.putLogsEvent({
        type: "NOTFOUND-APPIAN",
        message: `${
          isIgnoredState ? "IGNORED STATE - " : ""
        }Alert for ${id} - sent to ${[...ToAddresses, ...CcAddresses].join(
          ", "
        )}`,
      });
    }
  } catch (e) {
    await Libs.trackError(e);
  } finally {
    callback(null, data);
  }
};
