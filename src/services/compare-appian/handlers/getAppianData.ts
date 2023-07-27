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
    const key = { PK: data.PK, SK: data.SK };
    const appianRecord = await getItem({
      tableName: process.env.appianTableName,
      key,
    });

    if (!appianRecord) {
      throw "No Appian record found";
    }

    data.appianRecord = appianRecord as Types.AppianRecord;
    data.SPA_ID = appianRecord.payload?.SPA_ID;
    data.SPA_PCKG_ID = appianRecord.payload?.SPA_PCKG_ID;

    /* Checking if the appian record was submitted within the last 200 days. */
    const submissionDate = appianRecord.payload?.SBMSSN_DATE;
    data.secSinceAppianSubmitted = secondsBetweenDates(submissionDate);
    data.isAppianInSubmittedStatus =
      appianRecord.payload?.CRNT_STUS === "Submitted";

    data.appianSubmittedDate = submissionDate || undefined;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
