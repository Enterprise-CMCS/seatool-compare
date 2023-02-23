import * as Libs from "../../../libs";
import * as Types from "../../../types";

//! This work/logic will be done in another ticket

function formatReportData(data: Types.AppianReportData[]) {
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

  // if (!process.env.statusTable) {
  //   throw "process.env.statusTable needs to be defined.";
  // }
  if (!process.env.appianTableName) {
    throw "process.env.appianTableName needs to be defined.";
  }
  if (!process.env.seatoolTableName) {
    throw "process.env.seatoolTableName needs to be defined.";
  }

  try {
    const appianData = await Libs.scanTable(process.env.appianTableName);
    const seatoolData = await Libs.scanTable(process.env.seatoolTableName);
    const data = await Libs.scanTable(process.env.statusTable);
    console.log("Data:", data)
    
    // console.log("Appian Data: ", appianData)
    // console.log("Seatool Data: ", seatoolData)

    // const appianRecord = await getItem({
    //   tableName: process.env.appianTableName,
    //   id: data.id,
    // });
    
    // const item = await getItem({
    //   tableName: process.env.seatoolTableName,
    //   id: data.SPA_ID,
    // });

    // const reportDataJson = formatReportData(appianData as Types.AppianReportData[]);
    const reportDataJson = formatReportData(appianData);
    // console.log("Report Data JSON: ", reportDataJson)
    const csv = Libs.getCsvFromJson(reportDataJson);
    // console.log("CSV: ", csv)
    const mailOptions = getMailOptionsWithAttachment(recipientEmail, csv);

    await Libs.sendAttachment(mailOptions);
  } catch (e) {
    await Libs.trackError(e);
  }
};
