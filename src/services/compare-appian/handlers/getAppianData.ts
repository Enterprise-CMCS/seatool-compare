import { getItem, trackError } from "../../../libs";
import { secondsBetweenDates } from "./utils/timeHelper";
import * as Types from "../../../types";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data: Types.AppianSeatoolCompareData = { ...event.Payload };

  if (!process.env.appianTableName) {
    throw "process.env.appianTableName needs to be defined.";
  }
  try {
    const appianRecord = await getItem({
      tableName: process.env.appianTableName,
      key: {
        id: data.id,
      },
    });

    if (!appianRecord) {
      throw "No Appian record found";
    }

    data.appianRecord = appianRecord as Types.AppianRecord;
    data.SPA_ID = appianRecord.payload?.SPA_ID;

    /* Checking if the appian record was submitted within the last 200 days. */
    const submissionDate = appianRecord.payload?.SBMSSN_DATE;
    data.secSinceAppianSubmitted = secondsBetweenDates(submissionDate);
    data.isAppianSubmitted =
      appianRecord.payload?.SBMSSN_TYPE?.toLowerCase() === "official" &&
      appianRecord.payload?.SPA_PCKG_ID?.toLowerCase()?.at(-1) === "o";

    data.appianSubmittedDate = new Date(submissionDate).getTime();
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
