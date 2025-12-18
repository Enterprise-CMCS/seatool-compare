import { it, beforeAll, beforeEach, describe, expect, vi } from "vitest";
import * as sink from "../sinkAppianData";
import * as dynamodb from "../../../../libs/dynamodb-lib";

const appianSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
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
        key: record.key ? Buffer.from(record.key).toString("base64") : "",
        value: Buffer.from(record.value).toString("base64"),
        headers: [],
      })),
    },
  };
}

describe("appian sink service tests", () => {
  beforeAll(() => {
    process.env.tableName = "appian-table";
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("function tests putting an item to appian table", async () => {
    const event = createKafkaESMEvent("aws.appian.cmcs.MCP_SPA_PCKG-0", [
      {
        key: "",
        value: '{"payload":{"PCKG_ID":21782}}',
      },
    ]);

    await appianSink.handler(event, {});

    expect(dynamodb.putItem).toHaveBeenCalledWith({
      tableName: "appian-table",
      item: {
        PK: "21782",
        SK: "21782",
        payload: {
          PCKG_ID: 21782,
        },
      },
    });
  });

  it("tests processing multiple records in a batch", async () => {
    const event = createKafkaESMEvent("aws.appian.cmcs.MCP_SPA_PCKG-0", [
      {
        key: "",
        value: '{"payload":{"PCKG_ID":21782}}',
      },
      {
        key: "",
        value: '{"payload":{"PCKG_ID":21783}}',
      },
    ]);

    await appianSink.handler(event, {});

    expect(dynamodb.putItem).toHaveBeenCalledTimes(2);
  });
});
