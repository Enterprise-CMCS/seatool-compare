import { it, beforeAll, describe, expect, vi } from "vitest";
import * as sink from "../sinkAppianData";
import * as dynamodb from "../../../../libs/dynamodb-lib";

const appianSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
  };
});

describe("appian sink service tests", () => {
  beforeAll(() => {
    process.env.tableName = "appian-table";
  });

  it("function tests putting an item to appian table", async () => {
    const event = {
      key: "",
      value: '{"payload":{"PCKG_ID":21782}}',
    };

    await appianSink.handler(event);

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
});
