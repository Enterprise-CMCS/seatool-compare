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
  BatchWriteItemCommand,
  WriteRequest,
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

/**
 * Batch write items to DynamoDB for high-throughput operations.
 * Handles chunking into 25-item batches (DynamoDB limit) and retries for unprocessed items.
 */
export async function batchWriteItems({
  tableName,
  items,
}: {
  tableName: string;
  items: Array<{ type: "put" | "delete"; item: Record<string, NativeAttributeValue> }>;
}): Promise<{ processed: number; failed: number }> {
  const BATCH_SIZE = 25; // DynamoDB limit
  const MAX_RETRIES = 3;
  let processed = 0;
  let failed = 0;

  // Split items into chunks of 25
  const batches: Array<typeof items> = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const requests: WriteRequest[] = batch.map(({ type, item }) => {
      if (type === "delete") {
        return {
          DeleteRequest: {
            Key: marshall({ PK: item.PK, SK: item.SK }),
          },
        };
      } else {
        return {
          PutRequest: {
            Item: marshall(item, { removeUndefinedValues: true }),
          },
        };
      }
    });

    let unprocessedItems: WriteRequest[] | undefined = requests;
    let retryCount = 0;

    while (unprocessedItems && unprocessedItems.length > 0 && retryCount < MAX_RETRIES) {
      try {
        const result = await client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [tableName]: unprocessedItems,
            },
          })
        );

        const processedInBatch = unprocessedItems.length - (result.UnprocessedItems?.[tableName]?.length ?? 0);
        processed += processedInBatch;

        // Check for unprocessed items (throttling/capacity issues)
        unprocessedItems = result.UnprocessedItems?.[tableName];

        if (unprocessedItems && unprocessedItems.length > 0) {
          retryCount++;
          // Exponential backoff before retry
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
        }
      } catch (error) {
        console.error(`Error in batch write (attempt ${retryCount + 1}):`, error);
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          failed += unprocessedItems?.length ?? 0;
          break;
        }
        // Exponential backoff before retry
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }

    // If we exhausted retries and still have unprocessed items
    if (unprocessedItems && unprocessedItems.length > 0 && retryCount >= MAX_RETRIES) {
      failed += unprocessedItems.length;
      console.error(`Failed to process ${unprocessedItems.length} items after ${MAX_RETRIES} retries`);
    }
  }

  return { processed, failed };
}
