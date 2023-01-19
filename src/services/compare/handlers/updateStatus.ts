import { putItem, trackError } from "../../../libs";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, iterations: event.Payload.iterations + 1 };
  try {
    await putItem({
      tableName: process.env.statusTableName,
      item: data,
    });
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`data after updating item: ${JSON.stringify(data, null, 2)}`);

    callback(null, data);
  }
};
