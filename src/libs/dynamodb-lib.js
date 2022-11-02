import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

export const update = async ({ region, tableName, item }) => {
  const client = new DynamoDBClient({ region });

  const params = {
    TableName: tableName,
    Item: marshall(item),
  };

  try {
    console.log(
      `Putting item into dynamo table ${tableName} with id: ${item.id}:`,
      JSON.stringify(params, null, 2)
    );

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
