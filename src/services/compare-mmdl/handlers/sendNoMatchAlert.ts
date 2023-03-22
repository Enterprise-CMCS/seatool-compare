import * as Libs from "../../../libs";
import * as Types from "../../../types";
import { getEmailBody } from "../../../libs";
import { getEmailContent } from "./utils/getEmailContent";
import { getIsIgnoredState } from "./utils/getIsIgnoredState";

/*
  secret should be formatted like this: validate your JSON!!
  secret name: compare/[stage]/mmdl-alerts

  {
  	"sourceEmail": "someAuthorizedSender@example.com",
  	"CHP": {
  		"ToAddresses": ["probablySomeGovernmentEmail@example.com"],
  		"CcAddresses": [{
  				"email": "emailOne@example.com",
  				"alertIfGreaterThanSeconds": 345600
  			},
  			{
  				"email": "emailTwo@example.com",
  				"alertIfGreaterThanSeconds": 518400
  			}
  		]
  	},
  	"nonCHP": {
  		"ToAddresses": ["probablySomeGovernmentEmail@example.com"],
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

  const secretId = `${project}/${stage}/mmdl-alerts`;

  const data: Types.MmdlReportData = {
    ...event.Payload,
  } as Types.MmdlReportData;
  const isCHP = data.programType == "CHP";
  const secretExists = await Libs.doesSecretExist(region, secretId);
  const secSinceMmdlSigned = data.secSinceMmdlSigned || 0;
  const isIgnoredState = getIsIgnoredState(data);

  // has this been signed more than five days ago - if so its urgent
  const isUrgent = secSinceMmdlSigned >= 432000; // five days

  if (!data.TN) {
    throw "transmittal number required to get email content";
  }

  const emailContent = getEmailContent({
    id: data.TN,
    isUrgent,
    seatoolSubdomain: process.env.seatoolSubdomain,
    isCHP,
  });
  const emailBody = getEmailBody(emailContent);
  const subjectText = `${data.TN} - ACTION REQUIRED - No matching record in SEA Tool`;

  try {
    if (!secretExists) {
      // Secret doesnt exist - this will likely be the case on ephemeral branches

      const params = Libs.getEmailParams({
        id: data.TN,
        Body: emailBody,
      });

      console.log(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details:",
        JSON.stringify(params, null, 2)
      );

      await Libs.putLogsEvent({
        type: "NOTFOUND-MMDL",
        message: `Alert for id: ${data.PK} with transmittal number: ${data.TN} - TEST `,
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
        id: data.TN,
        CcAddresses,
        sourceEmail,
        subjectText,
        ToAddresses,
      });

      if (!isIgnoredState) {
        await Libs.sendAlert(emailParams);
      }

      await Libs.putLogsEvent({
        type: "NOTFOUND-MMDL",
        message: `${isIgnoredState ? "TEST STATE - " : ""}Alert for id: ${
          data.PK
        } with transmittal number: ${data.TN} - to ${[
          ...ToAddresses,
          ...CcAddresses,
        ].join(", ")}.`,
      });
    }
  } catch (e) {
    await Libs.trackError(e);
  } finally {
    callback(null, data);
  }
};
