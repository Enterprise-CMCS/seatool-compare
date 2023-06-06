import * as Libs from "../../../libs";
import * as Types from "../../../types";
import { getItem } from "../../../libs";

function formatDate(dateMs: number) {
  return new Date(dateMs).toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
}

const convertMsToDate = (milliseconds?: number) => {
  if (!milliseconds) return "N/A";
  let date = new Date(milliseconds);
  let dateStr =
    date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();

  return dateStr;
};

function formatReportData(data: Types.AppianReportData[]) {
  return data.map((i) => {
    return {
      "SPA ID": i.SPA_ID,
      "Iterations ": i.iterations,
      "Submission Date": convertMsToDate(i.appianSubmittedDate)
        ? formatDate(Number(i.appianSubmittedDate))
        : "",
      "Seatool Record Exist": i.seatoolExist,
      "Seatool Signed Date": i.seatoolSubmissionDate
        ? formatDate(Number(i.seatoolSubmissionDate))
        : "N/A",
      // "Records Match": i.match || false,
    };
  });
}

function getMailOptionsWithAttachment({
  recipient,
  attachment,
  days,
}: {
  recipient: string;
  attachment: string;
  days?: number;
}) {
  console.log(days);
  const todaysDate = new Date().toISOString().split("T")[0];
  const mailOptions = {
    from: "noreply@cms.hhs.gov",
    subject: `Appian SEA Tool Status - ${todaysDate}`,
    html:
      `<p>Attached is a csv indicating the current status of Appian and SEA Tool records.</p>` +
      `<p>This report can be opened in your favorite spreadsheet viewing application.</p>`,
    to: recipient,
    attachments: [
      {
        filename: `Appian SEA Tool Status - ${todaysDate}.csv`,
        content: attachment,
      },
    ],
  };
  return mailOptions;
}

exports.handler = async function (event: { recipient: string; days: number }) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const { recipient, days } = event;

  if (!recipient || !days) {
    throw 'You must manually provide a recipient email and days in the event. ex. {"recipient": "user@example.com", "days": 250}';
  }

  if (!process.env.appianTableName || !process.env.seatoolTableName) {
    throw "process.env.appianTableName and process.env.seatoolTableName needs to be defined.";
  }

  try {
    const epochTime = new Date().getTime() - days * 86400000; // one day in miliseconds

    const appianRecords = await Libs.scanTable<Types.AppianReportData>({
      TableName: process.env.appianTableName,
    });

    const relevantAppianRecords = (
      appianRecords as Types.AppianReportData[]
    ).filter((record) => {
      return (
        record &&
        record.appianSubmittedDate &&
        record.appianSubmittedDate >= epochTime
      );
    });

    if (!relevantAppianRecords) {
      throw "No relevant appain records to show. Check your days value.";
    }

    const results = await Promise.all(
      relevantAppianRecords.map(await addSeatoolExists)
    );

    const reportDataJson = formatReportData(
      results as Types.AppianReportData[]
    );
    const csv = Libs.getCsvFromJson(reportDataJson);
    const mailOptions = getMailOptionsWithAttachment({
      recipient,
      attachment: csv,
      days,
    });

    await Libs.sendAttachment(mailOptions);
  } catch (e) {
    await Libs.trackError(e);
  }
};

async function addSeatoolExists(record: Types.AppianReportData) {
  const seatoolItem = await getItem({
    tableName: process.env.seatoolTableName || "",
    key: {
      PK: record.PK,
      SK: record.SK,
    },
  });

  if (seatoolItem) {
    return {
      ...record,
      seatoolExist: true,
    };
  }
  return record;
}
