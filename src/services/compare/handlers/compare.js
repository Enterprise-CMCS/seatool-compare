import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const result = { ...event.Payload, match: false };
  const id = event.Context.Execution.Input.id;
  console.log("id from context:", id);

  try {
    const mmdlItem = await getItem(process.env.mmdlTableName, id);
    const seatoolItem = await getItem(process.env.seatoolTableName, id);
    console.log("Item from MMDL:  " + mmdlItem);
    console.log("Item from SEA Tool:  " + seatoolItem);

    if (!mmdlItem) {
      console.log("No mmdl item found");
    }
    if (!seatoolItem) {
      console.log("No seatool item found");
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log("Results after compare task:", JSON.stringify(result, null, 2));
    callback(null, result);
  }
};
