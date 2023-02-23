import { it, beforeAll, describe, expect, vi } from "vitest";
import * as handler from "../sinkAppianData";
import * as dynamodb from "../../../../libs/dynamodb-lib";
vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
  };
});

describe("appian sink service tests", () => {
  beforeAll(() => {
    process.env.tableName = "appian-table";
  });

  it("function returns appian table update", async () => {
    // const workflowFunction = vi.fn(() => (
    //   Context: { Execution: { Input: { cluster: "test" } } },
    // }));

    const event: any = {
      key: "",
      value: `{"payload": "{'PCKG_ID': '4433'}"}`,
    };

    const result = await handler.handler(event);
    expect(dynamodb.putItem).toHaveBeenCalledWith(event);

    // handler.handlerEvent(
    //   {}, //event
    //   {}, //content
    //   function (data, ss) {
    //     //callback function with two arguments
    //     console.log(data);
    //   }
    // );
    expect(result).toEqual(200);
    expect(result.body).toEqual(
      `Queries: ${JSON.stringify(event.queryStringParameters)}`
    );
  });
});
