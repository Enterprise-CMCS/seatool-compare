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

    /*
     * Calculate time elapsed since record became eligible for alerting.
     * 
     * Master environment (skipWait=true):
     *   Use eligibleAt timestamp captured when workflow started.
     *   This provides accurate minute-level timing without dependency on Appian date fields.
     * 
     * Val/Production environments (skipWait=false):
     *   Use SBMSSN_DATE from Appian. Day-level precision is sufficient since
     *   thresholds are measured in days and emails are batched to 8am EST.
     */
    if (data.eligibleAt && process.env.skipWait === "true") {
      // Master: calculate from when record became eligible (system time)
      data.secSinceAppianSubmitted = Math.floor((Date.now() - data.eligibleAt) / 1000);
    } else {
      // Val/Production: use SBMSSN_DATE (day-level precision)
      const submissionDate = appianRecord.payload?.SBMSSN_DATE;
      data.secSinceAppianSubmitted = secondsBetweenDates(submissionDate);
    }
    
    data.isAppianInSubmittedStatus =
      appianRecord.payload?.CRNT_STUS === "Submitted";

    data.appianSubmittedDate = appianRecord.payload?.SBMSSN_DATE || undefined;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
