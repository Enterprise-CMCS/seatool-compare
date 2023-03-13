import { getItem, trackError } from "../../../libs";

import * as Types from "../../../types";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data: Types.MmdlReportData = { ...event.Payload };

  if (!process.env.mmdlTableName) {
    throw "process.env.mmdlTableName needs to be defined.";
  }

  try {
    const key = { PK: data.PK, SK: data.SK };
    const mmdlRecord = (await getItem({
      tableName: process.env.mmdlTableName,
      key,
    })) as Types.MmdlRecord;

    if (mmdlRecord.mmdlSigDate) {
      data.secSinceMmdlSigned = getSecsSinceNow(mmdlRecord?.mmdlSigDate);
    }

    data.programType = mmdlRecord?.programType;
    data.TN = mmdlRecord?.TN;
    data.mmdlSigned = mmdlRecord?.mmdlSigned;
    data.mmdlSigDate = mmdlRecord?.mmdlSigDate;
    data.isStatusSubmitted = mmdlRecord?.isStatusSubmitted;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};

// 'DD/MM/YYYY'
function getSecsSinceNow(date: string) {
  const now = new Date().getTime();
  const signedOn = new Date(date).getTime();

  const diffInSec = (now - signedOn) / 1000; // from ms to sec we div by 1000

  return Math.floor(diffInSec);
}
