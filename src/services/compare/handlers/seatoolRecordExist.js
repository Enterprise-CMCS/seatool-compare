import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;
  const result = { seatoolExist: false, id };
  try {
    const item = await getItem(process.env.seatoolTableName, id);

    if (item) {
      result.seatoolExist = true;
      result.seatoolRecord = item;
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(
      `Result after finding seatool item: ${JSON.stringify(result, null, 2)}`
    );

    callback(null, result);
  }
};
