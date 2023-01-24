import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { sendMetricData } from "./cloudwatch-lib";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: process.env.region });

export async function putItem({
  tableName,
  item,
}: {
  tableName: string;
  item: { [key: string]: any };
}) {
  const params = {
    TableName: tableName,
    Item: marshall(item, {
      removeUndefinedValues: true,
    }),
  };

  try {
    if (item && item.id) console.log(`Putting item with id: ${item.id}:`);

    const command = new PutItemCommand(params);
    const result = await client.send(command);
    if (item && item.id)
      console.log(
        `Record processed for item: ${item.id}:`,
        JSON.stringify(result, null, 2)
      );

    await sendMetricData({
      Namespace: process.env.namespace,
      MetricData: [
        {
          MetricName: `${tableName}_dynamo_updates`,
          Value: 0,
        },
      ],
    });

    return result;
  } catch (error) {
    console.error("ERROR updating record in dynamodb: ", error);
    await sendMetricData({
      Namespace: process.env.namespace,
      MetricData: [
        {
          MetricName: `${tableName}_dynamo_updates`,
          Value: 1,
        },
      ],
    });
    return;
  }
}

export async function getItem({
  tableName,
  id,
}: {
  tableName: string | undefined;
  id: string;
}) {
  const item = (
    await client.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          id: {
            S: id,
          },
        },
      })
    )
  ).Item;
  if (!item) return null;

  /* Converting the DynamoDB record to a JavaScript object. */
  return unmarshall(item);
}
