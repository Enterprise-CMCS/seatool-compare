import { it, beforeAll, describe, expect, vi } from "vitest";
import * as sink from "../sinkSeatoolData";
import * as dynamodb from "../../../../libs/dynamodb-lib";

const seaToolSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
    deleteItem: vi.fn(),
  };
});

describe("SEATool sink service tests", () => {
  beforeAll(() => {
    process.env.tableName = "seatool-table";
  });

  it("function tests putting an item to SEATool table", async () => {
    const event = {
      key: '"NC-11-020"',
      value:
        '{"STATE_PLAN":{"ID_NUMBER":"NC-11-020","SUBMISSION_DATE":1311638400000}}',
    };
    await seaToolSink.handler(event);

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
    const event = {
      key: '"TX-23-4440"',
      keySchemaName: null,
      value: "",
      valueSchemaName: null,
      topic: "aws.ksqldb.seatool.agg.State_Plan",
      partition: 0,
      offset: 1114610,
      timestamp: 1677086273242,
      timestampTypeName: "CreateTime",
    };
    await seaToolSink.handler(event);

    expect(dynamodb.deleteItem).toHaveBeenCalledWith({
      tableName: "seatool-table",
      key: {
        PK: "TX-23-4440",
        SK: "TX-23-4440",
      },
    });
  });
});
