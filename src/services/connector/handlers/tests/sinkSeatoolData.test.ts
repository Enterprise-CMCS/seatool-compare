import { it, beforeAll, beforeEach, describe, expect, vi } from "vitest";
import * as sink from "../sinkSeatoolData";
import * as dynamodb from "../../../../libs/dynamodb-lib";
import * as cloudwatch from "../../../../libs/cloudwatch-lib";

const seaToolSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    batchWriteItems: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
    putItem: vi.fn(),
    deleteItem: vi.fn(),
  };
});

vi.mock("../../../../libs/cloudwatch-lib", () => {
  return {
    sendMetricData: vi.fn().mockResolvedValue({}),
  };
});

/**
 * Helper to create a Kafka ESM event in the format Lambda receives from self-managed Kafka
 */
function createKafkaESMEvent(
  topicPartition: string,
  records: Array<{ key: string; value: string }>
) {
  return {
    eventSource: "aws:SelfManagedKafka",
    bootstrapServers: "broker1:9094,broker2:9094",
    records: {
      [topicPartition]: records.map((record, index) => ({
        topic: topicPartition.split("-").slice(0, -1).join("-"),
        partition: 0,
        offset: index,
        timestamp: Date.now(),
        timestampType: "CreateTime",
        key: Buffer.from(record.key).toString("base64"),
        value: record.value ? Buffer.from(record.value).toString("base64") : "",
        headers: [],
      })),
    },
  };
}

describe("SEATool sink service tests", () => {
  beforeAll(() => {
    process.env.tableName = "seatool-table";
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to return successful processing by default
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 1, failed: 0 });
  });

  it("function tests putting an item to SEATool table using batch write", async () => {
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 1, failed: 0 });

    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"NC-11-020"',
        value:
          '{"STATE_PLAN":{"ID_NUMBER":"NC-11-020","SUBMISSION_DATE":1311638400000}}',
      },
    ]);

    await seaToolSink.handler(event, {});

    expect(dynamodb.batchWriteItems).toHaveBeenCalledWith({
      tableName: "seatool-table",
      items: [
        {
          type: "put",
          item: {
            PK: "NC-11-020",
            SK: "NC-11-020",
            STATE_PLAN: {
              ID_NUMBER: "NC-11-020",
              SUBMISSION_DATE: 1311638400000,
            },
          },
        },
      ],
    });
  });

  it("tests deleting an item using batch write", async () => {
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 1, failed: 0 });

    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"TX-23-4440"',
        value: "", // Empty value indicates deletion
      },
    ]);

    await seaToolSink.handler(event, {});

    expect(dynamodb.batchWriteItems).toHaveBeenCalledWith({
      tableName: "seatool-table",
      items: [
        {
          type: "delete",
          item: {
            PK: "TX-23-4440",
            SK: "TX-23-4440",
          },
        },
      ],
    });
  });

  it("tests processing multiple records in a single batch write call", async () => {
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 2, failed: 0 });

    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"NC-11-001"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-001","SUBMISSION_DATE":1311638400000}}',
      },
      {
        key: '"NC-11-002"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-002","SUBMISSION_DATE":1311638400001}}',
      },
    ]);

    await seaToolSink.handler(event, {});

    // Should be called once with all items batched together
    expect(dynamodb.batchWriteItems).toHaveBeenCalledTimes(1);
    expect(dynamodb.batchWriteItems).toHaveBeenCalledWith({
      tableName: "seatool-table",
      items: [
        {
          type: "put",
          item: {
            PK: "NC-11-001",
            SK: "NC-11-001",
            STATE_PLAN: {
              ID_NUMBER: "NC-11-001",
              SUBMISSION_DATE: 1311638400000,
            },
          },
        },
        {
          type: "put",
          item: {
            PK: "NC-11-002",
            SK: "NC-11-002",
            STATE_PLAN: {
              ID_NUMBER: "NC-11-002",
              SUBMISSION_DATE: 1311638400001,
            },
          },
        },
      ],
    });
  });

  it("tests mixed put and delete operations in a single batch", async () => {
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 2, failed: 0 });

    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"NC-11-001"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-001"}}',
      },
      {
        key: '"NC-11-002"',
        value: "", // Delete
      },
    ]);

    await seaToolSink.handler(event, {});

    expect(dynamodb.batchWriteItems).toHaveBeenCalledWith({
      tableName: "seatool-table",
      items: [
        {
          type: "put",
          item: {
            PK: "NC-11-001",
            SK: "NC-11-001",
            STATE_PLAN: { ID_NUMBER: "NC-11-001" },
          },
        },
        {
          type: "delete",
          item: {
            PK: "NC-11-002",
            SK: "NC-11-002",
          },
        },
      ],
    });
  });

  it("sends aggregate metrics after processing", async () => {
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 2, failed: 0 });

    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"NC-11-001"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-001"}}',
      },
      {
        key: '"NC-11-002"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-002"}}',
      },
    ]);

    await seaToolSink.handler(event, {});

    // Should send metrics once with aggregate values
    expect(cloudwatch.sendMetricData).toHaveBeenCalledTimes(1);
    expect(cloudwatch.sendMetricData).toHaveBeenCalledWith(
      expect.objectContaining({
        MetricData: expect.arrayContaining([
          expect.objectContaining({ MetricName: "RecordsProcessed", Value: 2 }),
          expect.objectContaining({ MetricName: "RecordsFailed", Value: 0 }),
          expect.objectContaining({ MetricName: "BatchDuration" }),
        ]),
      })
    );
  });

  it("throws error when all records fail", async () => {
    vi.mocked(dynamodb.batchWriteItems).mockResolvedValue({ processed: 0, failed: 2 });

    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"NC-11-001"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-001"}}',
      },
      {
        key: '"NC-11-002"',
        value: '{"STATE_PLAN":{"ID_NUMBER":"NC-11-002"}}',
      },
    ]);

    await expect(seaToolSink.handler(event, {})).rejects.toThrow(
      "All 2 records failed to process"
    );
  });

  it("handles empty batch gracefully", async () => {
    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", []);

    const result = await seaToolSink.handler(event, {});

    expect(dynamodb.batchWriteItems).not.toHaveBeenCalled();
    expect(result.body.processed).toBe(0);
  });
});
