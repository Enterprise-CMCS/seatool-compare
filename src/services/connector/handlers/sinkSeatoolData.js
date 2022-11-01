import * as dynamodb from "../../../libs/dynamodb-lib";

function myHandler(event, _context, _callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  dynamodb.update({
    region: process.env.region,
    tableName: process.env.tableName,
    item: { id: JSON.parse(event.key), ...JSON.parse(event.value) },
  });
}

exports.handler = myHandler;
