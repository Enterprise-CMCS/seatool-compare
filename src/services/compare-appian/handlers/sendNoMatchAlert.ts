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
  const stage = process.env.stage;

  if (!region) throw "process.env.region needs to be defined.";

  const secretId = `${project}/${stage}/alerts-appian`;

  const data: Types.AppianReportData = {
    ...event.Payload,
  } as Types.AppianSeatoolCompareData;
  const id: string = data.SPA_ID;
  const secretExists = await Libs.doesSecretExist(region, secretId);
  const secSinceAppianSubmitted = data.secSinceAppianSubmitted || 0;
  const isIgnoredState = getIsIgnoredState(data);

  // Was this submitted more than five days ago? If so, it's urgent:
  const isUrgent = secSinceAppianSubmitted >= 432000; // Five days in secs

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
