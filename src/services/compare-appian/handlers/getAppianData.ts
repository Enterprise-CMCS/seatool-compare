import { getItem, trackError } from "../../../libs";
import { secondsBetweenDates } from "./utils/timeHelper";
exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload };
  try {
    const appianRecord = await getItem({
      tableName: process.env.appianTableName,
      id: data.id,
    });
    data.appianRecord = appianRecord;
    data.SPA_ID = appianRecord.payload?.SPA_ID;

    /* Checking if the appian record was signed within the last 200 days. */
    const submissionDate = appianRecord.payload?.SBMSSN_DATE;
    data.secSinceAppianSubmitted = secondsBetweenDates(submissionDate);

    data.appianSubmitted =
      appianRecord.payload?.IS_SBMTD?.toLowerCase() === "y";

    data.appianSubmittedDate = new Date(submissionDate).getTime();
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
