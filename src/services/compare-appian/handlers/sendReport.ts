import {
  sendAttachment,
  trackError,
  scanTable,
  getCsvFromJson,
} from "../../../libs";

interface Data {
  id: string;
  appianSubmitted: boolean;
  SPA_ID: string;
  iterations: number;
  secSinceAppianSubmitted: string;
  appianSubmittedDate: string;
  seatoolExist: boolean;
  seatoolSubmissionDate?: string;
  match?: boolean;
}

//! This work/logic will be done in another ticket

function formatReportData(data: Data[]) {
  return data.map((i) => {
    return {
      "Transmittal ID": i.id,
      "Iterations ": i.iterations,
      "Clock Start Date": i.secSinceAppianSubmitted,
      "Seatool Record Exist": i.seatoolExist,
      "Seatool Signed Date": i.seatoolSubmissionDate || "N/A",
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

  try {
    const data = await scanTable(process.env.statusTable);
    const reportDataJson = formatReportData(data as Data[]);
    const csv = getCsvFromJson(reportDataJson);
    const mailOptions = getMailOptionsWithAttachment(recipientEmail, csv);

    await sendAttachment(mailOptions);
  } catch (e) {
    await trackError(e);
  }
};
