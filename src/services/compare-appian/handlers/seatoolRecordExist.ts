import { getItem, trackError } from "../../../libs";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, seatoolExist: false };

  // SEA Tool ID Number should have a 1-1 relationship with the SPA ID+Official tag field from Appian.
  // SPA_ID + 'Official'

  // data.SPA_ID (Appian Data);
  // Does data.SPA_ID === seaTool.id
  console.log(process.env.seatoolTableName, data.SPA_ID, data);
  try {
    const item = await getItem({
      tableName: process.env.seatoolTableName,
      id: data.SPA_ID,
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
