import * as dynamodb from "../../../libs/dynamodb-lib";

async function myHandler(
  event: { key: string; value: string },
  _context: any,
  _callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  if (!process.env.tableName) {
    throw "process.env.tableName needs to be defined.";
  }

  const tableName = process.env.tableName;
  const id = JSON.parse(event.key);
  const key = { PK: id, SK: id };

  // an empty string value will represent deleted records
  if (event.value === "") {
    await dynamodb.deleteItem({
      tableName,
      key,
    });
  } else {
    await dynamodb.putItem({
      tableName,
      item: { ...key, ...JSON.parse(event.value) },
    });
  }
}

exports.handler = myHandler;
