import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, seatoolExist: false };
  /* Trying to find the seatool record in the seatool table. */
  try {
    const item = await getItem(process.env.seatoolTableName, data.id);

    /* Checking if the item exists in the seatool table.
    If it does, it will set the seatoolExist to true and set the seatoolRecord to the record. */
    if (item) {
      data.seatoolExist = true;
      data.seatoolRecord = item;
    } else {
      console.log(`No Seatool record found for mmdl record: ${data.id}`);
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(
      `data after finding seatool item: ${JSON.stringify(data, null, 2)}`
    );

    callback(null, data);
  }
};
