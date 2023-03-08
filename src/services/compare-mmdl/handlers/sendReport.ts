import * as Libs from "../../../libs";
import * as Types from "../../../types";

function formatReportData(data: Types.MmdlReportData[]) {
  return data.map((i) => {
    return {
      "Transmittal Number": i.TN,
      ID: i.PK,
      "Iterations ": i.iterations,
      "Program Type": i.programType,
      "Clock Start Date": i.mmdlSigDate,
      "Seatool Record Exist": i.seatoolExist || false,
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
    subject: `MMDL SEA Tool Status - ${todaysDate}`,
    html:
      `<p>Attached is a csv indicating the current status of MMDL and SEA Tool records.</p>` +
      `<p>This report can be opened in your favorite spreadsheet viewing application.</p>`,
    to: recipientEmail,
    attachments: [
      {
        filename: `MMDL SEA Tool Status - ${todaysDate}.csv`,
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

  try {
    const data = await Libs.scanTable(process.env.statusTable);
    const reportDataJson = formatReportData(data as Types.MmdlReportData[]);
    const csv = Libs.getCsvFromJson(reportDataJson);
    const mailOptions = getMailOptionsWithAttachment(recipientEmail, csv);

    await Libs.sendAttachment(mailOptions);
  } catch (e) {
    await Libs.trackError(e);
  }
};
