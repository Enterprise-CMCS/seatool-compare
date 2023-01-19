import * as dynamodb from "../../../libs/dynamodb-lib";

async function myHandler(event, _context, _callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  await dynamodb.putItem({
    tableName: process.env.tableName,
    item: { id: JSON.parse(event.key), ...JSON.parse(event.value) },
  });
}

exports.handler = myHandler;
