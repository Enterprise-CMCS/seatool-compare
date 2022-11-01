import * as dynamodb from "../../../libs/dynamodb-lib";

function myHandler(event, _context, _callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  dynamodb.update({
    region: process.env.region,
    tableName: process.env.tableName,
    item: { ...JSON.parse(event.value) },
    key: { id: JSON.parse(event.key) },
  });
}

exports.handler = myHandler;
