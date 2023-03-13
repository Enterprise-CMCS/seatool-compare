import * as dynamodb from "../../../libs/dynamodb-lib";
import * as Types from "../../../types";

async function myHandler(
  event: { key: string; value: string },
  _context: any,
  _callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  if (!process.env.tableName) {
    throw "process.env.tableName needs to be defined.";
  }
  try {
    const eventValue = JSON.parse(event.value) as Types.AppianStreamRecord;
    const id = eventValue.payload.PCKG_ID.toString();
    const key = { PK: id, SK: id };

    await dynamodb.putItem({
      tableName: process.env.tableName,
      item: {
        ...key,
        ...JSON.parse(event.value),
      },
    });
  } catch (error) {
    console.log("Error updading appian table", event);
    console.error(error);
  }
}

exports.handler = myHandler;
