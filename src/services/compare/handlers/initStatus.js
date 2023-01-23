import { putItem, trackError } from "../../../libs";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;
  const data = { iterations: 0, id };

  try {
    await putItem(process.env.statusTableName, data);
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`data after putting item: ${JSON.stringify(data, null, 2)}`);
    callback(null, data);
  }
};
