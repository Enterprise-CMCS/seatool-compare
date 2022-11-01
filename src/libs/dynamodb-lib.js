import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

export const update = async ({ region, tableName, item, key }) => {
  const client = new DynamoDBClient({ region });

  // When we do updates we need to tell DynamoDB what fields we want updated.
  // If that's not annoying enough, we also need to be careful as some field names
  // are reserved - so DynamoDB won't like them in the UpdateExpressions list.
  // To avoid passing reserved words we prefix each field with "#field" and provide the correct
  // field mapping in ExpressionAttributeNames. The same has to be done with the actual
  // value as well. They are prefixed with ":value" and mapped in ExpressionAttributeValues
  // along with their actual value

  const itemKeys = Object.keys(item);
  const params = {
    TableName: tableName,
    Key: marshall(key),
    ReturnValues: "ALL_NEW",
    UpdateExpression: `SET ${itemKeys
      .map((k, index) => `#field${index} = :value${index}`)
      .join(", ")}`,
    ExpressionAttributeNames: itemKeys.reduce(
      (accumulator, k, index) => ({
        ...accumulator,
        [`#field${index}`]: k,
      }),
      {}
    ),
    ExpressionAttributeValues: marshall(
      itemKeys.reduce(
        (accumulator, k, index) => ({
          ...accumulator,
          [`:value${index}`]: item[k],
        }),
        {}
      )
    ),
  };

  try {
    console.log(
      `Sending update item: ${key.id}:`,
      JSON.stringify(params, null, 2)
    );

    const command = new UpdateItemCommand(params);
    const { Attributes } = await client.send(command);
    console.log(
      `Record processed for item: ${key.id}:`,
      JSON.stringify(Attributes, null, 2)
    );

    return unmarshall(Attributes);
  } catch (error) {
    console.log("ERROR updating record in dynamodb: ", error.toString("utf-8"));
  }
};
