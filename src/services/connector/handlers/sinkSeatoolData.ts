import * as dynamodb from "../../../libs/dynamodb-lib";
import { sendMetricData } from "../../../libs/cloudwatch-lib";

/**
 * Lambda Event Source Mapping event structure for self-managed Kafka
 */
interface KafkaESMEvent {
  eventSource: string;
  bootstrapServers: string;
  records: {
    [topicPartition: string]: Array<{
      topic: string;
      partition: number;
      offset: number;
      timestamp: number;
      timestampType: string;
      key: string; // base64 encoded
      value: string; // base64 encoded
      headers: Array<{ [key: string]: number[] }>;
    }>;
  };
}

/**
 * Batch item for DynamoDB operations
 */
interface BatchItem {
  type: "put" | "delete";
  item: Record<string, any>;
}

/**
 * Decode base64 string to UTF-8
 */
function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/**
 * Handler for Seatool data from Kafka via Lambda Event Source Mapping
 * Processes batches of records from the aws.ksqldb.seatool.agg.State_Plan topic
 * 
 * Optimized for high throughput using batch DynamoDB operations.
 */
async function myHandler(event: KafkaESMEvent, _context: any) {
  const startTime = Date.now();

  if (!process.env.tableName) {
    throw new Error("process.env.tableName needs to be defined.");
  }

  const tableName = process.env.tableName;
  const batchItems: BatchItem[] = [];
  let parseErrorCount = 0;

  // Count total records across all partitions
  const totalRecords = Object.values(event.records).reduce(
    (sum, records) => sum + records.length,
    0
  );
  console.log(`Processing ${totalRecords} records from Kafka`);

  // Collect all items for batch processing
  for (const [, records] of Object.entries(event.records)) {
    for (const record of records) {
      try {
        // Decode base64 encoded key and value
        const decodedKey = decodeBase64(record.key);
        const decodedValue = record.value ? decodeBase64(record.value) : "";

        const id = JSON.parse(decodedKey);

        // An empty string value represents deleted records
        if (decodedValue === "" || decodedValue === "null") {
          batchItems.push({
            type: "delete",
            item: { PK: id, SK: id },
          });
        } else {
          batchItems.push({
            type: "put",
            item: { PK: id, SK: id, ...JSON.parse(decodedValue) },
          });
        }
      } catch (error) {
        parseErrorCount++;
        console.error(`Error parsing record at offset ${record.offset}:`, error);
        // Continue collecting other records
      }
    }
  }

  // Process all items in batches
  let processed = 0;
  let failed = 0;

  if (batchItems.length > 0) {
    const result = await dynamodb.batchWriteItems({
      tableName,
      items: batchItems,
    });
    processed = result.processed;
    failed = result.failed;
  }

  const duration = Date.now() - startTime;
  const throughput = totalRecords > 0 ? Math.round((processed / duration) * 1000) : 0;

  console.log(
    `Completed: ${processed} processed, ${failed} failed, ${parseErrorCount} parse errors, ${duration}ms duration, ~${throughput} records/sec`
  );

  // Send aggregate metrics (single metric call instead of per-record)
  await sendMetricData({
    Namespace: process.env.namespace || "SeatoolConnector",
    MetricData: [
      {
        MetricName: "RecordsProcessed",
        Value: processed,
        Unit: "Count",
      },
      {
        MetricName: "RecordsFailed",
        Value: failed + parseErrorCount,
        Unit: "Count",
      },
      {
        MetricName: "BatchDuration",
        Value: duration,
        Unit: "Milliseconds",
      },
    ],
  });

  // If all records failed, throw to trigger retry
  const totalErrors = failed + parseErrorCount;
  if (processed === 0 && totalErrors > 0) {
    throw new Error(`All ${totalErrors} records failed to process`);
  }

  return {
    statusCode: 200,
    body: { processed, errors: totalErrors, duration },
  };
}

exports.handler = myHandler;
