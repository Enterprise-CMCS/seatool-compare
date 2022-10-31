import {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

export const handleTopicEvent = async ({ region, tableName, item }) => {
  const client = new DynamoDBClient({ region });

  const params = {
    TableName: tableName,
    Item: marshall(item),
  };

  const command = new PutItemCommand(params);

  try {
    const data = await client.send(command);
    console.log("Record processed", data.toString("utf-8"));
    return unmarshall(data);
  } catch (error) {
    console.log("ERROR updating record in dynamodb: ", error.toString("utf-8"));
  }
};
