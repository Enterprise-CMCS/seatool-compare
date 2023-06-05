import { trackError } from "../../../libs";
import * as Types from "../../../types";

// const getTenMinutesFromNow = () => {
//   const date = new Date();
//   const tenMinutesFromNow = new Date(date.getTime() + 600000).toISOString();
//   return tenMinutesFromNow;
// };

// 8am EST two days from now
const getTimeToStart = () => {
  const date = new Date();

  // Set the UTC Hours to 12 (8AM EST)
  date.setUTCHours(12, 0, 0, 0);

  // Add 2 days to the date
  date.setDate(date.getDate() + 2);

  const timeToStart = date.toISOString();
  return timeToStart;
};

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data: Types.MmdlReportData = { ...event.Payload };

  try {
    let timeToStart;

    // if (process.env.skipWait === "true") {
    //   timeToStart = getTenMinutesFromNow();
    // } else {
    timeToStart = getTimeToStart();
    // }

    data.startAtTimeStamp = timeToStart;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
