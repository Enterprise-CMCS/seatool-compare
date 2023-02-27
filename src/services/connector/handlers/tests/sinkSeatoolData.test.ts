import { it, beforeAll, describe, expect, vi } from "vitest";
import * as sink from "../sinkSeatoolData";
import * as dynamodb from "../../../../libs/dynamodb-lib";

const seaToolSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
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
        id: "NC-11-020",
        STATE_PLAN: {
          ID_NUMBER: "NC-11-020",
          SUBMISSION_DATE: 1311638400000,
        },
      },
    });
  });
});
