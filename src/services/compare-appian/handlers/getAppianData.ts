import { getItem, trackError } from "../../../libs";

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
    console.log(data.appianRecord, appianRecord, event.Payload);
    console.log("spa_id", appianRecord.payload?.SPA_ID);

    /* Checking if the appian record was signed within the last 200 days. */
    const submissionDate = appianRecord.payload?.SBMSSN_DATE;

    /* Calculating the difference between the current date and the date Appian was submitted. */
    const today = new Date().getTime();
    const submittedOn = new Date(submissionDate).getTime();
    const diffInSec = Math.floor((today - submittedOn) / 1000); // from ms to sec we div by 1000
    console.log("check seconds", diffInSec, submissionDate);
    data.secSinceAppianSubmitted = diffInSec;

    // data.programType = programType;
    data.appianSubmitted =
      appianRecord.payload?.SUB_STUS?.toLowerCase() === "y";

    data.appianSubmittedDate = submittedOn;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
