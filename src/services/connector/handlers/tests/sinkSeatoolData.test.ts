import { it, beforeAll, beforeEach, describe, expect, vi } from "vitest";
import * as sink from "../sinkSeatoolData";
import * as dynamodb from "../../../../libs/dynamodb-lib";

const seaToolSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
    deleteItem: vi.fn(),
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
  });

  it("function tests putting an item to SEATool table", async () => {
    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"NC-11-020"',
        value:
          '{"STATE_PLAN":{"ID_NUMBER":"NC-11-020","SUBMISSION_DATE":1311638400000}}',
      },
    ]);

    await seaToolSink.handler(event, {});

    expect(dynamodb.putItem).toHaveBeenCalledWith({
      tableName: "seatool-table",
      item: {
        PK: "NC-11-020",
        SK: "NC-11-020",
        STATE_PLAN: {
          ID_NUMBER: "NC-11-020",
          SUBMISSION_DATE: 1311638400000,
        },
      },
    });
  });

  it("tests deleting an item", async () => {
    const event = createKafkaESMEvent("aws.ksqldb.seatool.agg.State_Plan-0", [
      {
        key: '"TX-23-4440"',
        value: "", // Empty value indicates deletion
      },
    ]);

    await seaToolSink.handler(event, {});

    expect(dynamodb.deleteItem).toHaveBeenCalledWith({
      tableName: "seatool-table",
      key: {
        PK: "TX-23-4440",
        SK: "TX-23-4440",
      },
    });
  });

  it("tests processing multiple records in a batch", async () => {
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

    expect(dynamodb.putItem).toHaveBeenCalledTimes(2);
  });
});
