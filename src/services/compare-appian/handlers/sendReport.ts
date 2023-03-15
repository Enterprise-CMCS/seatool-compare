import * as Libs from "../../../libs";
import * as Types from "../../../types";

function formatDateString(dateMs: number) {
  return new Date(dateMs).toLocaleString("{en-US", {
    timeZone: "America/New_York",
  });
}

function formatReportData(data: Types.AppianReportData[]) {
  return data.map((i) => {
    return {
      PCKG_ID: i.id,
      "SPA ID": i.SPA_ID,
      "Iterations ": i.iterations,
      "Submission Date": i.appianSubmittedDate
        ? formatDateString(i.appianSubmittedDate)
        : "",
      "Seatool Record Exist": i.seatoolExist,
      "Seatool Signed Date": i.seatoolSubmissionDate
        ? formatDateString(Number(i.seatoolSubmissionDate))
        : "N/A",
      "Records Match": i.match || false,
    };
  });
}

function getMailOptionsWithAttachment(
  recipientEmail: string,
  attachment: string
) {
  const todaysDate = new Date().toISOString().split("T")[0];
  const mailOptions = {
    from: "noreply@cms.hhs.gov",
    subject: `Appian SEA Tool Status - ${todaysDate}`,
    html:
      `<p>Attached is a csv indicating the current status of Appian and SEA Tool records.</p>` +
      `<p>This report can be opened in your favorite spreadsheet viewing application.</p>`,
    to: recipientEmail,
    attachments: [
      {
        filename: `Appian SEA Tool Status - ${todaysDate}.csv`,
        content: attachment,
      },
    ],
  };
  return mailOptions;
}

exports.handler = async function (event: { recipient: string }) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const recipientEmail = event.recipient;

  if (!recipientEmail) {
    throw 'You must manually provide a recipient email in the event to send a report. ex. {"recipient": "user@example.com"}';
  }

  if (!process.env.statusTable) {
    throw "process.env.statusTable needs to be defined.";
  }

  const params = {
    TableName: process.env.statusTable,
  };

  try {
    const data = await Libs.scanTable<Types.AppianReportData>(params);
    if (data) {
      const reportDataJson = formatReportData(data);
      const csv = Libs.getCsvFromJson(reportDataJson);
      const mailOptions = getMailOptionsWithAttachment(recipientEmail, csv);
      await Libs.sendAttachment(mailOptions);
    }
  } catch (e) {
    await Libs.trackError(e);
  }
};
