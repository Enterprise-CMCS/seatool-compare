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

  const eventValue = JSON.parse(event.value);

  await dynamodb.putItem({
    tableName: process.env.tableName,
    item: {
      id: eventValue.payload.PCKG_ID.toString(),
      ...JSON.parse(event.value),
    },
  });
}

exports.handler = myHandler;
