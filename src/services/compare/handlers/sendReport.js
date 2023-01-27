import {
  sendAttachment,
  trackError,
  scanTable,
  getCsvFromJson,
} from "../../../libs";

function formatReportData(data) {
  return data.map((i) => {
    return {
      "Transmittal ID": i.id,
      "Iterations ": i.iterations,
      "Program Type": i.programType,
      "Clock Start Date": i.mmdlSigDate,
      "Seatool Record Exist": i.seatoolExist,
      "Seatool Signed Date": i.seatoolSigDate || "N/A",
      "Records Match": i.match || false,
    };
  });
}

function getMailOptionsWithAttachment(recipientEmail, attachment) {
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

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const recipientEmail = event.recipient;

  if (!recipientEmail) {
    throw 'You must manually provde a recipient email in the event to send a report. ex. {"recipient": "user@example.com"}';
  }

  try {
    const data = await scanTable(process.env.statusTable);
    const reportDataJson = formatReportData(data);
    const csv = getCsvFromJson(reportDataJson);
    const mailOptions = getMailOptionsWithAttachment(recipientEmail, csv);

    await sendAttachment(mailOptions);
  } catch (e) {
    await trackError(e);
  }
};
