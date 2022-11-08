import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
const { marshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: process.env.region });

export const update = async ({ tableName, item }) => {
  const params = {
    TableName: tableName,
    Item: marshall(item),
  };

  try {
    console.log(`Putting item: ${item.id}:`, JSON.stringify(params, null, 2));

    const command = new PutItemCommand(params);
    const result = await client.send(command);
    console.log(
      `Record processed for item: ${item.id}:`,
      JSON.stringify(result, null, 2)
    );

    return result;
  } catch (error) {
    console.log("ERROR updating record in dynamodb: ", error.toString("utf-8"));
  }
};
