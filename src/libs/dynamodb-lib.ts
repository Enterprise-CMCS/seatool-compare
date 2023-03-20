import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  GetItemCommandInput,
  DeleteItemCommand,
  DeleteItemCommandInput,
  ScanCommandInput,
  ScanCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { sendMetricData } from "./cloudwatch-lib";
import {
  marshall,
  NativeAttributeValue,
  unmarshall,
} from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: process.env.region });

export async function putItem({
  tableName,
  item,
}: {
  tableName: string;
  item: { [key: string]: NativeAttributeValue };
}) {
  const params = {
    TableName: tableName,
    Item: marshall(item, {
      removeUndefinedValues: true,
    }),
  };

  try {
    const command = new PutItemCommand(params);
    const result = await client.send(command);
    if (result)
      console.log(
        `Record processed for result: `,
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
  key,
}: {
  tableName: string;
  key: {
    [key: string]: NativeAttributeValue;
  };
}) {
  const getItemCommandInput: GetItemCommandInput = {
    TableName: tableName,
    Key: marshall(key),
  };

  try {
    const item = (await client.send(new GetItemCommand(getItemCommandInput)))
      ?.Item;

    if (!item) return null;

    /* Converting the DynamoDB record to a JavaScript object. */
    return unmarshall(item);
  } catch (e) {
    console.table(e);
    return null;
  }
}

const marshallOptions = {
  convertEmptyValues: true, // false, by default.
  removeUndefinedValues: true, // false, by default.
};

// Create the DynamoDB document client.
const ddbDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions,
});

export const scanTable = async <T>(params: ScanCommandInput) => {
  try {
    const scanResults: T[] = [];
    let items: ScanCommandOutput;

    do {
      items = await ddbDocClient.send(new ScanCommand(params));
      const Items = items.Items?.map(unmarshall as any);
      if (Items) {
        Items.forEach((item) => scanResults.push(item as any));
      }
      params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey !== "undefined");

    return scanResults;
  } catch (err) {
    console.log("Error", err);
    return;
  }
};

export async function deleteItem({
  tableName,
  key,
}: {
  tableName: string;
  key: {
    [key: string]: NativeAttributeValue;
  };
}) {
  try {
    const deleteItemCommandInput: DeleteItemCommandInput = {
      TableName: tableName,
      Key: marshall(key),
    };

    console.log("DELETING ITEM:", deleteItemCommandInput);

    const results = await client.send(
      new DeleteItemCommand(deleteItemCommandInput)
    );
    return results;
  } catch (error) {
    console.log("ERROR Deleting Item: ", error);
    return error;
  }
}
