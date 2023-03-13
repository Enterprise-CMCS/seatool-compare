import { getItem, trackError } from "../../../libs";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, seatoolExist: false };

  // appian.SPA_ID should have a 1-to-1 relationship with SEATool.id

  if (!process.env.seatoolTableName) {
    throw "process.env.seatoolTableName needs to be defined.";
  }

  try {
    const item = await getItem({
      tableName: process.env.seatoolTableName,
      key: {
        id: data.SPA_ID,
      },
    });

    if (item) {
      data.seatoolExist = true;
      data.seatoolRecord = item;
    } else {
      console.log(`No Seatool record found for Appian record: ${data.id}`);
    }
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(
      `data after finding seatool item: ${JSON.stringify(data, null, 2)}`
    );

    callback(null, data);
  }
};
