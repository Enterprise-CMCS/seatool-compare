import * as Libs from "../../../libs";
import { getItem } from "../../../libs";
import * as Types from "../../../types";
import { getIsIgnoredState } from "./utils/getIsIgnoredState";

const convertMsToDate = (milliseconds?: number) => {
  if (!milliseconds) return "N/A";
  let date = new Date(milliseconds);
  let dateStr =
    date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();

  return dateStr;
};

function formatReportData(data: Types.MmdlReportData[]) {
  return data.map((i) => {
    const isIgnoredState = getIsIgnoredState(i);
    return {
      "Transmittal Number": i.TN,
      ID: i.PK,
      "Program Type": i.programType,
      "Clock Start Date": convertMsToDate(i.clockStartDate),
      "Seatool Record Exist": i.seatoolExist || false,
      "Submitted Status": i.isStatusSubmitted,
      "MMDL Signed Date": i.mmdlSigDate,
      "Alerts Ignored": isIgnoredState || false,
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
  days: number;
}) {
  const todaysDate = new Date().toISOString().split("T")[0];
  const mailOptions = {
    from: "noreply@cms.hhs.gov",
    subject: `MMDL SEA Tool Status - ${todaysDate}`,
    html:
      `<p>Attached is a status report of MMDL and SEA Tool records for the previous ${days} days.</p>` +
      `<p>This report can be opened in your favorite spreadsheet viewing application.</p>`,
    to: recipient,
    attachments: [
      {
        filename: `MMDL SEA Tool Status - ${todaysDate}.csv`,
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

  if (!process.env.mmdlTableName || !process.env.seatoolTableName) {
    throw "process.env.mmdlTableName and process.env.seatoolTableName needs to be defined.";
  }

  try {
    const epochTime = new Date().getTime() - days * 86400000; // one day in miliseconds

    const mmdlRecords = await Libs.scanTable<Types.MmdlReportData>({
      TableName: process.env.mmdlTableName,
    });

    const relevantMmdlRecords = (mmdlRecords as Types.MmdlReportData[]).filter(
      (record) => {
        return (
          record && record.clockStartDate && record.clockStartDate >= epochTime
        );
      }
    );

    if (!relevantMmdlRecords) {
      throw "No relevant mmdl records to show. Sheck your days value.";
    }

    const results = await Promise.all(
      relevantMmdlRecords.map(await addSeatoolExists)
    );

    const reportDataJson = formatReportData(results as Types.MmdlReportData[]);
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

async function addSeatoolExists(record: Types.MmdlReportData) {
  const seatoolItem = await getItem({
    tableName: process.env.seatoolTableName || "",
    key: {
      PK: record.TN,
      SK: record.TN,
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
