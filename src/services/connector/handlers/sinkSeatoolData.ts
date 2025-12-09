import * as dynamodb from "../../../libs/dynamodb-lib";

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
 * Decode base64 string to UTF-8
 */
function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/**
 * Handler for Seatool data from Kafka via Lambda Event Source Mapping
 * Processes batches of records from the aws.ksqldb.seatool.agg.State_Plan topic
 */
async function myHandler(event: KafkaESMEvent, _context: any) {
  console.log("Received Kafka ESM event:", JSON.stringify(event, null, 2));

  if (!process.env.tableName) {
    throw new Error("process.env.tableName needs to be defined.");
  }

  const tableName = process.env.tableName;
  let processedCount = 0;
  let errorCount = 0;

  // Process all records from all topic-partitions
  for (const [topicPartition, records] of Object.entries(event.records)) {
    console.log(`Processing ${records.length} records from ${topicPartition}`);

    for (const record of records) {
      try {
        // Decode base64 encoded key and value
        const decodedKey = decodeBase64(record.key);
        const decodedValue = record.value ? decodeBase64(record.value) : "";
        
        console.log(`Processing record at offset ${record.offset}, key: ${decodedKey}`);

        const id = JSON.parse(decodedKey);
        const key = { PK: id, SK: id };

        // An empty string value represents deleted records
        if (decodedValue === "" || decodedValue === "null") {
          await dynamodb.deleteItem({
            tableName,
            key,
          });
          console.log(`Deleted record with key: ${id}`);
        } else {
          await dynamodb.putItem({
            tableName,
            item: { ...key, ...JSON.parse(decodedValue) },
          });
          console.log(`Upserted record with key: ${id}`);
        }

        processedCount++;
      } catch (error) {
        errorCount++;
        console.error(`Error processing record at offset ${record.offset}:`, error);
        // Continue processing other records
      }
    }
  }

  console.log(`Completed: ${processedCount} processed, ${errorCount} errors`);

  // If all records failed, throw to trigger retry
  if (processedCount === 0 && errorCount > 0) {
    throw new Error(`All ${errorCount} records failed to process`);
  }

  return {
    statusCode: 200,
    body: { processed: processedCount, errors: errorCount },
  };
}

exports.handler = myHandler;
