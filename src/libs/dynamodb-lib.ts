import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { sendMetricData } from "./cloudwatch-lib";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: process.env.region });

export const update = async ({
  tableName,
  item,
}): Promise<PutItemCommandOutput> => {
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
  } catch (error: any) {
    console.log("ERROR updating record in dynamodb: ", error);
    await sendMetricData({
      Namespace: process.env.namespace,
      MetricData: [
        {
          MetricName: `${tableName}_dynamo_updates`,
          Value: 1,
        },
      ],
    });

    throw Error(error);
  }
};
