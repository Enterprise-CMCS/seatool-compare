import { putItem } from "../../../libs/dynamodb-lib";

/* This is the handler function that is called when the Lambda function is invoked. */
exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;
  const data = { iterations: 0, id };

  try {
    await putItem({
      tableName: process.env.statusTableName,
      item: data,
    });
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`data after putting item: ${JSON.stringify(data, null, 2)}`);

    callback(null, data);
  }
};
